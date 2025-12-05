// ==========================================
// 3. SEQUENCER
// ==========================================
class Sequencer extends EventTarget {
    constructor(armController) {
        super();
        this.arm = armController;
        this.state = 'idle';
        this.startTime = 0;
        this.currentTime = 0;
        this.duration = 5000;
        this.loop = false;
        this.tracks = {};
        this.animationFrameId = null;
    }

    addKeyframe(servoId, time, value) {
        if (!this.tracks[servoId]) this.tracks[servoId] = [];
        this.tracks[servoId] = this.tracks[servoId].filter(k => Math.abs(k.time - time) > 10);
        this.tracks[servoId].push({ time, value });
        this.tracks[servoId].sort((a, b) => a.time - b.time);
        if (time > this.duration) { this.duration = time + 1000; }
        this.dispatchEvent(new CustomEvent('track-change'));
    }

    getKeyframes(servoId) { return this.tracks[servoId] || []; }

    play() {
        if (this.state === 'playing') return;
        this.state = 'playing';
        this.startTime = Date.now() - this.currentTime;
        this.dispatchEvent(new CustomEvent('state-change', { detail: { state: 'playing' } }));
        this.animate();
    }

    pause() {
        this.state = 'idle';
        this.cancelAnimation();
        this.dispatchEvent(new CustomEvent('state-change', { detail: { state: 'idle' } }));
    }

    stop() {
        this.state = 'idle';
        this.cancelAnimation();
        this.currentTime = 0;
        this.dispatchEvent(new CustomEvent('time-update', { detail: { time: 0 } }));
        this.dispatchEvent(new CustomEvent('state-change', { detail: { state: 'idle' } }));
    }

    seek(time) {
        this.currentTime = Math.max(0, time);
        this.applyPoseAtTime(this.currentTime);
        this.dispatchEvent(new CustomEvent('time-update', { detail: { time: this.currentTime } }));
    }

    toggleRecording() {
        if (this.state === 'recording') this.stop();
        else this.startRecording();
    }

    startRecording() {
        this.state = 'recording';
        this.startTime = Date.now();
        this.currentTime = 0;
        this.tracks = {};
        this.duration = 0;
        this.arm.servos.forEach(s => this.addKeyframe(s.id, 0, s.angle));
        this.dispatchEvent(new CustomEvent('state-change', { detail: { state: 'recording' } }));
        this.animate();
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        if (this.state === 'playing') {
            this.currentTime = Date.now() - this.startTime;
            if (this.currentTime >= this.duration) {
                if (this.loop) { this.startTime = Date.now(); this.currentTime = 0; }
                else { this.stop(); return; }
            }
            this.applyPoseAtTime(this.currentTime);
            this.dispatchEvent(new CustomEvent('time-update', { detail: { time: this.currentTime } }));
        } else if (this.state === 'recording') {
            this.currentTime = Date.now() - this.startTime;
            if (this.currentTime > this.duration) this.duration = this.currentTime;
            this.arm.servos.forEach(s => {
                const keys = this.tracks[s.id] || [];
                const lastKey = keys[keys.length - 1];
                if (!lastKey || Math.abs(lastKey.value - s.angle) > 1) {
                    this.addKeyframe(s.id, this.currentTime, s.angle);
                }
            });
            this.dispatchEvent(new CustomEvent('time-update', { detail: { time: this.currentTime } }));
        }
    }

    cancelAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    applyPoseAtTime(time) {
        this.arm.servos.forEach(servo => {
            const keys = this.tracks[servo.id];
            if (!keys || keys.length === 0) return;
            if (time >= keys[keys.length - 1].time) {
                this.arm.updateServo(servo.id, keys[keys.length - 1].value);
                return;
            }
            if (time <= keys[0].time) {
                this.arm.updateServo(servo.id, keys[0].value);
                return;
            }
            for (let i = 0; i < keys.length - 1; i++) {
                if (time >= keys[i].time && time < keys[i + 1].time) {
                    const prev = keys[i];
                    const next = keys[i + 1];
                    const duration = next.time - prev.time;
                    const progress = (time - prev.time) / duration;
                    const val = prev.value + (next.value - prev.value) * progress;
                    this.arm.updateServo(servo.id, val);
                    break;
                }
            }
        });
    }

    exportJSON() { return JSON.stringify({ duration: this.duration, tracks: this.tracks }); }

    importJSON(json) {
        try {
            const data = JSON.parse(json);
            this.duration = data.duration || 5000;
            this.tracks = data.tracks || {};
            this.dispatchEvent(new CustomEvent('track-change'));
        } catch (e) { console.error(e); }
    }
}
