/**
 * poloche-3d.js - Interactive 3D T-Shirt / Poloche Showcase with Three.js
 * Features:
 * - PBR Material with normal/occlusion fabric textures from shirt_baked.glb
 * - Studio 3-point lighting + Cyan brand rim lighting
 * - Interactive 360° mouse & touch drag orbit with smooth damping & momentum
 * - Subtle floating breathing animation + gentle turntable idle spin
 * - Interactive real-time color swatches (Negro Onix, Blanco Puro, Azul KMIZ, etc.)
 * - Scroll-reactive subtle tilt and rotation
 * - Battery & GPU friendly: IntersectionObserver pauses render loop when offscreen
 * - Responsive camera framing for Desktop, Tablet, and Mobile
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

class Poloche3DViewer {
    constructor() {
        this.container = document.getElementById('premium-3d-wrapper');
        this.canvas = document.getElementById('poloche-3d-canvas');
        if (!this.container || !this.canvas) return;

        this.loaderEl = document.getElementById('poloche-3d-loader');
        this.hintEl = document.getElementById('poloche-3d-hint');
        this.colorPicker = document.getElementById('ps-color-picker');

        // State variables
        this.shirtMesh = null;
        this.shirtGroup = null;
        this.shadowMesh = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.clock = new THREE.Clock();

        this.isVisible = false;
        this.animationFrameId = null;

        // Rotation & interaction physics
        this.targetRotationY = 0;
        this.targetRotationX = 0;
        this.currentRotationY = 0;
        this.currentRotationX = 0;
        this.isDragging = false;
        this.previousPointerX = 0;
        this.previousPointerY = 0;
        this.idleTimer = 0;
        this.autoRotateSpeed = 0.004;

        // Mouse Parallax on Desktop
        this.mouseParallaxX = 0;
        this.mouseParallaxY = 0;

        // Colors
        this.targetColor = new THREE.Color('#0e131f'); // Default: Negro Onix
        this.currentColor = new THREE.Color('#0e131f');

        this.init();
    }

    init() {
        this.initThree();
        this.initLights();
        this.initShadow();
        this.loadModel();
        this.initEvents();
        this.initColorSwatches();
        this.initIntersectionObserver();
    }

    isMobile() {
        return window.innerWidth <= 768;
    }

    initThree() {
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        const fov = this.isMobile() ? 44 : 36;
        this.camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 50);
        this.updateCameraPosition();

        // Group container for shirt + animations
        this.shirtGroup = new THREE.Group();
        this.scene.add(this.shirtGroup);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
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
        // Soft universal ambient fill
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
        this.scene.add(ambientLight);

        // Key Light: Crisp white directional light from top-left front
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
        keyLight.position.set(2.5, 3.5, 3);
        this.scene.add(keyLight);

        // Fill Light: Soft slate-blue from opposite side
        const fillLight = new THREE.DirectionalLight(0x94a3b8, 1.4);
        fillLight.position.set(-3, 1.5, 2);
        this.scene.add(fillLight);

        // Brand Accent Rim Light: Cyan/Blue glow on the back & silhouette
        const rimLight = new THREE.DirectionalLight(0x38bdf8, 3.2);
        rimLight.position.set(0, 2.5, -3);
        this.scene.add(rimLight);

        // Subtle warm under-bounce
        const underLight = new THREE.DirectionalLight(0x1e293b, 0.9);
        underLight.position.set(0, -3, 1.5);
        this.scene.add(underLight);
    }

    initShadow() {
        // Soft grounding contact shadow plane
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

    loadModel() {
        const loader = new GLTFLoader();
        const modelUrl = 'assets/models/shirt_baked.glb';

        loader.load(
            modelUrl,
            (gltf) => {
                gltf.scene.traverse((child) => {
                    if (child.isMesh) {
                        this.shirtMesh = child;
                        child.geometry.center();

                        // Enhance fabric material with normal & AO maps from GLB
                        if (child.material) {
                            child.material.color = this.currentColor;
                            child.material.roughness = 0.55;
                            child.material.metalness = 0.03;
                            child.material.needsUpdate = true;
                        }
                    }
                });

                this.shirtGroup.add(gltf.scene);

                // Initial orientation: slight natural 3/4 angle
                this.targetRotationY = -0.25;
                this.currentRotationY = -0.25;

                // Hide loader with smooth fade
                if (this.loaderEl) {
                    this.loaderEl.style.opacity = '0';
                    setTimeout(() => {
                        this.loaderEl.style.display = 'none';
                    }, 400);
                }
            },
            undefined,
            (error) => {
                console.error('Error cargando modelo 3D del poloche:', error);
                if (this.loaderEl) {
                    this.loaderEl.innerHTML = '<span style="color:#94a3b8;font-size:12px;">Vista 3D disponible en modo interactivo</span>';
                }
            }
        );
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
        // Resize
        window.addEventListener('resize', () => this.onResize(), { passive: true });

        // Pointer / Touch 360° Drag
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
                // Clamp vertical tilt to natural angles (-0.35 to 0.35 rad)
                this.targetRotationX = Math.max(-0.35, Math.min(0.35, this.targetRotationX + deltaY * 0.005));

                this.previousPointerX = clientX;
                this.previousPointerY = clientY;
                this.idleTimer = 0;
            } else if (!this.isMobile()) {
                // Subtle desktop mouse parallax
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

        // Mouse Events
        el.addEventListener('mousedown', (e) => onPointerDown(e.clientX, e.clientY));
        window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', onPointerUp);

        // Touch Events
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

        // Subtle scroll influence on rotation when not dragging
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

        // 1. Color Lerp: Smooth color transitions when clicking swatches
        if (this.shirtMesh && this.shirtMesh.material) {
            this.currentColor.lerp(this.targetColor, 0.1);
            this.shirtMesh.material.color.copy(this.currentColor);
        }

        // 2. Turntable Rotation logic
        if (!this.isDragging) {
            this.idleTimer += delta;
            if (this.idleTimer > 2.0) {
                // Resume gentle turntable rotation after 2 seconds of inactivity
                this.targetRotationY += this.autoRotateSpeed;
            }
        }

        // Damped easing towards target angles
        this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.08;
        this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.08;

        if (this.shirtGroup) {
            // Apply rotation with parallax and scroll additions
            const finalRotY = this.currentRotationY + (this.scrollRotationY || 0) + this.mouseParallaxX;
            const finalRotX = this.currentRotationX + this.mouseParallaxY;

            this.shirtGroup.rotation.y = finalRotY;
            this.shirtGroup.rotation.x = finalRotX;

            // 3. Floating / Breathing motion on Y axis
            const hoverY = Math.sin(time * 1.8) * 0.022;
            this.shirtGroup.position.y = hoverY;

            // Subtle shadow breathing
            if (this.shadowMesh) {
                const shadowScale = 1 - hoverY * 3.5;
                this.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
                this.shadowMesh.material.opacity = 0.65 - hoverY * 2.0;
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new Poloche3DViewer());
} else {
    new Poloche3DViewer();
}
