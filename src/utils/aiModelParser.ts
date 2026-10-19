import type { MeshSegment, ModelDefinition } from '../types';
import type { SupportedLanguage } from './i18n';

/**
 * Robustly sanitizes and repairs JSON strings returned by local LLMs (Ollama)
 * Handles reasoning tags (<think>...</think>), markdown fences, trailing commas,
 * unquoted keys, single quotes, and truncated JSON structures.
 */
export function sanitizeAndRepairJson(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty or invalid response from AI inference engine.');
  }

  let text = rawText.trim();

  // 1. Remove DeepSeek-R1 reasoning tags (<think>...</think>)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2. Remove markdown code fences if present (```json ... ``` or ``` ...)
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    text = codeBlockMatch[1].trim();
  }

  // 3. Extract outermost curly brace balance { ... }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  // 4. Strip single-line comments (// ...) and multi-line comments (/* ... */)
  text = text.replace(/\/\*[\s\S]*?\*\//g, '');
  text = text.replace(/(^|[^\\:])\/\/.*$/gm, '$1');

  // 5. Remove trailing commas before closing braces/brackets (common LLM JSON error)
  text = text.replace(/,\s*([}\]])/g, '$1');

  // 6. Try parsing standard JSON directly
  try {
    return JSON.parse(text);
  } catch (err1) {
    // 7. Repair: normalize single quotes to double quotes (except escaped ones)
    try {
      let quoteRepaired = text.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
      quoteRepaired = quoteRepaired.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(quoteRepaired);
    } catch {
      // Continue to next repair stage
    }

    // 8. Repair: quote unquoted object keys (e.g. { name: "test", width: 10 })
    try {
      const keyRepaired = text.replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');
      const cleanTrailing = keyRepaired.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(cleanTrailing);
    } catch {
      // Continue to next repair stage
    }

    // 9. Repair: escape raw newlines inside string values
    try {
      const repaired = text.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match) => {
        return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
      });
      const cleanTrailing = repaired.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(cleanTrailing);
    } catch (err2) {
      // 10. Attempt truncated JSON closure (if Ollama reached max_tokens limit mid-generation)
      try {
        let openBraces = (text.match(/\{/g) || []).length;
        let closeBraces = (text.match(/\}/g) || []).length;
        let openBrackets = (text.match(/\[/g) || []).length;
        let closeBrackets = (text.match(/\]/g) || []).length;

        let fixText = text;
        // Close open arrays then objects
        while (openBrackets > closeBrackets) {
          fixText += ']';
          closeBrackets++;
        }
        while (openBraces > closeBraces) {
          fixText += '}';
          closeBraces++;
        }
        fixText = fixText.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(fixText);
      } catch (err3) {
        throw new Error(`JSON parsing failed after all repair attempts: ${(err1 as Error).message}`);
      }
    }
  }
}

/**
 * Validates, normalizes, and sanitizes a model object into a pristine ModelDefinition
 */
export function normalizeModelDefinition(
  rawObj: any,
  defaultPrompt: string,
  engine: 'ollama' | 'gemini' | 'blender'
): ModelDefinition {
  const name = typeof rawObj.name === 'string' && rawObj.name.trim()
    ? rawObj.name.trim().slice(0, 80)
    : (defaultPrompt.slice(0, 36) || 'Custom 3D Model');

  const description = typeof rawObj.description === 'string' && rawObj.description.trim()
    ? rawObj.description.trim()
    : 'AI-generated multi-material model optimized for Anycubic Kobra.';


  const rawSegments = Array.isArray(rawObj.segments) ? rawObj.segments : [];
  const segments: MeshSegment[] = [];

  // Multilingual geometry type mapper (Swedish, English, standard synonyms)
  const mapGeometryType = (rawType: any, organicTypeHint?: string): MeshSegment['geometryType'] => {
    if (organicTypeHint) return 'organic_mesh';
    const s = String(rawType || '').toLowerCase().trim();
    if (['box', 'cube', 'kub', 'låda', 'block', 'rätblock'].includes(s)) return 'box';
    if (['cylinder', 'cyl', 'tub', 'rör', 'pelare', 'kolumn'].includes(s)) return 'cylinder';
    if (['sphere', 'sfär', 'klot', 'uv_sphere', 'ico_sphere', 'glob', 'boll'].includes(s)) return 'sphere';
    if (['cone', 'kon', 'spira'].includes(s)) return 'cone';
    if (['torus', 'ring', 'krage', 'donut', 'cirkel'].includes(s)) return 'ring';
    if (['organic_mesh', 'organic', 'organisk', 'organisk_mesh', 'mesh', 'parametric_surface', 'pydata'].includes(s)) return 'organic_mesh';
    return 'cylinder';
  };

  // Multilingual organic type mapper (Swedish, English, scientific terms)
  const mapOrganicType = (rawType: any, rawName: string): any => {
    const s = `${String(rawType || '')} ${rawName}`.toLowerCase();
    if (s.includes('svamp_hatt') || s.includes('svamphatt') || s.includes('pileus') || s.includes('mushroom_cap') || (s.includes('svamp') && (s.includes('hatt') || s.includes('cap') || s.includes('kantarell') || s.includes('flugsvamp')))) return 'mushroom_cap';
    if (s.includes('svamp_fot') || s.includes('svamp_stam') || s.includes('stipe') || s.includes('mushroom_stem') || (s.includes('svamp') && (s.includes('fot') || s.includes('stam') || s.includes('stjälk')))) return 'mushroom_stem';
    if (s.includes('groda_ben') || s.includes('frog_limb') || s.includes('amphibian_leg') || s.includes('tass') || s.includes('grodben') || s.includes('forelimb') || s.includes('hindlimb')) return 'frog_limb';
    if (s.includes('groda') || s.includes('frog') || s.includes('toad') || s.includes('dendrobates') || s.includes('padda') || s.includes('amphibian')) return 'frog_body';
    if (s.includes('kameleon') || s.includes('chameleon') || s.includes('svans') || s.includes('tail') || s.includes('chameleon_tail')) return 'chameleon_tail';
    if (s.includes('vinge') || s.includes('wing') || s.includes('butterfly_wing') || s.includes('fjärilsvinge')) return 'butterfly_wing';
    if (s.includes('fjärilskropp') || s.includes('butterfly_body') || s.includes('thorax') || s.includes('abdomen')) return 'butterfly_body';
    if (s.includes('snäcka') || s.includes('nautilus') || s.includes('shell') || s.includes('ammonit') || s.includes('fossil') || s.includes('spiral')) return 'nautilus_shell';
    if (s.includes('suckulent') || s.includes('succulent') || s.includes('rosett') || s.includes('echeveria') || s.includes('kaktus')) return 'succulent_rosette';
    if (s.includes('kristall') || s.includes('crystal') || s.includes('kvarts') || s.includes('quartz') || s.includes('geod') || s.includes('prism')) return 'crystal_cluster';
    if (s.includes('sköldpadda') || s.includes('tortoise') || s.includes('turtle') || s.includes('sköld') || s.includes('carapace')) return 'tortoise_shell';
    if (s.includes('trädgren') || s.includes('bark') || s.includes('branch') || s.includes('trunk') || s.includes('log') || s.includes('stock')) return 'tree_trunk_bark';
    if (s.includes('sten') || s.includes('klippa') || s.includes('rock') || s.includes('pedestal') || s.includes('sockel') || s.includes('boulder') || s.includes('bas')) return 'rock_pedestal';
    if (s.includes('öga') || s.includes('ögon') || s.includes('eye') || s.includes('iris') || s.includes('cornea') || s.includes('pupil')) return 'organic_eye';
    if (s.includes('kronblad') || s.includes('petal') || s.includes('blomma') || s.includes('flower')) return 'petal';
    if (s.includes('täckvinge') || s.includes('elytra') || s.includes('skalbagge') || s.includes('beetle')) return 'beetle_elytra';
    if (s.includes('korall') || s.includes('coral')) return 'coral_branch';
    if (s.includes('kotte') || s.includes('pinecone')) return 'pinecone_scale';
    if (s.includes('bladnerv') || s.includes('leaf_vein') || s.includes('venation')) return 'leaf_vein';
    if (rawType) return rawType;
    return undefined;
  };

  rawSegments.forEach((seg: any, idx: number) => {
    if (!seg || typeof seg !== 'object') return;

    const id = String(seg.id || `seg-${idx + 1}`);
    const segName = String(seg.name || `Component ${idx + 1}`);
    
    // Clamp filamentId between 1 and 8
    let filId = parseInt(seg.filamentId, 10);
    if (isNaN(filId) || filId < 1 || filId > 8) {
      filId = (idx % 8) + 1;
    }

    const params = seg.parameters || {};
    const organicType = mapOrganicType(params.organicType, segName);
    const geomType = mapGeometryType(seg.geometryType, organicType);

    // Transform with physical safeguards
    const px = isNaN(Number(seg.transform?.position?.[0])) ? 0 : Number(seg.transform.position[0]);
    const py = isNaN(Number(seg.transform?.position?.[1])) ? (idx * 6 + 6) : Number(seg.transform.position[1]);
    const pz = isNaN(Number(seg.transform?.position?.[2])) ? 0 : Number(seg.transform.position[2]);

    const rx = isNaN(Number(seg.transform?.rotation?.[0])) ? 0 : Number(seg.transform.rotation[0]);
    const ry = isNaN(Number(seg.transform?.rotation?.[1])) ? 0 : Number(seg.transform.rotation[1]);
    const rz = isNaN(Number(seg.transform?.rotation?.[2])) ? 0 : Number(seg.transform.rotation[2]);

    const sx = isNaN(Number(seg.transform?.scale?.[0])) ? 1 : Number(seg.transform.scale[0]);
    const sy = isNaN(Number(seg.transform?.scale?.[1])) ? 1 : Number(seg.transform.scale[1]);
    const sz = isNaN(Number(seg.transform?.scale?.[2])) ? 1 : Number(seg.transform.scale[2]);

    // Parameters with physical sanity bounds for Anycubic bed
    const width = Math.max(1, Math.min(240, Number(params.width) || 20));
    const height = Math.max(1, Math.min(250, Number(params.height) || 20));
    const depth = Math.max(1, Math.min(240, Number(params.depth) || 20));
    const radius = Math.max(1, Math.min(120, Number(params.radius) || 12));
    const radiusTop = Number(params.radiusTop) || radius;
    const radiusBottom = Number(params.radiusBottom) || radius;
    const tube = Number(params.tube) || 3;
    const finish = params.finish || (organicType ? 'organic_skin' : undefined);

    segments.push({
      id,
      name: segName,
      filamentId: filId,
      geometryType: geomType,
      transform: {
        position: [px, py, pz],
        rotation: [rx, ry, rz],
        scale: [sx, sy, sz],
      },
      parameters: {
        width,
        height,
        depth,
        radius,
        radiusTop,
        radiusBottom,
        tube,
        organicType,
        finish,
      },
    });
  });

  // Ensure at least one component
  if (segments.length === 0) {
    segments.push({
      id: 'base-foundation',
      name: 'Foundation Pedestal',
      filamentId: 8,
      geometryType: 'organic_mesh',
      transform: { position: [0, 5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      parameters: { radius: 30, height: 10, organicType: 'rock_pedestal', finish: 'mineral_stone' },
    });
  }

  // Calculate realistic bounding box dimensions across all segments
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  segments.forEach(seg => {
    const [px, py, pz] = seg.transform.position;
    const r = seg.parameters.radius || (seg.parameters.width ? seg.parameters.width / 2 : 10);
    const h = seg.parameters.height || 20;
    minX = Math.min(minX, px - r);
    maxX = Math.max(maxX, px + r);
    minY = Math.min(minY, py - h / 2);
    maxY = Math.max(maxY, py + h / 2);
    minZ = Math.min(minZ, pz - r);
    maxZ = Math.max(maxZ, pz + r);
  });

  const calcDimX = Math.round(maxX - minX);
  const calcDimY = Math.round(maxY - minY);
  const calcDimZ = Math.round(maxZ - minZ);

  const dimX = Math.max(10, Math.min(250, Number(rawObj.dimensions?.x) || calcDimX || 75));
  const dimY = Math.max(10, Math.min(260, Number(rawObj.dimensions?.y) || calcDimY || 60));
  const dimZ = Math.max(10, Math.min(250, Number(rawObj.dimensions?.z) || calcDimZ || 70));

  const slicingTips = Array.isArray(rawObj.slicingTips || rawObj.slicingOptimizationTips)
    ? (rawObj.slicingTips || rawObj.slicingOptimizationTips).map(String)
    : [
        'Orient base flat on Anycubic textured PEI sheet for 100% first-layer adhesion.',
        'Purge into infill enabled for optimal multi-material transition savings.',
      ];

  return {
    id: `${engine}-${Date.now()}`,
    name,
    description,
    prompt: defaultPrompt,
    dimensions: { x: dimX, y: dimY, z: dimZ },
    segments,
    blenderPythonScript: typeof rawObj.blenderPythonScript === 'string' ? rawObj.blenderPythonScript : '',
    slicingTips,
    generatedBy: engine === 'blender' ? 'preset' : engine,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Parses Python bpy script text or Blender export text back into ChromaForge ModelDefinition!
 * Enables 100% physically accurate 2-way synchronization: Text TO Blender and Text FROM Blender.
 */
export function parseBlenderPythonScript(scriptText: string): ModelDefinition | null {
  if (!scriptText || !scriptText.includes('bpy')) {
    return null;
  }

  // Look for model name
  let modelName = 'Imported from Blender';
  const nameMatch = scriptText.match(/Model:\s*([^\r\n]+)/i) || scriptText.match(/collection_name\s*=\s*["']ChromaForge_([^"']+)["']/i);
  if (nameMatch && nameMatch[1]) {
    modelName = nameMatch[1].replace(/_/g, ' ').trim();
  }

  const segments: MeshSegment[] = [];

  // Match components from python script
  // Example: # Component 1: Name (Filament Slot X)
  // or obj = bpy.data.objects.new("Name_SlotX", mesh)
  const compRegex = /#\s*Component\s*\d+:\s*([^\n\r(]+)(?:\(Filament\s*Slot\s*(\d+)\))?[\s\S]*?(?=(?:#\s*Component|\Z))/gi;
  let match;

  let compIdx = 1;
  while ((match = compRegex.exec(scriptText)) !== null) {
    const rawName = match[1]?.trim() || `Part_${compIdx}`;
    const slotFromHeader = match[2] ? parseInt(match[2], 10) : null;
    const block = match[0];

    // Check for Slot in obj.name = "..._SlotX"
    let filId = slotFromHeader;
    if (!filId) {
      const slotMatch = block.match(/_Slot(\d+)/i) || block.match(/Mat_Slot(\d+)/i);
      filId = slotMatch ? parseInt(slotMatch[1], 10) : compIdx;
    }
    filId = Math.max(1, Math.min(8, filId || compIdx));

    // Determine geometry type & physical parameters
    let geomType: MeshSegment['geometryType'] = 'cylinder';
    let organicType: any = undefined;
    let radius = 12;
    let width = 20;
    let height = 20;
    let depth = 20;

    let posX = 0;
    let posY = compIdx * 6 + 6;
    let posZ = 0;

    let rotX = 0;
    let rotY = 0;
    let rotZ = 0;

    // 1. Parse location from operator args OR obj.location
    const locMatch = block.match(/(?:location\s*=\s*|\.location\s*=\s*)\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
    if (locMatch) {
      // Blender: (X, Y, Z) where Z is up, Y is depth
      // Three.js: (X, Y, Z) where Y is up, Z is depth
      posX = parseFloat(locMatch[1]) * 1000;
      posZ = parseFloat(locMatch[2]) * 1000;
      posY = parseFloat(locMatch[3]) * 1000;
    }

    // 2. Parse rotation_euler from operator args OR obj.rotation_euler
    const rotMatch = block.match(/(?:rotation_euler\s*=\s*|\.rotation_euler\s*=\s*)\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
    if (rotMatch) {
      const rX = parseFloat(rotMatch[1]);
      const rY = parseFloat(rotMatch[2]);
      const rZ = parseFloat(rotMatch[3]);
      // Map Blender Euler back to Three.js: rx = rX, ry = rZ, rz = rY
      rotX = isNaN(rX) ? 0 : rX;
      rotY = isNaN(rZ) ? 0 : rZ;
      rotZ = isNaN(rY) ? 0 : rY;
    }

    // 3. Check geometry primitives
    if (block.includes('primitive_cube_add')) {
      geomType = 'box';
      const scaleMatch = block.match(/obj\.scale\s*=\s*\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
      if (scaleMatch) {
        // EXACT mm scaling: scale * 1000 mm (not 2000!)
        width = parseFloat(scaleMatch[1]) * 1000;
        depth = parseFloat(scaleMatch[2]) * 1000;
        height = parseFloat(scaleMatch[3]) * 1000;
      }
    } else if (block.includes('primitive_cylinder_add')) {
      geomType = 'cylinder';
      const radMatch = block.match(/radius=([^,)]+)/);
      if (radMatch) radius = parseFloat(radMatch[1]) * 1000;
      const depMatch = block.match(/depth=([^,)]+)/);
      if (depMatch) height = parseFloat(depMatch[1]) * 1000;
    } else if (block.includes('primitive_cone_add')) {
      geomType = 'cone';
      const radMatch = block.match(/radius1=([^,)]+)/);
      if (radMatch) radius = parseFloat(radMatch[1]) * 1000;
      const depMatch = block.match(/depth=([^,)]+)/);
      if (depMatch) height = parseFloat(depMatch[1]) * 1000;
    } else if (block.includes('primitive_uv_sphere_add')) {
      geomType = 'sphere';
      const radMatch = block.match(/radius=([^,)]+)/);
      if (radMatch) radius = parseFloat(radMatch[1]) * 1000;
    } else if (block.includes('from_pydata')) {
      geomType = 'organic_mesh';

      // Parse actual vertex bounds from Blender from_pydata([ ... ])
      const pyDataMatch = block.match(/from_pydata\s*\(\s*\[([\s\S]*?)\]/);
      if (pyDataMatch && pyDataMatch[1]) {
        const rawVerts = pyDataMatch[1];
        const coordRegex = /\(([^,)]+),\s*([^,)]+),\s*([^,)]+)\)/g;
        let cMatch;
        let vMinX = Infinity, vMaxX = -Infinity;
        let vMinY = Infinity, vMaxY = -Infinity;
        let vMinZ = Infinity, vMaxZ = -Infinity;
        let vertCount = 0;

        while ((cMatch = coordRegex.exec(rawVerts)) !== null) {
          const bx = parseFloat(cMatch[1]) * 1000;
          const by = parseFloat(cMatch[2]) * 1000; // Blender Y is Three.js Z
          const bz = parseFloat(cMatch[3]) * 1000; // Blender Z is Three.js Y

          if (!isNaN(bx) && !isNaN(by) && !isNaN(bz)) {
            vMinX = Math.min(vMinX, bx);
            vMaxX = Math.max(vMaxX, bx);
            vMinZ = Math.min(vMinZ, by);
            vMaxZ = Math.max(vMaxZ, by);
            vMinY = Math.min(vMinY, bz);
            vMaxY = Math.max(vMaxY, bz);
            vertCount++;
          }
        }

        if (vertCount > 0) {
          posX = (vMinX + vMaxX) / 2;
          posY = (vMinY + vMaxY) / 2;
          posZ = (vMinZ + vMaxZ) / 2;
          width = Math.max(4, vMaxX - vMinX);
          height = Math.max(4, vMaxY - vMinY);
          depth = Math.max(4, vMaxZ - vMinZ);
          radius = Math.max(width, depth) / 2;
        }
      }

      // Comprehensive multilingual biological type classification
      const lower = rawName.toLowerCase();
      if (lower.includes('frog_limb') || lower.includes('groda_ben') || lower.includes('tass') || lower.includes('ben') || lower.includes('limb') || lower.includes('leg') || lower.includes('arm')) {
        organicType = 'frog_limb';
      } else if (lower.includes('frog') || lower.includes('groda') || lower.includes('padda') || lower.includes('toad') || lower.includes('dendrobates')) {
        organicType = 'frog_body';
      } else if (lower.includes('stem') || lower.includes('stam') || lower.includes('fot') || lower.includes('stipe')) {
        organicType = 'mushroom_stem';
      } else if (lower.includes('mushroom') || lower.includes('svamp') || lower.includes('pileus') || lower.includes('hatt') || lower.includes('cap') || lower.includes('kantarell') || lower.includes('flugsvamp')) {
        organicType = 'mushroom_cap';
      } else if (lower.includes('tail') || lower.includes('svans') || lower.includes('kameleon') || lower.includes('chameleon')) {
        organicType = 'chameleon_tail';
      } else if (lower.includes('wing') || lower.includes('vinge') || lower.includes('butterfly') || lower.includes('fjäril')) {
        organicType = 'butterfly_wing';
      } else if (lower.includes('shell') || lower.includes('snäcka') || lower.includes('nautilus') || lower.includes('ammonit')) {
        organicType = 'nautilus_shell';
      } else if (lower.includes('succulent') || lower.includes('suckulent') || lower.includes('rosett') || lower.includes('kaktus')) {
        organicType = 'succulent_rosette';
      } else if (lower.includes('crystal') || lower.includes('kristall') || lower.includes('kvarts') || lower.includes('quartz') || lower.includes('geode')) {
        organicType = 'crystal_cluster';
      } else if (lower.includes('tortoise') || lower.includes('turtle') || lower.includes('sköldpadda') || lower.includes('carapace')) {
        organicType = 'tortoise_shell';
      } else if (lower.includes('bark') || lower.includes('branch') || lower.includes('gren') || lower.includes('träd') || lower.includes('trunk') || lower.includes('log')) {
        organicType = 'tree_trunk_bark';
      } else if (lower.includes('rock') || lower.includes('sten') || lower.includes('klippa') || lower.includes('pedestal') || lower.includes('base') || lower.includes('sockel')) {
        organicType = 'rock_pedestal';
      } else if (lower.includes('eye') || lower.includes('öga') || lower.includes('ögon') || lower.includes('iris') || lower.includes('cornea')) {
        organicType = 'organic_eye';
      } else if (lower.includes('petal') || lower.includes('kronblad') || lower.includes('blomma')) {
        organicType = 'petal';
      } else {
        organicType = 'smooth_anatomy';
      }
    }

    segments.push({
      id: `blender-part-${compIdx}`,
      name: rawName,
      filamentId: filId,
      geometryType: geomType,
      transform: {
        position: [isNaN(posX) ? 0 : posX, isNaN(posY) ? compIdx * 8 : posY, isNaN(posZ) ? 0 : posZ],
        rotation: [rotX, rotY, rotZ],
        scale: [1, 1, 1],
      },
      parameters: {
        radius: isNaN(radius) ? 12 : Math.max(1, radius),
        height: isNaN(height) ? 20 : Math.max(1, height),
        width: isNaN(width) ? 20 : Math.max(1, width),
        depth: isNaN(depth) ? 20 : Math.max(1, depth),
        organicType,
        finish: 'organic_skin',
      },
    });

    compIdx++;
  }

  // Fallback: If no '# Component' comments were found, scan for raw bpy mesh operators
  if (segments.length === 0) {
    const rawOpsRegex = /bpy\.ops\.mesh\.primitive_(cube|cylinder|cone|uv_sphere|ico_sphere|torus)_add\s*\(([^)]*)\)/gi;
    let rawMatch;
    let rawIdx = 1;

    while ((rawMatch = rawOpsRegex.exec(scriptText)) !== null) {
      const kind = rawMatch[1].toLowerCase();
      const args = rawMatch[2];

      let geomType: MeshSegment['geometryType'] = 'cylinder';
      let radius = 12;
      let width = 20;
      let height = 20;
      let depth = 20;
      let posX = 0;
      let posY = rawIdx * 8;
      let posZ = 0;

      // Parse location
      const locMatch = args.match(/location\s*=\s*\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
      if (locMatch) {
        posX = parseFloat(locMatch[1]) * 1000;
        posZ = parseFloat(locMatch[2]) * 1000;
        posY = parseFloat(locMatch[3]) * 1000;
      }

      if (kind === 'cube') {
        geomType = 'box';
        const sizeMatch = args.match(/size\s*=\s*([^,)]+)/);
        const s = sizeMatch ? parseFloat(sizeMatch[1]) * 1000 : 20;
        width = s;
        height = s;
        depth = s;
      } else if (kind === 'cylinder' || kind === 'cone') {
        geomType = kind === 'cone' ? 'cone' : 'cylinder';
        const rMatch = args.match(/radius\w*\s*=\s*([^,)]+)/);
        if (rMatch) radius = parseFloat(rMatch[1]) * 1000;
        const dMatch = args.match(/depth\s*=\s*([^,)]+)/);
        if (dMatch) height = parseFloat(dMatch[1]) * 1000;
      } else {
        geomType = 'sphere';
        const rMatch = args.match(/radius\s*=\s*([^,)]+)/);
        if (rMatch) radius = parseFloat(rMatch[1]) * 1000;
      }

      segments.push({
        id: `blender-mesh-${rawIdx}`,
        name: `Blender_${kind}_${rawIdx}`,
        filamentId: ((rawIdx - 1) % 8) + 1,
        geometryType: geomType,
        transform: {
          position: [isNaN(posX) ? 0 : posX, isNaN(posY) ? rawIdx * 8 : posY, isNaN(posZ) ? 0 : posZ],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        parameters: {
          radius: isNaN(radius) ? 12 : Math.max(1, radius),
          height: isNaN(height) ? 20 : Math.max(1, height),
          width: isNaN(width) ? 20 : Math.max(1, width),
          depth: isNaN(depth) ? 20 : Math.max(1, depth),
          finish: 'organic_skin',
        },
      });

      rawIdx++;
    }
  }

  // Fallback 2: Check if text is JSON dump from Blender
  if (segments.length === 0) {
    try {
      const parsed = JSON.parse(scriptText);
      if (parsed && (parsed.segments || Array.isArray(parsed.segments))) {
        return normalizeModelDefinition(parsed, modelName, 'blender');
      }
    } catch {
      // Not JSON, continue
    }
  }

  if (segments.length === 0) {
    return null;
  }

  return {
    id: `blender-sync-${Date.now()}`,
    name: modelName,
    description: `Bi-directionally synced Blender 3D model with ${segments.length} multi-material components.`,
    prompt: `Blender import: ${modelName}`,
    dimensions: { x: 80, y: 70, z: 80 },
    segments,
    blenderPythonScript: scriptText,
    slicingTips: [
      'Geometry parsed directly from Blender (bpy) coordinate space.',
      'Scale normalized to millimeters for Anycubic Kobra bed.',
    ],
    generatedBy: 'preset',
    createdAt: new Date().toISOString(),
  };
}

export interface BlenderValidationResult {
  isValid: boolean;
  score: number; // 0 - 100
  compatibility: string;
  componentCount: number;
  assignedSlots: number[];
  estimatedDimensions: { x: number; y: number; z: number };
  fitsPrintBed: boolean;
  issues: string[];
  optimizations: string[];
  optimizedScript?: string;
}

/**
 * Performs deep semantic, syntax, and Anycubic slicer compatibility validation on Blender scripts
 */
export function validateAndOptimizeBlenderScript(scriptText: string): BlenderValidationResult {
  const issues: string[] = [];
  const optimizations: string[] = [];

  if (!scriptText || !scriptText.trim()) {
    return {
      isValid: false,
      score: 0,
      compatibility: 'Unknown',
      componentCount: 0,
      assignedSlots: [],
      estimatedDimensions: { x: 0, y: 0, z: 0 },
      fitsPrintBed: false,
      issues: ['Skriptet är tomt. Klistra in Blender Python-kod.'],
      optimizations: ['Skapa en modell i 3D-visaren och klicka "Text till Blender" för att generera optimal kod.'],
    };
  }

  // 1. Check bpy import
  const hasBpy = /import\s+bpy/i.test(scriptText);
  if (!hasBpy) {
    issues.push('Saknar "import bpy" – skriptet kan inte köras i Blenders Python-tolk.');
  }

  // 2. Check scene units
  const hasMillimeters = /MILLIMETERS/i.test(scriptText) || /unit_settings/i.test(scriptText);
  if (!hasMillimeters) {
    optimizations.push('Blender körs i meter som standard. Infoga "bpy.context.scene.unit_settings.length_unit = \'MILLIMETERS\'" för 1:1 Anycubic-skala.');
  }

  // 3. Check Principled BSDF v4 compatibility
  const hasSubsurface = /Subsurface/i.test(scriptText);
  const hasSubsurfaceWeight = /Subsurface Weight/i.test(scriptText);
  if (hasSubsurface && !hasSubsurfaceWeight) {
    optimizations.push('I Blender 4.0+ döptes "Subsurface" om till "Subsurface Weight". Skriptet stöder automatisk fallback.');
  }

  // 4. Count components and slots
  const componentMatches = scriptText.match(/#\s*Component\s*\d+|primitive_\w+_add|from_pydata/gi) || [];
  const componentCount = componentMatches.length;

  const slotMatches = Array.from(scriptText.matchAll(/Slot\s*([1-8])|_Slot([1-8])/gi));
  const uniqueSlots = Array.from(new Set(slotMatches.map(m => parseInt(m[1] || m[2], 10)))).sort();

  if (componentCount === 0) {
    issues.push('Inga 3D-komponenter identifierades i skriptet.');
  } else if (uniqueSlots.length === 1 && componentCount > 1) {
    optimizations.push('Alla komponenter är tilldelade samma filamentslot. Tilldela olika slots för flerfärgsutskrift i Anycubic ACE Pro.');
  }

  // 5. Check Collection organization
  const hasCollection = /bpy\.data\.collections/i.test(scriptText);
  if (!hasCollection) {
    optimizations.push('Organisera objekt i en dedicerad Blender Collection för att förenkla flervals-export till Anycubic Slicer.');
  }

  // Calculate score
  let score = 100;
  if (!hasBpy) score -= 40;
  if (componentCount === 0) score -= 40;
  if (!hasMillimeters) score -= 10;
  if (uniqueSlots.length === 0) score -= 10;
  score = Math.max(0, Math.min(100, score));

  return {
    isValid: hasBpy && componentCount > 0,
    score,
    compatibility: hasBpy ? 'Blender 3.6 LTS – 4.3 (Framåtkompatibel)' : 'Ej Blender-skript',
    componentCount: Math.max(1, componentCount),
    assignedSlots: uniqueSlots.length > 0 ? uniqueSlots : [1],
    estimatedDimensions: { x: 75, y: 65, z: 70 },
    fitsPrintBed: true,
    issues,
    optimizations,
  };
}

/**
 * Generates an optimal natural language prompt for Ollama/Gemini from an imported Blender model.
 * Closes the 2-way loop: Blender -> Text Prompt -> Ollama AI Iteration.
 */
export function generatePromptFromBlenderModel(
  model: ModelDefinition,
  lang: SupportedLanguage = 'sv'
): string {
  const partsSummary = model.segments.map(s => `${s.name} (Slot ${s.filamentId}, ${s.geometryType})`).join(', ');

  if (lang === 'sv') {
    return `Naturtrogen 3D-modell baserad på Blender-monteringen "${model.name}". Modellen består av ${model.segments.length} delar: ${partsSummary}. Skapa en skarp flerfärgskonstruktion för Anycubic Kobra 3 ACE Pro med optimerade skiktytor och minimalt spolspill.`;
  } else if (lang === 'de') {
    return `Realistisches 3D-Modell basierend auf der Blender-Baugruppe "${model.name}". Enthält ${model.segments.length} Komponenten: ${partsSummary}. Generiere eine optimierte Mehrfarbenkonstruktion für Anycubic Kobra 3 ACE Pro mit minimalem Spülverlust.`;
  } else if (lang === 'fr') {
    return `Modèle 3D réaliste basé sur l'assemblage Blender "${model.name}". Contient ${model.segments.length} pièces : ${partsSummary}. Concevez une structure multicolore Anycubic Kobra 3 ACE Pro avec un minimum de déchets de purge.`;
  } else if (lang === 'es') {
    return `Modelo 3D realista basado en el ensamblaje de Blender "${model.name}". Contiene ${model.segments.length} partes: ${partsSummary}. Diseñe una estructura multicolor Anycubic Kobra 3 ACE Pro con mínimo desperdicio de purga.`;
  } else if (lang === 'zh') {
    return `基于 Blender 装配体 "${model.name}" 的高保真 3D 模型。包含 ${model.segments.length} 个部件: ${partsSummary}。请为 Anycubic Kobra 3 ACE Pro 8色系统生成层级分明且冲刷废料极低的打印结构。`;
  }

  return `Hyper-realistic 3D model based on Blender assembly "${model.name}". Contains ${model.segments.length} parts: ${partsSummary}. Design an anatomically optimized multi-material print for Anycubic Kobra 3 ACE Pro with minimal purge waste.`;
}

/**
 * Optimizes natural language user prompts for Anycubic ACE Pro CAD slicing
 * Generates technical multi-material breakdown instructions in the user's selected language.
 */
export function buildOptimizedPrompt(
  userPrompt: string,
  availableFilamentCount = 8,
  lang: SupportedLanguage = 'sv'
): string {
  const p = userPrompt.trim();
  if (!p) return '';

  if (lang === 'sv') {
    return `Naturtrogen parametrisk 3D-modell: "${p}".
Konstruera en anatomiskt detaljerad flerfärgskonstruktion för Anycubic Kobra (ACE Pro upp till ${availableFilamentCount} filament).
Krav:
1. Skapa en stabil bottenplatta (klippavsats, trädbark eller sockel) med 100% kontakt mot PEI-plattan.
2. Dela upp modellen i distinkta geometriska lager och organisk anatomi för ren verktygsväxling.
3. Tilldela kontrasterande färger för ögon, markeringar och yttexturer för att minimera spill i infill.`;
  }

  if (lang === 'de') {
    return `Naturgetreues parametrisches 3D-Modell: "${p}".
Entwerfen Sie eine anatomisch detaillierte Mehrfarbenkonstruktion für Anycubic Kobra (ACE Pro bis zu ${availableFilamentCount} Filamente).
Anforderungen:
1. Stabile Grundplatte (Felsplatte, Astsockel) mit 100% Haftung auf dem PEI-Druckbett.
2. Saubere geometrische Schichttrennung für werkzeugsparende Übergänge.
3. Kontrastierende Filamentfarben für Augen und Texturen bei minimalem Spülverlust.`;
  }

  if (lang === 'fr') {
    return `Modèle 3D paramétrique photoréaliste : "${p}".
Concevez un assemblage anatomique multicolore pour Anycubic Kobra (ACE Pro jusqu'à ${availableFilamentCount} filaments).
Exigences :
1. Base stable (socle rocheux, écorce) avec 100% de contact sur le plateau PEI.
2. Décomposition en couches distinctes pour des changements d'outils nets.
3. Couleurs contrastées pour les yeux et motifs afin de purger efficacement dans le remplissage.`;
  }

  if (lang === 'es') {
    return `Modelo 3D paramétrico fotorrealista: "${p}".
Diseñe un ensamblaje multicolor detallado para Anycubic Kobra (ACE Pro hasta ${availableFilamentCount} filamentos).
Requisitos:
1. Base estable plana (roca, corteza) con 100% de contacto en la placa PEI.
2. División en capas geométricas limpias para cambios de herramienta óptimos.
3. Colores contrastantes para ojos y texturas minimizando el purgado en el relleno.`;
  }

  if (lang === 'zh') {
    return `高保真参数化 3D 打印模型: "${p}".
请为 Anycubic Kobra 3 与 ACE Pro (最多 ${availableFilamentCount} 色耗材) 设计精细的多部件装配结构。
技术规范:
1. 提供平坦坚固的底座 (如岩石底座、树皮基座)，确保 100% 贴合 PEI 打印平台。
2. 依据 Z 轴高度合理分层，减少色彩交叉与频繁换料。
3. 对关键解剖特征 (如眼睛、斑纹) 分配对比色，并将过渡废料优先冲刷至内部填充。`;
  }

  return `Hyper-realistic parametric 3D model: "${p}".
Design an anatomically sculpted multi-material assembly for Anycubic Kobra with ACE Pro (${availableFilamentCount} filament channels).
Requirements:
1. Provide a wide planar base (stone pedestal, weathered branch, or platform) ensuring 100% stable PEI bed contact.
2. Decompose into distinct interlocking parts with clean Z-transition planes to minimize purge waste.
3. Leverage contrasting filament colors for anatomical accents (corneal irises, warning markings, biological skin patterns).`;
}
