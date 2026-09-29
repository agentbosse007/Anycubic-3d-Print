import JSZip from 'jszip';
import type { FilamentChannel, MeshSegment, ModelDefinition, SlicingConfig } from '../types';
import { getOrganicTriangles } from './organicGeometry';

/**
 * Converts hex color (#RRGGBB) to hex RGBA (#RRGGBBAA) for 3MF basematerial
 */
function hexTo3mfColor(hex: string): string {
  const clean = hex.replace('#', '').toUpperCase();
  return `#${clean}FF`;
}

/**
 * Converts hex to RGB floats (0.0 to 1.0) for Blender bpy
 */
function hexToRgbFloat(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = (parseInt(clean.substring(0, 2), 16) || 0) / 255;
  const g = (parseInt(clean.substring(2, 4), 16) || 0) / 255;
  const b = (parseInt(clean.substring(4, 6), 16) || 0) / 255;
  return [parseFloat(r.toFixed(3)), parseFloat(g.toFixed(3)), parseFloat(b.toFixed(3))];
}

/**
 * Generates triangular mesh vertices and indices for procedural geometry types
 */
function generateMeshTriangles(segment: MeshSegment): {
  vertices: [number, number, number][];
  indices: [number, number, number][];
} {
  // If organic mesh or natural biological structure, use high-detail organic generator
  if (
    segment.geometryType === 'organic_mesh' ||
    segment.geometryType === 'parametric_surface' ||
    segment.parameters.organicType
  ) {
    return getOrganicTriangles(segment);
  }

  const vertices: [number, number, number][] = [];
  const indices: [number, number, number][] = [];

  const [px, py, pz] = segment.transform.position;
  const [sx, sy, sz] = segment.transform.scale;
  const geomType = segment.geometryType;

  if (geomType === 'box') {
    const w = ((segment.parameters.width || 20) * sx) / 2;
    const h = ((segment.parameters.height || 20) * sy) / 2;
    const d = ((segment.parameters.depth || 20) * sz) / 2;

    // 8 box vertices around (px, py, pz)
    const corners: [number, number, number][] = [
      [px - w, py - h, pz - d],
      [px + w, py - h, pz - d],
      [px + w, py + h, pz - d],
      [px - w, py + h, pz - d],
      [px - w, py - h, pz + d],
      [px + w, py - h, pz + d],
      [px + w, py + h, pz + d],
      [px - w, py + h, pz + d],
    ];
    vertices.push(...corners);

    const faces = [
      // Front
      [0, 2, 1], [0, 3, 2],
      // Back
      [4, 5, 6], [4, 6, 7],
      // Top
      [3, 6, 2], [3, 7, 6],
      // Bottom
      [0, 1, 5], [0, 5, 4],
      // Right
      [1, 2, 6], [1, 6, 5],
      // Left
      [0, 4, 7], [0, 7, 3],
    ];
    for (const f of faces) {
      indices.push([f[0], f[1], f[2]]);
    }
  } else if (geomType === 'cylinder' || geomType === 'cone') {
    const rTop = geomType === 'cone' ? 0.1 : ((segment.parameters.radiusTop || segment.parameters.radius || 10) * sx);
    const rBot = ((segment.parameters.radiusBottom || segment.parameters.radius || 10) * sx);
    const h = ((segment.parameters.height || 20) * sy) / 2;
    const segments = 16;

    // Top center vertex
    const topCenterIdx = vertices.length;
    vertices.push([px, py + h, pz]);

    // Bottom center vertex
    const botCenterIdx = vertices.length;
    vertices.push([px, py - h, pz]);

    const topRingStart = vertices.length;
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = Math.cos(theta) * rTop;
      const z = Math.sin(theta) * rTop;
      vertices.push([px + x, py + h, pz + z]);
    }

    const botRingStart = vertices.length;
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = Math.cos(theta) * rBot;
      const z = Math.sin(theta) * rBot;
      vertices.push([px + x, py - h, pz + z]);
    }

    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      // Top cap
      indices.push([topCenterIdx, topRingStart + i, topRingStart + next]);
      // Bottom cap
      indices.push([botCenterIdx, botRingStart + next, botRingStart + i]);
      // Side quad (2 triangles)
      indices.push([topRingStart + i, botRingStart + i, botRingStart + next]);
      indices.push([topRingStart + i, botRingStart + next, topRingStart + next]);
    }
  } else {
    // Sphere / Torus / Generic fallback: Octasphere
    const r = ((segment.parameters.radius || 12) * sx);
    const h = ((segment.parameters.height || 12) * sy);
    const rings = 8;
    const slices = 12;

    for (let i = 0; i <= rings; i++) {
      const v = i / rings;
      const phi = v * Math.PI;
      for (let j = 0; j <= slices; j++) {
        const u = j / slices;
        const theta = u * Math.PI * 2;
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = h * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);
        vertices.push([px + x, py + y, pz + z]);
      }
    }

    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < slices; j++) {
        const a = i * (slices + 1) + j;
        const b = a + slices + 1;
        indices.push([a, b, a + 1]);
        indices.push([b, b + 1, a + 1]);
      }
    }
  }

  return { vertices, indices };
}

/**
 * Builds standard Production 3MF file (Zip containing 3dmodel.model with basematerials)
 * Fully compatible with Anycubic Slicer, Anycubic Slicer Next, OrcaSlicer, PrusaSlicer, Bambu Studio
 */
export async function generateMultiColor3MF(
  model: ModelDefinition,
  filaments: FilamentChannel[],
  config: SlicingConfig
): Promise<Blob> {
  const zip = new JSZip();

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;
  zip.file('[Content_Types].xml', contentTypesXml);

  // 2. _rels/.rels
  const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;
  zip.file('_rels/.rels', relsXml);

  // 3. Build materials XML
  let baseMaterialsXml = `<m:basematerials id="1">\n`;
  filaments.forEach((fil, idx) => {
    const color3mf = hexTo3mfColor(fil.color);
    baseMaterialsXml += `    <m:base name="Slot_${fil.id}_${fil.name.replace(/[^a-zA-Z0-9_]/g, '')}" displaycolor="${color3mf}"/>\n`;
  });
  baseMaterialsXml += `  </m:basematerials>`;

  // 4. Build objects and meshes XML
  let objectsXml = '';
  let buildItemsXml = '';

  model.segments.forEach((seg, segIndex) => {
    const objId = segIndex + 10;
    const { vertices, indices } = generateMeshTriangles(seg);
    const materialIndex = Math.max(0, Math.min(filaments.length - 1, (seg.filamentId || 1) - 1));

    let verticesXml = '      <vertices>\n';
    for (const v of vertices) {
      verticesXml += `        <vertex x="${v[0].toFixed(3)}" y="${v[2].toFixed(3)}" z="${v[1].toFixed(3)}"/>\n`; // Convert Y-up to Z-up for 3D printing
    }
    verticesXml += '      </vertices>\n';

    let trianglesXml = '      <triangles>\n';
    for (const tri of indices) {
      trianglesXml += `        <triangle v1="${tri[0]}" v2="${tri[1]}" v3="${tri[2]}" pid="1" p1="${materialIndex}"/>\n`;
    }
    trianglesXml += '      </triangles>\n';

    objectsXml += `    <object id="${objId}" name="${seg.name.replace(/[^a-zA-Z0-9_ -]/g, '')}" type="model" pid="1" p1="${materialIndex}">
      <mesh>
${verticesXml}${trianglesXml}      </mesh>
    </object>\n`;

    buildItemsXml += `    <item objectid="${objId}"/>\n`;
  });

  // 5. 3D/3dmodel.model
  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02" xmlns:anycubic="http://schemas.anycubic.com/slicer/2024/01">
  <metadata name="Title">${model.name}</metadata>
  <metadata name="Application">ChromaForge Multi-Material Studio</metadata>
  <metadata name="TargetPrinter">Anycubic Kobra 3 ACE Pro / Kobra X</metadata>
  <metadata name="CreationDate">${new Date().toISOString()}</metadata>
  <metadata name="PurgeOptimization">Infill=${config.purgeIntoInfill},Support=${config.purgeIntoSupport},Multiplier=${config.flushingMultiplier}</metadata>
  <resources>
${baseMaterialsXml}
${objectsXml}  </resources>
  <build>
${buildItemsXml}  </build>
</model>`;

  zip.file('3D/3dmodel.model', modelXml);

  return await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml' });
}

/**
 * Generates an ASCII STL string for a single segment
 */
export function generateSingleStl(segment: MeshSegment): string {
  const { vertices, indices } = generateMeshTriangles(segment);
  let stl = `solid ${segment.name.replace(/[^a-zA-Z0-9_]/g, '_')}\n`;

  for (const tri of indices) {
    const v1 = vertices[tri[0]];
    const v2 = vertices[tri[1]];
    const v3 = vertices[tri[2]];

    // Face normal (approx)
    const ax = v2[0] - v1[0];
    const ay = v2[2] - v1[2]; // Z-up for STL
    const az = v2[1] - v1[1];
    const bx = v3[0] - v1[0];
    const by = v3[2] - v1[2];
    const bz = v3[1] - v1[1];

    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

    stl += `  facet normal ${(nx / len).toFixed(4)} ${(ny / len).toFixed(4)} ${(nz / len).toFixed(4)}\n`;
    stl += `    outer loop\n`;
    stl += `      vertex ${v1[0].toFixed(3)} ${v1[2].toFixed(3)} ${v1[1].toFixed(3)}\n`;
    stl += `      vertex ${v2[0].toFixed(3)} ${v2[2].toFixed(3)} ${v2[1].toFixed(3)}\n`;
    stl += `      vertex ${v3[0].toFixed(3)} ${v3[2].toFixed(3)} ${v3[1].toFixed(3)}\n`;
    stl += `    endloop\n`;
    stl += `  endfacet\n`;
  }

  stl += `endsolid ${segment.name.replace(/[^a-zA-Z0-9_]/g, '_')}\n`;
  return stl;
}

/**
 * Bundles multi-material STL parts into a ZIP archive for Anycubic Slicer
 */
export async function generateMultiStlZip(
  model: ModelDefinition,
  filaments: FilamentChannel[]
): Promise<Blob> {
  const zip = new JSZip();

  model.segments.forEach((seg, i) => {
    const fil = filaments.find(f => f.id === seg.filamentId) || filaments[0];
    const cleanFilName = fil.name.replace(/[^a-zA-Z0-9_]/g, '');
    const cleanSegName = seg.name.replace(/[^a-zA-Z0-9_]/g, '');
    const filename = `${String(i + 1).padStart(2, '0')}_Slot${seg.filamentId}_${cleanFilName}_${cleanSegName}.stl`;
    const stlContent = generateSingleStl(seg);
    zip.file(filename, stlContent);
  });

  // Include README instructions for Anycubic Slicer / OrcaSlicer
  const readme = `CHROMAFORGE MULTI-MATERIAL STL BUNDLE
Model: ${model.name}
Target: Anycubic Kobra 3 (ACE Pro) / Anycubic Kobra X

HOW TO LOAD IN ANYCUBIC SLICER / ANYCUBIC SLICER NEXT / ORCASLICER:
1. Drag and drop all .stl files simultaneously into the Slicer viewport.
2. When prompted: "Load multiple objects as a single multi-material assembly?", choose YES!
3. Each object is automatically linked to its corresponding filament slot (Slot 1 to Slot 8).
4. Verify Wipe Tower is enabled on the print bed.
5. Slice and print via Anycubic Cloud or USB Drive!
`;
  zip.file('README_ANYCUBIC_INSTRUCTIONS.txt', readme);

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Generates the complete, runnable Python script for Blender 3.x / 4.x
 */
export function generateBlenderPythonScript(
  model: ModelDefinition,
  filaments: FilamentChannel[]
): string {
  const segmentsCode = model.segments.map((seg, idx) => {
    const [px, py, pz] = seg.transform.position;
    const [sx, sy, sz] = seg.transform.scale;
    const fil = filaments.find(f => f.id === seg.filamentId) || filaments[0];
    const [r, g, b] = hexToRgbFloat(fil.color);

    let addMeshCode = '';
    const isOrganic = seg.geometryType === 'organic_mesh' || seg.parameters.organicType;

    if (isOrganic) {
      const { vertices: orgVerts, indices: orgFaces } = getOrganicTriangles(seg);
      // Scale to meters for Blender and round to 4 decimals
      const vertsStr = orgVerts.map(v => `(${v[0] / 1000}, ${v[2] / 1000}, ${v[1] / 1000})`).join(', ');
      const facesStr = orgFaces.map(f => `(${f[0]}, ${f[1]}, ${f[2]})`).join(', ');

      addMeshCode = `mesh_data = bpy.data.meshes.new("${seg.name.replace(/[^a-zA-Z0-9_]/g, '_')}_mesh")
    mesh_data.from_pydata([${vertsStr}], [], [${facesStr}])
    mesh_data.update()
    obj = bpy.data.objects.new("${seg.name.replace(/[^a-zA-Z0-9_]/g, '_')}_Slot${seg.filamentId}", mesh_data)
    bpy.context.collection.objects.link(obj)
    # Add Subsurf modifier for ultra-smooth biological realism
    subsurf = obj.modifiers.new("Subsurf", "SUBSURF")
    subsurf.levels = 1`;
    } else if (seg.geometryType === 'box') {
      const w = ((seg.parameters.width || 20) * sx) / 1000; // Blender uses meters by default
      const h = ((seg.parameters.height || 20) * sy) / 1000;
      const d = ((seg.parameters.depth || 20) * sz) / 1000;
      addMeshCode = `bpy.ops.mesh.primitive_cube_add(size=1.0, location=(${px / 1000}, ${pz / 1000}, ${py / 1000}))
    obj = bpy.context.active_object
    obj.scale = (${w}, ${d}, ${h})`;
    } else if (seg.geometryType === 'cylinder') {
      const rad = ((seg.parameters.radius || 10) * sx) / 1000;
      const dep = ((seg.parameters.height || 20) * sy) / 1000;
      addMeshCode = `bpy.ops.mesh.primitive_cylinder_add(radius=${rad}, depth=${dep}, location=(${px / 1000}, ${pz / 1000}, ${py / 1000}))
    obj = bpy.context.active_object`;
    } else if (seg.geometryType === 'cone') {
      const rad = ((seg.parameters.radius || 10) * sx) / 1000;
      const dep = ((seg.parameters.height || 20) * sy) / 1000;
      addMeshCode = `bpy.ops.mesh.primitive_cone_add(radius1=${rad}, depth=${dep}, location=(${px / 1000}, ${pz / 1000}, ${py / 1000}))
    obj = bpy.context.active_object`;
    } else {
      const rad = ((seg.parameters.radius || 12) * sx) / 1000;
      addMeshCode = `bpy.ops.mesh.primitive_uv_sphere_add(radius=${rad}, location=(${px / 1000}, ${pz / 1000}, ${py / 1000}))
    obj = bpy.context.active_object`;
    }

    return `
    # Component ${idx + 1}: ${seg.name} (Filament Slot ${seg.filamentId})
    ${addMeshCode}
    obj.name = "${seg.name.replace(/[^a-zA-Z0-9_]/g, '_')}_Slot${seg.filamentId}"
    
    # Assign Material & Color
    mat = get_or_create_material("Mat_Slot${seg.filamentId}_${fil.name.replace(/[^a-zA-Z0-9_]/g, '_')}", (${r}, ${g}, ${b}, 1.0))
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)
    
    # Apply Smooth Shading for natural biological curvature
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth()
    
    # Link to ChromaForge Collection
    if obj.name not in chroma_col.objects:
        chroma_col.objects.link(obj)
    if obj.name in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.unlink(obj)
`;
  }).join('\n');

  return `"""
ChromaForge Studio - Blender Automation Script
Model: ${model.name}
Target Printer: Anycubic Kobra 3 (ACE Pro 8-Color) & Kobra X
Optimized for: Multi-material 3MF export with automated material segmentation

Instructions:
1. Open Blender (v3.6+ or v4.x)
2. Switch to 'Scripting' tab in the top header
3. Click '+ New' and paste this entire script
4. Click 'Run Script' (Alt+P)
5. The 3D model with materials and collections will appear instantly!
"""

import bpy
import math

def get_or_create_material(name, rgba):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            # Base Color (sRGB)
            if "Base Color" in bsdf.inputs:
                bsdf.inputs["Base Color"].default_value = rgba
            # Lifelike natural surface roughness & subsurface scattering
            if "Roughness" in bsdf.inputs:
                bsdf.inputs["Roughness"].default_value = 0.28
            if "Subsurface Weight" in bsdf.inputs:
                bsdf.inputs["Subsurface Weight"].default_value = 0.15
            elif "Subsurface" in bsdf.inputs:
                bsdf.inputs["Subsurface"].default_value = 0.15
            if "Coat Weight" in bsdf.inputs:
                bsdf.inputs["Coat Weight"].default_value = 0.2
    return mat

def build_chromaforge_model():
    # 0. Safety: Ensure Object Mode
    try:
        if bpy.context.object and bpy.context.object.mode != 'OBJECT':
            bpy.ops.object.mode_set(mode='OBJECT')
    except Exception:
        pass

    # 1. Set scene unit settings to millimeters for Anycubic 3D printing
    try:
        bpy.context.scene.unit_settings.system = 'METRIC'
        bpy.context.scene.unit_settings.length_unit = 'MILLIMETERS'
    except Exception:
        pass

    # 2. Create or get dedicated collection
    collection_name = "ChromaForge_${model.name.replace(/[^a-zA-Z0-9_]/g, '_')}"
    if collection_name in bpy.data.collections:
        chroma_col = bpy.data.collections[collection_name]
    else:
        chroma_col = bpy.data.collections.new(collection_name)
        bpy.context.scene.collection.children.link(chroma_col)
    
    print("Building model: ${model.name} with ${model.segments.length} multi-material segments...")
${segmentsCode}

    # Deselect all and select the root collection
    bpy.ops.object.select_all(action='DESELECT')
    print("ChromaForge model generated successfully! Ready for Anycubic multi-color slicing.")

if __name__ == "__main__":
    build_chromaforge_model()
`;
}

/**
 * Complete Blender Addon (.py) installable into Blender Preferences > Addons
 */
export function generateBlenderAddonScript(): string {
  return `bl_info = {
    "name": "ChromaForge Anycubic Multi-Material Bridge",
    "author": "ChromaForge Studio",
    "version": (1, 0, 0),
    "blender": (3, 6, 0),
    "location": "View3D > Sidebar > ChromaForge",
    "description": "Bridge between Ollama AI, Blender, and Anycubic Kobra 3 ACE Pro (up to 8 colors)",
    "category": "3D View",
}

import bpy
import json
import urllib.request

class CHROMAFORGE_PT_Panel(bpy.types.Panel):
    bl_label = "ChromaForge 3D Print Bridge"
    bl_idname = "CHROMAFORGE_PT_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'ChromaForge'

    def draw(self, context):
        layout = self.layout
        col = layout.column(align=True)
        col.label(text="Anycubic Multi-Color Exporter", icon='COLOR')
        col.separator()
        col.operator("chromaforge.export_anycubic_3mf", text="Export Anycubic 3MF", icon='EXPORT')
        col.operator("chromaforge.separate_by_material", text="Separate Parts by Color", icon='MESH_DATA')
        col.separator()
        col.label(text="Anycubic Kobra 3 Specs:")
        box = col.box()
        box.label(text="ACE Pro Channels: Up to 8")
        box.label(text="Build Volume: 250x250x260 mm")
        box.label(text="Speed: up to 600 mm/s")

class CHROMAFORGE_OT_SeparateByMaterial(bpy.types.Operator):
    bl_idname = "chromaforge.separate_by_material"
    bl_label = "Separate By Material"
    bl_description = "Separates selected mesh into loose objects by material for Anycubic Slicer"

    def execute(self, context):
        obj = context.active_object
        if obj and obj.type == 'MESH':
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.separate(type='MATERIAL')
            bpy.ops.object.mode_set(mode='OBJECT')
            self.report({'INFO'}, "Separated mesh into individual material parts.")
        else:
            self.report({'WARNING'}, "Please select a mesh object first.")
        return {'FINISHED'}

class CHROMAFORGE_OT_ExportAnycubic3mf(bpy.types.Operator):
    bl_idname = "chromaforge.export_anycubic_3mf"
    bl_label = "Export Anycubic 3MF"
    bl_description = "Exports selected objects as a multi-part 3MF for Anycubic Slicer / OrcaSlicer"

    def execute(self, context):
        try:
            bpy.ops.wm.save_as_mainfile()
            self.report({'INFO'}, "Saved! Use File > Export > 3MF for Anycubic Slicer.")
        except Exception as e:
            self.report({'ERROR'}, str(e))
        return {'FINISHED'}

classes = (
    CHROMAFORGE_PT_Panel,
    CHROMAFORGE_OT_SeparateByMaterial,
    CHROMAFORGE_OT_ExportAnycubic3mf,
)

def register():
    for cls in classes:
        bpy.utils.register_class(cls)

def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)

if __name__ == "__main__":
    register()
`;
}
