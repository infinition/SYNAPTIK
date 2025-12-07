// ui.js
// ==========================================
// 7. UI MANAGER
// ==========================================
class UIManager {
    constructor(armController, serialManager, sequencer, gamepadManager, visualizer, timeline) {
        this.arm = armController;
        this.serial = serialManager;
        this.sequencer = sequencer;
        this.gamepad = gamepadManager;
        this.visualizer = visualizer;
        this.timeline = timeline;
        this.currentTheme = 'dark';
        this.dragSrcEl = null;
        this.autoSaveEnabled = true; // valeur par défaut
        this.currentSettingsServoId = null;
        this.selectedServoForMesh = null;

        this.initElements();
        this.initModals();
        this.initKeyboardShortcuts();
        this.initTooltips();
        this.init();
    }

    initElements() {
        this.btnArduinoStatus = document.getElementById('btn-arduino-status');
        this.btnGamepadStatus = document.getElementById('btn-gamepad-status');
        this.arduinoText = document.getElementById('arduino-text');
        this.gamepadText = document.getElementById('gamepad-text');
        this.controlsList = document.getElementById('track-controls');
        this.configList = document.getElementById('servo-config-list');
        this.btnAddServo = document.getElementById('btn-add-servo');
        this.timeDisplay = document.getElementById('time-display');
        this.btnRecord = document.getElementById('btn-record');
        this.btnPlay = document.getElementById('btn-play');
        this.btnStop = document.getElementById('btn-stop');
        this.btnTheme = document.getElementById('btn-theme');
        this.btnHelp = document.getElementById('btn-help');
        this.btnBgSettings = document.getElementById('btn-bg-settings');
        this.btnFloorSettings = document.getElementById('btn-floor-settings');
        this.btnResetCamera = document.getElementById('btn-reset-camera');
        this.btnSettings = document.getElementById('btn-settings');
        this.btnExport = document.getElementById('btn-export');
        this.btnStats = document.getElementById('btn-stats');
        this.btnPerformance = document.getElementById('btn-performance');
        this.toggleInvertServo = document.getElementById('toggle-invert-servo');
    }

    initModals() {
        // Close modal handlers
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal-overlay').classList.remove('show');
            });
        });

        // Click outside to close
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('show');
                }
            });
        });

        // Background modal
        this.initBgModal();

        // Floor modal
        this.initFloorModal();

        // Theme modal
        this.initThemeModal();

        // Mesh modal
        this.initMeshModal();
    }

    initBgModal() {
        const modal = document.getElementById('bg-modal');
        const presetsContainer = document.getElementById('bg-presets');

        const presets = [
            { name: 'Dark Gradient', type: 'gradient' },
            { name: 'Solid Black', type: 'solid', data: 0x000000 },
            { name: 'Space', type: 'space' },
            { name: 'Cyberpunk', type: 'cyberpunk' },
            { name: 'Blue Void', type: 'solid', data: 0x001030 }
        ];

        presets.forEach(preset => {
            const item = document.createElement('div');
            item.className = 'modal-item';
            item.textContent = preset.name;
            item.addEventListener('click', () => {
                this.visualizer.updateBackground(preset.type, preset.data);
                modal.classList.remove('show');
                Utils.showNotification(`Background: ${preset.name}`, 'success');
                this.saveConfigToLocalStorage();
            });
            presetsContainer.appendChild(item);
        });

        // File upload
        const uploadArea = document.getElementById('bg-upload');
        const fileInput = document.getElementById('bg-file-input');

        uploadArea.addEventListener('click', () => fileInput.click());

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) this.handleBgUpload(file);
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleBgUpload(file);
        });
    }

    handleBgUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.visualizer.updateBackground('image', e.target.result);
            document.getElementById('bg-modal').classList.remove('show');
            Utils.showNotification('Custom background loaded', 'success');
            this.saveConfigToLocalStorage();
        };
        reader.readAsDataURL(file);
    }

    initFloorModal() {
        const modal = document.getElementById('floor-modal');
        const presetsContainer = document.getElementById('floor-presets');

        const presets = [
            { name: 'Grid', type: 'grid' },
            { name: 'Plane', type: 'plane' },
            { name: 'Mirror', type: 'mirror' },
            { name: 'None', type: 'none' }
        ];

        presets.forEach(preset => {
            const item = document.createElement('div');
            item.className = 'modal-item';
            item.textContent = preset.name;
            item.addEventListener('click', () => {
                this.visualizer.updateFloor(preset.type);
                modal.classList.remove('show');
                Utils.showNotification(`Floor: ${preset.name}`, 'success');
                this.saveConfigToLocalStorage();
            });
            presetsContainer.appendChild(item);
        });
    }

    initThemeModal() {
        const modal = document.getElementById('theme-modal');
        const presetsContainer = document.getElementById('theme-presets');

        const themes = [
            { name: '🌑 Dark', class: '' },
            { name: '☀️ Light', class: 'theme-light' },
            { name: '🌆 Cyberpunk', class: 'theme-cyberpunk' },
            { name: '⚪ Minimal', class: 'theme-minimal' }
        ];

        themes.forEach(theme => {
            const item = document.createElement('div');
            item.className = 'modal-item';
            item.textContent = theme.name;
            item.addEventListener('click', () => {
                document.body.className = theme.class;
                this.currentTheme = theme.name;
                modal.classList.remove('show');
                Utils.showNotification(`Theme: ${theme.name}`, 'success');
                this.saveConfigToLocalStorage();
            });
            presetsContainer.appendChild(item);
        });
    }

    initMeshModal() {
        const modal = document.getElementById('mesh-modal');
        const presetsContainer = document.getElementById('mesh-presets');
        const colorPalette = document.getElementById('color-palette');

        const meshTypes = [
            { name: 'Default', type: 'default' },
            { name: 'Cube', type: 'cube' },
            { name: 'Cylinder', type: 'cylinder' },
            { name: 'Sphere', type: 'sphere' },
            { name: 'Cone', type: 'cone' },
            { name: 'Torus', type: 'torus' }
        ];

        meshTypes.forEach(meshType => {
            const item = document.createElement('div');
            item.className = 'modal-item';
            item.textContent = meshType.name;
            item.addEventListener('click', () => {
                if (this.selectedServoForMesh !== null) {
                    this.arm.setServoMesh(this.selectedServoForMesh, meshType.type);
                    modal.classList.remove('show');
                    Utils.showNotification(`Mesh updated`, 'success');
                }
            });
            presetsContainer.appendChild(item);
        });

        // Color palette
        const colors = [
            '#FF0055', '#00f3ff', '#bc13fe', '#00ff9d', '#ffb800',
            '#ff6b35', '#004e89', '#1a1a1a', '#ffffff', '#ff69b4',
            '#7209b7', '#f72585', '#4cc9f0', '#06ffa5', '#ffd60a'
        ];

        colors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.addEventListener('click', () => {
                if (this.selectedServoForMesh !== null) {
                    this.arm.setServoColor(this.selectedServoForMesh, color);
                    Utils.showNotification('Color updated', 'success');
                }
            });
            colorPalette.appendChild(swatch);
        });

        // Custom mesh upload
        const uploadArea = document.getElementById('mesh-upload');
        const fileInput = document.getElementById('mesh-file-input');

        uploadArea.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && this.selectedServoForMesh !== null) {
                const servo = this.arm.getServo(this.selectedServoForMesh);
                if (servo) {
                    this.visualizer.loadCustomMesh(servo, null, null, file);
                    modal.classList.remove('show');
                }
            }
        });
    }

    showMeshModal(servoId) {
        const servo = this.arm.getServo(servoId);
        if (!servo) return;

        this.selectedServoForMesh = servoId;
        document.getElementById('mesh-servo-name').textContent = servo.name;
        document.getElementById('mesh-modal').classList.add('show');
    }

    initKeyboardShortcuts() {
        const shortcutsPanel = document.getElementById('shortcuts-panel');

        document.addEventListener('keydown', (e) => {
            // ESC - Close modals
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
                shortcutsPanel.classList.remove('show');
                return;
            }

            // ? - Toggle shortcuts
            if (e.key === '?') {
                shortcutsPanel.classList.toggle('show');
                return;
            }

            // Ignore if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            // Space - Play/Pause
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.sequencer.state === 'playing') this.sequencer.pause();
                else this.sequencer.play();
            }

            // R - Record
            if (e.key === 'r' || e.key === 'R') {
                this.sequencer.toggleRecording();
            }

            // S - Stop
            if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
                this.sequencer.stop();
            }

            // Ctrl+S - Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveSequence();
            }

            // Ctrl+O - Open
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                document.getElementById('btn-load-seq').click();
            }

            // Arrow keys - Move playhead
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.sequencer.seek(Math.max(0, this.sequencer.currentTime - 100));
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.sequencer.seek(this.sequencer.currentTime + 100);
            }
        });

        this.btnHelp.addEventListener('click', () => {
            shortcutsPanel.classList.toggle('show');
        });
    }

    initTooltips() {
        document.querySelectorAll('[title]').forEach(el => {
            el.addEventListener('mouseenter', () => {
                if (el.title) Utils.showTooltip(el, el.title);
            });
            el.addEventListener('mouseleave', () => {
                Utils.hideTooltip();
            });
        });
    }

    init() {
        // Arduino status
        this.btnArduinoStatus.addEventListener('click', () => {
            if (this.serial.isConnected) {
                this.serial.disconnect();
            } else {
                this.serial.connect();
            }
        });

        // Gamepad status
        this.btnGamepadStatus.addEventListener('click', () => {
            this.gamepad.toggleEnabled();
        });

        // Theme button
        this.btnTheme.addEventListener('click', () => {
            document.getElementById('theme-modal').classList.add('show');
        });

        // 3D Viewer controls
        this.btnBgSettings.addEventListener('click', () => {
            document.getElementById('bg-modal').classList.add('show');
        });

        this.btnFloorSettings.addEventListener('click', () => {
            document.getElementById('floor-modal').classList.add('show');
        });

        this.btnResetCamera.addEventListener('click', () => {
            this.visualizer.resetCamera();
            Utils.showNotification('Camera reset', 'info');
        });

        // Advanced Settings
        this.btnSettings.addEventListener('click', () => {
            document.getElementById('settings-modal').classList.add('show');
        });

        // Export/Import
        this.btnExport.addEventListener('click', () => {
            document.getElementById('export-modal').classList.add('show');
        });

        // Stats toggle
        this.btnStats.addEventListener('click', () => {
            const statsPanel = document.getElementById('stats-panel');
            const isVisible = statsPanel.style.display !== 'none';
            statsPanel.style.display = isVisible ? 'none' : 'block';
            this.btnStats.classList.toggle('active');
            this.saveConfigToLocalStorage();
        });

        // Performance mode toggle
        this.btnPerformance.addEventListener('click', () => {
            document.body.classList.toggle('performance-mode');
            this.btnPerformance.classList.toggle('active');
            const isActive = document.body.classList.contains('performance-mode');
            Utils.showNotification(
                isActive ? 'Performance mode enabled' : 'Performance mode disabled',
                'info'
            );
            this.saveConfigToLocalStorage();
        });

        // Servo invert toggle (in modal)
        if (this.toggleInvertServo) {
            this.toggleInvertServo.addEventListener('click', () => {
                this.toggleInvertServo.classList.toggle('active');
            });
        }

        // Settings modal handlers
        this.initSettingsHandlers();

        // Export modal handlers
        this.initExportHandlers();

        // Servo Settings Save
        document.getElementById('settings-btn-save')?.addEventListener('click', () => {
            this.saveServoSettings();
        });

        // Serial events
        this.serial.addEventListener('status-change', (e) => {
            if (e.detail.connected) {
                this.btnArduinoStatus.className = 'status-pill connected';
                this.arduinoText.textContent = "ARDUINO";
            } else {
                this.btnArduinoStatus.className = 'status-pill disconnected';
                this.arduinoText.textContent = "ARDUINO";
            }
        });

        // Gamepad events
        const updateGamepadUI = (gp) => {
            if (gp && this.gamepad.isEnabled) {
                this.btnGamepadStatus.className = 'status-pill connected';
                this.gamepadText.textContent = "GAMEPAD";
            } else {
                this.btnGamepadStatus.className = 'status-pill disconnected';
                this.gamepadText.textContent = this.gamepad.isEnabled ? "NO GAMEPAD" : "GP DISABLED";
            }
        };

        this.gamepad.addEventListener('gamepad-connected', (e) => updateGamepadUI(e.detail.gamepad));
        this.gamepad.addEventListener('gamepad-disconnected', () => updateGamepadUI(null));

        // Config save/load (header buttons)
        const btnSaveConfig = document.getElementById('btn-save-config');
        const btnLoadConfig = document.getElementById('btn-load-config');

        if (btnSaveConfig) {
            btnSaveConfig.addEventListener('click', () => {
                const configData = this.getCurrentConfigData();
                Utils.downloadFile(JSON.stringify(configData, null, 2), 'neuro_link_config.json');
                Utils.showNotification('Configuration saved', 'success');
            });
        }

        if (btnLoadConfig) {
            btnLoadConfig.addEventListener('click', () => {
                Utils.loadFile((data) => {
                    try {
                        const parsed = JSON.parse(data);
                        const config = parsed.config ? parsed.config : parsed; // support ancien format
                        this.applyConfig(config);
                        Utils.showNotification('Configuration loaded', 'success');
                    } catch (err) {
                        console.error(err);
                        Utils.showNotification('Error loading configuration', 'error');
                    }
                }, '.json');
            });
        }

        // Add servo
        this.btnAddServo.addEventListener('click', () => {
            this.arm.addServo();
            Utils.showNotification('Servo added', 'success');
        });

        // Time display
        setInterval(() => {
            const now = new Date();
            this.timeDisplay.textContent = now.toLocaleTimeString('fr-FR');
        }, 1000);

        // Arm events
        this.arm.addEventListener('config-change', () => {
            console.log('[NEURO-LINK] arm "config-change" event received');
            this.renderControls();
            this.renderConfig();
            this.saveConfigToLocalStorage();
        });

        this.arm.addEventListener('servo-update', (e) => {
            const valSpan = document.getElementById(`val-${e.detail.id}`);
            if (valSpan) valSpan.textContent = Math.round(e.detail.angle) + '°';

            const slider = document.getElementById(`slider-${e.detail.id}`);
            if (slider && document.activeElement !== slider) {
                slider.value = e.detail.angle;
            }
        });

        // Gamepad events
        this.gamepad.addEventListener('learning-complete', () => {
            console.log('[NEURO-LINK] gamepad "learning-complete" event');
            this.renderConfig();
            this.saveConfigToLocalStorage();
        });

        this.gamepad.addEventListener('mapping-change', () => {
            console.log('[NEURO-LINK] gamepad "mapping-change" event');
            this.renderConfig();
            this.saveConfigToLocalStorage();
        });

        // Charger la config sauvegardée (si existante)
        console.log('[NEURO-LINK] init(): calling loadConfigFromLocalStorage()');
        this.loadConfigFromLocalStorage();

        // Collapsible sections
        document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
                const content = document.getElementById(header.dataset.target);
                if (content) content.classList.toggle('collapsed');
            });
        });

        // Render initial UI
        this.renderControls();
        this.renderConfig();
        this.renderSequencer();
    }

    initSettingsHandlers() {
        // Timeline scale
        const timelineScale = document.getElementById('timeline-scale');
        if (timelineScale) {
            if (this.timeline && typeof this.timeline.scale === 'number') {
                timelineScale.value = this.timeline.scale;
            }

            timelineScale.addEventListener('input', (e) => {
                if (this.timeline) {
                    this.timeline.scale = parseFloat(e.target.value);
                    this.timeline.draw();
                    this.saveConfigToLocalStorage();
                }
            });
        }

        // Camera FOV
        const cameraFov = document.getElementById('camera-fov');
        if (cameraFov) {
            cameraFov.addEventListener('input', (e) => {
                if (this.visualizer) {
                    this.visualizer.setCameraFOV(parseFloat(e.target.value));
                    this.saveConfigToLocalStorage();
                }
            });
        }

        // Toggle shadows
        const toggleShadows = document.getElementById('toggle-shadows');
        if (toggleShadows) {
            toggleShadows.addEventListener('click', () => {
                toggleShadows.classList.toggle('active');
                const enabled = toggleShadows.classList.contains('active');
                if (this.visualizer) {
                    this.visualizer.enableShadows(enabled);
                }
                Utils.showNotification(
                    enabled ? 'Shadows enabled' : 'Shadows disabled',
                    'info'
                );
                this.saveConfigToLocalStorage();
            });
        }

        // Anti-aliasing
        const toggleAA = document.getElementById('toggle-antialiasing');
        if (toggleAA) {
            toggleAA.addEventListener('click', () => {
                toggleAA.classList.toggle('active');
                const enabled = toggleAA.classList.contains('active');
                if (this.visualizer) {
                    this.visualizer.antialiasing = enabled; // on stocke juste l'état
                }
                Utils.showNotification('Restart required for AA changes', 'warning');
                this.saveConfigToLocalStorage();
            });
        }

        // Auto-save toggle
        const toggleAutosave = document.getElementById('toggle-autosave');
        if (toggleAutosave) {
            // Lire l'état sauvegardé
            const savedAuto = localStorage.getItem('neuro_link_autosave');
            console.log('[NEURO-LINK] initSettingsHandlers(): savedAuto =', savedAuto);

            if (savedAuto !== null) {
                this.autoSaveEnabled = savedAuto === 'true';
            }

            console.log('[NEURO-LINK] initSettingsHandlers(): autoSaveEnabled =', this.autoSaveEnabled);

            // Appliquer la classe visuelle
            if (this.autoSaveEnabled) toggleAutosave.classList.add('active');
            else toggleAutosave.classList.remove('active');

            toggleAutosave.addEventListener('click', () => {
                toggleAutosave.classList.toggle('active');
                const enabled = toggleAutosave.classList.contains('active');
                this.autoSaveEnabled = enabled;
                localStorage.setItem('neuro_link_autosave', enabled ? 'true' : 'false');
                console.log('[NEURO-LINK] Auto-save toggled. Now =', enabled);
                Utils.showNotification(
                    enabled ? 'Auto-save enabled' : 'Auto-save disabled',
                    'info'
                );
                if (enabled) {
                    this.saveConfigToLocalStorage(); // snapshot immédiat
                }
            });
        }
    }

    initExportHandlers() {
        // Export Arduino code
        document.getElementById('export-arduino')?.addEventListener('click', () => {
            const code = this.generateArduinoCode();
            Utils.downloadFile(code, 'neuro_link_arm.ino', 'text/plain');
            Utils.showNotification('Arduino code exported', 'success');
        });

        // Export CSV
        document.getElementById('export-csv')?.addEventListener('click', () => {
            const csv = this.generateCSV();
            Utils.downloadFile(csv, 'sequence.csv', 'text/csv');
            Utils.showNotification('CSV exported', 'success');
        });

        // Export full project
        document.getElementById('export-json')?.addEventListener('click', () => {
            const configData = this.getCurrentConfigData();
            const project = {
                version: '2.1',
                config: configData,
                sequence: {
                    duration: this.sequencer.duration,
                    tracks: this.sequencer.tracks
                },
                // Compat anciennes versions
                settings: {
                    background: configData.viewer.background,
                    floor: configData.viewer.floor
                }
            };
            Utils.downloadFile(JSON.stringify(project, null, 2), 'project.json');
            Utils.showNotification('Full project exported', 'success');
        });

        // Import project
        const importArea = document.getElementById('import-project');
        const importInput = document.getElementById('import-file-input');

        importArea?.addEventListener('click', () => importInput?.click());

        importInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const project = JSON.parse(evt.target.result);
                        this.importProject(project);
                        Utils.showNotification('Project imported', 'success');
                        document.getElementById('export-modal').classList.remove('show');
                    } catch (err) {
                        console.error(err);
                        Utils.showNotification('Error importing project', 'error');
                    }
                };
                reader.readAsText(file);
            }
        });
    }

    generateArduinoCode() {
        let code = `// NEURO-LINK ARM CONTROLLER - Generated Code
#include <Servo.h>

// --- PARAMÈTRES DE VITESSE (Plus le chiffre est grand, plus c'est LENT/FLUIDE) ---
const int SPEED_HEAVY = 15;     // Base (Type: base)
const int SPEED_MEDIUM = 10;    // Joint/Wrist (Type: joint, wrist)
const int SPEED_FAST = 2;       // Pince (Type: claw)

// --- Structure pour gérer un servo de façon fluide ---
struct SmoothServo {
  Servo servo;
  int pin;
  float currentAngle;
  int targetAngle;
  int speedDelay;
  unsigned long lastMove;
  
  void attach(int p, int startAngle, int spd) {
    pin = p;
    currentAngle = startAngle;
    targetAngle = startAngle;
    speedDelay = spd;
    servo.attach(pin);
    servo.write(startAngle);
    lastMove = millis();
  }

  void setTarget(int angle) {
    targetAngle = constrain(angle, 0, 180);
  }

  void update() {
    if (millis() - lastMove >= speedDelay) {
      lastMove = millis();
      if (abs(currentAngle - targetAngle) > 0.5) {
        if (currentAngle < targetAngle) {
          currentAngle += 1.0; 
        } else {
          currentAngle -= 1.0;
        }
        servo.write((int)currentAngle);
      }
    }
  }
};

`;

        // Declare servos
        this.arm.servos.forEach(servo => {
            code += `SmoothServo servo${servo.id}; // ${servo.name}\n`;
        });

        code += `
void setup() {
  Serial.begin(9600); 

  // Initialisation : (Pin, Angle Départ, Vitesse)
`;

        // Attach servos
        this.arm.servos.forEach(servo => {
            let speed = 'SPEED_MEDIUM';
            if (servo.type === 'base') speed = 'SPEED_HEAVY';
            else if (servo.type === 'claw') speed = 'SPEED_FAST';

            const start = servo.startAngle !== undefined ? servo.startAngle : 90;
            code += `  servo${servo.id}.attach(${servo.pin}, ${start}, ${speed}); // ${servo.name}\n`;
        });

        code += `}

void loop() {
  // 1. Mise à jour physique des servos
`;
        // Update servos
        this.arm.servos.forEach(servo => {
            code += `  servo${servo.id}.update();\n`;
        });

        code += `
  // 2. Lecture des données série
  if (Serial.available() > 0) {
    String data = Serial.readStringUntil('\\n');
    int separatorIndex = data.indexOf(':');

    if (separatorIndex > 0) {
      int pin = data.substring(0, separatorIndex).toInt();
      int angle = data.substring(separatorIndex + 1).toInt();

`;
        // Map pins to servos
        let first = true;
        this.arm.servos.forEach(servo => {
            const elseStr = first ? '' : 'else ';
            code += `      ${elseStr}if (pin == ${servo.pin}) servo${servo.id}.setTarget(angle);\n`;
            first = false;
        });

        code += `    }
  }
}
`;
        return code;
    }

    generateCSV() {
        let csv = 'Time (ms)';
        this.arm.servos.forEach(servo => {
            csv += `,${servo.name}`;
        });
        csv += '\n';

        // Get all unique timestamps
        const timestamps = new Set();
        Object.values(this.sequencer.tracks).forEach(track => {
            track.forEach(kf => timestamps.add(kf.time));
        });

        const sortedTimes = Array.from(timestamps).sort((a, b) => a - b);

        sortedTimes.forEach(time => {
            csv += time;
            this.arm.servos.forEach(servo => {
                const track = this.sequencer.tracks[servo.id] || [];
                const kf = track.find(k => k.time === time);
                csv += `,${kf ? kf.value.toFixed(2) : ''}`;
            });
            csv += '\n';
        });

        return csv;
    }

    importProject(project) {
        // Nouveau format : project.config
        if (project.config) {
            this.applyConfig(project.config);
        } else if (project.servos || project.mappings) {
            // Compat ancien format direct
            this.applyConfig(project);
        }

        if (project.sequence) {
            this.sequencer.importJSON(JSON.stringify(project.sequence));
        }

        // Ancien champ "settings" (background / floor seulement)
        if (project.settings) {
            const cfg = { viewer: {} };
            if (project.settings.background) cfg.viewer.background = project.settings.background;
            if (project.settings.floor) cfg.viewer.floor = project.settings.floor;
            this.applyConfig(cfg);
        }
    }

    renderControls() {
        this.controlsList.innerHTML = '';

        this.arm.servos.forEach((servo, index) => {
            const div = document.createElement('div');
            div.className = 'track-control-item';
            div.dataset.index = index;

            div.innerHTML = `
            <div class="track-drag-handle" title="Drag to reorder">☰</div>
            <div class="track-control-info">
                <div style="display:flex; justify-content:space-between; width:100%; margin-bottom:2px;">
                    <span class="track-name" title="${servo.name}">${servo.name}</span>
                    <span class="track-value" id="val-${servo.id}">${Math.round(servo.angle)}°</span>
                </div>
                <input type="range" class="track-slider" id="slider-${servo.id}"
                       min="${servo.min}" max="${servo.max}" value="${servo.angle}">
            </div>
            <button class="track-settings-btn" title="Settings" data-id="${servo.id}">
                ⚙️
            </button>
            <button class="track-delete-btn" title="Remove Servo" data-id="${servo.id}">
                ×
            </button>
        `;

            // Slider -> mise à jour servo
            div.querySelector('.track-slider').addEventListener('input', (e) => {
                this.arm.updateServo(servo.id, parseInt(e.target.value));
            });

            // Bouton settings -> ouvre le modal servo
            div.querySelector('.track-settings-btn').addEventListener('click', () => {
                this.openServoSettings(servo.id);
            });

            // Bouton delete -> supprime le servo
            const btnDelete = div.querySelector('.track-delete-btn');
            btnDelete.addEventListener('click', () => {
                if (confirm(`Remove Servo "${servo.name}"?`)) {
                    this.arm.removeServo(servo.id);
                    Utils.showNotification('Servo removed', 'warning');
                }
            });

            // Drag & drop via le handle
            const dragHandle = div.querySelector('.track-drag-handle');
            this.setupDragAndDrop(div, dragHandle);

            this.controlsList.appendChild(div);
        });
    }

    openServoSettings(servoId) {
        const servo = this.arm.getServo(servoId);
        if (!servo) return;

        this.currentSettingsServoId = servoId;

        document.getElementById('settings-servo-name').textContent = servo.name;
        document.getElementById('settings-servo-name-input').value = servo.name;
        document.getElementById('settings-servo-pin').value = servo.pin;
        document.getElementById('settings-servo-type').value = servo.type;

        const modeSelect = document.getElementById('settings-servo-mode');
        if (modeSelect) {
            modeSelect.value = servo.mode || 'positional';
            // 🔹 claw = pince => pas de mode continuous dans l'UI
            modeSelect.disabled = (servo.type === 'claw');
        }

        document.getElementById('settings-servo-start').value = servo.startAngle || 90;
        document.getElementById('settings-servo-min').value = servo.min;
        document.getElementById('settings-servo-max').value = servo.max;

        if (this.toggleInvertServo) {
            if (servo.inverted) this.toggleInvertServo.classList.add('active');
            else this.toggleInvertServo.classList.remove('active');
        }
        const mapBtn = document.getElementById('settings-btn-map');
        const map = this.gamepad.getMapping(servoId);
        const controlStyleGroup = document.getElementById('group-control-style');
        const controlStyleSelect = document.getElementById('settings-control-style');
        const deadzoneGroup = document.getElementById('group-deadzone');
        const deadzoneInput = document.getElementById('settings-deadzone');

        if (map) {
            mapBtn.textContent = map.type === 'axis' ? `AXIS ${map.index}` : `BTN ${map.index}`;
            mapBtn.className = 'btn success';

            // Show and populate control style
            if (controlStyleGroup && controlStyleSelect) {
                controlStyleGroup.style.display = 'block';
                controlStyleSelect.value = map.controlMode || 'absolute';
                controlStyleSelect.disabled = false;
            }
            // Show and populate deadzone
            if (deadzoneGroup && deadzoneInput) {
                deadzoneGroup.style.display = 'block';
                deadzoneInput.value = map.deadzone !== undefined ? map.deadzone : 0.1;
            }
        } else {
            mapBtn.textContent = 'NO MAP';
            mapBtn.className = 'btn secondary';
            if (controlStyleGroup) controlStyleGroup.style.display = 'none';
            if (deadzoneGroup) deadzoneGroup.style.display = 'none';
        }

        mapBtn.onclick = () => {
            if (this.gamepad.isLearning) {
                this.gamepad.cancelLearning();
                mapBtn.textContent = 'NO MAP';
                mapBtn.className = 'btn secondary';
            } else {
                mapBtn.textContent = 'WAITING...';
                mapBtn.className = 'btn warning';
                this.gamepad.startLearning(servoId);
            }
        };

        document.getElementById('servo-settings-modal').classList.add('show');
    }

    saveServoSettings() {
        if (this.currentSettingsServoId === null) return;

        const type = document.getElementById('settings-servo-type').value;
        const modeSelect = document.getElementById('settings-servo-mode');
        let mode = modeSelect ? modeSelect.value : 'positional';

        // 🔹 sécurité : claw reste positional
        if (type === 'claw') {
            mode = 'positional';
        }

        const updates = {
            name: document.getElementById('settings-servo-name-input').value,
            pin: parseInt(document.getElementById('settings-servo-pin').value),
            type: type,
            mode: mode,
            startAngle: parseInt(document.getElementById('settings-servo-start').value),
            min: parseInt(document.getElementById('settings-servo-min').value),
            max: parseInt(document.getElementById('settings-servo-max').value),
            inverted: this.toggleInvertServo
                ? this.toggleInvertServo.classList.contains('active')
                : false
        };

        this.arm.updateServoConfig(this.currentSettingsServoId, updates);

        // Save Control Style and Deadzone if mapped
        const controlStyleSelect = document.getElementById('settings-control-style');
        const deadzoneInput = document.getElementById('settings-deadzone');
        if (controlStyleSelect && deadzoneInput && this.gamepad.getMapping(this.currentSettingsServoId)) {
            this.gamepad.updateMapping(this.currentSettingsServoId, {
                controlMode: controlStyleSelect.value,
                deadzone: parseFloat(deadzoneInput.value)
            });
        }

        this.closeModals();
        this.renderConfig();
    }

    closeModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
    }

    // Renvoie l'état complet (servos, mappings, display, viewer, theme...)
    getCurrentConfigData() {
        const statsPanel = document.getElementById('stats-panel');

        return {
            servos: this.arm.servos,
            mappings: this.gamepad.mappings,
            viewer: {
                background: this.visualizer ? this.visualizer.bgSettings : null,
                floor: this.visualizer ? this.visualizer.floorSettings : null,
                statsVisible: statsPanel ? statsPanel.style.display !== 'none' : false,
                performanceMode: document.body.classList.contains('performance-mode')
            },
            display: {
                timelineScale: this.timeline ? this.timeline.scale : 0.1,
                cameraFov: this.visualizer && this.visualizer.camera ? this.visualizer.camera.fov : 75,
                shadowsEnabled: this.visualizer && this.visualizer.renderer
                    ? !!this.visualizer.renderer.shadowMap.enabled
                    : false,
                antialiasing: this.visualizer && typeof this.visualizer.antialiasing !== 'undefined'
                    ? this.visualizer.antialiasing
                    : true,
                autoSave: this.autoSaveEnabled
            },
            theme: {
                bodyClass: document.body.className || ''
            }
        };
    }

    // Sauvegarde auto dans localStorage (si activée)
    saveConfigToLocalStorage() {
        console.log('[NEURO-LINK] saveConfigToLocalStorage() called. autoSaveEnabled =', this.autoSaveEnabled);

        if (!this.autoSaveEnabled) {
            console.log('[NEURO-LINK] Auto-save is disabled, skipping save.');
            return;
        }

        try {
            const configData = this.getCurrentConfigData();
            console.log('[NEURO-LINK] Saving configData =', configData);
            localStorage.setItem('neuro_link_config', JSON.stringify(configData));
            console.log('[NEURO-LINK] Config saved to localStorage under key "neuro_link_config"');
        } catch (err) {
            console.error('Error saving config to localStorage', err);
        }
    }

    // Chargement auto des paramètres depuis localStorage
    loadConfigFromLocalStorage() {
        try {
            const data = localStorage.getItem('neuro_link_config');
            console.log('[NEURO-LINK] loadConfigFromLocalStorage(): raw data =', data);

            if (!data) {
                console.log('[NEURO-LINK] No config found in localStorage, skipping.');
                return;
            }

            const config = JSON.parse(data);
            console.log('[NEURO-LINK] Parsed config =', config);

            this.applyConfig(config);
        } catch (err) {
            console.error('Error loading config from localStorage', err);
        }
    }

    // Applique une config complète (servos, mappings, settings UI...)
    applyConfig(config) {
        if (!config || typeof config !== 'object') return;

        // Servos
        if (Array.isArray(config.servos)) {
            console.log('[NEURO-LINK] Importing servos from config');
            this.arm.importConfig(JSON.stringify(config.servos));
        }

        // Mappings
        if (config.mappings) {
            console.log('[NEURO-LINK] Restoring gamepad mappings');
            this.gamepad.mappings = config.mappings;
            this.gamepad.dispatchEvent(new CustomEvent('mapping-change'));
        }

        // Theme
        if (config.theme && typeof config.theme.bodyClass === 'string') {
            document.body.className = config.theme.bodyClass;
        }

        // Viewer (background, floor, stats, performance)
        const viewer = config.viewer || {};
        if (viewer.background && this.visualizer) {
            const bg = viewer.background;
            this.visualizer.updateBackground(bg.type || 'gradient', bg.data || null);
        }
        if (viewer.floor && this.visualizer) {
            const fl = viewer.floor;
            this.visualizer.updateFloor(fl.type || 'grid', fl.data || null);
        }

        const statsPanel = document.getElementById('stats-panel');
        if (typeof viewer.statsVisible === 'boolean' && statsPanel) {
            statsPanel.style.display = viewer.statsVisible ? 'block' : 'none';
            if (this.btnStats) this.btnStats.classList.toggle('active', viewer.statsVisible);
        }

        if (typeof viewer.performanceMode === 'boolean') {
            document.body.classList.toggle('performance-mode', viewer.performanceMode);
            if (this.btnPerformance) {
                this.btnPerformance.classList.toggle('active', viewer.performanceMode);
            }
        }

        // Display settings
        const disp = config.display || {};

        if (this.timeline && typeof disp.timelineScale === 'number') {
            this.timeline.scale = disp.timelineScale;
            this.timeline.draw();
            const tsInput = document.getElementById('timeline-scale');
            if (tsInput) tsInput.value = disp.timelineScale;
        }

        if (this.visualizer && typeof disp.cameraFov === 'number') {
            this.visualizer.setCameraFOV(disp.cameraFov);
            const fovInput = document.getElementById('camera-fov');
            if (fovInput) fovInput.value = disp.cameraFov;
        }

        if (typeof disp.shadowsEnabled === 'boolean' && this.visualizer) {
            this.visualizer.enableShadows(disp.shadowsEnabled);
            const tSh = document.getElementById('toggle-shadows');
            if (tSh) tSh.classList.toggle('active', disp.shadowsEnabled);
        }

        if (typeof disp.antialiasing === 'boolean') {
            if (this.visualizer) this.visualizer.antialiasing = disp.antialiasing;
            const tAA = document.getElementById('toggle-antialiasing');
            if (tAA) tAA.classList.toggle('active', disp.antialiasing);
        }

        if (typeof disp.autoSave === 'boolean') {
            this.autoSaveEnabled = disp.autoSave;
            const tAuto = document.getElementById('toggle-autosave');
            if (tAuto) tAuto.classList.toggle('active', disp.autoSave);
            localStorage.setItem('neuro_link_autosave', disp.autoSave ? 'true' : 'false');
        }
    }

    renderConfig() {
        if (!this.configList) return;  // rien à rendre si le panneau n'existe pas

        this.configList.innerHTML = '';

        this.arm.servos.forEach((servo, index) => {
            const div = document.createElement('div');
            div.className = 'config-item';
            div.dataset.index = index;

            const map = this.gamepad.getMapping(servo.id);
            let mapText = "NO MAP", mapClass = "";

            if (map) {
                if (map.type === 'axis') mapText = `AXIS ${map.index}`;
                else if (map.type === 'button') mapText = `BTN ${map.index}`;
                mapClass = "success";
            }

            div.innerHTML = `
    <div class="config-row">
        <div class="drag-handle" title="Drag to reorder">☰</div>
        <input type="text" class="servo-name-input" value="${servo.name}">
        <button class="btn-del">×</button>
    </div>
    <div class="config-row">
        <label>PIN</label>
        <input type="number" class="servo-pin" value="${servo.pin}">
        <label>TYPE</label>
        <select class="servo-type-select">
            <option value="base" ${servo.type === 'base' ? 'selected' : ''}>Base</option>
            <option value="joint" ${servo.type === 'joint' ? 'selected' : ''}>Joint</option>
            <option value="wrist" ${servo.type === 'wrist' ? 'selected' : ''}>Wrist</option>
            <option value="claw" ${servo.type === 'claw' ? 'selected' : ''}>Claw</option>
        </select>
    </div>
    <div class="config-row">
        <label style="color:var(--primary-color); width:auto;">START</label>
        <input type="number" class="servo-start"
            value="${servo.startAngle !== undefined ? servo.startAngle : 90}">
    </div>
    <div class="config-row">
        <label>MIN</label>
        <input type="number" class="servo-min" value="${servo.min}">
        <label>MAX</label>
        <input type="number" class="servo-max" value="${servo.max}">
    </div>
    <button class="btn small btn-map ${mapClass}" style="width: 100%; margin-top:5px; border-style: dashed;">
        🎮 ${mapText}
    </button>
    `;

            // Event listeners
            const update = (key, val) => this.arm.updateServoConfig(servo.id, { [key]: val });

            div.querySelector('.servo-name-input').addEventListener('change', (e) => update('name', e.target.value));
            div.querySelector('.servo-pin').addEventListener('change', (e) => update('pin', parseInt(e.target.value)));
            div.querySelector('.servo-type-select').addEventListener('change', (e) => update('type', e.target.value));
            div.querySelector('.servo-start').addEventListener('change', (e) => update('startAngle',
                parseInt(e.target.value)));
            div.querySelector('.servo-min').addEventListener('change', (e) => update('min', parseInt(e.target.value)));
            div.querySelector('.servo-max').addEventListener('change', (e) => update('max', parseInt(e.target.value)));

            div.querySelector('.btn-del').addEventListener('click', () => {
                if (confirm(`Remove Servo "${servo.name}"?`)) {
                    this.arm.removeServo(servo.id);
                    Utils.showNotification('Servo removed', 'warning');
                }
            });

            const mapBtn = div.querySelector('.btn-map');
            mapBtn.addEventListener('click', () => {
                mapBtn.textContent = "⏳ WAITING INPUT...";
                mapBtn.className = "btn small warning";
                this.gamepad.startLearning(servo.id);
            });

            // Drag and drop via le handle
            const dragHandle = div.querySelector('.drag-handle');
            this.setupDragAndDrop(div, dragHandle);

            this.configList.appendChild(div);
        });
    }

    setupDragAndDrop(div, handle) {
        const dragElement = handle || div;
        if (!dragElement) return;

        dragElement.setAttribute('draggable', 'true');

        dragElement.addEventListener('dragstart', (e) => {
            this.dragSrcEl = div;
            e.dataTransfer.effectAllowed = 'move';
            div.classList.add('dragging');
        });

        div.addEventListener('dragover', (e) => {
            if (e.preventDefault) e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            return false;
        });

        div.addEventListener('dragenter', () => {
            div.classList.add('over');
        });

        div.addEventListener('dragleave', () => {
            div.classList.remove('over');
        });

        div.addEventListener('drop', (e) => {
            if (e.stopPropagation) e.stopPropagation();

            if (this.dragSrcEl !== div) {
                const fromIndex = parseInt(this.dragSrcEl.dataset.index);
                const toIndex = parseInt(div.dataset.index);
                this.arm.reorderServos(fromIndex, toIndex);
            }
            return false;
        });

        div.addEventListener('dragend', () => {
            div.classList.remove('dragging', 'over');
        });
    }

    renderSequencer() {
        this.btnRecord.onclick = () => this.sequencer.toggleRecording();
        this.btnPlay.onclick = () => {
            if (this.sequencer.state === 'playing') this.sequencer.pause();
            else this.sequencer.play();
        };
        this.btnStop.onclick = () => this.sequencer.stop();

        document.getElementById('btn-save-seq').onclick = () => this.saveSequence();
        document.getElementById('btn-load-seq').onclick = () => this.loadSequence();
        document.getElementById('btn-clear-seq').onclick = () => {
            if (confirm('Clear entire timeline?')) {
                this.sequencer.tracks = {};
                this.sequencer.dispatchEvent(new CustomEvent('track-change'));
                Utils.showNotification('Timeline cleared', 'warning');
            }
        };

        this.sequencer.addEventListener('state-change', (e) => {
            const s = e.detail.state;
            this.btnRecord.className = s === 'recording' ? "btn danger active" : "btn danger";
            this.btnPlay.className = s === 'playing' ? "btn success active" : "btn success";

            if (s === 'recording') {
                this.btnRecord.innerHTML = '⏺ REC';
            } else if (s === 'playing') {
                this.btnPlay.innerHTML = '⏸️ PAUSE';
            } else {
                this.btnRecord.innerHTML = '⏺ REC';
                this.btnPlay.innerHTML = '▶️ PLAY';
            }
        });
    }

    saveSequence() {
        const json = this.sequencer.exportJSON();
        Utils.downloadFile(json, 'sequence.json');
        Utils.showNotification('Sequence saved', 'success');
    }

    loadSequence() {
        Utils.loadFile((data) => {
            this.sequencer.importJSON(data);
            Utils.showNotification('Sequence loaded', 'success');
        }, '.json');
    }
}
