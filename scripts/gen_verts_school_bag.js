// gen_verts_school_bag.js
// Reads ref-school-bag2.svg (Tabler backpack, viewBox 0 0 24 24)
// Converts paths to Lottie vertex format and saves lottie-verts-school-bag.json

const fs = require('fs');
const path = require('path');
const SvgPath = require('svgpath');

// SVG dimensions
const SVG_W = 24;
const SVG_H = 24;

// Scale: height=75px, centered at canvas (100, 105)
const SC = 75 / SVG_H;           // 3.125
const OX = 100 - (SVG_W * SC) / 2; // 100 - 37.5 = 62.5
const OY = 105 - (75 / 2);         // 67.5

function svgToShape(d) {
  // Convert arcs and relative to absolute, then expand V/H
  const abs = new SvgPath(d).abs().unarc().round(6).toString();
  const segs = abs.match(/[MLCVHSQTAZ][^MLCVHSQTAZ]*/gi) || [];
  const verts = [], ins = [], outs = [];
  let cx = 0, cy = 0;

  for (const seg of segs) {
    const type = seg[0].toUpperCase();
    const nums = (seg.slice(1).match(/-?[\d.]+(?:e[+-]?\d+)?/g) || []).map(Number);

    if (type === 'M') {
      // First pair is M, subsequent pairs are implicit L
      for (let i = 0; i < nums.length; i += 2) {
        cx = nums[i]; cy = nums[i + 1];
        verts.push([cx * SC + OX, cy * SC + OY]);
        ins.push([0, 0]); outs.push([0, 0]);
      }
    } else if (type === 'L') {
      for (let i = 0; i < nums.length; i += 2) {
        cx = nums[i]; cy = nums[i + 1];
        verts.push([cx * SC + OX, cy * SC + OY]);
        ins.push([0, 0]); outs.push([0, 0]);
      }
    } else if (type === 'H') {
      for (let i = 0; i < nums.length; i++) {
        cx = nums[i];
        verts.push([cx * SC + OX, cy * SC + OY]);
        ins.push([0, 0]); outs.push([0, 0]);
      }
    } else if (type === 'V') {
      for (let i = 0; i < nums.length; i++) {
        cy = nums[i];
        verts.push([cx * SC + OX, cy * SC + OY]);
        ins.push([0, 0]); outs.push([0, 0]);
      }
    } else if (type === 'C') {
      for (let i = 0; i < nums.length; i += 6) {
        const x1 = nums[i],   y1 = nums[i + 1];
        const x2 = nums[i + 2], y2 = nums[i + 3];
        const x  = nums[i + 4], y  = nums[i + 5];
        // Set out handle of previous vertex
        if (verts.length > 0) {
          outs[outs.length - 1] = [
            x1 * SC + OX - verts[verts.length - 1][0],
            y1 * SC + OY - verts[verts.length - 1][1]
          ];
        }
        cx = x; cy = y;
        const px = cx * SC + OX, py = cy * SC + OY;
        verts.push([px, py]);
        ins.push([x2 * SC + OX - px, y2 * SC + OY - py]);
        outs.push([0, 0]);
      }
    }
    // Z: close — c:true handles this
  }

  return { v: verts, i: ins, o: outs, c: true };
}

// Read SVG
const svgContent = fs.readFileSync(path.join(__dirname, 'ref-school-bag2.svg'), 'utf8');

// Extract all path d attributes
const pathMatches = [...svgContent.matchAll(/<path[^>]+d="([^"]+)"/g)].map(m => m[1]);
console.log(`Found ${pathMatches.length} paths in SVG`);

const shapes = [];
for (const d of pathMatches) {
  const shape = svgToShape(d);
  if (shape.v.length >= 2) {
    shapes.push(shape);
    console.log(`  Shape: ${shape.v.length} vertices`);
  }
}

// Print bounds for verification
console.log('\nBounds check:');
for (let idx = 0; idx < shapes.length; idx++) {
  const s = shapes[idx];
  const xs = s.v.map(p => p[0]);
  const ys = s.v.map(p => p[1]);
  const minX = Math.min(...xs).toFixed(2);
  const maxX = Math.max(...xs).toFixed(2);
  const minY = Math.min(...ys).toFixed(2);
  const maxY = Math.max(...ys).toFixed(2);
  const inBounds = +minX >= 0 && +maxX <= 200 && +minY >= 0 && +maxY <= 200;
  console.log(`  Shape ${idx + 1}: x=[${minX},${maxX}] y=[${minY},${maxY}] ${inBounds ? 'OK' : 'OUT OF BOUNDS!'}`);
}

// Save result
const output = { shapes };
const outPath = path.join(__dirname, 'lottie-verts-school-bag.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\nSaved: ${outPath}`);
console.log(`Total shapes: ${shapes.length}`);
