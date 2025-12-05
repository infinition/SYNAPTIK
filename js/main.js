// ==========================================
// MAIN APP ENTRY POINT
// ==========================================
class App {
    constructor() {
        console.log("🚀 NEURO-LINK // System Initializing...");

        this.serial = new SerialManager();
        this.arm = new ArmController(this.serial);
        this.visualizer = new Visualizer('visualizer', this.arm);
        this.sequencer = new Sequencer(this.arm);
        this.gamepad = new GamepadManager(this.arm, this.sequencer);
        this.timeline = new TimelineUI('timeline-container', this.sequencer, this.arm);

        // 👇 on passe maintenant la timeline au UIManager
        this.ui = new UIManager(
            this.arm,
            this.serial,
            this.sequencer,
            this.gamepad,
            this.visualizer,
            this.timeline
        );

        this.animate();

        Utils.showNotification('System Ready', 'success', 2000);
        console.log("✅ NEURO-LINK // System Online");
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.visualizer) this.visualizer.update();
    }
}


// ==========================================
// STARTUP
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
