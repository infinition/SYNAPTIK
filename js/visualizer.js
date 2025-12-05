// ==========================================
// 5. VISUALIZER
// ==========================================
class Visualizer {
    constructor(containerId, armController) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        this.arm = armController;

        this.scene = new THREE.Scene();
        this.bgSettings = { type: 'gradient', data: null };
        this.floorSettings = { type: 'grid', data: null };

        // Performance tracking
        this.frameCount = 0;
        this.lastTime = Date.now();
        this.lastUpdateTime = Date.now(); // pour le delta
        this.fps = 60;

        // AA persistant
        this.antialiasing = true;

        this.updateBackground();

        const rect = this.container.getBoundingClientRect();
        this.camera = new THREE.PerspectiveCamera(75, rect.width / rect.height, 0.1, 1000);
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 5, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: this.antialiasing, alpha: false });
        this.renderer.setSize(rect.width, rect.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = false; // Can be toggled
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(0, 5, 0);

        this.setupLighting();
        this.updateFloor();

        this.joints = [];
        this.armRoot = null;
        this.clawFingers = null;
        this.customMeshes = {}; // Store custom loaded meshes

        this.arm.addEventListener('servo-update', (e) => this.updateJoints(e.detail));
        this.arm.addEventListener('config-change', () => this.buildArm());
        window.addEventListener('resize', () => this.onWindowResize(), false);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.setupInteraction();

        this.buildArm();
    }

    setupLighting() {
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2.0);
        this.hemiLight.position.set(0, 20, 0);
        this.scene.add(this.hemiLight);

        this.pointLight = new THREE.PointLight(0x00f3ff, 3, 100);
        this.pointLight.position.set(10, 20, 10);
        this.scene.add(this.pointLight);

        this.pointLight2 = new THREE.PointLight(0xbc13fe, 2.5, 100);
        this.pointLight2.position.set(-10, 10, -10);
        this.scene.add(this.pointLight2);
    }

    updateBackground(type = 'gradient', data = null) {
        this.bgSettings = { type, data };

        if (type === 'solid') {
            this.scene.background = new THREE.Color(data || 0x050505);
            this.scene.fog = null;
        } else if (type === 'gradient') {
            this.scene.background = new THREE.Color(0x151515);
            this.scene.fog = new THREE.FogExp2(0x151515, 0.02);
        } else if (type === 'image' && data) {
            const loader = new THREE.TextureLoader();
            loader.load(data, (texture) => {
                this.scene.background = texture;
                this.scene.fog = null;
            });
        } else if (type === 'space') {
            this.scene.background = new THREE.Color(0x000000);
            this.scene.fog = null;
        } else if (type === 'cyberpunk') {
            this.scene.background = new THREE.Color(0x0a0015);
            this.scene.fog = new THREE.FogExp2(0x0a0015, 0.03);
        }
    }

    updateFloor(type = 'grid', data = null) {
        if (this.floor) {
            this.scene.remove(this.floor);
            this.floor = null;
        }

        this.floorSettings = { type, data };

        if (type === 'grid') {
            this.floor = new THREE.GridHelper(50, 50, 0x333333, 0x111111);
            this.scene.add(this.floor);
        } else if (type === 'plane') {
            const geometry = new THREE.PlaneGeometry(50, 50);
            const material = new THREE.MeshStandardMaterial({
                color: 0x333333,
                roughness: 0.8,
                metalness: 0.2
            });
            this.floor = new THREE.Mesh(geometry, material);
            this.floor.rotation.x = -Math.PI / 2;
            this.floor.receiveShadow = true;
            this.scene.add(this.floor);
        } else if (type === 'mirror') {
            const geometry = new THREE.PlaneGeometry(50, 50);
            const material = new THREE.MeshStandardMaterial({
                color: 0x000000,
                roughness: 0.1,
                metalness: 0.9
            });
            this.floor = new THREE.Mesh(geometry, material);
            this.floor.rotation.x = -Math.PI / 2;
            this.floor.receiveShadow = true;
            this.scene.add(this.floor);
        } else if (type === 'none') {
            // No floor
        }
    }

    resetCamera() {
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 5, 0);
        this.controls.target.set(0, 5, 0);
        this.controls.update();
    }

    buildArm() {
        if (this.armRoot) { this.scene.remove(this.armRoot); this.armRoot = null; }
        this.joints = [];
        this.clawFingers = null;
        this.armRoot = new THREE.Group();
        this.scene.add(this.armRoot);

        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.4,
            metalness: 0.6
        });
        const baseGeo = new THREE.CylinderGeometry(4, 5, 2, 32);
        const baseMesh = new THREE.Mesh(baseGeo, baseMaterial);
        baseMesh.position.y = 1;
        this.armRoot.add(baseMesh);

        let parent = this.armRoot;
        let currentY = 2;

        this.arm.servos.forEach((servo) => {
            const jointGroup = new THREE.Group();
            jointGroup.position.y = currentY;
            parent.add(jointGroup);

            let axis = 'x';
            if (servo.type === 'base') axis = 'y';
            else if (servo.type === 'wrist') axis = 'z';

            this.joints.push({
                id: servo.id,
                mesh: jointGroup,
                axis: axis,
                type: servo.type,
                servo: servo
            });

            const color = new THREE.Color(servo.color || '#222222');
            const segMaterial = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.2,
                metalness: 0.8
            });
            const jointColorMat = new THREE.MeshStandardMaterial({
                color: 0x00f3ff,
                emissive: 0x00f3ff,
                emissiveIntensity: 0.2
            });

            if (servo.meshData) {
                // Custom mesh - simplified for now
                const mesh = this.createMeshForType(servo.type, segMaterial, jointColorMat);
                jointGroup.add(mesh);
            } else {
                this.createDefaultMesh(servo, jointGroup, segMaterial, jointColorMat);
            }

            if (servo.type === 'base') {
                currentY = 2;
                parent = jointGroup;
            } else if (servo.type === 'joint') {
                currentY = 8;
                parent = jointGroup;
            } else if (servo.type === 'wrist') {
                currentY = 3;
                parent = jointGroup;
            } else if (servo.type === 'claw') {
                currentY = 0;
                parent = jointGroup;
            }
        });

        this.updateJoints();
    }

    createDefaultMesh(servo, jointGroup, segMaterial, jointColorMat) {
        if (servo.type === 'base') {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 4), segMaterial);
            mesh.position.y = 1;
            mesh.userData = { servoId: servo.id };
            jointGroup.add(mesh);
        } else if (servo.type === 'joint') {
            const pivot = new THREE.Mesh(
                new THREE.CylinderGeometry(1.2, 1.2, 5, 16).rotateZ(Math.PI / 2),
                jointColorMat
            );
            pivot.userData = { servoId: servo.id };
            jointGroup.add(pivot);

            const length = 8;
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, length, 2), segMaterial);
            mesh.position.y = length / 2;
            mesh.userData = { servoId: servo.id };
            jointGroup.add(mesh);
        } else if (servo.type === 'wrist') {
            const wristBase = new THREE.Mesh(
                new THREE.CylinderGeometry(1.5, 1.5, 3, 16),
                jointColorMat
            );
            wristBase.userData = { servoId: servo.id };
            jointGroup.add(wristBase);

            const wristSupport = new THREE.Mesh(
                new THREE.BoxGeometry(3, 1.5, 2),
                segMaterial
            );
            wristSupport.position.y = 2;
            wristSupport.userData = { servoId: servo.id };
            jointGroup.add(wristSupport);
        } else if (servo.type === 'claw') {
            const clawBase = new THREE.Mesh(
                new THREE.BoxGeometry(3, 1, 2),
                jointColorMat
            );
            clawBase.userData = { servoId: servo.id };
            jointGroup.add(clawBase);

            const fingerMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(servo.color),
                roughness: 0.3,
                metalness: 0.7
            });

            const clawL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4, 0.6), fingerMat);
            clawL.position.set(-1.5, 2, 0);
            clawL.userData = { servoId: servo.id };
            jointGroup.add(clawL);

            const clawR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4, 0.6), fingerMat);
            clawR.position.set(1.5, 2, 0);
            clawR.userData = { servoId: servo.id };
            jointGroup.add(clawR);

            this.clawFingers = { servoId: servo.id, left: clawL, right: clawR };
        }
    }

    async loadCustomMesh(servo, jointGroup, segMaterial, file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                let geometry;

                if (file.name.endsWith('.obj')) {
                    geometry = SimpleOBJLoader.parse(e.target.result);
                } else {
                    Utils.showNotification('Format not supported yet', 'error');
                    return;
                }

                // Center and scale the geometry
                geometry.computeBoundingBox();
                const box = geometry.boundingBox;
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 5 / maxDim; // Normalize to roughly 5 units

                geometry.translate(-center.x, -center.y, -center.z);
                geometry.scale(scale, scale, scale);

                const mesh = new THREE.Mesh(geometry, segMaterial || new THREE.MeshStandardMaterial({ color: 0xffffff }));
                mesh.userData = { servoId: servo.id, customMesh: true };
                if (jointGroup) {
                    jointGroup.add(mesh);
                }
                this.customMeshes[servo.id] = { geometry, file: file.name };
                Utils.showNotification(`Mesh loaded: ${file.name}`, 'success');

            } catch (err) {
                console.error(err);
                Utils.showNotification('Error loading mesh', 'error');
            }
        };

        if (file.name.endsWith('.obj')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    }

    createMeshForType(type, segMaterial, jointColorMat) {
        // Simplified - would load actual mesh data
        if (type === 'base') {
            return new THREE.Mesh(new THREE.BoxGeometry(4, 2, 4), segMaterial);
        } else if (type === 'joint') {
            return new THREE.Mesh(new THREE.BoxGeometry(2, 8, 2), segMaterial);
        } else {
            return new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), segMaterial);
        }
    }

    updateJoints(detail) {
        if (detail) {
            const servo = this.arm.getServo(detail.id);
            const joint = this.joints.find(j => j.id === detail.id);
            if (joint && servo) this.applyServoRotation(joint, servo);
        } else {
            this.arm.servos.forEach((servo) => {
                const joint = this.joints.find(j => j.id === servo.id);
                if (joint) this.applyServoRotation(joint, servo);
            });
        }
    }

    applyServoRotation(joint, servo) {
        // continuous : rotation gérée dans update()
        // claw : reste une pince => on applique toujours la cinématique de pince
        if (servo.mode === 'continuous' && servo.type !== 'claw') {
            return;
        }

        const rad = THREE.MathUtils.degToRad(servo.angle - 90);

        if (joint.type === 'base') {
            joint.mesh.rotation.y = -rad;
        } else if (joint.type === 'joint') {
            joint.mesh.rotation.x = rad;
        } else if (joint.type === 'wrist') {
            joint.mesh.rotation.z = rad;
        } else if (joint.type === 'claw') {
            if (this.clawFingers && this.clawFingers.servoId === servo.id) {
                const range = servo.max - servo.min;
                const normalized = (servo.angle - servo.min) / range;
                const distance = 0.3 + (normalized * 2.2);

                this.clawFingers.left.position.x = -distance;
                this.clawFingers.right.position.x = distance;

                const rotationAngle = (1 - normalized) * 0.2;
                this.clawFingers.left.rotation.z = rotationAngle;
                this.clawFingers.right.rotation.z = -rotationAngle;
            }
        }
    }

    onWindowResize() {
        const rect = this.container.getBoundingClientRect();
        this.camera.aspect = rect.width / rect.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(rect.width, rect.height);
    }

    setupInteraction() {
        // Color picker
        this.colorPicker = document.createElement('input');
        this.colorPicker.type = 'color';
        this.colorPicker.style.position = 'absolute';
        this.colorPicker.style.visibility = 'hidden';
        this.colorPicker.style.zIndex = '1000';
        document.body.appendChild(this.colorPicker);
        this.selectedServoId = null;

        this.colorPicker.addEventListener('input', (event) => {
            if (this.selectedServoId !== null) {
                this.arm.setServoColor(this.selectedServoId, event.target.value);
                this.buildArm();
            }
        });

        // Double click for color
        this.renderer.domElement.addEventListener('dblclick', (e) => this.onDoubleClick(e));

        // Right click for mesh settings
        this.renderer.domElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.onRightClick(e);
        });
    }

    onDoubleClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        this.colorPicker.style.left = `${event.clientX}px`;
        this.colorPicker.style.top = `${event.clientY}px`;

        const intersects = this.raycaster.intersectObjects(this.armRoot.children, true);
        if (intersects.length > 0) {
            let curr = intersects[0].object;
            let foundJoint = null;

            while (curr && curr !== this.armRoot) {
                const joint = this.joints.find(j => j.mesh === curr);
                if (joint) { foundJoint = joint; break; }
                curr = curr.parent;
            }

            if (foundJoint) {
                this.selectedServoId = foundJoint.id;
                const servo = this.arm.getServo(foundJoint.id);
                this.colorPicker.value = servo.color || '#222222';
                this.colorPicker.click();
            }
        }
    }

    onRightClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.armRoot.children, true);

        if (intersects.length > 0) {
            let curr = intersects[0].object;
            let foundJoint = null;

            while (curr && curr !== this.armRoot) {
                const joint = this.joints.find(j => j.mesh === curr);
                if (joint) { foundJoint = joint; break; }
                curr = curr.parent;
            }

            if (foundJoint) {
                window.app.ui.showMeshModal(foundJoint.id);
            }
        }
    }

    update() {
        this.controls.update();

        const now = Date.now();
        const delta = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

        // 🔄 rotation continue pour les servos "continuous"
        this.joints.forEach(joint => {
            const servo = joint.servo;
            if (!servo) return;

            // claw reste une pince
            if (servo.type === 'claw') return;
            if (servo.mode !== 'continuous') return;

            const speedNorm = (servo.angle - 90) / 90; // -1..1
            if (Math.abs(speedNorm) < 0.02) return; // deadzone

            const rotSpeed = speedNorm * Math.PI; // rad/s
            if (joint.type === 'base') joint.mesh.rotation.y += rotSpeed * delta;
            else if (joint.type === 'joint') joint.mesh.rotation.x += rotSpeed * delta;
            else if (joint.type === 'wrist') joint.mesh.rotation.z += rotSpeed * delta;
        });

        this.renderer.render(this.scene, this.camera);

        // FPS
        this.frameCount++;
        if (now - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = now;
            const fpsEl = document.getElementById('fps-counter');
            if (fpsEl) fpsEl.textContent = this.fps;
        }
    }

    enableShadows(enable) {
        this.renderer.shadowMap.enabled = enable;
        if (enable) {
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.pointLight.castShadow = true;
            this.pointLight2.castShadow = true;
        }
    }

    setCameraFOV(fov) {
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
    }
}
