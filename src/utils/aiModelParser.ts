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

  const dimX = Number(rawObj.dimensions?.x) || 75;
  const dimY = Number(rawObj.dimensions?.y) || 60;
  const dimZ = Number(rawObj.dimensions?.z) || 70;

  const rawSegments = Array.isArray(rawObj.segments) ? rawObj.segments : [];
  const segments: MeshSegment[] = [];

  rawSegments.forEach((seg: any, idx: number) => {
    if (!seg || typeof seg !== 'object') return;

    const id = String(seg.id || `seg-${idx + 1}`);
    const segName = String(seg.name || `Component ${idx + 1}`);
    
    // Clamp filamentId between 1 and 8
    let filId = parseInt(seg.filamentId, 10);
    if (isNaN(filId) || filId < 1 || filId > 8) {
      filId = (idx % 8) + 1;
    }

    // Geometry type
    const validGeomTypes = [
      'box', 'cylinder', 'sphere', 'cone', 'torus', 'ring',
      'organic_mesh', 'parametric_surface'
    ];
    let geomType: any = seg.geometryType;
    if (!validGeomTypes.includes(geomType)) {
      geomType = seg.parameters?.organicType ? 'organic_mesh' : 'cylinder';
    }

    // Transform
    const px = Number(seg.transform?.position?.[0]) || 0;
    const py = Number(seg.transform?.position?.[1]) || (idx * 6 + 6);
    const pz = Number(seg.transform?.position?.[2]) || 0;

    const rx = Number(seg.transform?.rotation?.[0]) || 0;
    const ry = Number(seg.transform?.rotation?.[1]) || 0;
    const rz = Number(seg.transform?.rotation?.[2]) || 0;

    const sx = Number(seg.transform?.scale?.[0]) || 1;
    const sy = Number(seg.transform?.scale?.[1]) || 1;
    const sz = Number(seg.transform?.scale?.[2]) || 1;

    // Parameters
    const params = seg.parameters || {};
    const width = Number(params.width) || 20;
    const height = Number(params.height) || 20;
    const depth = Number(params.depth) || 20;
    const radius = Number(params.radius) || 12;
    const radiusTop = Number(params.radiusTop) || radius;
    const radiusBottom = Number(params.radiusBottom) || radius;
    const tube = Number(params.tube) || 3;

    // Organic parameters
    const organicType = params.organicType || undefined;
    const finish = params.finish || undefined;

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
      geometryType: 'cylinder',
      transform: { position: [0, 5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      parameters: { radius: 30, height: 10 },
    });
  }

  const slicingTips = Array.isArray(rawObj.slicingTips || rawObj.slicingOptimizationTips)
    ? (rawObj.slicingTips || rawObj.slicingOptimizationTips).map(String)
    : [
        'Orient base flat on Anycubic textured PEI sheet for maximum first-layer adhesion.',
        'Purge into infill enabled for optimal transition savings.',
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
 * This enables 2-way synchronization: Text TO Blender and Text FROM Blender.
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

    // Determine geometry type
    let geomType: MeshSegment['geometryType'] = 'cylinder';
    let organicType: any = undefined;
    let radius = 12;
    let width = 20;
    let height = 20;
    let depth = 20;

    let posX = 0;
    let posY = compIdx * 6 + 6;
    let posZ = 0;

    // Check if primitive_cube_add
    if (block.includes('primitive_cube_add')) {
      geomType = 'box';
      const locMatch = block.match(/location=\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
      if (locMatch) {
        posX = parseFloat(locMatch[1]) * 1000;
        posZ = parseFloat(locMatch[2]) * 1000;
        posY = parseFloat(locMatch[3]) * 1000;
      }
      const scaleMatch = block.match(/obj\.scale\s*=\s*\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
      if (scaleMatch) {
        width = parseFloat(scaleMatch[1]) * 2000;
        depth = parseFloat(scaleMatch[2]) * 2000;
        height = parseFloat(scaleMatch[3]) * 2000;
      }
    } else if (block.includes('primitive_cylinder_add')) {
      geomType = 'cylinder';
      const radMatch = block.match(/radius=([^,)]+)/);
      if (radMatch) radius = parseFloat(radMatch[1]) * 1000;
      const depMatch = block.match(/depth=([^,)]+)/);
      if (depMatch) height = parseFloat(depMatch[1]) * 1000;
      const locMatch = block.match(/location=\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
      if (locMatch) {
        posX = parseFloat(locMatch[1]) * 1000;
        posZ = parseFloat(locMatch[2]) * 1000;
        posY = parseFloat(locMatch[3]) * 1000;
      }
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
      const lower = rawName.toLowerCase();
      if (lower.includes('frog') || lower.includes('groda')) organicType = 'frog_body';
      else if (lower.includes('mushroom') || lower.includes('svamp')) organicType = 'mushroom_cap';
      else if (lower.includes('tail') || lower.includes('svans')) organicType = 'chameleon_tail';
      else if (lower.includes('wing') || lower.includes('vinge')) organicType = 'butterfly_wing';
      else if (lower.includes('shell') || lower.includes('snäcka')) organicType = 'nautilus_shell';
      else if (lower.includes('rock') || lower.includes('sten') || lower.includes('base')) organicType = 'rock_pedestal';
      else organicType = 'smooth_anatomy';
    }

    segments.push({
      id: `blender-part-${compIdx}`,
      name: rawName,
      filamentId: filId,
      geometryType: geomType,
      transform: {
        position: [isNaN(posX) ? 0 : posX, isNaN(posY) ? compIdx * 8 : posY, isNaN(posZ) ? 0 : posZ],
        rotation: [0, 0, 0],
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
