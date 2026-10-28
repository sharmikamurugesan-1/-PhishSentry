import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Shield, Sparkles, Move3d, RotateCcw } from 'lucide-react';

export default function HeroSecurity3D() {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [interactiveMode, setInteractiveMode] = useState(false);
  const [activeTab, setActiveTab] = useState('auto'); // 'auto' | 'interactive'
  const isInteractingRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Detect user preferences for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x1B130E, 0.12);

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 420;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 5.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI / 2 + 0.25;
    controls.minPolarAngle = Math.PI / 2 - 0.45;
    controls.maxAzimuthAngle = Math.PI / 4;
    controls.minAzimuthAngle = -Math.PI / 4;
    controls.enabled = false;

    // 3. Lighting System (Matching reference artwork)
    // Warm Key Light (Top-Right Golden Sun)
    const keyLight = new THREE.DirectionalLight(0xF5B86B, 3.2);
    keyLight.position.set(4, 5, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Cyan/Cool Rim Light (Silhouette backlight from Left)
    const rimLight = new THREE.DirectionalLight(0xA7F3D0, 2.6);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    // Soft Ambient Fill
    const ambientLight = new THREE.AmbientLight(0x2E1E14, 1.8);
    scene.add(ambientLight);

    // Internal Core Glow Point Light
    const corePointLight = new THREE.PointLight(0xF59E0B, 3.0, 6);
    corePointLight.position.set(0, 0.1, 0.5);
    scene.add(corePointLight);

    // 4. Background Security Particle Aura
    const particleCount = prefersReducedMotion ? 120 : 380;
    const pGeometry = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);
    const pScales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      pPositions[idx] = (Math.random() - 0.5) * 8;
      pPositions[idx + 1] = (Math.random() - 0.5) * 5;
      pPositions[idx + 2] = (Math.random() - 0.5) * 4;
      pScales[i] = Math.random() * 0.03 + 0.015;
    }

    pGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));

    // Particle Material
    const pMaterial = new THREE.PointsMaterial({
      color: 0xE8A854,
      size: 0.045,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(pGeometry, pMaterial);
    scene.add(particles);

    // 5. Flowing Energy Ribbon (Dynamic Particle Wave)
    const curvePoints = [];
    for (let i = -30; i <= 30; i++) {
      const t = i / 30;
      curvePoints.push(
        new THREE.Vector3(
          t * 3.2,
          Math.sin(t * Math.PI * 2) * 0.45 - 0.1,
          Math.cos(t * Math.PI * 1.5) * 0.8 - 0.3
        )
      );
    }
    const waveCurve = new THREE.CatmullRomCurve3(curvePoints);
    const waveGeo = new THREE.TubeGeometry(waveCurve, 64, 0.025, 8, false);
    const waveMat = new THREE.MeshStandardMaterial({
      color: 0xE5A93C,
      emissive: 0xB45309,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const waveMesh = new THREE.Mesh(waveGeo, waveMat);
    scene.add(waveMesh);

    // 6. Load GLTF 3D Asset
    let modelRoot = new THREE.Group();
    scene.add(modelRoot);

    const loader = new GLTFLoader();
    loader.load(
      '/models/phishshift_scene.glb',
      (gltf) => {
        const loadedScene = gltf.scene;

        // Traverse and enhance materials with physical transmission & PBR sheen
        loadedScene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            const name = child.name || '';
            if (name.includes('Shield')) {
              // Glass-like physical shield with metallic gold rim
              child.material = new THREE.MeshPhysicalMaterial({
                color: 0xD99B43,
                emissive: 0x451A03,
                emissiveIntensity: 0.3,
                roughness: 0.22,
                metalness: 0.45,
                clearcoat: 1.0,
                clearcoatRoughness: 0.15,
                transmission: 0.45,
                ior: 1.52,
                transparent: true,
                opacity: 0.95,
              });
            } else if (name.includes('Envelope')) {
              // Clean ivory-paper envelope with soft specular
              child.material = new THREE.MeshStandardMaterial({
                color: 0xF3EBDD,
                roughness: 0.55,
                metalness: 0.12,
              });
            } else if (name.includes('EnergyStream') || name.includes('Node')) {
              // Glowing node/stream
              child.material = new THREE.MeshStandardMaterial({
                color: 0xFBBF24,
                emissive: 0xD97706,
                emissiveIntensity: 1.6,
                roughness: 0.2,
                metalness: 0.9,
              });
            }
          }
        });

        // Center and scale appropriately
        loadedScene.position.set(-0.25, -0.1, 0);
        loadedScene.scale.set(1.05, 1.05, 1.05);

        modelRoot.add(loadedScene);
        setLoading(false);
      },
      undefined,
      (error) => {
        console.warn('GLB Load fallback to procedural meshes:', error);
        // Fallback procedural shield in case file is loading
        const fallbackShieldGeo = new THREE.CylinderGeometry(1.0, 0.4, 2.0, 32);
        const fallbackMat = new THREE.MeshStandardMaterial({ color: 0xC58A45, metalness: 0.8 });
        const fallbackShield = new THREE.Mesh(fallbackShieldGeo, fallbackMat);
        modelRoot.add(fallbackShield);
        setLoading(false);
      }
    );

    // 7. Mouse Parallax & Scroll Integration
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.targetX = x;
      mouse.targetY = y;
    };

    container.addEventListener('mousemove', onMouseMove);

    // Scroll listener for 3D camera depth
    let scrollProgress = 0;
    const onScroll = () => {
      const maxScroll = 500;
      scrollProgress = Math.min(window.scrollY / maxScroll, 1);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // 8. Animation Render Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth mouse lerping
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      if (!isInteractingRef.current) {
        // Floating idle hover animation on 3D root
        modelRoot.position.y = Math.sin(time * 1.5) * 0.08 - scrollProgress * 0.2;
        
        // Gentle looking towards mouse cursor
        modelRoot.rotation.y = mouse.x * 0.35 + Math.sin(time * 0.8) * 0.06;
        modelRoot.rotation.x = -mouse.y * 0.22 + Math.cos(time * 0.9) * 0.04;
        modelRoot.rotation.z = mouse.x * 0.08;

        // Camera gentle breath
        camera.position.z = 5.2 - scrollProgress * 0.5;
      } else {
        controls.update();
      }

      // Energy Wave shimmer
      waveMesh.rotation.y = Math.sin(time * 0.6) * 0.08;
      waveMesh.rotation.z = Math.cos(time * 0.5) * 0.04;

      // Particle Cloud Drift
      particles.rotation.y = time * 0.035;
      particles.rotation.x = Math.sin(time * 0.02) * 0.1;

      // Pulsing internal core light
      corePointLight.intensity = 2.4 + Math.sin(time * 3.0) * 0.8;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Save controls ref for toggling interactive mode
    controlsRef.current = controls;

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', onScroll);
      container.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const controlsRef = useRef(null);

  const toggleInteractive = (mode) => {
    setActiveTab(mode);
    const isInteractive = mode === 'interactive';
    setInteractiveMode(isInteractive);
    isInteractingRef.current = isInteractive;
    if (controlsRef.current) {
      controlsRef.current.enabled = isInteractive;
      if (!isInteractive) {
        controlsRef.current.reset();
      }
    }
  };

  return (
    <div className="w-full relative flex flex-col items-center justify-center">
      {/* 3D Canvas Viewport */}
      <div 
        ref={containerRef}
        className="relative w-full aspect-[16/10] sm:aspect-[16/9] flex items-center justify-center overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl transition-all"
        style={{ cursor: interactiveMode ? 'grab' : 'default' }}
      >
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg)]/80 backdrop-blur-sm z-20">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin mb-3" />
            <span className="text-[13px] text-[var(--color-text-muted)] font-medium">
              Initializing 3D Shield Environment...
            </span>
          </div>
        )}

        {/* 3D Overlay Badge */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-bg)]/80 backdrop-blur-md border border-[var(--color-border)] text-[11px] font-semibold tracking-wider text-[var(--color-accent)] uppercase">
          <Sparkles size={12} className="text-[var(--color-accent)]" />
          <span>Real-time 3D PBR</span>
        </div>

        {/* Interactive Mode Toggle in Top Right */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 p-0.5 rounded-lg bg-[var(--color-bg)]/80 backdrop-blur-md border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => toggleInteractive('auto')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'auto'
                ? 'bg-[var(--color-accent)] text-[#1B130E] font-semibold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <span>Cinematic</span>
          </button>
          <button
            type="button"
            onClick={() => toggleInteractive('interactive')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'interactive'
                ? 'bg-[var(--color-accent)] text-[#1B130E] font-semibold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
            title="Click and drag to rotate the 3D model"
          >
            <Move3d size={11} />
            <span>Orbit 3D</span>
          </button>
        </div>

        {/* Subtle Radial Ambient Fade to blend canvas edges */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, transparent 40%, rgba(27, 19, 14, 0.45) 95%)'
          }}
        />

        {/* Drag Hint when in interactive mode */}
        {interactiveMode && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-[var(--color-bg)]/90 backdrop-blur-md border border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] pointer-events-none animate-pulse flex items-center gap-1.5">
            <Move3d size={12} className="text-[var(--color-accent)]" />
            <span>Click & Drag to explore in 3D</span>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="w-full pt-3 flex items-center justify-between text-[13px] text-[var(--color-text-muted)] font-normal px-2">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
          <span>Real-time Shader Lighting</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Interactive 60 FPS Engine</span>
        </span>
      </div>
    </div>
  );
}
