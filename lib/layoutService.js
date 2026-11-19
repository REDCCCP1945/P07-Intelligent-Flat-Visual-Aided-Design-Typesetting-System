const GOLDEN = 0.6180339887498949;

function round(value, digits) {
  const factor = Math.pow(10, digits === undefined ? 2 : digits);
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex) {
  const value = String(hex || "#000000").replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  function part(value) {
    const text = clamp(Math.round(value), 0, 255).toString(16).toUpperCase();
    return text.length < 2 ? "0" + text : text;
  }
  return "#" + part(r) + part(g) + part(b);
}

function luminance(hex) {
  const rgb = hexToRgb(hex);
  const channels = [rgb.r, rgb.g, rgb.b].map(function (value) {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return round((bright + 0.05) / (dark + 0.05), 2);
}

function contrastLevel(ratio) {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA_LARGE";
  return "FAIL";
}

function rgbToCmyk(r, g, b) {
  const rr = Number(r) / 255;
  const gg = Number(g) / 255;
  const bb = Number(b) / 255;
  const k = 1 - Math.max(rr, gg, bb);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: round((1 - rr - k) / (1 - k) * 100, 1),
    m: round((1 - gg - k) / (1 - k) * 100, 1),
    y: round((1 - bb - k) / (1 - k) * 100, 1),
    k: round(k * 100, 1)
  };
}

function totalInk(cmyk) {
  return round(Number(cmyk.c) + Number(cmyk.m) + Number(cmyk.y) + Number(cmyk.k), 1);
}

function snapValue(value, step) {
  const size = Number(step) || 0;
  if (size <= 0) return round(value, 2);
  return round(Math.round(Number(value) / size) * size, 2);
}

function bbox(layers) {
  if (!layers.length) return { x: 0, y: 0, width: 0, height: 0, right: 0, bottom: 0 };
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  layers.forEach(function (layer) {
    const x = Number(layer.x);
    const y = Number(layer.y);
    const w = Number(layer.width);
    const h = Number(layer.height);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x + w);
    bottom = Math.max(bottom, y + h);
  });
  return { x: round(left, 2), y: round(top, 2), width: round(right - left, 2), height: round(bottom - top, 2), right: round(right, 2), bottom: round(bottom, 2) };
}

function alignOffset(layer, box, mode) {
  switch (mode) {
    case "left": return round(box.x - layer.x, 2);
    case "centerX": return round(box.x + box.width / 2 - (layer.x + layer.width / 2), 2);
    case "right": return round(box.right - (layer.x + layer.width), 2);
    case "top": return round(box.y - layer.y, 2);
    case "centerY": return round(box.y + box.height / 2 - (layer.y + layer.height / 2), 2);
    case "bottom": return round(box.bottom - (layer.y + layer.height), 2);
    default: return 0;
  }
}

function alignLayers(layers, mode) {
  const box = bbox(layers);
  return layers.map(function (layer) {
    const next = Object.assign({}, layer);
    if (mode === "left" || mode === "centerX" || mode === "right") {
      next.x = round(Number(layer.x) + alignOffset(layer, box, mode), 2);
    } else {
      next.y = round(Number(layer.y) + alignOffset(layer, box, mode), 2);
    }
    return next;
  });
}

function distributeGaps(layers, axis) {
  const sorted = layers.slice().sort(function (a, b) { return Number(a[axis]) - Number(b[axis]); });
  if (sorted.length < 3) return layers;
  const key = axis === "x" ? "width" : "height";
  const box = bbox(sorted);
  const used = sorted.reduce(function (sum, item) { return sum + Number(item[key]); }, 0);
  const gap = round((Number(box[key]) - used) / (sorted.length - 1), 2);
  let cursor = Number(box[axis]);
  sorted.forEach(function (item) {
    item[axis] = round(cursor, 2);
    cursor = cursor + Number(item[key]) + gap;
  });
  return layers;
}

function goldenGuides(width, height) {
  return {
    vertical: [round(Number(width) * (1 - GOLDEN), 2), round(Number(width) * GOLDEN, 2)],
    horizontal: [round(Number(height) * (1 - GOLDEN), 2), round(Number(height) * GOLDEN, 2)]
  };
}

function scaleLayers(layers, fromWidth, fromHeight, toWidth, toHeight) {
  const sx = Number(toWidth) / Number(fromWidth);
  const sy = Number(toHeight) / Number(fromHeight);
  return layers.map(function (layer) {
    return Object.assign({}, layer, {
      x: round(Number(layer.x) * sx, 2),
      y: round(Number(layer.y) * sy, 2),
      width: round(Number(layer.width) * sx, 2),
      height: round(Number(layer.height) * sy, 2),
      fontSize: layer.fontSize ? round(Number(layer.fontSize) * Math.min(sx, sy), 2) : layer.fontSize
    });
  });
}

function maskArea(operation, a, b) {
  const left = Math.max(Number(a.x), Number(b.x));
  const top = Math.max(Number(a.y), Number(b.y));
  const right = Math.min(Number(a.x) + Number(a.width), Number(b.x) + Number(b.width));
  const bottom = Math.min(Number(a.y) + Number(a.height), Number(b.y) + Number(b.height));
  const overlap = Math.max(0, right - left) * Math.max(0, bottom - top);
  const areaA = Number(a.width) * Number(a.height);
  const areaB = Number(b.width) * Number(b.height);
  if (operation === "union") return round(areaA + areaB - overlap, 2);
  if (operation === "intersect") return round(overlap, 2);
  if (operation === "subtract") return round(areaA - overlap, 2);
  return 0;
}

function textWidth(text, fontSize, weight) {
  let units = 0;
  String(text || "").split("").forEach(function (ch) {
    units += ch.charCodeAt(0) > 255 ? 1 : 0.55;
  });
  const bold = Number(weight) >= 600 ? 1.05 : 1;
  return round(units * Number(fontSize) * bold, 2);
}

function modularScale(base, ratio, step) {
  return round(Number(base) * Math.pow(Number(ratio), Number(step)), 2);
}

function lineBox(fontSize, lineHeight) {
  return round(Number(fontSize) * Number(lineHeight), 2);
}

function visualBalance(layers, width, height) {
  const box = bbox(layers);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = cx - Number(width) / 2;
  const dy = cy - Number(height) / 2;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const diagonal = Math.sqrt(Number(width) * Number(width) + Number(height) * Number(height));
  const score = clamp(Math.round(100 - distance / diagonal * 200), 0, 100);
  return { centerX: round(cx, 2), centerY: round(cy, 2), offsetX: round(dx, 2), offsetY: round(dy, 2), score: score };
}

function fitCover(srcWidth, srcHeight, dstWidth, dstHeight) {
  const scale = Math.max(Number(dstWidth) / Number(srcWidth), Number(dstHeight) / Number(srcHeight));
  return {
    scale: round(scale, 4),
    width: round(Number(srcWidth) * scale, 2),
    height: round(Number(srcHeight) * scale, 2),
    offsetX: round((Number(dstWidth) - Number(srcWidth) * scale) / 2, 2),
    offsetY: round((Number(dstHeight) - Number(srcHeight) * scale) / 2, 2)
  };
}

function preflightVerdict(dpi, ink, bleed) {
  const dpiScore = clamp(Math.round((Number(dpi) - 72) / (300 - 72) * 100), 0, 100);
  const inkScore = Number(ink) <= 300 ? 100 : clamp(Math.round(100 - (Number(ink) - 300) * 2), 0, 100);
  const bleedScore = Number(bleed) >= 3 ? 100 : clamp(Math.round(Number(bleed) / 3 * 100), 0, 100);
  const pass = Number(dpi) >= 300 && Number(ink) <= 300 && Number(bleed) >= 3;
  return { dpiScore: dpiScore, inkScore: inkScore, bleedScore: bleedScore, pass: pass };
}

module.exports = {
  GOLDEN: GOLDEN,
  round: round,
  clamp: clamp,
  hexToRgb: hexToRgb,
  rgbToHex: rgbToHex,
  luminance: luminance,
  contrastRatio: contrastRatio,
  contrastLevel: contrastLevel,
  rgbToCmyk: rgbToCmyk,
  totalInk: totalInk,
  snapValue: snapValue,
  bbox: bbox,
  alignOffset: alignOffset,
  alignLayers: alignLayers,
  distributeGaps: distributeGaps,
  goldenGuides: goldenGuides,
  scaleLayers: scaleLayers,
  maskArea: maskArea,
  textWidth: textWidth,
  modularScale: modularScale,
  lineBox: lineBox,
  visualBalance: visualBalance,
  fitCover: fitCover,
  preflightVerdict: preflightVerdict
};
