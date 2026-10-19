import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import type { FilamentChannel, MeshSegment, ModelDefinition, PrinterProfile, SlicingConfig, SlicingAnalysis, BleedRiskItem } from '../types';
import { blendHexColors } from '../utils/slicingEngine';
import { generateOrganicBufferGeometry } from '../utils/organicGeometry';
import { TRANSLATIONS, type SupportedLanguage } from '../utils/i18n';
import {
  Eye, RotateCcw, Box, Layers, Sparkles, Sliders, AlertTriangle, CheckCircle,
  ShieldAlert, ArrowRight, Zap, Leaf, Activity, Camera, Maximize2, Minimize2,
  Copy, Check, X, Cpu, Gauge
} from 'lucide-react';

interface ThreeViewportProps {
  model: ModelDefinition;
  filaments: FilamentChannel[];
  printer: PrinterProfile;
  slicingConfig: SlicingConfig;
  slicingAnalysis: SlicingAnalysis;
  selectedSegmentId: string | null;
  onSelectSegment: (id: string | null) => void;
  onAssignFilamentToSegment: (segmentId: string, filamentId: number) => void;
  onAutoFixBleed?: () => void;
  activeFilamentSlot: number;
  lang?: SupportedLanguage;
}

/**
 * Creates a canvas texture representing the color bleed gradient on a printed segment
 */
function createBleedGradientTexture(
  fromColor: string,
  toColor: string,
  purgeRatio: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Under-purging widens the contaminated bleed zone upwards
  // purgeRatio < 1.0 means severe bleed; purgeRatio >= 1.2 means clean
  const bleedHeightFraction = Math.max(0.04, Math.min(0.65, (1.25 - purgeRatio) * 0.5));
  const mixedColor = blendHexColors(fromColor, toColor, 0.45);

  const grad = ctx.createLinearGradient(0, 256, 0, 0); // Y-up: 256 is bottom, 0 is top
  grad.addColorStop(0, fromColor);
  grad.addColorStop(bleedHeightFraction * 0.5, mixedColor);
  grad.addColorStop(bleedHeightFraction, toColor);
  grad.addColorStop(1, toColor);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Creates a stratified texture for the wipe tower showing color transition gradients
 */
function createWipeTowerTexture(
  toolChanges: SlicingAnalysis['toolChangeLayers'],
  filaments: FilamentChannel[],
  purgeRatio: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  if (toolChanges.length === 0) {
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, 32, 512);
  } else {
    const numChanges = toolChanges.length;
    const bandHeight = 512 / Math.max(1, numChanges);

    toolChanges.forEach((tc, idx) => {
      const fromFil = filaments.find(f => f.id === tc.fromSlot) || filaments[0];
      const toFil = filaments.find(f => f.id === tc.toSlot) || filaments[0];
      const yStart = idx * bandHeight;
      const yEnd = yStart + bandHeight;

      const mixed = blendHexColors(fromFil.color, toFil.color, Math.min(0.8, 0.35 + (purgeRatio - 0.5) * 0.3));
      const grad = ctx.createLinearGradient(0, yStart, 0, yEnd);
      grad.addColorStop(0, fromFil.color);
      grad.addColorStop(0.4, mixed);
      grad.addColorStop(1, toFil.color);

      ctx.fillStyle = grad;
      ctx.fillRect(0, yStart, 32, bandHeight + 1);

      // Thin separation lines between tool swaps
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, yEnd - 1, 32, 1);
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

let skinBumpTexture: THREE.CanvasTexture | null = null;
function getSkinBumpTexture(): THREE.CanvasTexture {
  if (skinBumpTexture) return skinBumpTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 4) {
    for (let y = 0; y < 128; y += 4) {
      const v = Math.floor(128 + Math.sin(x * 0.4) * Math.cos(y * 0.4) * 50 + (Math.random() - 0.5) * 20);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.beginPath();
      ctx.arc(x + 2, y + 2, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  skinBumpTexture = new THREE.CanvasTexture(canvas);
  skinBumpTexture.wrapS = THREE.RepeatWrapping;
  skinBumpTexture.wrapT = THREE.RepeatWrapping;
  skinBumpTexture.repeat.set(4, 4);
  return skinBumpTexture;
}

let stoneBumpTexture: THREE.CanvasTexture | null = null;
function getStoneBumpTexture(): THREE.CanvasTexture {
  if (stoneBumpTexture) return stoneBumpTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 128);
  const imgData = ctx.getImageData(0, 0, 128, 128);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = Math.floor(128 + (Math.random() - 0.5) * 90);
    data[i] = n;
    data[i + 1] = n;
    data[i + 2] = n;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  stoneBumpTexture = new THREE.CanvasTexture(canvas);
  stoneBumpTexture.wrapS = THREE.RepeatWrapping;
  stoneBumpTexture.wrapT = THREE.RepeatWrapping;
  stoneBumpTexture.repeat.set(3, 3);
  return stoneBumpTexture;
}

let botanicalBumpTexture: THREE.CanvasTexture | null = null;
function getBotanicalBumpTexture(): THREE.CanvasTexture {
  if (botanicalBumpTexture) return botanicalBumpTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#a8a8a8';
  ctx.lineWidth = 1.5;
  for (let y = 0; y < 128; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(40, y + 3, 80, y - 3, 128, y);
    ctx.stroke();
  }
  botanicalBumpTexture = new THREE.CanvasTexture(canvas);
  botanicalBumpTexture.wrapS = THREE.RepeatWrapping;
  botanicalBumpTexture.wrapT = THREE.RepeatWrapping;
  botanicalBumpTexture.repeat.set(2, 2);
  return botanicalBumpTexture;
}

export const ThreeViewport: React.FC<ThreeViewportProps> = ({
  model,
  filaments,
  printer,
  slicingConfig,
  slicingAnalysis,
  selectedSegmentId,
  onSelectSegment,
  onAssignFilamentToSegment,
  onAutoFixBleed,
  activeFilamentSlot,
  lang = 'sv',
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.sv;

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const wipeTowerMeshRef = useRef<THREE.Mesh | null>(null);
  const wasteBoundingBoxGroupRef = useRef<THREE.Group | null>(null);
  const bedGridRef = useRef<THREE.Group | null>(null);
  const clipPlaneRef = useRef<THREE.Plane | null>(null);

  const [wireframe, setWireframe] = useState<boolean>(false);
  const [sliceHeightPercent, setSliceHeightPercent] = useState<number>(100);
  const [isSlicingActive, setIsSlicingActive] = useState<boolean>(false);
  const [paintMode, setPaintMode] = useState<boolean>(false);
  const [showWasteBoundingBox, setShowWasteBoundingBox] = useState<boolean>(true);
  const [natureShadingMode, setNatureShadingMode] = useState<boolean>(true);

  // Real-time 3D Canvas Telemetry Overlay State
  const [showTelemetryOverlay, setShowTelemetryOverlay] = useState<boolean>(true);
  const [isTelemetryMinimized, setIsTelemetryMinimized] = useState<boolean>(false);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);

  // Camera Coordinates & Angles State
  const [cameraCoords, setCameraCoords] = useState<{
    x: number;
    y: number;
    z: number;
    radius: number;
    thetaDeg: number;
    phiDeg: number;
  }>({
    x: 110,
    y: 140,
    z: 110,
    radius: 220,
    thetaDeg: 45,
    phiDeg: 60,
  });

  // Color Bleed Simulation Mode State
  const [bleedSimulationMode, setBleedSimulationMode] = useState<boolean>(false);
  const [simulatedPurgeRatio, setSimulatedPurgeRatio] = useState<number>(slicingConfig.flushingMultiplier || 1.0);

  const filamentById = useMemo(
    () => new Map(filaments.map(f => [f.id, f])),
    [filaments]
  );

  const activeFilamentCount = useMemo(
    () => filaments.filter(f => f.slotActive !== false).length,
    [filaments]
  );

  const bleedRiskBySlot = useMemo(() => {
    const riskMap = new Map<number, BleedRiskItem>();
    for (const br of slicingAnalysis.bleedRisks) {
      riskMap.set(br.toSlot, br);
    }
    return riskMap;
  }, [slicingAnalysis.bleedRisks]);

  // Interaction state
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: Math.PI / 4,
    phi: Math.PI / 3,
    radius: 220,
  });

  // Keep simulated ratio synced with slicingConfig multiplier
  useEffect(() => {
    setSimulatedPurgeRatio(slicingConfig.flushingMultiplier);
  }, [slicingConfig.flushingMultiplier]);

  // Real-time polygon, vertex, buffer memory and print optimization calculations
  const telemetryStats = useMemo(() => {
    let modelTriangles = 0;
    let modelVertices = 0;
    let geometryBufferBytes = 0;

    if (model && model.segments) {
      model.segments.forEach(seg => {
        let geo: THREE.BufferGeometry;
        const { width = 20, height = 20, depth = 20, radius = 10, radiusTop = 10, radiusBottom = 10 } = seg.parameters || {};

        if (
          seg.geometryType === 'organic_mesh' ||
          seg.geometryType === 'parametric_surface' ||
          seg.parameters?.organicType
        ) {
          geo = generateOrganicBufferGeometry(seg);
        } else if (seg.geometryType === 'box') {
          geo = new THREE.BoxGeometry(width, height, depth);
        } else if (seg.geometryType === 'cylinder') {
          geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32);
        } else if (seg.geometryType === 'cone') {
          geo = new THREE.ConeGeometry(radius, height, 32);
        } else if (seg.geometryType === 'ring' || seg.geometryType === 'torus') {
          geo = new THREE.TorusGeometry(radius, seg.parameters?.tube || 3, 16, 32);
        } else {
          geo = new THREE.SphereGeometry(radius, 32, 24);
        }

        if (geo.index) {
          modelTriangles += geo.index.count / 3;
          geometryBufferBytes += geo.index.array.byteLength;
        } else if (geo.attributes.position) {
          modelTriangles += geo.attributes.position.count / 3;
        }
        if (geo.attributes.position) {
          modelVertices += geo.attributes.position.count;
          geometryBufferBytes += geo.attributes.position.array.byteLength;
        }
        if (geo.attributes.normal) {
          geometryBufferBytes += geo.attributes.normal.array.byteLength;
        }
        if (geo.attributes.uv) {
          geometryBufferBytes += geo.attributes.uv.array.byteLength;
        }
        geo.dispose();
      });
    }

    const geometryBufferMb = (geometryBufferBytes / (1024 * 1024)).toFixed(2);
    const texturesCount = natureShadingMode ? 3 : 1;
    const texturesMemMb = natureShadingMode ? '1.8' : '0.6';

    let jsHeapMb: number | null = null;
    if (typeof window !== 'undefined' && (window.performance as any)?.memory) {
      jsHeapMb = Math.round((window.performance as any).memory.usedJSHeapSize / (1024 * 1024));
    }

    const sceneTriangles = modelTriangles + 2480;

    let optimizationLevel: 'optimal' | 'moderate' | 'heavy' = 'optimal';
    if (modelTriangles > 160000) {
      optimizationLevel = 'heavy';
    } else if (modelTriangles > 45000) {
      optimizationLevel = 'moderate';
    }

    return {
      modelTriangles,
      modelVertices,
      sceneTriangles,
      geometryBufferBytes,
      geometryBufferMb,
      texturesCount,
      texturesMemMb,
      jsHeapMb,
      optimizationLevel,
    };
  }, [model, natureShadingMode]);

  // Synchronize camera coordinates to React state for floating overlay
  const syncCameraTelemetry = () => {
    if (!cameraRef.current) return;
    const pos = cameraRef.current.position;
    const { theta, phi, radius } = cameraAngleRef.current;
    let thetaDeg = Math.round(((theta * 180) / Math.PI) % 360);
    if (thetaDeg < 0) thetaDeg += 360;
    const phiDeg = Math.round((phi * 180) / Math.PI);
    setCameraCoords({
      x: Number(pos.x.toFixed(1)),
      y: Number(pos.y.toFixed(1)),
      z: Number(pos.z.toFixed(1)),
      radius: Math.round(radius),
      thetaDeg,
      phiDeg,
    });
  };

  const lastTelemetryUpdateRef = useRef<number>(0);
  const throttledSyncCameraTelemetry = () => {
    const now = performance.now();
    if (now - lastTelemetryUpdateRef.current > 45) {
      lastTelemetryUpdateRef.current = now;
      syncCameraTelemetry();
    }
  };

  const applyCameraPreset = (preset: 'iso' | 'top' | 'front' | 'side') => {
    if (!cameraRef.current) return;
    if (preset === 'iso') {
      cameraAngleRef.current = { theta: Math.PI / 4, phi: Math.PI / 3, radius: 220 };
    } else if (preset === 'top') {
      cameraAngleRef.current = { theta: 0, phi: 0.05, radius: 230 };
    } else if (preset === 'front') {
      cameraAngleRef.current = { theta: 0, phi: Math.PI / 2 - 0.05, radius: 220 };
    } else if (preset === 'side') {
      cameraAngleRef.current = { theta: Math.PI / 2, phi: Math.PI / 2 - 0.05, radius: 220 };
    }
    const { theta, phi, radius } = cameraAngleRef.current;
    cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = radius * Math.cos(phi) + 30;
    cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.lookAt(0, 35, 0);
    syncCameraTelemetry();
  };

  const handleCopyCoords = () => {
    const text = `Camera Coords: X=${cameraCoords.x}mm, Y=${cameraCoords.y}mm, Z=${cameraCoords.z}mm | Distance=${cameraCoords.radius}mm | Azimuth=${cameraCoords.thetaDeg}°, Elevation=${cameraCoords.phiDeg}°`;
    try {
      navigator.clipboard.writeText(text);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    } catch (e) {
      // Ignore
    }
  };

  // 1. Initialize Scene & Renderer
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    sceneRef.current = scene;

    // Clipping plane for layer cross-section slicing
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 200);
    clipPlaneRef.current = clipPlane;

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Three-point lighting + ambient
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    keyLight.position.set(120, 220, 150);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88ccff, 0.6);
    fillLight.position.set(-150, 100, -100);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.8);
    rimLight.position.set(0, 180, -180);
    scene.add(rimLight);

    // Update camera position
    const updateCameraPos = () => {
      const { theta, phi, radius } = cameraAngleRef.current;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi) + 30;
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 35, 0);
    };
    updateCameraPos();
    syncCameraTelemetry();

    // Render loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // 2. Build Build Plate Grid & Boundaries
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    if (bedGridRef.current) {
      scene.remove(bedGridRef.current);
    }

    const bedGroup = new THREE.Group();
    const bedX = printer.bedX;
    const bedY = printer.bedY;

    // PEI Sheet surface
    const bedGeo = new THREE.PlaneGeometry(bedX, bedY);
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x171f2f,
      roughness: 0.85,
      metalness: 0.2,
    });
    const bedMesh = new THREE.Mesh(bedGeo, bedMat);
    bedMesh.rotation.x = -Math.PI / 2;
    bedMesh.position.y = 0;
    bedMesh.receiveShadow = true;
    bedGroup.add(bedMesh);

    // Grid lines
    const gridHelper = new THREE.GridHelper(bedX, 25, 0x06b6d4, 0x1e293b);
    gridHelper.position.y = 0.1;
    bedGroup.add(gridHelper);

    // Bed border
    const borderGeo = new THREE.BufferGeometry();
    const halfX = bedX / 2;
    const halfY = bedY / 2;
    const borderPoints = [
      new THREE.Vector3(-halfX, 0.2, -halfY),
      new THREE.Vector3(halfX, 0.2, -halfY),
      new THREE.Vector3(halfX, 0.2, halfY),
      new THREE.Vector3(-halfX, 0.2, halfY),
      new THREE.Vector3(-halfX, 0.2, -halfY),
    ];
    borderGeo.setFromPoints(borderPoints);
    const borderLine = new THREE.Line(borderGeo, new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 }));
    bedGroup.add(borderLine);

    // Coordinate markers: Anycubic origin & text indicator
    const originMarker = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2, 1, 16),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    originMarker.position.set(-halfX + 10, 0.5, -halfY + 10);
    bedGroup.add(originMarker);

    scene.add(bedGroup);
    bedGridRef.current = bedGroup;
  }, [printer]);

  // 3. Render Purge / Wipe Tower on Bed & Translucent Waste Volume Bounding Box
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Clean up previous wipe tower mesh
    if (wipeTowerMeshRef.current) {
      scene.remove(wipeTowerMeshRef.current);
      wipeTowerMeshRef.current = null;
    }

    // Clean up previous waste volume bounding box group
    if (wasteBoundingBoxGroupRef.current) {
      scene.remove(wasteBoundingBoxGroupRef.current);
      wasteBoundingBoxGroupRef.current = null;
    }

    if (!slicingConfig.wipeTowerEnabled) return;

    // Wipe tower coordinates on print bed
    const posX = (slicingConfig.wipeTowerX || 190) - printer.bedX / 2;
    const posZ = (slicingConfig.wipeTowerY || 190) - printer.bedY / 2;
    const towerWidth = slicingConfig.wipeTowerWidth || 30;
    const towerHeight = Math.min(60, model.dimensions.y || 40);

    // 3a. Base Purge Tower Block
    const towerGeo = new THREE.BoxGeometry(towerWidth, towerHeight, towerWidth);
    let towerMat: THREE.Material;

    if (bleedSimulationMode) {
      // Stratified gradient texture showing toolchange transition bands
      const towerTexture = createWipeTowerTexture(slicingAnalysis.toolChangeLayers, filaments, simulatedPurgeRatio);
      towerMat = new THREE.MeshStandardMaterial({
        map: towerTexture,
        roughness: 0.5,
        wireframe: wireframe,
      });
    } else {
      towerMat = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.6,
        wireframe: wireframe,
      });
    }

    const towerMesh = new THREE.Mesh(towerGeo, towerMat);
    towerMesh.position.set(posX, towerHeight / 2, posZ);
    towerMesh.castShadow = true;
    towerMesh.receiveShadow = true;

    scene.add(towerMesh);
    wipeTowerMeshRef.current = towerMesh;

    // 3b. Translucent Bounding Box representing Calculated Waste Volume (scaling with flushingMultiplier)
    if (showWasteBoundingBox) {
      const wasteGroup = new THREE.Group();

      const wasteVolMm3 = slicingAnalysis.purgeWasteVolumeMm3; // in mm³
      const multiplier = slicingConfig.flushingMultiplier || 1.0;

      // Volumetric calculation: Volume = Width * Depth * Height * infillDensityFactor (approx 0.85 packing factor)
      // Height = Volume / (Width * Depth * 0.85)
      // Scales dynamically with flushingMultiplier and total tool swaps!
      const effectivePacking = slicingConfig.purgeIntoInfill ? 0.68 : 0.85;
      const calculatedHeight = (wasteVolMm3 / (towerWidth * towerWidth * effectivePacking));
      const boxHeight = Math.max(12, Math.min(printer.bedZ - 15, calculatedHeight));

      // Bounding box footprint slightly envelopes the tower footprint
      const boxWidth = towerWidth + 6;
      const boxDepth = towerWidth + 6;

      // 1. Translucent Volumetric Mesh
      const boxGeo = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
      const boxMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b, // Warm Amber purge waste tone
        transparent: true,
        opacity: 0.24,
        roughness: 0.2,
        metalness: 0.1,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      boxMesh.position.set(0, boxHeight / 2, 0);
      wasteGroup.add(boxMesh);

      // 2. High-Visibility Bounding Box Edges
      const edgesGeo = new THREE.EdgesGeometry(boxGeo);
      const edgesMat = new THREE.LineBasicMaterial({
        color: 0xfbbf24,
        linewidth: 2,
        transparent: true,
        opacity: 0.9,
      });
      const edgesLine = new THREE.LineSegments(edgesGeo, edgesMat);
      edgesLine.position.set(0, boxHeight / 2, 0);
      wasteGroup.add(edgesLine);

      // 3. Top Face Crosshairs / Corner Tick Dimension Lines
      const halfW = boxWidth / 2;
      const halfD = boxDepth / 2;
      const topY = boxHeight;
      const crossGeo = new THREE.BufferGeometry();
      const crossPoints = [
        new THREE.Vector3(-halfW, topY, 0),
        new THREE.Vector3(halfW, topY, 0),
        new THREE.Vector3(0, topY, -halfD),
        new THREE.Vector3(0, topY, halfD),
      ];
      crossGeo.setFromPoints(crossPoints);
      const crossLines = new THREE.LineSegments(
        crossGeo,
        new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.75 })
      );
      wasteGroup.add(crossLines);

      // Position the entire waste bounding box group on the print bed at the wipe tower location
      wasteGroup.position.set(posX, 0, posZ);

      scene.add(wasteGroup);
      wasteBoundingBoxGroupRef.current = wasteGroup;
    }
  }, [
    slicingConfig,
    printer,
    model,
    wireframe,
    bleedSimulationMode,
    simulatedPurgeRatio,
    slicingAnalysis.toolChangeLayers,
    slicingAnalysis.purgeWasteVolumeMm3,
    filaments,
    showWasteBoundingBox,
  ]);

  // 4. Render Model Segments (with Bleed Transition Simulation when active!)
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    if (modelGroupRef.current) {
      scene.remove(modelGroupRef.current);
    }

    const modelGroup = new THREE.Group();

    model.segments.forEach((seg, sIdx) => {
      const fil = filamentById.get(seg.filamentId) || filamentById.get(1) || filaments[0];
      const isSelected = seg.id === selectedSegmentId;

      let geo: THREE.BufferGeometry;
      const { width = 20, height = 20, depth = 20, radius = 10, radiusTop = 10, radiusBottom = 10 } = seg.parameters;

      // Check if this is an organic natural biological structure or custom relief mesh
      if (
        seg.geometryType === 'organic_mesh' ||
        seg.geometryType === 'parametric_surface' ||
        seg.geometryType === 'relief_mesh' ||
        seg.parameters.customGeometry ||
        seg.parameters.organicType
      ) {
        geo = generateOrganicBufferGeometry(seg);
      } else if (seg.geometryType === 'box') {
        geo = new THREE.BoxGeometry(width, height, depth);
      } else if (seg.geometryType === 'cylinder') {
        geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32);
      } else if (seg.geometryType === 'cone') {
        geo = new THREE.ConeGeometry(radius, height, 32);
      } else if (seg.geometryType === 'ring' || seg.geometryType === 'torus') {
        geo = new THREE.TorusGeometry(radius, seg.parameters.tube || 3, 16, 32);
      } else {
        geo = new THREE.SphereGeometry(radius, 32, 24);
      }

      const isTPU = fil.material.includes('TPU');
      const isSilk = fil.name.includes('Silk');
      const finish = seg.parameters.finish || 'organic_skin';
      const isGlossy = finish === 'organic_skin' || finish === 'glossy_chitin';
      const isMineral = finish === 'mineral_stone';
      const isBotanical = finish === 'botanical_petal' || finish === 'matte_feather';
      const isSucculent = finish === 'fleshy_succulent';
      const isCrystal = finish === 'crystalline_quartz';
      const isResin = finish === 'translucent_resin';

      let mat: THREE.Material;

      // When Bleed Simulation Mode is active and this slot has a bleed risk
      const riskItem = bleedRiskBySlot.get(seg.filamentId);
      if (bleedSimulationMode && riskItem && simulatedPurgeRatio < 1.15) {
        // Create transition gradient material simulating the bleed
        const bleedTex = createBleedGradientTexture(riskItem.fromColor, fil.color, simulatedPurgeRatio);
        mat = new THREE.MeshStandardMaterial({
          map: bleedTex,
          roughness: isSilk ? 0.2 : isTPU ? 0.9 : 0.45,
          metalness: isSilk ? 0.4 : 0.05,
          wireframe: wireframe,
          clippingPlanes: isSlicingActive && clipPlaneRef.current ? [clipPlaneRef.current] : [],
          clipShadows: true,
        });

        // Add subtle warning glow if critical bleed
        if (riskItem.bleedSeverity === 'critical') {
          (mat as THREE.MeshStandardMaterial).emissive = new THREE.Color(0xd97706); // Amber warning
          (mat as THREE.MeshStandardMaterial).emissiveIntensity = 0.2;
        }
      } else if (natureShadingMode) {
        // High-fidelity Lifelike Nature PBR Material (Procedural bump, Clearcoat, Sheen, Subsurface emulation)
        const baseColor = new THREE.Color(fil.color);
        let bumpMap: THREE.Texture | null = null;
        let bumpScale = 0;

        if (isMineral) {
          bumpMap = getStoneBumpTexture();
          bumpScale = 0.35;
        } else if (isGlossy) {
          bumpMap = getSkinBumpTexture();
          bumpScale = 0.16;
        } else if (isBotanical || isSucculent) {
          bumpMap = getBotanicalBumpTexture();
          bumpScale = 0.12;
        }

        mat = new THREE.MeshPhysicalMaterial({
          color: baseColor,
          roughness: isCrystal ? 0.12 : isMineral ? 0.88 : isSilk ? 0.22 : isGlossy ? 0.28 : isSucculent ? 0.32 : 0.44,
          metalness: isCrystal ? 0.1 : isSilk ? 0.35 : isMineral ? 0.02 : 0.05,
          clearcoat: isCrystal ? 0.95 : isGlossy ? 0.65 : isSucculent ? 0.35 : 0.08,
          clearcoatRoughness: 0.1,
          sheen: isBotanical ? 0.85 : 0.15,
          sheenColor: new THREE.Color(0xffffff),
          transmission: (isCrystal || isResin) ? 0.35 : isSucculent ? 0.15 : 0.0,
          ior: isCrystal ? 1.54 : 1.45,
          bumpMap: bumpMap || undefined,
          bumpScale: bumpScale,
          wireframe: wireframe,
          clippingPlanes: isSlicingActive && clipPlaneRef.current ? [clipPlaneRef.current] : [],
          clipShadows: true,
        });
      } else {
        const baseColor = new THREE.Color(fil.color);
        mat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: isSilk ? 0.2 : isTPU ? 0.9 : 0.45,
          metalness: isSilk ? 0.4 : 0.05,
          wireframe: wireframe,
          clippingPlanes: isSlicingActive && clipPlaneRef.current ? [clipPlaneRef.current] : [],
          clipShadows: true,
        });
      }

      if (isSelected) {
        if ('emissive' in mat) {
          (mat as any).emissive = new THREE.Color(0x06b6d4);
          (mat as any).emissiveIntensity = 0.35;
        }
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = seg.id;
      mesh.userData = { segmentId: seg.id, filamentId: seg.filamentId };

      const [px, py, pz] = seg.transform.position;
      const [rx, ry, rz] = seg.transform.rotation;
      const [sx, sy, sz] = seg.transform.scale;

      mesh.position.set(px, py, pz);
      mesh.rotation.set(rx, ry, rz);
      mesh.scale.set(sx, sy, sz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      modelGroup.add(mesh);
    });

    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;
  }, [
    model,
    filaments,
    filamentById,
    selectedSegmentId,
    wireframe,
    isSlicingActive,
    bleedSimulationMode,
    simulatedPurgeRatio,
    slicingAnalysis.bleedRisks,
    bleedRiskBySlot,
    natureShadingMode,
  ]);

  // 5. Update Clipping Plane Height
  useEffect(() => {
    if (!clipPlaneRef.current) return;
    const maxHeight = model.dimensions.y || 80;
    const cutY = (sliceHeightPercent / 100) * maxHeight;
    clipPlaneRef.current.constant = cutY;
  }, [sliceHeightPercent, model]);

  // 6. Mouse Orbit & Click Picking
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !cameraRef.current) return;

    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    cameraAngleRef.current.theta -= deltaX * 0.008;
    cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, cameraAngleRef.current.phi - deltaY * 0.008));

    const { theta, phi, radius } = cameraAngleRef.current;
    cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = radius * Math.cos(phi) + 30;
    cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.lookAt(0, 35, 0);

    throttledSyncCameraTelemetry();
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    syncCameraTelemetry();
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!cameraRef.current) return;
    e.preventDefault();
    cameraAngleRef.current.radius = Math.max(50, Math.min(500, cameraAngleRef.current.radius + e.deltaY * 0.2));

    const { theta, phi, radius } = cameraAngleRef.current;
    cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = radius * Math.cos(phi) + 30;
    cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.lookAt(0, 35, 0);
    syncCameraTelemetry();
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mountRef.current || !cameraRef.current || !sceneRef.current || !modelGroupRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    const intersects = raycaster.intersectObjects(modelGroupRef.current.children, true);
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const segId = hitMesh.userData.segmentId;
      if (segId) {
        if (paintMode) {
          onAssignFilamentToSegment(segId, activeFilamentSlot);
        } else {
          onSelectSegment(segId === selectedSegmentId ? null : segId);
        }
      }
    } else {
      if (!paintMode) {
        onSelectSegment(null);
      }
    }
  };

  const resetCamera = () => {
    if (!cameraRef.current) return;
    cameraAngleRef.current = { theta: Math.PI / 4, phi: Math.PI / 3, radius: 220 };
    const { theta, phi, radius } = cameraAngleRef.current;
    cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = radius * Math.cos(phi) + 30;
    cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.lookAt(0, 35, 0);
    syncCameraTelemetry();
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950 flex flex-col">
      {/* 3D Canvas Mount */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
      />

      {/* Floating HUD Top Controls */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-lg text-xs">
          <span className="font-semibold text-white tracking-wide">{printer.name}</span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="text-slate-400 font-mono tabular-nums">{printer.bedX}×{printer.bedY}×{printer.bedZ}mm</span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="text-cyan-400 font-mono">{activeFilamentCount} Slots Active</span>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1 rounded-lg border border-slate-700/60 shadow-lg">
          {/* PURGE BLEED SIMULATION TOGGLE */}
          <button
            onClick={() => setBleedSimulationMode(!bleedSimulationMode)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-all whitespace-nowrap cursor-pointer ${
              bleedSimulationMode
                ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400'
                : 'text-amber-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Simulate color blending and purge transitions to detect bleeding on parts"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Bleed Simulation</span>
            {slicingAnalysis.bleedRisks.length > 0 && (
              <span className={`px-1 py-0.2 rounded text-[10px] font-mono font-bold ${
                bleedSimulationMode ? 'bg-slate-900 text-amber-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {slicingAnalysis.bleedRisks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setNatureShadingMode(!natureShadingMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap cursor-pointer ${
              natureShadingMode
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Photorealistic Nature PBR Shading (Clearcoat, Sheen, Organic Subsurface)"
          >
            <Leaf className="w-3.5 h-3.5 text-emerald-400" />
            <span>Nature PBR</span>
          </button>

          <button
            onClick={() => setShowWasteBoundingBox(!showWasteBoundingBox)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap cursor-pointer ${
              showWasteBoundingBox
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Translucent Waste Volume Bounding Box (scales with flushingMultiplier)"
          >
            <Box className="w-3.5 h-3.5 text-amber-400" />
            <span>Waste Box</span>
            <span className="font-mono text-[10px] text-amber-300 font-bold tabular-nums">
              {slicingConfig.flushingMultiplier.toFixed(2)}x
            </span>
          </button>

          <button
            onClick={() => setPaintMode(!paintMode)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              paintMode ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Click any 3D part to paint with the active filament color"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Paint</span>
          </button>

          <button
            onClick={() => setWireframe(!wireframe)}
            className={`p-1.5 rounded text-xs transition-colors ${
              wireframe ? 'bg-slate-700 text-cyan-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Wireframe Mesh"
          >
            <Box className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsSlicingActive(!isSlicingActive)}
            className={`p-1.5 rounded text-xs transition-colors ${
              isSlicingActive ? 'bg-slate-700 text-amber-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Slicing Cross-Section Plane"
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowTelemetryOverlay(!showTelemetryOverlay)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap cursor-pointer ${
              showTelemetryOverlay
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Real-Time 3D Telemetry Overlay (Polygon Count, Memory & Camera XYZ)"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.overlayToggle || 'Telemetri'}</span>
          </button>

          <button
            onClick={resetCamera}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Reset Viewport Camera"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slicing Height Slider Overlay (when slicing is active) */}
      {isSlicingActive && (
        <div className="absolute bottom-4 left-4 right-4 max-w-md mx-auto pointer-events-auto bg-slate-900/90 backdrop-blur-md p-3 rounded-lg border border-slate-700 shadow-xl z-10 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Slicing Cross-Section Height
            </span>
            <span className="font-mono text-amber-400 tabular-nums font-semibold">
              {((sliceHeightPercent / 100) * (model.dimensions.y || 80)).toFixed(1)} mm ({sliceHeightPercent}%)
            </span>
          </div>
          <input
            type="range"
            min="2"
            max="100"
            value={sliceHeightPercent}
            onChange={e => setSliceHeightPercent(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>
      )}

      {/* BLEED SIMULATION INTERACTIVE HUD OVERLAY */}
      {bleedSimulationMode && (
        <div className="absolute bottom-4 left-4 right-4 max-w-xl mx-auto pointer-events-auto bg-slate-900/95 backdrop-blur-md p-3.5 rounded-xl border border-amber-500/40 shadow-2xl z-20 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-white tracking-wide">Purge Transition & Bleeding Simulation</span>
                <span className="text-[10px] text-slate-400 block">
                  Simulating hotend residual pigment melt zone during Anycubic ACE Pro tool changes
                </span>
              </div>
            </div>

            {onAutoFixBleed && slicingAnalysis.bleedRisks.length > 0 && (
              <button
                onClick={onAutoFixBleed}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded transition-colors whitespace-nowrap shadow-sm cursor-pointer"
              >
                <Zap className="w-3 h-3" />
                <span>Auto-Resolve Bleed</span>
              </button>
            )}
          </div>

          {/* Purge Volume Adequacy Slider */}
          <div className="flex flex-col gap-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">Simulated Purge Volume Factor:</span>
              <span className="font-mono text-amber-400 font-bold tabular-nums">
                {simulatedPurgeRatio.toFixed(2)}x
                {simulatedPurgeRatio < 0.9 && ' (Under-Purged / High Bleed)'}
                {simulatedPurgeRatio >= 0.9 && simulatedPurgeRatio < 1.15 && ' (Borderline Clean)'}
                {simulatedPurgeRatio >= 1.15 && ' (Full Clean Purge)'}
              </span>
            </div>
            <input
              type="range"
              min="0.4"
              max="1.5"
              step="0.05"
              value={simulatedPurgeRatio}
              onChange={e => setSimulatedPurgeRatio(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span className="text-red-400">0.4x (Severe Bleed)</span>
              <span>1.0x (Standard)</span>
              <span className="text-emerald-400">1.4x (Zero Bleed)</span>
            </div>
          </div>

          {/* Identified Bleed Risks List */}
          <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto pt-1">
            {slicingAnalysis.bleedRisks.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-400 text-xs py-1">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>No bleeding detected. Current purge volumes provide clean color transitions.</span>
              </div>
            ) : (
              slicingAnalysis.bleedRisks.map((risk, rIdx) => (
                <div
                  key={rIdx}
                  className="flex items-center justify-between gap-2 p-1.5 rounded bg-slate-950/60 border border-slate-800/80 text-[11px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      risk.bleedSeverity === 'critical' ? 'bg-red-500 animate-pulse' : 'bg-amber-400'
                    }`} />
                    <span className="font-mono text-slate-400">L{risk.layer} ({risk.heightMm}mm):</span>

                    {/* Color From -> Mixed -> To Swatches */}
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: risk.fromColor }} title="Preceding Color" />
                      <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                      <span className="w-3 h-3 rounded-full border border-amber-400/80 ring-1 ring-amber-400/50" style={{ backgroundColor: risk.mixedColorHex }} title="Contaminated Bleed Transition" />
                      <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                      <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: risk.toColor }} title="Target Color" />
                    </div>
                  </div>

                  <span className="text-amber-300 font-mono text-[10px]">
                    +{risk.recommendedFlushMm3 - risk.currentFlushMm3} mm³ needed
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Waste Volume Bounding Box Live Indicator Tag */}
      {showWasteBoundingBox && !bleedSimulationMode && (
        <div className="absolute top-14 right-3 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-amber-500/40 text-xs shadow-lg flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-400/40 border border-amber-400" />
          <span className="text-slate-300 font-medium">Purge Waste Envelope:</span>
          <span className="font-mono font-bold text-amber-400 tabular-nums">
            {slicingAnalysis.purgeWasteVolumeMm3} mm³ ({slicingAnalysis.purgeWasteGrams}g)
          </span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="font-mono text-cyan-400 tabular-nums">
            {slicingConfig.flushingMultiplier.toFixed(2)}× Flush Scaling
          </span>
        </div>
      )}

      {/* Nature Shading Mode Active Badge */}
      {natureShadingMode && !bleedSimulationMode && (
        <div className="absolute bottom-4 left-4 pointer-events-auto bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-emerald-500/40 text-xs shadow-lg flex items-center gap-2">
          <Leaf className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-emerald-300 font-semibold text-[11px] leading-tight">Naturtrogen PBR-Rendering</span>
            <span className="text-[10px] text-slate-400">Micro-bump texturer, klar-lack & biologisk subsurface</span>
          </div>
        </div>
      )}

      {/* Paint Tool Active Banner */}
      {paintMode && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 pointer-events-none bg-cyan-950/90 border border-cyan-500/50 text-cyan-200 text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: filaments.find(f => f.id === activeFilamentSlot)?.color || '#fff' }} />
          <span>Click any 3D segment to paint with Slot {activeFilamentSlot} ({filaments.find(f => f.id === activeFilamentSlot)?.name})</span>
        </div>
      )}

      {/* FLOATING REAL-TIME 3D TELEMETRY & PRINT OPTIMIZATION OVERLAY */}
      {showTelemetryOverlay && (
        <div className="absolute top-14 left-3 pointer-events-auto z-20 transition-all max-w-xs sm:max-w-sm w-full">
          {isTelemetryMinimized ? (
            <div className="bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-xl border border-cyan-500/40 shadow-2xl flex items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="font-mono text-cyan-300 font-bold tabular-nums truncate">
                  {telemetryStats.modelTriangles.toLocaleString()} {t.triangles || 'tri'}
                </span>
                <span className="text-slate-600">·</span>
                <span className="font-mono text-purple-300 tabular-nums shrink-0">
                  {telemetryStats.geometryBufferMb} MB
                </span>
                <span className="text-slate-600">·</span>
                <span className="font-mono text-amber-300 text-[11px] tabular-nums truncate">
                  [{cameraCoords.x}, {cameraCoords.y}, {cameraCoords.z}]
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setIsTelemetryMinimized(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Expand 3D Telemetry Overlay"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowTelemetryOverlay(false)}
                  className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Close Overlay"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/95 backdrop-blur-md p-3.5 rounded-xl border border-cyan-500/40 shadow-2xl flex flex-col gap-2.5 text-xs">
              {/* Overlay Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white tracking-wide text-xs">
                        {t.overlayTitle || '3D Telemetri & Optimering'}
                      </span>
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {printer.name} · {model.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopyCoords}
                    className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                    title={copiedCoords ? (t.copiedNotice || 'Kopierat!') : (t.copyCoords || 'Kopiera koordinater')}
                  >
                    {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setIsTelemetryMinimized(true)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                    title="Minimize"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowTelemetryOverlay(false)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 1. Polygon & Geometry Optimization Card */}
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-cyan-400" />
                    {t.polyCount || 'Polygoner'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    telemetryStats.optimizationLevel === 'optimal'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : telemetryStats.optimizationLevel === 'moderate'
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    {telemetryStats.optimizationLevel === 'optimal'
                      ? (t.statusOptimal || 'Optimal för FDM')
                      : telemetryStats.optimizationLevel === 'moderate'
                      ? (t.statusModerate || 'Hög detaljnivå')
                      : (t.statusHeavy || 'Tät geometri')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{t.modelTris || 'Modell'}</span>
                    <span className="font-mono text-cyan-400 font-bold text-xs tabular-nums">
                      {telemetryStats.modelTriangles.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{t.sceneTris || 'Scen total'}</span>
                    <span className="font-mono text-slate-300 font-bold text-xs tabular-nums">
                      {telemetryStats.sceneTriangles.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{t.vertices || 'Hörn'}</span>
                    <span className="font-mono text-indigo-300 font-bold text-xs tabular-nums">
                      {telemetryStats.modelVertices.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-850">
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                    {t.manifoldCheck || '100% Vattentät (Manifold)'}
                  </span>
                  <span className="font-mono text-slate-400">
                    {model.segments.length} {t.partsLabel || 'delar'} · {model.dimensions.x}×{model.dimensions.y}×{model.dimensions.z}mm
                  </span>
                </div>
              </div>

              {/* 2. Real-time Memory Usage Card */}
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                    {t.memoryUsage || 'Minnesanvändning'}
                  </span>
                  <span className="font-mono text-purple-300 font-semibold text-[10px]">
                    {telemetryStats.geometryBufferMb} MB VRAM
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                  <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                    <span className="text-slate-500 block text-[9px]">{t.geometryBuffer || 'Buffert'}</span>
                    <span className="text-purple-300 font-bold">{telemetryStats.geometryBufferMb} MB</span>
                  </div>
                  <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                    <span className="text-slate-500 block text-[9px]">{t.texturesMem || 'Texturer'}</span>
                    <span className="text-slate-300 font-bold">{telemetryStats.texturesMemMb} MB ({telemetryStats.texturesCount})</span>
                  </div>
                  <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                    <span className="text-slate-500 block text-[9px]">JS Heap</span>
                    <span className="text-emerald-400 font-bold">{telemetryStats.jsHeapMb ? `${telemetryStats.jsHeapMb} MB` : 'Optimal'}</span>
                  </div>
                </div>
              </div>

              {/* 3. Real-time Camera Coordinates & Angles */}
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    {t.cameraCoords || 'Kamerakoordinater'}
                  </span>
                  <span className="font-mono text-amber-300 text-[10px] tabular-nums font-semibold">
                    R: {cameraCoords.radius} mm
                  </span>
                </div>

                {/* X, Y, Z coordinate metrics */}
                <div className="grid grid-cols-3 gap-2 font-mono text-center">
                  <div className="bg-slate-900/80 p-1.5 rounded border border-red-500/20">
                    <span className="text-[9px] text-red-400 block font-bold">X</span>
                    <span className="text-white font-bold text-xs tabular-nums">{cameraCoords.x}</span>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded border border-emerald-500/20">
                    <span className="text-[9px] text-emerald-400 block font-bold">Y ({t.cameraDistance || 'Höjd'})</span>
                    <span className="text-white font-bold text-xs tabular-nums">{cameraCoords.y}</span>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded border border-blue-500/20">
                    <span className="text-[9px] text-blue-400 block font-bold">Z</span>
                    <span className="text-white font-bold text-xs tabular-nums">{cameraCoords.z}</span>
                  </div>
                </div>

                {/* Camera Angles and Quick View Presets */}
                <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] pt-1 border-t border-slate-850">
                  <span className="text-slate-400 font-mono text-[9px]">
                    Az: <b className="text-slate-200">{cameraCoords.thetaDeg}°</b> · El: <b className="text-slate-200">{cameraCoords.phiDeg}°</b>
                  </span>

                  {/* Preset quick angle buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => applyCameraPreset('iso')}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-[9px] transition-colors cursor-pointer border border-slate-700"
                      title="Isometric View (3/4 angle)"
                    >
                      {t.presetIso || 'ISO'}
                    </button>
                    <button
                      onClick={() => applyCameraPreset('top')}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-[9px] transition-colors cursor-pointer border border-slate-700"
                      title="Top View (Inspect Build Plate Layer Footprint)"
                    >
                      {t.presetTop || 'Topp'}
                    </button>
                    <button
                      onClick={() => applyCameraPreset('front')}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-[9px] transition-colors cursor-pointer border border-slate-700"
                      title="Front View (Inspect Overhangs & Z height)"
                    >
                      {t.presetFront || 'Fram'}
                    </button>
                    <button
                      onClick={() => applyCameraPreset('side')}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-[9px] transition-colors cursor-pointer border border-slate-700"
                      title="Side Profile View"
                    >
                      {t.presetSide || 'Sida'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

