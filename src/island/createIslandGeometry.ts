import { BufferGeometry, Color, Float32BufferAttribute } from 'three';

// A single closed mesh, built from irregular elliptical rings. Shared vertices
// give soft normals; restrained vertex colours keep the low-poly forms legible.
export function createIslandGeometry() {
  const segments = 48;
  const rings = [
    { radius: 0.22, y: 0.13, color: '#BAD18F' },
    { radius: 0.48, y: 0.12, color: '#B5CF8D' },
    { radius: 0.73, y: 0.10, color: '#AEC98A' },
    { radius: 0.93, y: 0.06, color: '#A6C488' },
    { radius: 1.00, y: -0.02, color: '#9DBB85' },
    { radius: 1.01, y: -0.14, color: '#91AD93' },
    { radius: 1.00, y: -0.25, color: '#91AAB9' },
    { radius: 0.98, y: -0.70, color: '#839FB6' },
    { radius: 0.67, y: -1.08, color: '#7895AF' },
    { radius: 0.25, y: -1.24, color: '#7590AA' },
  ];
  const positions = [0, 0.13, 0];
  const colors: number[] = new Color('#BAD18F').toArray();
  const indices: number[] = [];

  for (const [ringIndex, ring] of rings.entries()) {
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const contour = 1 + 0.045 * Math.sin(3 * angle + 0.4) + 0.025 * Math.cos(5 * angle);
      const undulation = Math.sin(angle * 4 + ringIndex * 0.6);
      positions.push(
        Math.cos(angle) * 3.3 * ring.radius * contour,
        ring.y + undulation * (ringIndex < 4 ? 0.015 : 0.045),
        Math.sin(angle) * 2.7 * ring.radius * contour,
      );
      const color = new Color(ring.color);
      color.multiplyScalar(1 + 0.018 * Math.sin(angle * 5 + ringIndex));
      colors.push(...color.toArray());
    }
  }

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(0, 1 + next, 1 + i);
    for (let ring = 0; ring < rings.length - 1; ring++) {
      const a = 1 + ring * segments + i;
      const b = 1 + ring * segments + next;
      const c = a + segments;
      const d = b + segments;
      indices.push(a, b, c, b, d, c);
    }
  }

  const bottom = positions.length / 3;
  positions.push(0, -1.30, 0);
  colors.push(...new Color('#7590AA').toArray());
  const lastRing = 1 + (rings.length - 1) * segments;
  for (let i = 0; i < segments; i++) {
    indices.push(lastRing + i, lastRing + ((i + 1) % segments), bottom);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
