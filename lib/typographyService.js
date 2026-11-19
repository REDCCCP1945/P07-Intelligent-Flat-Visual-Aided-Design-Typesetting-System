const layout = require("./layoutService");

const SCALE_RATIOS = [1.2, 1.25, 1.333, 1.414, 1.5, 1.618];

function scale(base, ratio, step) {
  return layout.modularScale(base, ratio, step);
}

function lineBox(fontSize, lineHeight) {
  return layout.lineBox(fontSize, lineHeight);
}

function width(text, fontSize, weight) {
  return layout.textWidth(text, fontSize, weight);
}

function measure(text, fontSize, weight, lineHeight) {
  const box = width(text, fontSize, weight);
  return {
    width: box,
    height: lineBox(fontSize, lineHeight),
    lines: Math.max(1, Math.ceil(box / Math.max(1, Number(fontSize) * 12)))
  };
}

module.exports = {
  SCALE_RATIOS: SCALE_RATIOS,
  scale: scale,
  lineBox: lineBox,
  width: width,
  measure: measure
};
