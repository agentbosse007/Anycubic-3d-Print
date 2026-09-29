import type { ModelDefinition } from '../types';

export const PRESET_MODELS: ModelDefinition[] = [
  {
    id: 'poison-dart-frog-8color',
    name: 'Poison Dart Frog on Stone (8-Color Lifelike)',
    description: 'Anatomically sculpted dendrobatid poison frog perched on a weathered mineral boulder. Features lifelike humped dorsal posture, cranial eye bulges, webbed digit pads, and contrasting warning coloration.',
    prompt: 'Hyper-realistic poison dart frog on mossy granite rock, lifelike amphibian anatomy with glossy skin spots and amber eyes for Anycubic 8-color ACE Pro.',
    dimensions: { x: 82, y: 58, z: 76 },
    generatedBy: 'preset',
    createdAt: '2026-09-29',
    slicingTips: [
      'Natural rock pedestal ensures 100% stable bed contact with zero supports needed for the frog.',
      'Lifelike glossy amphibian clearcoat emulated with 0.16mm layer height.',
      'Enable "Purge into Infill" to flush dark dorsal spots into dense internal gyroid matrix.'
    ],
    segments: [
      // 1. Weathered Mineral Stone Pedestal (Slot 8: Tech Slate)
      {
        id: 'frog-stone',
        name: 'Weathered Slate Boulder',
        filamentId: 8,
        geometryType: 'organic_mesh',
        transform: { position: [0, 8, 0], rotation: [0, 0.4, 0], scale: [1.2, 0.6, 1.1] },
        parameters: { radius: 36, organicType: 'rock_pedestal', finish: 'mineral_stone' },
      },
      // 2. Sculpted Frog Body (Slot 2: Glacier Cyan)
      {
        id: 'frog-torso',
        name: 'Amphibian Sculpted Torso',
        filamentId: 2,
        geometryType: 'organic_mesh',
        transform: { position: [0, 28, 4], rotation: [-0.15, 0, 0], scale: [1.1, 0.9, 1.25] },
        parameters: { radius: 18, organicType: 'frog_body', finish: 'organic_skin' },
      },
      // 3. Ventral Throat & Belly (Slot 1: Pure White)
      {
        id: 'frog-throat',
        name: 'Ventral Throat & Chest Crest',
        filamentId: 1,
        geometryType: 'organic_mesh',
        transform: { position: [0, 22, 14], rotation: [-0.4, 0, 0], scale: [0.8, 0.7, 0.9] },
        parameters: { radius: 11, organicType: 'smooth_anatomy', finish: 'organic_skin' },
      },
      // 4. Forelimbs & Webbed Pads (Slot 4: Coral Orange)
      {
        id: 'frog-arm-l',
        name: 'Left Forelimb & Digit Pad',
        filamentId: 4,
        geometryType: 'organic_mesh',
        transform: { position: [-16, 20, 14], rotation: [0.3, 0.5, -0.4], scale: [0.9, 0.9, 0.9] },
        parameters: { radius: 12, organicType: 'frog_limb', finish: 'organic_skin' },
      },
      {
        id: 'frog-arm-r',
        name: 'Right Forelimb & Digit Pad',
        filamentId: 4,
        geometryType: 'organic_mesh',
        transform: { position: [16, 20, 14], rotation: [0.3, -0.5, 0.4], scale: [-0.9, 0.9, 0.9] },
        parameters: { radius: 12, organicType: 'frog_limb', finish: 'organic_skin' },
      },
      // 5. Powerful Hind Jumping Limbs (Slot 7: Crimson Ruby)
      {
        id: 'frog-leg-l',
        name: 'Left Hind Knee & Thigh Flange',
        filamentId: 7,
        geometryType: 'organic_mesh',
        transform: { position: [-20, 18, -10], rotation: [0.2, 1.8, -0.2], scale: [1.1, 1.0, 1.1] },
        parameters: { radius: 15, organicType: 'frog_limb', finish: 'organic_skin' },
      },
      {
        id: 'frog-leg-r',
        name: 'Right Hind Knee & Thigh Flange',
        filamentId: 7,
        geometryType: 'organic_mesh',
        transform: { position: [20, 18, -10], rotation: [0.2, -1.8, 0.2], scale: [-1.1, 1.0, 1.1] },
        parameters: { radius: 15, organicType: 'frog_limb', finish: 'organic_skin' },
      },
      // 6. Dorsal Toxic Melanic Spots (Slot 3: Obsidian Black)
      {
        id: 'frog-dorsal-spot',
        name: 'Melanic Toxic Back Stripe',
        filamentId: 3,
        geometryType: 'organic_mesh',
        transform: { position: [0, 35, 2], rotation: [-0.1, 0, 0], scale: [0.75, 0.4, 1.0] },
        parameters: { radius: 12, organicType: 'smooth_anatomy', finish: 'organic_skin' },
      },
      // 7. Eyes Golden Iris (Slot 5: Sunburst Gold)
      {
        id: 'frog-iris-l',
        name: 'Left Corneal Iris Bulge',
        filamentId: 5,
        geometryType: 'organic_mesh',
        transform: { position: [-8.5, 36, 17], rotation: [0.3, 0.4, 0], scale: [1, 1, 1] },
        parameters: { radius: 4.8, organicType: 'organic_eye', finish: 'glossy_chitin' },
      },
      {
        id: 'frog-iris-r',
        name: 'Right Corneal Iris Bulge',
        filamentId: 5,
        geometryType: 'organic_mesh',
        transform: { position: [8.5, 36, 17], rotation: [0.3, -0.4, 0], scale: [1, 1, 1] },
        parameters: { radius: 4.8, organicType: 'organic_eye', finish: 'glossy_chitin' },
      },
      // 8. Horizontal Slit Pupils (Slot 3: Obsidian Black)
      {
        id: 'frog-pupil-l',
        name: 'Left Slit Pupil Core',
        filamentId: 3,
        geometryType: 'box',
        transform: { position: [-8.5, 36, 20.5], rotation: [0, 0, 0.2], scale: [1, 1, 1] },
        parameters: { width: 4.5, height: 1.6, depth: 2 },
      },
      {
        id: 'frog-pupil-r',
        name: 'Right Slit Pupil Core',
        filamentId: 3,
        geometryType: 'box',
        transform: { position: [8.5, 36, 20.5], rotation: [0, 0, -0.2], scale: [1, 1, 1] },
        parameters: { width: 4.5, height: 1.6, depth: 2 },
      },
    ],
    blenderPythonScript: '',
  },
  {
    id: 'mushroom-cluster-7color',
    name: 'Forest Fungi Colony & Lichen Log (7-Color Lifelike)',
    description: 'Bioluminescent woodland mushroom cluster with curved umbrella pileus caps, radial under-cap hymenophore gills, fibrous stipes with partial annulus veil rings, and mossy weathered bark substrate.',
    prompt: 'Hyper-realistic woodland mushroom colony with gills, spore spots, and mossy weathered tree log pedestal for Anycubic 7-color multi-material print.',
    dimensions: { x: 78, y: 72, z: 68 },
    generatedBy: 'preset',
    createdAt: '2026-09-29',
    slicingTips: [
      'Weathered bark log provides broad 100% stable bed footprint with zero detached overhangs.',
      'Thin gills print cleanly with 0.16mm layer height and Anycubic High-Speed PLA.',
      'Translucent and vibrant caps benefit from low 0.85x flushing multiplier between warm hues.'
    ],
    segments: [
      {
        id: 'mush-log',
        name: 'Weathered Bark Log Pedestal',
        filamentId: 8,
        geometryType: 'organic_mesh',
        transform: { position: [0, 6, 0], rotation: [0, 0, Math.PI / 2], scale: [1, 1, 1] },
        parameters: { radius: 14, height: 74, organicType: 'tree_trunk_bark', finish: 'mineral_stone' },
      },
      {
        id: 'mush-moss',
        name: 'Moss & Lichen Growth Bed',
        filamentId: 6,
        geometryType: 'organic_mesh',
        transform: { position: [0, 11, 0], rotation: [0, 0.4, 0], scale: [1.2, 0.35, 1.1] },
        parameters: { radius: 24, organicType: 'rock_pedestal', finish: 'botanical_petal' },
      },
      {
        id: 'mush-stem-main',
        name: 'Primary Fibrous Stipe',
        filamentId: 1,
        geometryType: 'organic_mesh',
        transform: { position: [-6, 12, -4], rotation: [0.1, 0.2, -0.05], scale: [1, 1, 1] },
        parameters: { radius: 7.5, height: 38, organicType: 'mushroom_stem', finish: 'organic_skin' },
      },
      {
        id: 'mush-cap-main',
        name: 'Primary Umbrella Pileus Cap',
        filamentId: 4,
        geometryType: 'organic_mesh',
        transform: { position: [-6, 50, -4], rotation: [0.08, 0, -0.04], scale: [1, 1, 1] },
        parameters: { radius: 25, height: 18, organicType: 'mushroom_cap', finish: 'organic_skin' },
      },
      {
        id: 'mush-gills-main',
        name: 'Radiating Hymenophore Gills',
        filamentId: 5,
        geometryType: 'cylinder',
        transform: { position: [-6, 44, -4], rotation: [0, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 22, height: 4 },
      },
      {
        id: 'mush-stem-small',
        name: 'Juvenile Secondary Stipe',
        filamentId: 1,
        geometryType: 'organic_mesh',
        transform: { position: [14, 12, 6], rotation: [-0.15, -0.3, 0.2], scale: [0.75, 0.75, 0.75] },
        parameters: { radius: 6, height: 26, organicType: 'mushroom_stem', finish: 'organic_skin' },
      },
      {
        id: 'mush-cap-small',
        name: 'Juvenile Secondary Cap',
        filamentId: 7,
        geometryType: 'organic_mesh',
        transform: { position: [18, 38, 8], rotation: [-0.15, -0.2, 0.15], scale: [0.7, 0.7, 0.7] },
        parameters: { radius: 17, height: 13, organicType: 'mushroom_cap', finish: 'organic_skin' },
      },
      {
        id: 'mush-spots',
        name: 'Spore Droplet Accents',
        filamentId: 2,
        geometryType: 'sphere',
        transform: { position: [-5, 59, -3], rotation: [0, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 4 },
      },
    ],
    blenderPythonScript: '',
  },
  {
    id: 'chameleon-perch-8color',
    name: 'Veiled Chameleon on Lichen Perch (8-Color Lifelike)',
    description: 'Anatomically accurate reptile sculpture featuring prehensile logarithmic spiral tail, dorsal cranial casque, perched limbs with zygodactylous digit pads, and rotating turret eyes.',
    prompt: 'Lifelike veiled chameleon perched on mossy branch with spiral prehensile tail and multi-color skin markings.',
    dimensions: { x: 84, y: 64, z: 72 },
    generatedBy: 'preset',
    createdAt: '2026-09-29',
    slicingTips: [
      'Prehensile tail and perched limbs connect to horizontal branch base for integrated bed support.',
      'Intricate scale details highlighted with 0.16mm fine perimeters.',
      'Turret eyes with contrasting pupils printed on top layers for sharp focal clarity.'
    ],
    segments: [
      {
        id: 'cham-perch',
        name: 'Lichen Perch Branch',
        filamentId: 8,
        geometryType: 'organic_mesh',
        transform: { position: [0, 8, 0], rotation: [0, 0.2, Math.PI / 2], scale: [1, 1, 1] },
        parameters: { radius: 10, height: 80, organicType: 'branch_bark', finish: 'mineral_stone' },
      },
      {
        id: 'cham-torso',
        name: 'Sculpted Chameleon Body',
        filamentId: 6,
        geometryType: 'organic_mesh',
        transform: { position: [-4, 28, 0], rotation: [0.1, 0, 0], scale: [1.2, 0.9, 1.3] },
        parameters: { radius: 16, organicType: 'frog_body', finish: 'organic_skin' },
      },
      {
        id: 'cham-crest',
        name: 'Dorsal Cranial Casque Helmet',
        filamentId: 5,
        geometryType: 'cone',
        transform: { position: [6, 42, 12], rotation: [0.6, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 8, height: 16 },
      },
      {
        id: 'cham-tail',
        name: 'Prehensile Spiral Tail',
        filamentId: 6,
        geometryType: 'organic_mesh',
        transform: { position: [-26, 26, -12], rotation: [0, 0.4, 0.8], scale: [1, 1, 1] },
        parameters: { radius: 18, height: 12, organicType: 'chameleon_tail', finish: 'organic_skin' },
      },
      {
        id: 'cham-forelimb-l',
        name: 'Left Zygodactylous Foot',
        filamentId: 4,
        geometryType: 'organic_mesh',
        transform: { position: [-12, 18, 12], rotation: [0.3, 0.4, -0.3], scale: [0.85, 0.85, 0.85] },
        parameters: { radius: 10, organicType: 'frog_limb', finish: 'organic_skin' },
      },
      {
        id: 'cham-forelimb-r',
        name: 'Right Zygodactylous Foot',
        filamentId: 4,
        geometryType: 'organic_mesh',
        transform: { position: [8, 18, 12], rotation: [0.3, -0.4, 0.3], scale: [0.85, 0.85, 0.85] },
        parameters: { radius: 10, organicType: 'frog_limb', finish: 'organic_skin' },
      },
      {
        id: 'cham-eye-l',
        name: 'Left Turret Cone Eye',
        filamentId: 2,
        geometryType: 'organic_mesh',
        transform: { position: [-2, 36, 18], rotation: [0.2, 0.5, 0], scale: [1, 1, 1] },
        parameters: { radius: 4.8, organicType: 'organic_eye', finish: 'glossy_chitin' },
      },
      {
        id: 'cham-eye-r',
        name: 'Right Turret Cone Eye',
        filamentId: 2,
        geometryType: 'organic_mesh',
        transform: { position: [14, 36, 18], rotation: [0.2, -0.5, 0], scale: [1, 1, 1] },
        parameters: { radius: 4.8, organicType: 'organic_eye', finish: 'glossy_chitin' },
      },
    ],
    blenderPythonScript: '',
  },
  {
    id: 'nautilus-shell-6color',
    name: 'Fibonacci Nautilus Shell (6-Color Natural)',
    description: 'Mathematically exact logarithmic spiral chambered shell with sculpted organic growth septa, natural tiger striping, mother-of-pearl central whorl, and marine reef perch.',
    prompt: 'Realistic Fibonacci spiral chambered nautilus marine shell with logarithmic growth curve and biological tiger stripes.',
    dimensions: { x: 72, y: 78, z: 54 },
    generatedBy: 'preset',
    createdAt: '2026-09-29',
    slicingTips: [
      'Logarithmic spiral printed on contoured reef support base for pristine surface finish.',
      'Natural biological curvature best rendered with 0.12mm high precision layers.',
      'Iridescent Silk Gold inner core highlights the golden ratio phi whorl.'
    ],
    segments: [
      {
        id: 'nautilus-reef',
        name: 'Marine Coral Rock Base',
        filamentId: 8,
        geometryType: 'organic_mesh',
        transform: { position: [0, 6, 0], rotation: [0, 0, 0], scale: [1.3, 0.5, 1.1] },
        parameters: { radius: 32, organicType: 'rock_pedestal', finish: 'mineral_stone' },
      },
      {
        id: 'nautilus-body',
        name: 'Nautilus Outer Spiral Shell',
        filamentId: 1, // Pure White
        geometryType: 'organic_mesh',
        transform: { position: [0, 42, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 16, organicType: 'nautilus_shell', finish: 'organic_skin' },
      },
      {
        id: 'nautilus-tiger-stripes',
        name: 'Tiger Camouflage Outer Ribs',
        filamentId: 4, // Coral Orange
        geometryType: 'organic_mesh',
        transform: { position: [2, 44, 2], rotation: [0, 0.1, 0.05], scale: [0.98, 0.98, 0.98] },
        parameters: { radius: 15.5, organicType: 'nautilus_shell', finish: 'organic_skin' },
      },
      {
        id: 'nautilus-aperture',
        name: 'Living Chamber Margin Hood',
        filamentId: 3, // Obsidian
        geometryType: 'cylinder',
        transform: { position: [22, 60, 4], rotation: [0.4, 0, 0.8], scale: [1, 1, 1] },
        parameters: { radius: 14, height: 8 },
      },
      {
        id: 'nautilus-whorl',
        name: 'Fibonacci Inner Golden Core',
        filamentId: 5, // Silk Gold
        geometryType: 'organic_mesh',
        transform: { position: [-4, 34, 0], rotation: [0, 0, 0], scale: [0.45, 0.45, 0.45] },
        parameters: { radius: 14, organicType: 'fossil_spiral', finish: 'glossy_chitin' },
      },
      {
        id: 'nautilus-crest',
        name: 'Deep Sea Cyan Siphon Canal',
        filamentId: 2, // Glacier Cyan
        geometryType: 'cylinder',
        transform: { position: [-14, 28, 0], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 6, height: 12 },
      },
    ],
    blenderPythonScript: '',
  },
  {
    id: 'monarch-orchid-7color',
    name: 'Wild Butterfly on Orchid (7-Color Flora)',
    description: 'Lifelike botanical orchid flower with sculpted parabolic petals and central nectar labellum, host to an anatomical monarch butterfly with curved aerofoil wings and venation.',
    prompt: 'Realistic botanical orchid flower with wild monarch butterfly perched on blooming curved petals, lifelike nature specimen for Anycubic multi-color.',
    dimensions: { x: 88, y: 70, z: 82 },
    generatedBy: 'preset',
    createdAt: '2026-09-29',
    slicingTips: [
      'Delicate petal camber prints cleanly with thin 0.4mm nozzle perimeters.',
      'Butterfly wings angled at 25 degrees natural resting dihedral.'
    ],
    segments: [
      // Flower Stem & Receptacle (Slot 6: Forest Emerald)
      {
        id: 'orchid-stem',
        name: 'Botanical Stem & Pedicel',
        filamentId: 6,
        geometryType: 'cylinder',
        transform: { position: [0, 10, 0], rotation: [0.1, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 6, height: 22 },
      },
      // Orchid Petals (Slot 1: Pure White & Slot 7: Crimson Ruby)
      {
        id: 'orchid-petal-dorsal',
        name: 'Dorsal Sepal Petal',
        filamentId: 1,
        geometryType: 'organic_mesh',
        transform: { position: [0, 36, -18], rotation: [-0.6, 0, 0], scale: [1, 1, 1] },
        parameters: { width: 28, height: 38, organicType: 'petal', finish: 'botanical_petal' },
      },
      {
        id: 'orchid-petal-l',
        name: 'Lateral Wing Petal Left',
        filamentId: 1,
        geometryType: 'organic_mesh',
        transform: { position: [-26, 30, -4], rotation: [0, 0.4, 0.5], scale: [1, 1, 1] },
        parameters: { width: 30, height: 34, organicType: 'petal', finish: 'botanical_petal' },
      },
      {
        id: 'orchid-petal-r',
        name: 'Lateral Wing Petal Right',
        filamentId: 1,
        geometryType: 'organic_mesh',
        transform: { position: [26, 30, -4], rotation: [0, -0.4, -0.5], scale: [1, 1, 1] },
        parameters: { width: 30, height: 34, organicType: 'petal', finish: 'botanical_petal' },
      },
      // Lower Labellum Lip (Slot 7: Crimson Ruby)
      {
        id: 'orchid-lip',
        name: 'Labellum Scent Pouch Lip',
        filamentId: 7,
        geometryType: 'organic_mesh',
        transform: { position: [0, 24, 14], rotation: [0.5, 0, 0], scale: [1.2, 0.9, 1] },
        parameters: { width: 26, height: 30, organicType: 'petal', finish: 'botanical_petal' },
      },
      // Pollen Core Stamen (Slot 5: Sunburst Gold)
      {
        id: 'orchid-column',
        name: 'Central Anther Cap & Stamen',
        filamentId: 5,
        geometryType: 'sphere',
        transform: { position: [0, 28, 4], rotation: [0, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 5.5 },
      },
      // Perched Butterfly Thorax (Slot 3: Obsidian Black)
      {
        id: 'butterfly-body',
        name: 'Monarch Thorax & Abdomen',
        filamentId: 3,
        geometryType: 'cylinder',
        transform: { position: [0, 36, 4], rotation: [0.3, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 3.5, height: 26 },
      },
      // Left Forewing (Slot 4: Coral Orange)
      {
        id: 'butterfly-wing-l',
        name: 'Left Forewing Scale Membrane',
        filamentId: 4,
        geometryType: 'organic_mesh',
        transform: { position: [-20, 44, 2], rotation: [0.2, 0.4, 0.4], scale: [1, 1, 1] },
        parameters: { width: 36, height: 38, organicType: 'butterfly_wing', finish: 'glossy_chitin' },
      },
      // Right Forewing (Slot 4: Coral Orange)
      {
        id: 'butterfly-wing-r',
        name: 'Right Forewing Scale Membrane',
        filamentId: 4,
        geometryType: 'organic_mesh',
        transform: { position: [20, 44, 2], rotation: [0.2, -0.4, -0.4], scale: [1, 1, 1] },
        parameters: { width: 36, height: 38, organicType: 'butterfly_wing', finish: 'glossy_chitin' },
      },
      // Wing Margin Markings (Slot 3: Obsidian Black)
      {
        id: 'butterfly-margin-l',
        name: 'Left Wing Venation Border',
        filamentId: 3,
        geometryType: 'box',
        transform: { position: [-34, 48, 6], rotation: [0.2, 0.4, 0.4], scale: [1, 1, 1] },
        parameters: { width: 6, height: 24, depth: 1 },
      },
      {
        id: 'butterfly-margin-r',
        name: 'Right Wing Venation Border',
        filamentId: 3,
        geometryType: 'box',
        transform: { position: [34, 48, 6], rotation: [0.2, -0.4, -0.4], scale: [1, 1, 1] },
        parameters: { width: 6, height: 24, depth: 1 },
      },
    ],
    blenderPythonScript: '',
  },
  {
    id: 'kobra-owl-8color',
    name: 'Anycubic Owl Mascot (8-Color ACE Pro)',
    description: 'Flagship 8-color multi-material test model designed for dual daisy-chained Anycubic ACE Pro units. Features high-contrast feather layers, pupil accents, and perched base.',
    prompt: 'Anycubic mascot owl for multi-color 3D printing with 8 distinct filament layers, sharp feather detail, and branch perch.',
    dimensions: { x: 74, y: 88, z: 66 },
    generatedBy: 'preset',
    createdAt: '2026-09-29',
    slicingTips: [
      'Orient vertically with perch flat on Anycubic textured PEI sheet for maximum bed adhesion.',
      'Enable "Purge into Infill" to reduce color transition waste from 28g to 17g.',
      'Ensure wipe tower is positioned at top-right (X=210, Y=210) to avoid bed collision during 600mm/s travels.'
    ],
    segments: [
      // 1. Perch Base (Slot 8: Tech Slate)
      {
        id: 'seg-perch',
        name: 'Perch Branch Base',
        filamentId: 8,
        geometryType: 'cylinder',
        transform: { position: [0, 6, 0], rotation: [0, 0, Math.PI / 2], scale: [1, 1, 1] },
        parameters: { radius: 10, height: 72 },
      },
      // 2. Main Body (Slot 1: Pure White)
      {
        id: 'seg-body',
        name: 'Owl Main Body & Feathers',
        filamentId: 1,
        geometryType: 'cylinder',
        transform: { position: [0, 42, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        parameters: { radiusBottom: 22, radiusTop: 18, height: 48 },
      },
      // 3. Chest Crest (Slot 2: Cyan Blue)
      {
        id: 'seg-chest',
        name: 'Chest Crest Fluff',
        filamentId: 2,
        geometryType: 'box',
        transform: { position: [0, 36, 12], rotation: [0.1, 0, 0], scale: [1, 1, 1] },
        parameters: { width: 20, height: 26, depth: 8 },
      },
      // 4. Wings (Slot 4: Vibrant Coral)
      {
        id: 'seg-wings-l',
        name: 'Left Feather Wing',
        filamentId: 4,
        geometryType: 'cone',
        transform: { position: [-22, 40, -2], rotation: [0.2, 0, -0.2], scale: [1, 1, 1] },
        parameters: { radius: 12, height: 38 },
      },
      {
        id: 'seg-wings-r',
        name: 'Right Feather Wing',
        filamentId: 4,
        geometryType: 'cone',
        transform: { position: [22, 40, -2], rotation: [0.2, 0, 0.2], scale: [1, 1, 1] },
        parameters: { radius: 12, height: 38 },
      },
      // 5. Beak (Slot 5: Sunburst Gold)
      {
        id: 'seg-beak',
        name: 'Curved Beak',
        filamentId: 5,
        geometryType: 'cone',
        transform: { position: [0, 52, 17], rotation: [Math.PI / 2.2, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 5, height: 14 },
      },
      // 6. Eyes Outer (Slot 6: Emerald Green)
      {
        id: 'seg-eye-l',
        name: 'Left Iris Ring',
        filamentId: 6,
        geometryType: 'cylinder',
        transform: { position: [-10, 56, 15], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 7, height: 4 },
      },
      {
        id: 'seg-eye-r',
        name: 'Right Iris Ring',
        filamentId: 6,
        geometryType: 'cylinder',
        transform: { position: [10, 56, 15], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 7, height: 4 },
      },
      // 7. Pupils (Slot 3: Obsidian Black)
      {
        id: 'seg-pupil-l',
        name: 'Left Pupil Core',
        filamentId: 3,
        geometryType: 'sphere',
        transform: { position: [-10, 56, 17], rotation: [0, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 3.5, height: 7 },
      },
      {
        id: 'seg-pupil-r',
        name: 'Right Pupil Core',
        filamentId: 3,
        geometryType: 'sphere',
        transform: { position: [10, 56, 17], rotation: [0, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 3.5, height: 7 },
      },
      // 8. Talons (Slot 7: Crimson Red)
      {
        id: 'seg-talons',
        name: 'Perch Claws & Talons',
        filamentId: 7,
        geometryType: 'box',
        transform: { position: [0, 15, 6], rotation: [0, 0, 0], scale: [1, 1, 1] },
        parameters: { width: 28, height: 8, depth: 14 },
      },
    ],
    blenderPythonScript: '',
  },
  {
    id: 'cyber-drone-4color',
    name: 'Hexagon Modular Tech Dock (4-Color)',
    description: 'Engineering organizer tray featuring interlocking hexagonal walls, contrasting compartment base, rubberized perimeter rim, and color-coded status badges.',
    prompt: 'Modular tech desktop dock with hexagonal cell compartments, dual-color rim, and recessed Anycubic logo.',
    dimensions: { x: 110, y: 32, z: 95 },
    generatedBy: 'preset',
    createdAt: '2026-09-29',
    slicingTips: [
      'Print with 0.16mm layer height to ensure crisp horizontal lines on color badges.',
      'Single ACE Pro unit (4-color mode) is 100% sufficient for this print.',
      'Flush multiplier can be lowered to 0.85x since the base color is darker than the walls.'
    ],
    segments: [
      {
        id: 'dock-base',
        name: 'Main Tray Base Plate',
        filamentId: 3, // Black
        geometryType: 'cylinder',
        transform: { position: [0, 4, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 52, height: 8 },
      },
      {
        id: 'dock-outer-wall',
        name: 'Hexagonal Perimeter Wall',
        filamentId: 2, // Cyan
        geometryType: 'cylinder',
        transform: { position: [0, 18, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 50, height: 24 },
      },
      {
        id: 'dock-inner-core',
        name: 'Center Compartment Core',
        filamentId: 1, // White
        geometryType: 'cylinder',
        transform: { position: [0, 16, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 24, height: 20 },
      },
      {
        id: 'dock-accent-rim',
        name: 'Top Chamfer Rim',
        filamentId: 4, // Coral
        geometryType: 'cylinder',
        transform: { position: [0, 30, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 51, height: 4 },
      },
    ],
    blenderPythonScript: '',
  },
  {
    id: 'planetary-gearbox-3color',
    name: 'Planetary Gear Bearing (3-Color)',
    description: 'Precision mechanical planetary gear mechanism printable in-place. Highlights the sun gear, planetary satellites, and outer ring in distinct contrasting filaments.',
    prompt: 'Multi-color planetary gear bearing print-in-place with 3 separate color components for moving parts.',
    dimensions: { x: 75, y: 16, z: 75 },
    generatedBy: 'preset',
    createdAt: '2026-09-29',
    slicingTips: [
      'In-place print clearance: 0.35mm. High-Speed PLA recommended for low friction.',
      'No purge tower needed if slicing with color-by-part concentric layer infill.'
    ],
    segments: [
      {
        id: 'gear-ring',
        name: 'Outer Ring Gear',
        filamentId: 3, // Black
        geometryType: 'cylinder',
        transform: { position: [0, 8, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 36, height: 16 },
      },
      {
        id: 'gear-sun',
        name: 'Central Sun Gear & Shaft',
        filamentId: 5, // Gold
        geometryType: 'cylinder',
        transform: { position: [0, 8, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 12, height: 16 },
      },
      {
        id: 'gear-planet-1',
        name: 'Satellite Planet Gear A',
        filamentId: 2, // Cyan
        geometryType: 'cylinder',
        transform: { position: [0, 8, 22], rotation: [0, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 8, height: 16 },
      },
      {
        id: 'gear-planet-2',
        name: 'Satellite Planet Gear B',
        filamentId: 2, // Cyan
        geometryType: 'cylinder',
        transform: { position: [-19, 8, -11], rotation: [0, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 8, height: 16 },
      },
      {
        id: 'gear-planet-3',
        name: 'Satellite Planet Gear C',
        filamentId: 2, // Cyan
        geometryType: 'cylinder',
        transform: { position: [19, 8, -11], rotation: [0, 0, 0], scale: [1, 1, 1] },
        parameters: { radius: 8, height: 16 },
      },
    ],
    blenderPythonScript: '',
  }
];
