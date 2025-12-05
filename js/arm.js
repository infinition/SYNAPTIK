// ==========================================
// 2. ARM CONTROLLER
// ==========================================
class ArmController extends EventTarget {
    constructor(serialManager) {
        super();
        this.serial = serialManager;
        this.servos = [
            {
                id: 0, pin: 3, name: "Base",
                type: 'base', mode: 'positional',
                angle: 90, startAngle: 90, min: 0, max: 180,
                color: '#1a1a1a', meshType: 'default', inverted: false
            },
            {
                id: 1, pin: 5, name: "Shoulder",
                type: 'joint', mode: 'positional',
                angle: 90, startAngle: 45, min: 0, max: 180,
                color: '#2a2a2a', meshType: 'default', inverted: false
            },
            {
                id: 2, pin: 6, name: "Elbow",
                type: 'joint', mode: 'positional',
                angle: 90, startAngle: 150, min: 0, max: 180,
                color: '#3a3a3a', meshType: 'default', inverted: false
            },
            {
                id: 3, pin: 9, name: "Wrist",
                type: 'wrist', mode: 'positional',
                angle: 90, startAngle: 90, min: 0, max: 180,
                color: '#4a4a4a', meshType: 'default', inverted: false
            },
            {
                id: 4, pin: 10, name: "Claw",
                type: 'claw', mode: 'positional',
                angle: 90, startAngle: 90, min: 30, max: 120,
                color: '#00f3ff', meshType: 'default', inverted: false
            }
        ];
        setTimeout(() => this.resetToStart(), 500);
    }

    // 🔹 Helper : récupérer un servo par id
    getServo(id) {
        return this.servos.find(s => s.id === id);
    }

    // 🔹 Couleur de servo (pour le viewer + UI)
    setServoColor(id, color) {
        const servo = this.getServo(id);
        if (!servo) return;
        servo.color = color;
        this.dispatchEvent(new CustomEvent('config-change'));
    }

    // 🔹 Type de mesh (cube, cylindre, etc.)
    setServoMesh(id, meshType) {
        const servo = this.getServo(id);
        if (!servo) return;
        servo.meshType = meshType || 'default';
        this.dispatchEvent(new CustomEvent('config-change'));
    }

    updateServo(id, angle) {
        const servo = this.getServo(id);
        if (!servo) return;
        servo.angle = angle;

        // inversion logique
        let outAngle = angle;
        if (servo.inverted) outAngle = servo.max - (angle - servo.min);

        // 🔹 Garde-fou : serial peut ne pas avoir .send()
        if (
            this.serial &&
            typeof this.serial.send === 'function' &&
            this.serial.isConnected
        ) {
            this.serial.send(`${servo.pin}:${Math.round(outAngle)}\n`);
        }

        this.dispatchEvent(new CustomEvent('servo-update', { detail: { id, angle } }));
    }

    updateServoConfig(id, updates) {
        const servo = this.getServo(id);
        if (!servo) return;

        Object.assign(servo, updates);

        // 🔹 sécurité : une pince reste toujours en mode positional
        if (servo.type === 'claw') {
            servo.mode = 'positional';
        }
        if (!servo.mode) servo.mode = 'positional';

        if (!servo.meshType) servo.meshType = 'default';
        if (servo.inverted === undefined) servo.inverted = false;
        if (servo.startAngle === undefined) servo.startAngle = 90;

        this.dispatchEvent(new CustomEvent('config-change'));
    }

    addServo(type = 'joint') {
        const newId = this.servos.length > 0 ? Math.max(...this.servos.map(s => s.id)) + 1 : 0;
        this.servos.push({
            id: newId,
            pin: 0,
            name: `Servo ${newId}`,
            type: type,
            mode: 'positional',
            angle: 90,
            startAngle: 90,
            min: 0,
            max: 180,
            color: '#222222',
            meshType: 'default',
            inverted: false
        });
        this.dispatchEvent(new CustomEvent('config-change'));
    }

    removeServo(id) {
        this.servos = this.servos.filter(s => s.id !== id);
        this.dispatchEvent(new CustomEvent('config-change'));
    }

    reorderServos(fromIndex, toIndex) {
        const arr = this.servos;
        const [moved] = arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, moved);
        this.dispatchEvent(new CustomEvent('config-change'));
    }

    importConfig(json) {
        try {
            const data = JSON.parse(json);
            if (Array.isArray(data)) {
                this.servos = data;
                this.servos.forEach(s => {
                    if (s.startAngle === undefined) s.startAngle = 90;
                    if (!s.meshType) s.meshType = 'default';
                    if (s.inverted === undefined) s.inverted = false;
                    if (!s.mode) s.mode = 'positional'; // compat
                    // 🔹 claw = pince => jamais continuous
                    if (s.type === 'claw') s.mode = 'positional';
                });
                this.dispatchEvent(new CustomEvent('config-change'));
                this.resetToStart();
            }
        } catch (e) {
            console.error(e);
            Utils.showNotification("Invalid Config", "error");
        }
    }

    resetToStart() {
        this.servos.forEach(s => this.updateServo(s.id, s.startAngle));
    }
}
