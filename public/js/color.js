const ColorTool = {
  hexToRgb: function (hex) {
    const value = String(hex || "#000000").replace("#", "");
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  },
  rgbToHex: function (r, g, b) {
    function part(value) {
      const text = Math.max(0, Math.min(255, Math.round(value))).toString(16).toUpperCase();
      return text.length < 2 ? "0" + text : text;
    }
    return "#" + part(r) + part(g) + part(b);
  },
  luminance: function (hex) {
    const rgb = ColorTool.hexToRgb(hex);
    const list = [rgb.r, rgb.g, rgb.b].map(function (value) {
      const c = value / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * list[0] + 0.7152 * list[1] + 0.0722 * list[2];
  },
  contrast: function (a, b) {
    const l1 = ColorTool.luminance(a);
    const l2 = ColorTool.luminance(b);
    const bright = Math.max(l1, l2);
    const dark = Math.min(l1, l2);
    return Math.round((bright + 0.05) / (dark + 0.05) * 100) / 100;
  },
  level: function (ratio) {
    if (ratio >= 7) return "AAA";
    if (ratio >= 4.5) return "AA";
    if (ratio >= 3) return "AA_LARGE";
    return "FAIL";
  },
  distance: function (a, b) {
    const ar = ColorTool.hexToRgb(a);
    const br = ColorTool.hexToRgb(b);
    return Math.sqrt(Math.pow(ar.r - br.r, 2) + Math.pow(ar.g - br.g, 2) + Math.pow(ar.b - br.b, 2));
  },
  nearest: function (color, palette) {
    let best = palette[0] || color;
    let score = Infinity;
    palette.forEach(function (item) {
      const value = ColorTool.distance(color, item);
      if (value < score) {
        score = value;
        best = item;
      }
    });
    return best;
  },
  kmeans: function (image, k, iterations) {
    const clusterCount = Math.max(2, Math.min(8, Number(k) || 5));
    const rounds = Math.max(3, Math.min(20, Number(iterations) || 8));
    const size = 120;
    const scale = Math.min(size / image.width, size / image.height, 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const pixels = [];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
    if (!pixels.length) return [];
    const centers = [];
    for (let i = 0; i < clusterCount; i += 1) {
      const index = Math.floor(i * pixels.length / clusterCount);
      centers.push(pixels[index].slice());
    }
    for (let round = 0; round < rounds; round += 1) {
      const sums = centers.map(function () { return [0, 0, 0, 0]; });
      pixels.forEach(function (pixel) {
        let best = 0;
        let score = Infinity;
        centers.forEach(function (center, index) {
          const value = Math.pow(pixel[0] - center[0], 2) + Math.pow(pixel[1] - center[1], 2) + Math.pow(pixel[2] - center[2], 2);
          if (value < score) {
            score = value;
            best = index;
          }
        });
        sums[best][0] += pixel[0];
        sums[best][1] += pixel[1];
        sums[best][2] += pixel[2];
        sums[best][3] += 1;
      });
      sums.forEach(function (sum, index) {
        if (sum[3] > 0) centers[index] = [sum[0] / sum[3], sum[1] / sum[3], sum[2] / sum[3]];
      });
    }
    const counts = centers.map(function () { return 0; });
    pixels.forEach(function (pixel) {
      let best = 0;
      let score = Infinity;
      centers.forEach(function (center, index) {
        const value = Math.pow(pixel[0] - center[0], 2) + Math.pow(pixel[1] - center[1], 2) + Math.pow(pixel[2] - center[2], 2);
        if (value < score) {
          score = value;
          best = index;
        }
      });
      counts[best] += 1;
    });
    const total = pixels.length;
    return centers.map(function (center, index) {
      return {
        hex: ColorTool.rgbToHex(center[0], center[1], center[2]),
        count: counts[index],
        share: Math.round(counts[index] / total * 1000) / 10
      };
    }).sort(function (a, b) { return b.count - a.count; });
  }
};
