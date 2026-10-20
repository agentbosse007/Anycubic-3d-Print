import * as THREE from 'three';

export type ProceduralTextureType =
  | 'none'
  | 'reptile_scales'
  | 'wood_grain'
  | 'leather_grain'
  | 'carbon_fiber'
  | 'sandstone_granite'
  | 'matte_pei';

export interface TexturePresetInfo {
  id: ProceduralTextureType;
  name: string;
  nameSv: string;
  category: 'organic' | 'mechanical' | 'surface';
  description: string;
  descriptionSv: string;
  recommendedBumpScale: number;
  blenderNodeSummary: string;
}

export const TEXTURE_PRESETS: TexturePresetInfo[] = [
  {
    id: 'none',
    name: 'Standard Smooth',
    nameSv: 'Slät standardyta',
    category: 'surface',
    description: 'Clean smooth CAD surface finish without procedural displacement.',
    descriptionSv: 'Ren slät CAD-yta utan mikrostuktur.',
    recommendedBumpScale: 0.0,
    blenderNodeSummary: 'Principled BSDF standard',
  },
  {
    id: 'reptile_scales',
    name: 'Reptile Scales & Chitin',
    nameSv: 'Reptilfjäll & Kitinpansar',
    category: 'organic',
    description: 'Interlocking hexagonal Voronoi scales with domed micro-ridges.',
    descriptionSv: 'Sammankopplade hexagonala Voronoi-fjäll med välvda mikrokammar.',
    recommendedBumpScale: 0.045,
    blenderNodeSummary: 'Voronoi Texture (Smooth F1) -> Bump / Displacement',
  },
  {
    id: 'wood_grain',
    name: 'Organic Wood Grain',
    nameSv: 'Naturlig Träädring',
    category: 'organic',
    description: 'Flowing sinusoidal annual rings with organic bark fiber distortion.',
    descriptionSv: 'Organiska årsringar med sinusformad fiberförvrängning.',
    recommendedBumpScale: 0.035,
    blenderNodeSummary: 'Wave Texture (Rings) + Noise Distortion -> Bump',
  },
  {
    id: 'leather_grain',
    name: 'Pebble Leather',
    nameSv: 'Naturläder (Pebble Grain)',
    category: 'organic',
    description: 'Dual-frequency organic pebble bumps with micro-crease valleys.',
    descriptionSv: 'Dubbelfrekvent narvläder med mikrosprickor och mjuk dämpning.',
    recommendedBumpScale: 0.04,
    blenderNodeSummary: 'Dual Voronoi + Musgrave Noise -> Bump Node',
  },
  {
    id: 'carbon_fiber',
    name: 'Carbon Fiber 2x2 Weave',
    nameSv: 'Kolfiberväv (2x2 Twill)',
    category: 'mechanical',
    description: 'Orthogonal interlocking carbon fiber yarn bands with anisotropic sheen.',
    descriptionSv: 'Ortogonal flätad kolfiberväv med alternerande glansreflektioner.',
    recommendedBumpScale: 0.05,
    blenderNodeSummary: 'Checker Pattern + Directional Wave -> Anisotropic BSDF',
  },
  {
    id: 'sandstone_granite',
    name: 'Sandstone & Granite',
    nameSv: 'Sandsten & Gjuten Granit',
    category: 'surface',
    description: 'Multi-octave stippled mineral roughness with realistic micro-pores.',
    descriptionSv: 'Fleroktavig mineralsträvhet med naturtrogna mikroporer.',
    recommendedBumpScale: 0.03,
    blenderNodeSummary: 'Multi-octave Noise (Roughness 0.7, Detail 12.0) -> Bump',
  },
  {
    id: 'matte_pei',
    name: 'Textured PEI Powder Coat',
    nameSv: 'Strukturerad PEI-pulverlack',
    category: 'surface',
    description: 'Anycubic Kobra gold PEI build plate fingerprint-proof satin stipple.',
    descriptionSv: 'Anycubic Kobra guld-PEI fingeravtryckssäker mikrosatinyta.',
    recommendedBumpScale: 0.025,
    blenderNodeSummary: 'High-frequency White Noise -> Micro Bump',
  },
];

// Texture cache to prevent recreating Three.js textures
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Procedurally generates a seamless canvas texture representing the micro-bump pattern
 */
export function generateProceduralBumpCanvas(
  type: ProceduralTextureType,
  resolution = 256
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imgData = ctx.createImageData(resolution, resolution);
  const data = imgData.data;

  const getNoise = (x: number, y: number) => {
    const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };

  const smoothNoise = (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    // Hermite blend
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);

    const n00 = getNoise(ix, iy);
    const n10 = getNoise(ix + 1, iy);
    const n01 = getNoise(ix, iy + 1);
    const n11 = getNoise(ix + 1, iy + 1);

    const nx0 = n00 * (1 - ux) + n10 * ux;
    const nx1 = n01 * (1 - ux) + n11 * ux;
    return nx0 * (1 - uy) + nx1 * uy;
  };

  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const idx = (y * resolution + x) * 4;
      let val = 128; // neutral gray

      if (type === 'reptile_scales') {
        // Hexagonal Voronoi grid simulation
        const scale = 14;
        const u = (x / resolution) * scale;
        const v = (y / resolution) * scale;
        const row = Math.floor(v);
        const col = Math.floor(u + (row % 2 === 1 ? 0.5 : 0));
        const cx = col + 0.5 - (row % 2 === 1 ? 0.5 : 0);
        const cy = row + 0.5;
        const dist = Math.hypot(u - cx, v - cy);
        // Domed scale top with deep border groove
        const dome = Math.max(0, 1 - dist * 1.5);
        const jitter = getNoise(col, row) * 0.15;
        val = Math.floor(Math.min(255, (dome + jitter) * 230 + 25));
      } else if (type === 'wood_grain') {
        // Sinusoidal rings distorted by smooth noise
        const u = (x / resolution) * 20;
        const v = (y / resolution) * 8;
        const noise = smoothNoise(u * 0.5, v * 0.5) * 6;
        const wave = Math.sin(u + noise);
        val = Math.floor(128 + wave * 90 + smoothNoise(u * 2, v * 2) * 35);
      } else if (type === 'leather_grain') {
        // Dual pebble Voronoi
        const u1 = (x / resolution) * 22;
        const v1 = (y / resolution) * 22;
        const cellX1 = Math.floor(u1) + 0.5;
        const cellY1 = Math.floor(v1) + 0.5;
        const d1 = Math.hypot(u1 - cellX1, v1 - cellY1);

        const u2 = (x / resolution) * 44;
        const v2 = (y / resolution) * 44;
        const d2 = Math.hypot(u2 - (Math.floor(u2) + 0.5), v2 - (Math.floor(v2) + 0.5));

        const pebble = Math.max(0, 1 - d1 * 1.8) * 0.7 + Math.max(0, 1 - d2 * 1.8) * 0.3;
        val = Math.floor(pebble * 220 + 35);
      } else if (type === 'carbon_fiber') {
        // 2x2 twill weave pattern
        const px = Math.floor((x / resolution) * 32) % 4;
        const py = Math.floor((y / resolution) * 32) % 4;
        const isH = (px < 2 && py < 2) || (px >= 2 && py >= 2);
        const sub = ((x + y) % 8) / 8;
        const band = isH ? Math.sin((x / 4) * Math.PI) : Math.sin((y / 4) * Math.PI);
        val = Math.floor(128 + band * 70 + sub * 30);
      } else if (type === 'sandstone_granite') {
        // Multi-octave stippling
        const n1 = smoothNoise(x * 0.15, y * 0.15);
        const n2 = smoothNoise(x * 0.4, y * 0.4);
        const n3 = getNoise(x, y);
        const combined = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
        val = Math.floor(combined * 255);
      } else if (type === 'matte_pei') {
        // High frequency satin stipple
        const n = getNoise(x * 3.1, y * 3.7);
        const n2 = getNoise(x * 7.9, y * 7.1);
        val = Math.floor((n * 0.6 + n2 * 0.4) * 220 + 35);
      }

      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Returns a cached Three.js CanvasTexture for the procedural bump map
 */
export function getProceduralTexture(type: ProceduralTextureType): THREE.CanvasTexture | null {
  if (type === 'none') return null;
  if (textureCache.has(type)) {
    return textureCache.get(type)!;
  }

  const canvas = generateProceduralBumpCanvas(type);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.needsUpdate = true;
  textureCache.set(type, texture);
  return texture;
}

/**
 * Generates Blender Python code to configure Shader Nodes for the given procedural texture
 */
export function generateBlenderShaderNodesForTexture(type: ProceduralTextureType, matVar = 'mat'): string {
  if (type === 'none') return '';

  switch (type) {
    case 'reptile_scales':
      return `
    # --- Procedural Reptile Scales Shader Setup ---
    nodes = ${matVar}.node_tree.nodes
    links = ${matVar}.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    
    # Texture Coordinate & Mapping
    tex_coord = nodes.new(type="ShaderNodeTexCoord")
    mapping = nodes.new(type="ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (28.0, 28.0, 28.0)
    links.new(tex_coord.outputs["Object"], mapping.inputs["Vector"])
    
    # Voronoi Scale Texture
    voronoi = nodes.new(type="ShaderNodeTexVoronoi")
    voronoi.feature = 'SMOOTH_F1'
    voronoi.inputs["Scale"].default_value = 1.0
    links.new(mapping.outputs["Vector"], voronoi.inputs["Vector"])
    
    # Bump Node
    bump = nodes.new(type="ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.45
    bump.inputs["Distance"].default_value = 0.003
    links.new(voronoi.outputs["Distance"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
`;

    case 'wood_grain':
      return `
    # --- Procedural Wood Grain Shader Setup ---
    nodes = ${matVar}.node_tree.nodes
    links = ${matVar}.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    
    tex_coord = nodes.new(type="ShaderNodeTexCoord")
    mapping = nodes.new(type="ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (8.0, 8.0, 32.0)
    links.new(tex_coord.outputs["Object"], mapping.inputs["Vector"])
    
    # Wave Texture with noise distortion
    wave = nodes.new(type="ShaderNodeTexWave")
    wave.wave_type = 'RINGS'
    wave.rings_direction = 'Z'
    wave.inputs["Scale"].default_value = 12.0
    wave.inputs["Distortion"].default_value = 3.5
    wave.inputs["Detail"].default_value = 4.0
    links.new(mapping.outputs["Vector"], wave.inputs["Vector"])
    
    bump = nodes.new(type="ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    bump.inputs["Distance"].default_value = 0.002
    links.new(wave.outputs["Color"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
`;

    case 'leather_grain':
      return `
    # --- Procedural Pebble Leather Shader Setup ---
    nodes = ${matVar}.node_tree.nodes
    links = ${matVar}.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    
    tex_coord = nodes.new(type="ShaderNodeTexCoord")
    mapping = nodes.new(type="ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (45.0, 45.0, 45.0)
    links.new(tex_coord.outputs["Object"], mapping.inputs["Vector"])
    
    voronoi = nodes.new(type="ShaderNodeTexVoronoi")
    voronoi.feature = 'F1'
    voronoi.inputs["Scale"].default_value = 1.0
    links.new(mapping.outputs["Vector"], voronoi.inputs["Vector"])
    
    noise = nodes.new(type="ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 15.0
    noise.inputs["Detail"].default_value = 6.0
    links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    
    mix_rgb = nodes.new(type="ShaderNodeMix")
    mix_rgb.data_type = 'FLOAT'
    mix_rgb.inputs["Factor"].default_value = 0.3
    links.new(voronoi.outputs["Distance"], mix_rgb.inputs[2])
    links.new(noise.outputs["Fac"], mix_rgb.inputs[3])
    
    bump = nodes.new(type="ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.4
    bump.inputs["Distance"].default_value = 0.002
    links.new(mix_rgb.outputs[0], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
`;

    case 'carbon_fiber':
      return `
    # --- Procedural Carbon Fiber 2x2 Twill Shader Setup ---
    nodes = ${matVar}.node_tree.nodes
    links = ${matVar}.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    
    tex_coord = nodes.new(type="ShaderNodeTexCoord")
    mapping = nodes.new(type="ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (60.0, 60.0, 60.0)
    links.new(tex_coord.outputs["Object"], mapping.inputs["Vector"])
    
    wave1 = nodes.new(type="ShaderNodeTexWave")
    wave1.wave_type = 'BANDS'
    wave1.inputs["Scale"].default_value = 1.0
    links.new(mapping.outputs["Vector"], wave1.inputs["Vector"])
    
    bump = nodes.new(type="ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.5
    bump.inputs["Distance"].default_value = 0.0015
    links.new(wave1.outputs["Color"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    
    # Metallic & Anisotropic sheen for authentic carbon reflection
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.65
    if "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = 0.25
`;

    case 'sandstone_granite':
      return `
    # --- Procedural Sandstone & Granite Shader Setup ---
    nodes = ${matVar}.node_tree.nodes
    links = ${matVar}.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    
    tex_coord = nodes.new(type="ShaderNodeTexCoord")
    noise = nodes.new(type="ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 85.0
    noise.inputs["Detail"].default_value = 12.0
    noise.inputs["Roughness"].default_value = 0.75
    links.new(tex_coord.outputs["Object"], noise.inputs["Vector"])
    
    bump = nodes.new(type="ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.3
    bump.inputs["Distance"].default_value = 0.002
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    
    if "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = 0.85
`;

    case 'matte_pei':
      return `
    # --- Procedural Textured PEI Powder Coat Shader Setup ---
    nodes = ${matVar}.node_tree.nodes
    links = ${matVar}.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    
    tex_coord = nodes.new(type="ShaderNodeTexCoord")
    noise = nodes.new(type="ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 160.0
    noise.inputs["Detail"].default_value = 8.0
    noise.inputs["Roughness"].default_value = 0.9
    links.new(tex_coord.outputs["Object"], noise.inputs["Vector"])
    
    bump = nodes.new(type="ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.2
    bump.inputs["Distance"].default_value = 0.001
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    
    if "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = 0.55
`;

    default:
      return '';
  }
}
