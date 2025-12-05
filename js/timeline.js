// ==========================================
// 6. TIMELINE UI
// ==========================================
class TimelineUI {
    constructor(containerId, sequencer, armController) {
        this.container = document.getElementById(containerId);
        this.sequencer = sequencer;
        this.arm = armController;
        this.canvas = document.createElement('canvas');
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.scale = 0.1;
        this.scrollX = 0;
        this.isDragging = false;
        this.isTouchDragging = false;
        this.headerHeight = 30;
        this.trackHeight = 50;
        this.lastTouchX = 0;

        this.sequencer.addEventListener('time-update', () => { this.autoScroll(); this.draw(); });
        this.sequencer.addEventListener('track-change', () => this.resize());
        this.arm.addEventListener('config-change', () => this.resize());
        window.addEventListener('resize', () => this.resize());

        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.handleInput(e);
        });
        window.addEventListener('mouseup', () => this.isDragging = false);
        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) this.handleInput(e);
        });

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isTouchDragging = true;
            const touch = e.touches[0];
            this.lastTouchX = touch.clientX;
            this.handleInput(touch);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.isTouchDragging) {
                const touch = e.touches[0];
                const deltaX = touch.clientX - this.lastTouchX;
                this.scrollX -= deltaX / this.scale;
                this.scrollX = Math.max(0, this.scrollX);
                this.lastTouchX = touch.clientX;
                this.draw();
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', () => {
            this.isTouchDragging = false;
        });

        // Wheel event
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.scrollX += e.deltaY * 0.5;
            this.scrollX = Math.max(0, this.scrollX);
            this.draw();
        }, { passive: false });

        this.resize();
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        const contentHeight = this.headerHeight + (this.arm.servos.length * this.trackHeight);
        this.container.style.height = `${contentHeight}px`;
        this.canvas.height = contentHeight;
        this.draw();
    }

    autoScroll() {
        const center = this.canvas.width / 2;
        const currentX = this.sequencer.currentTime * this.scale;

        if (this.sequencer.state === 'playing' || this.sequencer.state === 'recording') {
            this.scrollX = Math.max(0, currentX - center);
        }
    }

    handleInput(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX || e.pageX) - rect.left;
        const time = (x + this.scrollX) / this.scale;
        this.sequencer.seek(time);
    }

    draw() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        // Background
        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(0, 0, w, h);

        // Time grid
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        const timeStep = 1000;
        const startTime = Math.floor(this.scrollX / this.scale / 1000) * 1000;
        const endTime = startTime + (w / this.scale) + 1000;

        for (let t = startTime; t < endTime; t += timeStep) {
            const x = t * this.scale - this.scrollX;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();

            ctx.fillStyle = '#555';
            ctx.font = '10px monospace';
            ctx.fillText(`${t / 1000}s`, x + 4, 18);
        }

        // Header separator
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, this.headerHeight);
        ctx.lineTo(w, this.headerHeight);
        ctx.stroke();

        // Servo tracks
        this.arm.servos.forEach((servo, index) => {
            const y = this.headerHeight + index * this.trackHeight;

            // Alternating track background
            ctx.fillStyle = (index % 2 === 0) ? '#0f0f0f' : '#121212';
            ctx.fillRect(0, y, w, this.trackHeight);

            // Track separator
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();

            // Keyframes
            const keys = this.sequencer.getKeyframes(servo.id);

            // Draw line connecting keyframes
            if (keys.length > 1) {
                ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                keys.forEach((k, i) => {
                    const x = k.time * this.scale - this.scrollX;
                    const keyY = y + this.trackHeight / 2;
                    if (i === 0) ctx.moveTo(x, keyY);
                    else ctx.lineTo(x, keyY);
                });
                ctx.stroke();
            }

            // Draw keyframe points
            keys.forEach(k => {
                const x = k.time * this.scale - this.scrollX;
                if (x >= -10 && x <= w + 10) {
                    const keyY = y + this.trackHeight / 2;

                    // Outer glow
                    ctx.fillStyle = 'rgba(0, 243, 255, 0.3)';
                    ctx.beginPath();
                    ctx.arc(x, keyY, 6, 0, Math.PI * 2);
                    ctx.fill();

                    // Inner dot
                    ctx.fillStyle = '#00f3ff';
                    ctx.beginPath();
                    ctx.arc(x, keyY, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        });

        // Playhead
        const playheadX = this.sequencer.currentTime * this.scale - this.scrollX;

        // Playhead line with glow
        const gradient = ctx.createLinearGradient(playheadX - 2, 0, playheadX + 2, 0);
        gradient.addColorStop(0, 'rgba(255, 0, 85, 0)');
        gradient.addColorStop(0.5, 'rgba(255, 0, 85, 1)');
        gradient.addColorStop(1, 'rgba(255, 0, 85, 0)');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, h);
        ctx.stroke();

        // Playhead indicator (triangle)
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.moveTo(playheadX - 8, 0);
        ctx.lineTo(playheadX + 8, 0);
        ctx.lineTo(playheadX, 12);
        ctx.fill();

        // Playhead time display
        ctx.fillStyle = '#ff0055';
        ctx.font = 'bold 11px monospace';
        const timeText = `${(this.sequencer.currentTime / 1000).toFixed(2)}s`;
        const textWidth = ctx.measureText(timeText).width;
        const textX = Math.max(5, Math.min(w - textWidth - 5, playheadX - textWidth / 2));

        // Text background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(textX - 3, 3, textWidth + 6, 16);

        // Text
        ctx.fillStyle = '#ff0055';
        ctx.fillText(timeText, textX, 15);
    }
}