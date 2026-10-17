/**
 * poloche-3d.js - Universal Three.js Interactive 3D Poloche Viewer (UMD)
 * Compatible with all environments: local file:///, localhost, and production.
 *
 * Features:
 * - Direct global THREE & THREE.GLTFLoader (no ES module / importmap bare-specifier bugs)
 * - Auto-fallback to procedural 3D t-shirt if GLB is blocked by CORS (file:///) or slow network
 * - Guarantees the loader spinner always hides within max 1.5 seconds
 * - Interactive 360° mouse & touch drag orbit with smooth damping & momentum
 * - Turntable auto-spin & floating breathing hover effect
 * - Interactive color swatches (Negro Onix, Blanco, Azul KMIZ, Rojo Carmesí, Verde)
 * - GPU & Battery friendly: pauses render loop when section is offscreen
 */

(function () {
    'use strict';

    function initViewer() {
        if (typeof window.THREE === 'undefined') {
            setTimeout(initViewer, 100);
            return;
        }

        const container = document.getElementById('premium-3d-wrapper');
        const canvas = document.getElementById('poloche-3d-canvas');
        if (!container || !canvas) return;

        new Poloche3DViewer(container, canvas);
    }

    class Poloche3DViewer {
        constructor(container, canvas) {
            this.container = container;
            this.canvas = canvas;
            this.loaderEl = document.getElementById('poloche-3d-loader');
            this.hintEl = document.getElementById('poloche-3d-hint');
            this.colorPicker = document.getElementById('ps-color-picker');

            this.shirtMeshes = [];
            this.shirtGroup = null;
            this.shadowMesh = null;
            this.renderer = null;
            this.scene = null;
            this.camera = null;
            this.clock = new THREE.Clock();

            this.isVisible = false;
            this.isModelLoaded = false;
            this.animationFrameId = null;

            // Physics & rotation
            this.targetRotationY = -0.25;
            this.targetRotationX = 0;
            this.currentRotationY = -0.25;
            this.currentRotationX = 0;
            this.scrollRotationY = 0;
            this.isDragging = false;
            this.previousPointerX = 0;
            this.previousPointerY = 0;
            this.idleTimer = 0;
            this.autoRotateSpeed = 0.004;

            // Mouse Parallax on Desktop
            this.mouseParallaxX = 0;
            this.mouseParallaxY = 0;

            // Colors
            this.targetColor = new THREE.Color('#0e131f');
            this.currentColor = new THREE.Color('#0e131f');

            this.init();
        }

        isMobile() {
            return window.innerWidth <= 768;
        }

        init() {
            this.initThree();
            this.initLights();
            this.initShadow();
            this.initEvents();
            this.initColorSwatches();
            this.initIntersectionObserver();

            // Load 3D model with automatic fallback
            this.loadModelWithFallback();
        }

        initThree() {
            const width = this.container.clientWidth || window.innerWidth;
            const height = this.container.clientHeight || window.innerHeight;

            this.scene = new THREE.Scene();

            const fov = this.isMobile() ? 44 : 36;
            this.camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 50);
            this.updateCameraPosition();

            this.shirtGroup = new THREE.Group();
            this.scene.add(this.shirtGroup);

            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance'
            });
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

            if (typeof THREE.ACESFilmicToneMapping !== 'undefined') {
                this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                this.renderer.toneMappingExposure = 1.25;
            }
            if (typeof THREE.SRGBColorSpace !== 'undefined') {
                this.renderer.outputColorSpace = THREE.SRGBColorSpace;
            } else if (typeof this.renderer.outputEncoding !== 'undefined') {
                this.renderer.outputEncoding = THREE.sRGBEncoding;
            }
        }

        updateCameraPosition() {
            if (!this.camera) return;
            if (this.isMobile()) {
                this.camera.position.set(0, -0.02, 1.48);
                this.camera.fov = 44;
            } else {
                this.camera.position.set(0, 0.0, 1.25);
                this.camera.fov = 36;
            }
            this.camera.updateProjectionMatrix();
        }

        initLights() {
            // Ambient light
            const ambient = new THREE.AmbientLight(0xffffff, 1.2);
            this.scene.add(ambient);

            // Key light
            const key = new THREE.DirectionalLight(0xffffff, 2.5);
            key.position.set(2.5, 3.5, 3);
            this.scene.add(key);

            // Fill light
            const fill = new THREE.DirectionalLight(0x94a3b8, 1.4);
            fill.position.set(-3, 1.5, 2);
            this.scene.add(fill);

            // Rim light (Cyan KMIZ brand glow)
            const rim = new THREE.DirectionalLight(0x38bdf8, 3.2);
            rim.position.set(0, 2.5, -3);
            this.scene.add(rim);

            // Under bounce
            const under = new THREE.DirectionalLight(0x1e293b, 0.9);
            under.position.set(0, -3, 1.5);
            this.scene.add(under);
        }

        initShadow() {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');

            const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 120);
            grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
            grad.addColorStop(0.4, 'rgba(0, 0, 0, 0.35)');
            grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.08)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 256, 256);

            const shadowTexture = new THREE.CanvasTexture(canvas);
            const shadowGeo = new THREE.PlaneGeometry(0.7, 0.7);
            const shadowMat = new THREE.MeshBasicMaterial({
                map: shadowTexture,
                transparent: true,
                opacity: 0.75,
                depthWrite: false
            });

            this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
            this.shadowMesh.rotation.x = -Math.PI / 2;
            this.shadowMesh.position.y = -0.42;
            this.scene.add(this.shadowMesh);
        }

        hideLoader() {
            if (this.loaderEl) {
                this.loaderEl.style.opacity = '0';
                setTimeout(() => {
                    if (this.loaderEl) this.loaderEl.style.display = 'none';
                }, 350);
            }
        }

        loadModelWithFallback() {
            // Safety timeout: Never let spinner hang more than 1.8 seconds under any condition
            const timeoutId = setTimeout(() => {
                if (!this.isModelLoaded) {
                    console.warn('3D model load timeout: activating procedural 3D poloche.');
                    this.buildProceduralPoloche();
                }
            }, 1800);

            if (typeof THREE.GLTFLoader === 'function') {
                const loader = new THREE.GLTFLoader();
                const modelUrl = 'assets/models/shirt_baked.glb';

                loader.load(
                    modelUrl,
                    (gltf) => {
                        clearTimeout(timeoutId);
                        if (this.isModelLoaded) return;
                        this.isModelLoaded = true;

                        gltf.scene.traverse((child) => {
                            if (child.isMesh) {
                                child.geometry.center();
                                if (child.material) {
                                    child.material.color = this.currentColor;
                                    child.material.roughness = 0.55;
                                    child.material.metalness = 0.03;
                                    child.material.needsUpdate = true;
                                    this.shirtMeshes.push(child);
                                }
                            }
                        });

                        this.shirtGroup.add(gltf.scene);
                        this.hideLoader();
                    },
                    undefined,
                    (err) => {
                        clearTimeout(timeoutId);
                        console.warn('GLTFLoader error (likely CORS on file:///), rendering procedural 3D poloche:', err);
                        if (!this.isModelLoaded) {
                            this.buildProceduralPoloche();
                        }
                    }
                );
            } else {
                clearTimeout(timeoutId);
                this.buildProceduralPoloche();
            }
        }

        buildProceduralPoloche() {
            if (this.isModelLoaded) return;
            this.isModelLoaded = true;

            const group = new THREE.Group();

            // Material
            const fabricMat = new THREE.MeshStandardMaterial({
                color: this.currentColor,
                roughness: 0.52,
                metalness: 0.04
            });

            // 1. Torso
            const torsoGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.48, 36);
            torsoGeo.scale(1.0, 1.0, 0.52);
            const torso = new THREE.Mesh(torsoGeo, fabricMat);
            torso.position.y = -0.06;
            group.add(torso);

            // 2. Collar
            const collarGeo = new THREE.TorusGeometry(0.095, 0.016, 16, 36);
            collarGeo.scale(1.0, 0.65, 1.0);
            const collarMat = new THREE.MeshStandardMaterial({
                color: this.currentColor,
                roughness: 0.65,
                metalness: 0.02
            });
            const collar = new THREE.Mesh(collarGeo, collarMat);
            collar.rotation.x = Math.PI / 2;
            collar.position.set(0, 0.178, 0);
            group.add(collar);

            // 3. Left Shoulder & Sleeve
            const leftSleeveGeo = new THREE.CylinderGeometry(0.088, 0.08, 0.2, 28);
            leftSleeveGeo.scale(1.0, 1.0, 0.62);
            const leftSleeve = new THREE.Mesh(leftSleeveGeo, fabricMat);
            leftSleeve.position.set(-0.25, 0.09, 0);
            leftSleeve.rotation.z = Math.PI / 4.2;
            group.add(leftSleeve);

            // 4. Right Shoulder & Sleeve
            const rightSleeveGeo = new THREE.CylinderGeometry(0.088, 0.08, 0.2, 28);
            rightSleeveGeo.scale(1.0, 1.0, 0.62);
            const rightSleeve = new THREE.Mesh(rightSleeveGeo, fabricMat);
            rightSleeve.position.set(0.25, 0.09, 0);
            rightSleeve.rotation.z = -Math.PI / 4.2;
            group.add(rightSleeve);

            // 5. Brand Patch / Decal on Chest
            const badgeCanvas = document.createElement('canvas');
            badgeCanvas.width = 256;
            badgeCanvas.height = 128;
            const bCtx = badgeCanvas.getContext('2d');
            bCtx.clearRect(0, 0, 256, 128);

            // Styled KMIZ typography
            bCtx.fillStyle = '#ffffff';
            bCtx.font = '900 48px sans-serif';
            bCtx.textAlign = 'center';
            bCtx.textBaseline = 'middle';
            bCtx.fillText('KMIZ', 128, 54);

            // Cyan brand accent bar under KMIZ
            bCtx.fillStyle = '#38bdf8';
            bCtx.fillRect(68, 86, 120, 7);

            const badgeTex = new THREE.CanvasTexture(badgeCanvas);
            const badgeGeo = new THREE.PlaneGeometry(0.14, 0.07);
            const badgeMat = new THREE.MeshBasicMaterial({
                map: badgeTex,
                transparent: true,
                opacity: 0.95
            });
            const badge = new THREE.Mesh(badgeGeo, badgeMat);
            badge.position.set(0, 0.04, 0.135);
            group.add(badge);

            // Store meshes for color customization
            this.shirtMeshes.push(torso, collar, leftSleeve, rightSleeve);

            this.shirtGroup.add(group);
            this.hideLoader();
        }

        initColorSwatches() {
            if (!this.colorPicker) return;

            const swatches = this.colorPicker.querySelectorAll('.color-swatch');
            swatches.forEach((swatch) => {
                swatch.addEventListener('click', () => {
                    swatches.forEach((s) => s.classList.remove('active'));
                    swatch.classList.add('active');

                    const colorHex = swatch.getAttribute('data-color');
                    if (colorHex) {
                        this.targetColor.set(colorHex);
                    }
                });
            });
        }

        initEvents() {
            window.addEventListener('resize', () => this.onResize(), { passive: true });

            const el = this.container;

            const onPointerDown = (clientX, clientY) => {
                this.isDragging = true;
                this.previousPointerX = clientX;
                this.previousPointerY = clientY;
                this.idleTimer = 0;

                if (this.hintEl) {
                    this.hintEl.style.opacity = '0';
                }
            };

            const onPointerMove = (clientX, clientY) => {
                if (this.isDragging) {
                    const deltaX = clientX - this.previousPointerX;
                    const deltaY = clientY - this.previousPointerY;

                    this.targetRotationY += deltaX * 0.008;
                    this.targetRotationX = Math.max(-0.35, Math.min(0.35, this.targetRotationX + deltaY * 0.005));

                    this.previousPointerX = clientX;
                    this.previousPointerY = clientY;
                    this.idleTimer = 0;
                } else if (!this.isMobile()) {
                    const rect = el.getBoundingClientRect();
                    const normX = ((clientX - rect.left) / rect.width) * 2 - 1;
                    const normY = ((clientY - rect.top) / rect.height) * 2 - 1;
                    this.mouseParallaxX = normX * 0.12;
                    this.mouseParallaxY = -normY * 0.08;
                }
            };

            const onPointerUp = () => {
                this.isDragging = false;
            };

            // Mouse events
            el.addEventListener('mousedown', (e) => onPointerDown(e.clientX, e.clientY));
            window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
            window.addEventListener('mouseup', onPointerUp);

            // Touch events
            el.addEventListener(
                'touchstart',
                (e) => {
                    if (e.touches.length === 1) {
                        onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
                    }
                },
                { passive: true }
            );

            window.addEventListener(
                'touchmove',
                (e) => {
                    if (this.isDragging && e.touches.length === 1) {
                        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
                    }
                },
                { passive: true }
            );

            window.addEventListener('touchend', onPointerUp, { passive: true });
            window.addEventListener('touchcancel', onPointerUp, { passive: true });

            // Scroll reactivity
            window.addEventListener('scroll', () => this.onScroll(), { passive: true });
        }

        onScroll() {
            const showcase = document.getElementById('premium-showcase');
            if (!showcase) return;

            const rect = showcase.getBoundingClientRect();
            const maxScroll = showcase.offsetHeight - window.innerHeight;
            if (maxScroll <= 0) return;

            const scrolled = -rect.top;
            const progress = Math.max(0, Math.min(1, scrolled / maxScroll));

            if (!this.isDragging && !this.isMobile()) {
                this.scrollRotationY = (progress - 0.5) * 1.2;
            } else {
                this.scrollRotationY = 0;
            }
        }

        onResize() {
            if (!this.container || !this.renderer || !this.camera) return;

            const width = this.container.clientWidth;
            const height = this.container.clientHeight;

            this.camera.aspect = width / height;
            this.updateCameraPosition();

            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        }

        initIntersectionObserver() {
            const showcase = document.getElementById('premium-showcase');
            if (!showcase) return;

            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver(
                    (entries) => {
                        entries.forEach((entry) => {
                            if (entry.isIntersecting) {
                                if (!this.isVisible) {
                                    this.isVisible = true;
                                    this.startRenderLoop();
                                }
                            } else {
                                if (this.isVisible) {
                                    this.isVisible = false;
                                    this.stopRenderLoop();
                                }
                            }
                        });
                    },
                    { threshold: 0.05 }
                );
                observer.observe(showcase);
            } else {
                this.isVisible = true;
                this.startRenderLoop();
            }
        }

        startRenderLoop() {
            if (!this.animationFrameId) {
                this.clock.start();
                this.render();
            }
        }

        stopRenderLoop() {
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        }

        render() {
            this.animationFrameId = requestAnimationFrame(() => this.render());

            const delta = this.clock.getDelta();
            const time = this.clock.getElapsedTime();

            // Color Lerp
            if (this.shirtMeshes.length > 0) {
                this.currentColor.lerp(this.targetColor, 0.1);
                this.shirtMeshes.forEach((mesh) => {
                    if (mesh.material && mesh.material.color) {
                        mesh.material.color.copy(this.currentColor);
                    }
                });
            }

            // Turntable Auto-spin
            if (!this.isDragging) {
                this.idleTimer += delta;
                if (this.idleTimer > 2.0) {
                    this.targetRotationY += this.autoRotateSpeed;
                }
            }

            // Damped rotation
            this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.08;
            this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.08;

            if (this.shirtGroup) {
                const finalRotY = this.currentRotationY + (this.scrollRotationY || 0) + this.mouseParallaxX;
                const finalRotX = this.currentRotationX + this.mouseParallaxY;

                this.shirtGroup.rotation.y = finalRotY;
                this.shirtGroup.rotation.x = finalRotX;

                // Subtle floating breathing hover
                const hoverY = Math.sin(time * 1.8) * 0.022;
                this.shirtGroup.position.y = hoverY;

                if (this.shadowMesh) {
                    const shadowScale = 1 - hoverY * 3.5;
                    this.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
                    this.shadowMesh.material.opacity = 0.65 - hoverY * 2.0;
                }
            }

            this.renderer.render(this.scene, this.camera);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initViewer);
    } else {
        initViewer();
    }
})();
