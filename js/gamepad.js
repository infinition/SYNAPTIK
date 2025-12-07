// ==========================================
// 4. GAMEPAD MANAGER
// ==========================================
class GamepadManager extends EventTarget {
    constructor(armController, sequencer) {
        super();
        this.arm = armController;
        this.sequencer = sequencer;
        this.gamepads = {};
        this.activeGamepadIndex = null;
        this.mappings = {};
        this.isLearning = false;
        this.learningTargetId = null;
        this.learningBaselines = {};
        this.pollingInterval = null;
        this.isEnabled = true;

        window.addEventListener("gamepadconnected", (e) => this.onGamepadConnected(e));
        window.addEventListener("gamepaddisconnected", (e) => this.onGamepadDisconnected(e));
        this.checkForGamepads();
    }

    // --- NEW : petit helper pour décider si on ignore un gamepad ---
    isIgnoredGamepad(gp) {
        if (!gp || !gp.id) return false;
        const id = gp.id.toLowerCase();

        // Chez toi : "Unknown Gamepad (Vendor: beef Product: 046d)"
        if (id.includes("unknown gamepad")) return true;

        // Si un jour tu veux ignorer d'autres trucs, tu peux rajouter ici
        // ex: if (id.includes("beef")) return true;

        return false;
    }

    toggleEnabled() {
        this.isEnabled = !this.isEnabled;
        if (this.activeGamepadIndex !== null) {
            this.dispatchEvent(new CustomEvent('gamepad-connected', { detail: { gamepad: this.gamepads[this.activeGamepadIndex] } }));
        } else {
            this.dispatchEvent(new CustomEvent('gamepad-disconnected'));
        }
    }

    checkForGamepads() {
        const gamepads = navigator.getGamepads();
        console.log('[GAMEPAD] checkForGamepads():', gamepads);

        for (const gp of gamepads) {
            if (!gp) continue;
            if (this.isIgnoredGamepad(gp)) {
                console.log('[GAMEPAD] Ignoring gamepad from checkForGamepads():', gp.id);
                continue;
            }
            this.onGamepadConnected({ gamepad: gp });
        }
    }

    onGamepadConnected(e) {
        const gp = e.gamepad;
        if (!gp) return;

        // --- NEW : on zappe la fausse manette ---
        if (this.isIgnoredGamepad(gp)) {
            console.log('[GAMEPAD] Ignoring unknown/virtual gamepad:', gp.id);
            return;
        }

        console.log(`[GAMEPAD] Gamepad connected: index=${gp.index}, id="${gp.id}"`);
        this.gamepads[gp.index] = gp;

        // Si aucun actif, on prend celui-là
        if (this.activeGamepadIndex === null) {
            this.activeGamepadIndex = gp.index;
            this.startPolling();
        }

        this.dispatchEvent(new CustomEvent('gamepad-connected', { detail: { gamepad: gp } }));
        Utils.showNotification(`Gamepad connected: ${gp.id}`, "success");
    }

    onGamepadDisconnected(e) {
        const gp = e.gamepad;
        if (!gp) return;

        delete this.gamepads[gp.index];
        delete this.learningBaselines[gp.index];

        if (this.activeGamepadIndex === gp.index) {
            this.activeGamepadIndex = null;
            const indices = Object.keys(this.gamepads);
            if (indices.length > 0) {
                this.activeGamepadIndex = parseInt(indices[0]);
            } else {
                this.stopPolling();
            }
        }

        this.dispatchEvent(new CustomEvent('gamepad-disconnected'));
        Utils.showNotification("Gamepad disconnected", "warning");
    }

    startPolling() {
        if (this.pollingInterval) return;
        this.pollingInterval = setInterval(() => this.poll(), 16);
    }

    stopPolling() {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
    }

    startLearning(servoId) {
        this.isLearning = true;
        this.learningTargetId = servoId;
        this.learningBaselines = {};
        console.log(`[LEARNING] Servo ${servoId}`);
    }

    poll() {
        if (!this.isEnabled) return;
        if (this.sequencer && this.sequencer.state === 'playing') return;

        const gamepads = navigator.getGamepads();

        // Mode "learning"
        if (this.isLearning && this.learningTargetId !== null) {
            for (let i = 0; i < gamepads.length; i++) {
                const gp = gamepads[i];
                if (!gp || this.isIgnoredGamepad(gp)) continue;   // NEW : on ignore aussi ici
                if (!this.learningBaselines[gp.index]) {
                    this.learningBaselines[gp.index] = {
                        axes: [...gp.axes],
                        buttons: gp.buttons.map(b => b.pressed)
                    };
                    return;
                }
                const baseline = this.learningBaselines[gp.index];
                for (let axisIdx = 0; axisIdx < gp.axes.length; axisIdx++) {
                    if (Math.abs(gp.axes[axisIdx] - baseline.axes[axisIdx]) > 0.5) {
                        this.registerMapping(gp.index, 'axis', axisIdx);
                        return;
                    }
                }
                for (let btnIdx = 0; btnIdx < gp.buttons.length; btnIdx++) {
                    if (gp.buttons[btnIdx].pressed && !baseline.buttons[btnIdx]) {
                        this.registerMapping(gp.index, 'button', btnIdx);
                        return;
                    }
                }
            }
            return;
        }

        if (this.activeGamepadIndex === null) return;
        const activeGP = gamepads[this.activeGamepadIndex];
        if (!activeGP || this.isIgnoredGamepad(activeGP)) return; // NEW : on vérifie

        Object.keys(this.mappings).forEach(servoId => {
            const map = this.mappings[servoId];
            const servo = this.arm.getServo(parseInt(servoId));
            if (!servo) return;
            const range = servo.max - servo.min;
            const center = servo.min + range / 2;
            let inputVal = 0;

            if (map.type === 'axis') {
                if (map.index < activeGP.axes.length) {
                    let val = activeGP.axes[map.index];
                    const deadzone = map.deadzone !== undefined ? map.deadzone : 0.1;
                    if (Math.abs(val) < deadzone) val = 0;
                    inputVal = val;
                }
            } else if (map.type === 'button') {
                if (map.index < activeGP.buttons.length) {
                    inputVal = activeGP.buttons[map.index].pressed ? 1 : -1;
                }
            }

            if (map.invert) inputVal = -inputVal;
            let targetAngle;

            if (map.type === 'axis') {
                // Check for control mode (absolute vs incremental)
                if (map.controlMode === 'incremental') {
                    const speed = 2.0; // Degrees per tick
                    // Use a small threshold for movement in incremental mode, slightly above deadzone if needed, 
                    // but since we already zeroed out val based on deadzone, we can just check for non-zero.
                    if (Math.abs(inputVal) > 0) {
                        const requestedAngle = servo.angle + (inputVal * speed);
                        targetAngle = Math.max(servo.min, Math.min(servo.max, requestedAngle));
                        if (targetAngle !== servo.angle) {
                            this.arm.updateServo(servo.id, targetAngle);
                        }
                    }
                } else {
                    // Default: Absolute (Spring-centered)
                    targetAngle = center + (inputVal * (range / 2));
                    if (Math.abs(targetAngle - servo.angle) > 1) {
                        this.arm.updateServo(servo.id, targetAngle);
                    }
                }
            } else if (map.type === 'button') {
                const step = 2;
                const requestedAngle = servo.angle + (inputVal * step);
                targetAngle = Math.max(servo.min, Math.min(servo.max, requestedAngle));
                if (targetAngle !== servo.angle) {
                    this.arm.updateServo(servo.id, targetAngle);
                }
            }
        });
    }

    registerMapping(gpIndex, type, index) {
        if (this.activeGamepadIndex !== gpIndex) this.activeGamepadIndex = gpIndex;
        this.setMapping(this.learningTargetId, type, index);
        this.isLearning = false;
        this.learningTargetId = null;
        this.dispatchEvent(new CustomEvent('learning-complete'));
        Utils.showNotification(`Mapped ${type} ${index}`, "success");
    }

    setMapping(servoId, type, index) {
        // Default to absolute for axis, with 0.1 deadzone
        this.mappings[servoId] = { type, index, invert: false, controlMode: 'absolute', deadzone: 0.1 };
        this.dispatchEvent(new CustomEvent('mapping-change'));
    }

    updateMapping(servoId, updates) {
        if (this.mappings[servoId]) {
            this.mappings[servoId] = { ...this.mappings[servoId], ...updates };
            this.dispatchEvent(new CustomEvent('mapping-change'));
        }
    }

    getMapping(servoId) { return this.mappings[servoId]; }
}
