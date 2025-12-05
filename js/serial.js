// ==========================================
// 1. SERIAL MANAGER
// ==========================================
class SerialManager extends EventTarget {
    constructor() {
        super();
        this.port = null;
        this.writer = null;
        this.reader = null;
        this.isConnected = false;
        this.keepReading = false;
        this.autoConnect();
    }

    async autoConnect() {
        if (!navigator.serial) return;
        const ports = await navigator.serial.getPorts();
        if (ports.length > 0) {
            console.log("Auto-connecting to known port...");
            this.connect(ports[0]);
        }
    }

    async connect(preAuthorizedPort = null) {
        if (!navigator.serial) {
            Utils.showNotification("Web Serial API not supported", "error");
            return;
        }
        try {
            if (preAuthorizedPort) {
                this.port = preAuthorizedPort;
            } else {
                this.port = await navigator.serial.requestPort();
            }
            await this.port.open({ baudRate: 9600 });
            this.writer = this.port.writable.getWriter();
            this.isConnected = true;
            this.keepReading = true;
            this.dispatchEvent(new CustomEvent('status-change', { detail: { connected: true } }));
            Utils.showNotification("Arduino connected", "success");
            this.readLoop();
        } catch (error) {
            console.error("Connection Failed:", error);
            if (!preAuthorizedPort) {
                Utils.showNotification("Failed to connect: " + error.message, "error");
            }
        }
    }

    async disconnect() {
        if (!this.port) return;
        this.isConnected = false;
        this.keepReading = false;
        try {
            if (this.writer) {
                try { await this.writer.releaseLock(); } catch (e) { }
            }
            if (this.reader) {
                try {
                    await this.reader.cancel();
                    await this.reader.releaseLock();
                } catch (e) { }
            }
            await this.port.close();
        } catch (e) {
            console.error("Error closing port:", e);
        } finally {
            this.port = null;
            this.writer = null;
            this.reader = null;
            this.isConnected = false;
            this.dispatchEvent(new CustomEvent('status-change', { detail: { connected: false } }));
            Utils.showNotification("Arduino disconnected", "warning");
        }
    }

    // Méthode bas niveau déjà existante
    async write(data) {
        if (!this.isConnected || !this.writer) return;
        const encoder = new TextEncoder();
        try {
            await this.writer.write(encoder.encode(data));
        } catch (e) {
            console.error("Write error:", e);
        }
    }

    // 👇 Nouveau wrapper utilisé par ArmController.updateServo()
    // Permet d'appeler this.serial.send("pin:angle\n")
    async send(line) {
        // tu peux logger si tu veux :
        // console.log('[SERIAL] TX:', line.trim());
        return this.write(line);
    }

    async readLoop() {
        while (this.port && this.port.readable && this.keepReading) {
            this.reader = this.port.readable.getReader();
            try {
                while (true) {
                    const { value, done } = await this.reader.read();
                    if (done) break;
                    // Ici tu peux traiter 'value' si l'Arduino renvoie des infos
                }
            } catch (e) {
                console.error("Read error:", e);
            } finally {
                if (this.reader) this.reader.releaseLock();
            }
        }
    }
}
