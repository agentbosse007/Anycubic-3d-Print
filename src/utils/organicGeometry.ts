import * as THREE from 'three';
import type { MeshSegment } from '../types';

/**
 * Creates high-detail organic procedural BufferGeometry with smooth normal vectors
 */
export function generateOrganicBufferGeometry(segment: MeshSegment): THREE.BufferGeometry {
  const organicType = segment.parameters.organicType || 'smooth_anatomy';
  const width = segment.parameters.width || 20;
  const height = segment.parameters.height || 20;
  const depth = segment.parameters.depth || 20;
  const radius = segment.parameters.radius || 12;

  // 1. Logarithmic Fibonacci Nautilus Shell
  if (organicType === 'nautilus_shell' || organicType === 'fossil_spiral') {
    const turns = 2.4;
    const slices = 48;
    const rings = 20;
    const a = 1.8;
    const b = 0.22;

    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    for (let i = 0; i <= slices; i++) {
      const theta = (i / slices) * Math.PI * 2 * turns;
      const rCenter = a * Math.exp(b * theta) * (radius / 10);
      const tubeRadius = rCenter * 0.38;

      const centerX = Math.cos(theta) * rCenter;
      const centerY = (theta / (Math.PI * 2 * turns)) * 6 - 3;
      const centerZ = Math.sin(theta) * rCenter;

      // Tangent vector
      const tanX = -Math.sin(theta);
      const tanZ = Math.cos(theta);

      for (let j = 0; j <= rings; j++) {
        const phi = (j / rings) * Math.PI * 2;
        // Minor ribbing wave on shell exterior
        const rib = Math.sin(theta * 12) * (tubeRadius * 0.08);
        const curTube = tubeRadius + rib;

        const nx = Math.cos(phi) * tanZ;
        const ny = Math.sin(phi);
        const nz = -Math.cos(phi) * tanX;

        vertices.push(
          centerX + nx * curTube,
          centerY + ny * curTube,
          centerZ + nz * curTube
        );
        uvs.push(i / slices, j / rings);
      }
    }

    for (let i = 0; i < slices; i++) {
      for (let j = 0; j < rings; j++) {
        const aIdx = i * (rings + 1) + j;
        const bIdx = (i + 1) * (rings + 1) + j;
        indices.push(aIdx, bIdx, aIdx + 1);
        indices.push(bIdx, bIdx + 1, aIdx + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // 2. Lifelike Butterfly Wing with Aerofoil & Venation Curvature
  if (organicType === 'butterfly_wing') {
    const segX = 24;
    const segY = 32;
    const geo = new THREE.PlaneGeometry(width, height, segX, segY);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) / width) + 0.5; // 0 to 1
      const v = (pos.getY(i) / height) + 0.5; // 0 to 1

      // Natural aerofoil camber: curved arch along length
      const camber = Math.sin(v * Math.PI) * (width * 0.14) * (1 - u * 0.4);
      // Wing tip curl
      const tipCurl = Math.pow(v, 2) * Math.sin(u * Math.PI) * (width * 0.08);
      // Delicate sculpted venation ripples
      const venation = Math.sin(u * 14 + v * 6) * 0.45 * Math.sin(u * Math.PI);

      pos.setZ(i, camber + tipCurl + venation);
      // Natural tapered wing silhouette
      const taperFactor = 0.5 + 0.5 * Math.sin(v * Math.PI * 0.85);
      pos.setX(i, pos.getX(i) * taperFactor);
    }

    geo.computeVertexNormals();
    return geo;
  }

  // 3. Lifelike Botanical Petal / Flora
  if (organicType === 'petal') {
    const segX = 20;
    const segY = 24;
    const geo = new THREE.PlaneGeometry(width, height, segX, segY);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) / width) + 0.5;
      const v = (pos.getY(i) / height) + 0.5;

      // Parabolic bowl cup curvature
      const cup = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * (height * 0.25);
      // Edge curl at the tip
      const tipFlute = (v > 0.7) ? Math.sin((v - 0.7) * Math.PI * 3) * (width * 0.1) : 0;
      // Central midrib groove
      const midrib = -Math.exp(-Math.pow((u - 0.5) * 8, 2)) * 0.8;

      pos.setZ(i, cup + tipFlute + midrib);
      // Tear-drop petal contour
      const tearTaper = Math.sin(v * Math.PI * 0.9);
      pos.setX(i, pos.getX(i) * Math.max(0.2, tearTaper));
    }

    geo.computeVertexNormals();
    return geo;
  }

  // 4. Lifelike Amphibian Torso (Poison Dart Frog Body)
  if (organicType === 'frog_body') {
    const rings = 28;
    const slices = 28;
    const geo = new THREE.SphereGeometry(radius, slices, rings);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      const normY = y / radius; // -1 (ventral/pelvis) to +1 (rostral/head)
      const normZ = z / radius;

      // Flatten belly (ventral)
      if (y < 0) {
        y *= 0.65;
      }

      // Dorsal arch: humped back typical of anurans
      if (y > 0 && normZ < 0) {
        z *= 1.35;
      }

      // Head taper: triangular snout toward +Z
      if (normZ > 0.4) {
        const snoutFactor = 1 - (normZ - 0.4) * 0.5;
        x *= snoutFactor;
        y *= snoutFactor;
      }

      // Cranial eye arches: pair of raised spherical crests
      const eyeLDist = Math.hypot(x - radius * 0.45, y - radius * 0.35, z - radius * 0.4);
      const eyeRDist = Math.hypot(x + radius * 0.45, y - radius * 0.35, z - radius * 0.4);
      const eyeLBulge = Math.max(0, 1 - eyeLDist / (radius * 0.5)) * (radius * 0.3);
      const eyeRBulge = Math.max(0, 1 - eyeRDist / (radius * 0.5)) * (radius * 0.3);

      x += (eyeRBulge - eyeLBulge) * 0.4;
      y += (eyeLBulge + eyeRBulge) * 0.8;

      // Micro skin papillae (subtle organic bumpiness)
      const skinNoise = Math.sin(x * 1.5) * Math.cos(z * 1.5) * 0.25;

      pos.setXYZ(i, x + skinNoise, y, z);
    }

    geo.computeVertexNormals();
    return geo;
  }

  // 5. Lifelike Amphibian Limb (Curved anatomical leg with spread digit pads)
  if (organicType === 'frog_limb') {
    const curvePoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(radius * 0.6, radius * 0.5, -radius * 0.2), // Thigh
      new THREE.Vector3(radius * 1.1, radius * 0.1, -radius * 0.6), // Knee
      new THREE.Vector3(radius * 1.4, -radius * 0.4, -radius * 0.2), // Ankle
      new THREE.Vector3(radius * 1.7, -radius * 0.6, radius * 0.1), // Foot pad
    ];
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(curve, 24, radius * 0.22, 12, false);
    tubeGeo.computeVertexNormals();
    return tubeGeo;
  }

  // 6. Natural Displaced Slate Rock / Mossy Pedestal
  if (organicType === 'rock_pedestal') {
    const geo = new THREE.DodecahedronGeometry(radius, 3);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Multi-frequency fractal noise displacement
      const noise =
        Math.sin(x * 0.2) * Math.cos(z * 0.2) * 2.2 +
        Math.sin(x * 0.5 + y * 0.3) * 1.1 +
        Math.cos(z * 0.8) * 0.6;

      // Flatten bottom for print bed adhesion
      if (y < -radius * 0.35) {
        y = -radius * 0.35;
      } else {
        x += (x / radius) * noise;
        z += (z / radius) * noise;
        y += (y / radius) * noise * 0.7;
      }

      pos.setXYZ(i, x, y, z);
    }

    geo.computeVertexNormals();
    return geo;
  }

  // 7. Realistic Organic Eye (Cornea & Iris)
  if (organicType === 'organic_eye') {
    const geo = new THREE.SphereGeometry(radius, 24, 20);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      // Slightly prolate cornea forward
      if (z > 0) {
        pos.setZ(i, z * 1.25);
      }
    }

    geo.computeVertexNormals();
    return geo;
  }

  // 8. Lifelike Mushroom Cap (Pileus with radial gills & organic undulating margin)
  if (organicType === 'mushroom_cap') {
    const slices = 36;
    const rings = 24;
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    // Construct umbrella hemisphere with under-cap gill cavity
    for (let r = 0; r <= rings; r++) {
      const v = r / rings; // 0 (apex) to 1 (rim margin)
      const ringRadius = Math.sin(v * Math.PI * 0.55) * radius;
      const ringY = Math.cos(v * Math.PI * 0.55) * (height * 0.6);

      for (let s = 0; s <= slices; s++) {
        const u = s / slices;
        const theta = u * Math.PI * 2;

        // Undulating organic wavy margin
        const edgeWave = v > 0.6 ? Math.sin(theta * 7) * (radius * 0.08) * (v - 0.6) : 0;
        // Fine micro gills on the underside
        const gillRib = v > 0.85 ? Math.sin(theta * 32) * (radius * 0.06) : 0;

        const x = Math.cos(theta) * (ringRadius + edgeWave);
        const z = Math.sin(theta) * (ringRadius + edgeWave);
        const y = ringY + gillRib;

        vertices.push(x, y, z);
        uvs.push(u, v);
      }
    }

    // Underside inward lip closure to make solid watertight mesh
    const baseOffset = vertices.length / 3;
    for (let s = 0; s <= slices; s++) {
      const u = s / slices;
      const theta = u * Math.PI * 2;
      const innerRadius = radius * 0.28;
      const x = Math.cos(theta) * innerRadius;
      const z = Math.sin(theta) * innerRadius;
      const y = (height * 0.15);
      vertices.push(x, y, z);
      uvs.push(u, 1);
    }

    // Faces for outer dome
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < slices; s++) {
        const a = r * (slices + 1) + s;
        const b = (r + 1) * (slices + 1) + s;
        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }

    // Connect rim to inner underside lip
    const rimStart = rings * (slices + 1);
    for (let s = 0; s < slices; s++) {
      const a = rimStart + s;
      const b = rimStart + s + 1;
      const c = baseOffset + s;
      const d = baseOffset + s + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // 9. Lifelike Mushroom Stem (Stipe with fibrous texture & flared base)
  if (organicType === 'mushroom_stem') {
    const curvePoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(radius * 0.15, height * 0.35, radius * 0.1),
      new THREE.Vector3(-radius * 0.1, height * 0.7, -radius * 0.05),
      new THREE.Vector3(0, height, 0),
    ];
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(curve, 24, radius * 0.45, 16, false);
    const pos = tubeGeo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Flared mycelial bulb base
      if (y < height * 0.25) {
        const flare = 1 + (1 - y / (height * 0.25)) * 0.8;
        x *= flare;
        z *= flare;
      }
      // Annulus veil ring bulge
      const ringDist = Math.abs(y - height * 0.68);
      if (ringDist < height * 0.08) {
        const ringBulge = 1 + Math.cos((ringDist / (height * 0.08)) * Math.PI * 0.5) * 0.45;
        x *= ringBulge;
        z *= ringBulge;
      }

      pos.setXYZ(i, x, y, z);
    }
    tubeGeo.computeVertexNormals();
    return tubeGeo;
  }

  // 10. Lifelike Fleshy Succulent Rosette (Fibonacci phyllotaxis spiraled fleshy leaves)
  if (organicType === 'succulent_rosette') {
    const geo = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    const numLeaves = 28;
    const goldenAngle = 137.50776 * (Math.PI / 180);

    for (let l = 0; l < numLeaves; l++) {
      const leafFrac = l / numLeaves; // 0 (outer older) to 1 (inner budding)
      const leafAngle = l * goldenAngle;
      const distFromCenter = Math.pow(1 - leafFrac * 0.85, 0.7) * radius;
      const leafScale = (0.55 + 0.45 * (1 - leafFrac)) * (radius * 0.45);
      const leafElevation = (leafFrac * 0.4) * height;
      const tiltAngle = 0.45 + (1 - leafFrac) * 0.5; // Outer leaves open wider

      // Each leaf is a sculpted spoon-shaped fleshy polygon
      const leafSlices = 8;
      const leafRings = 5;
      const vStart = vertices.length / 3;

      for (let r = 0; r <= leafRings; r++) {
        const vr = r / leafRings;
        for (let s = 0; s <= leafSlices; s++) {
          const us = (s / leafSlices) * 2 - 1; // -1 to +1

          // Spoon leaf profile
          const leafW = Math.sin(vr * Math.PI) * leafScale * 0.65 * (1 - us * us * 0.3);
          const leafL = vr * leafScale * 1.4;
          const leafThick = Math.sin(vr * Math.PI) * (leafScale * 0.32) * (1 - Math.abs(us) * 0.6);

          // Local coords
          let lx = us * leafW;
          let ly = leafThick;
          let lz = leafL;

          // Rotate by leaf pitch tilt
          const cosP = Math.cos(tiltAngle);
          const sinP = Math.sin(tiltAngle);
          const ty = ly * cosP - lz * sinP;
          const tz = ly * sinP + lz * cosP;

          // Rotate by Fibonacci azimuth
          const cosA = Math.cos(leafAngle);
          const sinA = Math.sin(leafAngle);
          const gx = Math.cos(leafAngle) * distFromCenter + (lx * cosA - tz * sinA);
          const gz = Math.sin(leafAngle) * distFromCenter + (lx * sinA + tz * cosA);
          const gy = leafElevation + ty;

          vertices.push(gx, gy, gz);
          uvs.push(us * 0.5 + 0.5, vr);
        }
      }

      for (let r = 0; r < leafRings; r++) {
        for (let s = 0; s < leafSlices; s++) {
          const a = vStart + r * (leafSlices + 1) + s;
          const b = vStart + (r + 1) * (leafSlices + 1) + s;
          indices.push(a, b, a + 1);
          indices.push(b, b + 1, a + 1);
        }
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // 11. Lifelike Prismatic Hexagonal Quartz Crystal Cluster
  if (organicType === 'crystal_cluster') {
    const geo = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    // 7 interlocking hexagonal quartz crystals with pyramidal terminations
    const crystals = [
      { x: 0, z: 0, r: radius * 0.38, h: height * 0.95, yaw: 0.1, tiltX: 0.05, tiltZ: 0.05 },
      { x: -radius * 0.35, z: -radius * 0.2, r: radius * 0.28, h: height * 0.75, yaw: 0.8, tiltX: -0.15, tiltZ: -0.1 },
      { x: radius * 0.4, z: -radius * 0.15, r: radius * 0.26, h: height * 0.82, yaw: 0.4, tiltX: 0.18, tiltZ: -0.12 },
      { x: -radius * 0.2, z: radius * 0.4, r: radius * 0.24, h: height * 0.65, yaw: 1.2, tiltX: -0.12, tiltZ: 0.2 },
      { x: radius * 0.32, z: radius * 0.35, r: radius * 0.22, h: height * 0.58, yaw: 0.6, tiltX: 0.15, tiltZ: 0.18 },
      { x: radius * 0.05, z: -radius * 0.45, r: radius * 0.20, h: height * 0.52, yaw: 1.5, tiltX: 0.05, tiltZ: -0.22 },
      { x: -radius * 0.45, z: radius * 0.1, r: radius * 0.18, h: height * 0.45, yaw: 0.3, tiltX: -0.25, tiltZ: 0.05 },
    ];

    crystals.forEach(c => {
      const vOffset = vertices.length / 3;
      const sides = 6;
      const pyrH = c.r * 1.2;
      const bodyH = Math.max(c.r, c.h - pyrH);

      // Bottom center
      const botCenter = vOffset;
      vertices.push(c.x, 0, c.z);
      uvs.push(0.5, 0);

      // Apex point of pyramid
      const apexIdx = vOffset + 1;
      // Apex position tilted
      const apexX = c.x + c.tiltX * c.h;
      const apexY = c.h;
      const apexZ = c.z + c.tiltZ * c.h;
      vertices.push(apexX, apexY, apexZ);
      uvs.push(0.5, 1);

      // Prism ring vertices (base & shoulder)
      const baseRingStart = vOffset + 2;
      const shoulderRingStart = vOffset + 2 + sides;

      for (let s = 0; s < sides; s++) {
        const theta = (s / sides) * Math.PI * 2 + c.yaw;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        // Base ring
        vertices.push(c.x + cos * c.r, 0, c.z + sin * c.r);
        uvs.push(s / sides, 0.1);

        // Shoulder ring (where pyramid starts)
        const shX = c.x + cos * c.r + c.tiltX * bodyH;
        const shY = bodyH;
        const shZ = c.z + sin * c.r + c.tiltZ * bodyH;
        vertices.push(shX, shY, shZ);
        uvs.push(s / sides, 0.8);
      }

      for (let s = 0; s < sides; s++) {
        const next = (s + 1) % sides;
        const bCurr = baseRingStart + s;
        const bNext = baseRingStart + next;
        const sCurr = shoulderRingStart + s;
        const sNext = shoulderRingStart + next;

        // Base triangle
        indices.push(botCenter, bNext, bCurr);
        // Prism wall quads (2 triangles)
        indices.push(bCurr, sCurr, bNext);
        indices.push(bNext, sCurr, sNext);
        // Pyramid facet triangle
        indices.push(sCurr, apexIdx, sNext);
      }
    });

    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // 12. Lifelike Chameleon Prehensile Spiral Tail
  if (organicType === 'chameleon_tail') {
    const turns = 1.6;
    const slices = 42;
    const rings = 16;
    const rSpiral = radius * 0.7;

    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    for (let i = 0; i <= slices; i++) {
      const t = i / slices;
      const theta = t * Math.PI * 2 * turns;
      const curRadius = rSpiral * Math.pow(1 - t * 0.65, 1.2);
      const tubeRadius = Math.max(1.8, (radius * 0.28) * (1 - t * 0.85));

      const cx = Math.cos(theta) * curRadius;
      const cy = Math.sin(theta) * curRadius;
      const cz = t * (height * 0.2);

      const tanX = -Math.sin(theta);
      const tanY = Math.cos(theta);

      for (let j = 0; j <= rings; j++) {
        const phi = (j / rings) * Math.PI * 2;
        // Fine reptile scale ribs
        const scaleBump = Math.sin(phi * 8 + theta * 12) * (tubeRadius * 0.08);
        const tr = tubeRadius + scaleBump;

        const nx = Math.cos(phi) * (-tanY);
        const ny = Math.cos(phi) * tanX;
        const nz = Math.sin(phi);

        vertices.push(cx + nx * tr, cy + ny * tr, cz + nz * tr);
        uvs.push(t, j / rings);
      }
    }

    for (let i = 0; i < slices; i++) {
      for (let j = 0; j < rings; j++) {
        const a = i * (rings + 1) + j;
        const b = (i + 1) * (rings + 1) + j;
        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // 13. Lifelike Beetle Elytra (Curved chitin wing shell with margin suture)
  if (organicType === 'beetle_elytra') {
    const segX = 22;
    const segY = 28;
    const geo = new THREE.PlaneGeometry(width, height, segX, segY);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) / width) + 0.5; // 0 to 1
      const v = (pos.getY(i) / height) + 0.5; // 0 to 1

      // Convex chitinous dome arch
      const dome = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * (width * 0.38);
      // Lateral rim downturn
      const edgeCurl = Math.pow(Math.abs(u - 0.5) * 2, 3) * (-width * 0.12);
      // Subtle longitudinal striations (elytral striae)
      const striae = Math.sin(u * Math.PI * 10) * 0.35 * Math.sin(v * Math.PI);

      pos.setZ(i, dome + edgeCurl + striae);
      // Natural tapered beetle abdomen contour
      const contour = Math.sin(v * Math.PI * 0.85);
      pos.setX(i, pos.getX(i) * (0.6 + 0.4 * contour));
    }
    geo.computeVertexNormals();
    return geo;
  }

  // 14. Weathered Tree Trunk Bark with Buttress Roots
  if (organicType === 'tree_trunk_bark' || organicType === 'branch_bark') {
    const rings = 28;
    const slices = 28;
    const geo = new THREE.CylinderGeometry(radius * 0.85, radius * 1.15, height, slices, rings);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      const angle = Math.atan2(z, x);
      const normY = y / height; // -0.5 to +0.5

      // Vertical bark fissures & longitudinal striations
      const barkFissure = Math.sin(angle * 12 + normY * 3) * (radius * 0.12) +
                          Math.cos(angle * 24) * (radius * 0.05);

      // Flared buttress root lobes near bottom
      let rootFlare = 1.0;
      if (normY < -0.2) {
        const rootLobe = Math.pow(Math.cos(angle * 3), 4) * 0.5;
        rootFlare += (-(normY + 0.2) / 0.3) * (0.6 + rootLobe);
      }

      x *= rootFlare;
      z *= rootFlare;

      pos.setXYZ(i, x + (x / radius) * barkFissure, y, z + (z / radius) * barkFissure);
    }
    geo.computeVertexNormals();
    return geo;
  }

  // 15. Botanical Leaf with Primary & Secondary Venation
  if (organicType === 'leaf_vein') {
    const segX = 24;
    const segY = 30;
    const geo = new THREE.PlaneGeometry(width, height, segX, segY);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) / width) + 0.5;
      const v = (pos.getY(i) / height) + 0.5;

      // Natural leaf camber curve
      const arch = Math.sin(v * Math.PI) * (width * 0.15) * Math.sin(u * Math.PI);
      // Midrib depression & raised edge
      const midrib = -Math.exp(-Math.pow((u - 0.5) * 12, 2)) * 1.2;
      // Secondary branching veins
      const veinDist = Math.sin((v * 12 + Math.abs(u - 0.5) * 8) * Math.PI) * 0.3;

      pos.setZ(i, arch + midrib + veinDist);

      // Natural lanceolate / ovate leaf silhouette
      const leafTaper = Math.sin(v * Math.PI * 0.95);
      pos.setX(i, pos.getX(i) * Math.max(0.15, leafTaper));
    }
    geo.computeVertexNormals();
    return geo;
  }

  // 16. Tortoise Shell Carapace (Hexagonal scutes & growth sulci)
  if (organicType === 'tortoise_shell') {
    const geo = new THREE.SphereGeometry(radius, 32, 26);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Flatten plastron bottom for print stability
      if (y < -radius * 0.3) {
        y = -radius * 0.3;
      } else {
        // High domed carapace
        y *= 1.15;
        z *= 1.25; // Oval turtle shape

        // Sculpted scute ridges and growth sulci
        const dist = Math.hypot(x, z);
        const scuteGroove = Math.sin(dist * 0.8) * Math.cos(Math.atan2(z, x) * 6) * 0.8;
        x += (x / radius) * scuteGroove;
        z += (z / radius) * scuteGroove;
        y += scuteGroove * 0.6;
      }

      pos.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();
    return geo;
  }

  // 17. Default Smooth Anatomical Surface
  const geo = new THREE.SphereGeometry(radius, 28, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Smooth asymmetric muscle volume
    const bulge = Math.sin(y * 0.3) * 1.2;
    pos.setXYZ(i, x + bulge, y * (height / (radius * 2)), z + bulge * 0.5);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Extracts raw vertices and triangular indices from organic geometry for 3MF/STL export
 */
export function getOrganicTriangles(segment: MeshSegment): {
  vertices: [number, number, number][];
  indices: [number, number, number][];
} {
  const geo = generateOrganicBufferGeometry(segment);
  const pos = geo.attributes.position;
  const index = geo.index;

  const [px, py, pz] = segment.transform.position;
  const [rx, ry, rz] = segment.transform.rotation;
  const [sx, sy, sz] = segment.transform.scale;

  // Rotation Euler
  const euler = new THREE.Euler(rx, ry, rz, 'XYZ');
  const matrix = new THREE.Matrix4().makeRotationFromEuler(euler);

  const vertices: [number, number, number][] = [];
  const indices: [number, number, number][] = [];

  for (let i = 0; i < pos.count; i++) {
    const localVec = new THREE.Vector3(
      pos.getX(i) * sx,
      pos.getY(i) * sy,
      pos.getZ(i) * sz
    );
    localVec.applyMatrix4(matrix);

    vertices.push([
      parseFloat((px + localVec.x).toFixed(3)),
      parseFloat((py + localVec.y).toFixed(3)),
      parseFloat((pz + localVec.z).toFixed(3)),
    ]);
  }

  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      indices.push([index.getX(i), index.getX(i + 1), index.getX(i + 2)]);
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      indices.push([i, i + 1, i + 2]);
    }
  }

  return { vertices, indices };
}
