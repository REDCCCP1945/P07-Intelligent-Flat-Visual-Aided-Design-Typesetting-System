const TypeTool = {
  scaleRatios: [1.2, 1.25, 1.333, 1.414, 1.5, 1.618],
  context: null,
  ctx: function () {
    if (!TypeTool.context) {
      const canvas = document.createElement("canvas");
      TypeTool.context = canvas.getContext("2d");
    }
    return TypeTool.context;
  },
  measure: function (text, fontSize, weight, family) {
    const ctx = TypeTool.ctx();
    ctx.font = (weight || 400) + " " + fontSize + "px \"" + (family || "SimHei") + "\", SimHei, sans-serif";
    return Math.round(ctx.measureText(String(text)).width * 100) / 100;
  },
  scale: function (base, ratio, step) {
    return Math.round(base * Math.pow(ratio, step) * 100) / 100;
  },
  lineHeight: function (fontSize, ratio) {
    return Math.round(fontSize * ratio * 100) / 100;
  },
  lineCount: function (text, width, fontSize, weight, family) {
    const ctx = TypeTool.ctx();
    ctx.font = (weight || 400) + " " + fontSize + "px \"" + (family || "SimHei") + "\", SimHei, sans-serif";
    let lines = 0;
    String(text).split("\n").forEach(function (paragraph) {
      let line = "";
      let count = 1;
      for (const ch of paragraph) {
        if (ctx.measureText(line + ch).width > width && line) {
          count += 1;
          line = ch;
        } else {
          line += ch;
        }
      }
      lines += count;
    });
    return lines;
  }
};
