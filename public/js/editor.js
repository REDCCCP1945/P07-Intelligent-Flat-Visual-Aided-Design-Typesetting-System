const Editor = {
  canvas: null,
  ctx: null,
  design: null,
  selectedId: "",
  selectedIds: [],
  zoom: 1,
  showGrid: true,
  showGuides: true,
  gridStep: 20,
  onChange: null,
  dragging: null,

  mount: function (canvas, design, onChange) {
    Editor.canvas = canvas;
    Editor.ctx = canvas.getContext("2d");
    Editor.design = design;
    Editor.selectedId = "";
    Editor.selectedIds = [];
    Editor.onChange = onChange || null;
    Editor.bind();
    Editor.resize();
    Editor.render();
  },

  resize: function () {
    const design = Editor.design;
    const maxW = 760;
    const maxH = 520;
    const scale = Math.min(maxW / design.width, maxH / design.height);
    Editor.canvas.width = design.width;
    Editor.canvas.height = design.height;
    Editor.canvas.style.width = Math.max(240, Math.round(design.width * scale)) + "px";
    Editor.canvas.style.height = Math.max(160, Math.round(design.height * scale)) + "px";
    Editor.zoom = scale;
  },

  bind: function () {
    if (Editor.canvas.dataset.bound === "1") return;
    Editor.canvas.dataset.bound = "1";
    Editor.canvas.addEventListener("mousedown", function (event) {
      const point = Editor.toDesign(event);
      const layer = Editor.hitTest(point.x, point.y);
      if (layer) {
        if (event.shiftKey) {
          const index = Editor.selectedIds.indexOf(layer.id);
          if (index >= 0) Editor.selectedIds.splice(index, 1);
          else Editor.selectedIds.push(layer.id);
        } else {
          Editor.selectedIds = [layer.id];
        }
        Editor.selectedId = layer.id;
        Editor.dragging = { id: layer.id, startX: point.x, startY: point.y, originX: Number(layer.x), originY: Number(layer.y) };
        Editor.emit();
        event.preventDefault();
      } else {
        Editor.selectedId = "";
        Editor.selectedIds = [];
        Editor.emit();
      }
    });
    window.addEventListener("mousemove", function (event) {
      if (!Editor.dragging) return;
      const point = Editor.toDesign(event);
      const layer = Editor.layerById(Editor.dragging.id);
      if (!layer) return;
      let x = Editor.dragging.originX + point.x - Editor.dragging.startX;
      let y = Editor.dragging.originY + point.y - Editor.dragging.startY;
      if (Editor.showGrid) {
        x = Math.round(x / Editor.gridStep) * Editor.gridStep;
        y = Math.round(y / Editor.gridStep) * Editor.gridStep;
      }
      layer.x = Math.round(x * 100) / 100;
      layer.y = Math.round(y * 100) / 100;
      Editor.render();
    });
    window.addEventListener("mouseup", function () {
      if (!Editor.dragging) return;
      Editor.dragging = null;
      if (Editor.onChange) Editor.onChange();
      Editor.emit();
    });
  },

  toDesign: function (event) {
    const rect = Editor.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width * Editor.design.width,
      y: (event.clientY - rect.top) / rect.height * Editor.design.height
    };
  },

  layerById: function (id) {
    return (Editor.design.layers || []).find(function (item) { return item.id === id; });
  },

  hitTest: function (x, y) {
    const layers = Editor.design.layers || [];
    for (let i = layers.length - 1; i >= 0; i -= 1) {
      const layer = layers[i];
      if (x >= layer.x && x <= layer.x + layer.width && y >= layer.y && y <= layer.y + layer.height) {
        return layer;
      }
    }
    return null;
  },

  render: function () {
    const ctx = Editor.ctx;
    const design = Editor.design;
    ctx.save();
    ctx.clearRect(0, 0, design.width, design.height);
    ctx.fillStyle = design.background;
    ctx.fillRect(0, 0, design.width, design.height);
    if (Editor.showGrid) Editor.drawGrid();
    (design.layers || []).forEach(function (layer) {
      Editor.drawLayer(ctx, layer);
    });
    if (Editor.showGuides) Editor.drawGuides();
    if (Editor.selectedId) {
      const layer = Editor.layerById(Editor.selectedId);
      if (layer) {
        ctx.strokeStyle = "#E08A2C";
        ctx.lineWidth = Math.max(2, design.width / 500);
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(layer.x, layer.y, layer.width, layer.height);
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  },

  drawGrid: function () {
    const ctx = Editor.ctx;
    const design = Editor.design;
    const step = Editor.gridStep;
    ctx.save();
    ctx.strokeStyle = "rgba(23,58,94,.10)";
    ctx.lineWidth = 1;
    for (let x = step; x < design.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, design.height);
      ctx.stroke();
    }
    for (let y = step; y < design.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(design.width, y);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawGuides: function () {
    const ctx = Editor.ctx;
    const design = Editor.design;
    const gx = [design.width * (1 - 0.6180339887498949), design.width * 0.6180339887498949];
    const gy = [design.height * (1 - 0.6180339887498949), design.height * 0.6180339887498949];
    ctx.save();
    ctx.strokeStyle = "rgba(201,164,106,.55)";
    ctx.lineWidth = Math.max(1, design.width / 900);
    ctx.setLineDash([12, 8]);
    gx.forEach(function (x) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, design.height);
      ctx.stroke();
    });
    gy.forEach(function (y) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(design.width, y);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();
  },

  drawLayer: function (ctx, layer) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, Number(layer.opacity) / 100));
    ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
    ctx.rotate(Number(layer.rotation) * Math.PI / 180);
    ctx.translate(-layer.width / 2, -layer.height / 2);
    if (layer.type === "rect" || layer.type === "mask") {
      ctx.fillStyle = layer.fill;
      ctx.fillRect(0, 0, layer.width, layer.height);
    } else if (layer.type === "ellipse") {
      ctx.fillStyle = layer.fill;
      ctx.beginPath();
      ctx.ellipse(layer.width / 2, layer.height / 2, layer.width / 2, layer.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (layer.type === "text") {
      ctx.fillStyle = layer.fill;
      ctx.font = (Number(layer.fontWeight) || 400) + " " + Number(layer.fontSize) + "px \"" + layer.fontFamily + "\", SimHei, sans-serif";
      ctx.textBaseline = "top";
      const lineHeight = Number(layer.fontSize) * Number(layer.lineHeight);
      const lines = Editor.wrapText(ctx, layer.text || "", layer.width);
      lines.forEach(function (line, index) {
        const y = index * lineHeight;
        if (y > layer.height) return;
        let x = 0;
        if (layer.align === "center") x = (layer.width - ctx.measureText(line).width) / 2;
        if (layer.align === "right") x = layer.width - ctx.measureText(line).width;
        ctx.fillText(line, x, y);
      });
    }
    ctx.restore();
  },

  wrapText: function (ctx, text, maxWidth) {
    const result = [];
    String(text).split("\n").forEach(function (paragraph) {
      let line = "";
      for (const ch of paragraph) {
        if (ctx.measureText(line + ch).width > maxWidth && line) {
          result.push(line);
          line = ch;
        } else {
          line += ch;
        }
      }
      result.push(line);
    });
    return result;
  },

  selectLayer: function (id) {
    Editor.selectedId = id;
    Editor.selectedIds = id ? [id] : [];
    Editor.render();
    Editor.emit();
  },

  updateSelected: function (patch) {
    const layer = Editor.layerById(Editor.selectedId);
    if (!layer) return;
    Object.assign(layer, patch);
    Editor.render();
    Editor.emit();
  },

  emit: function () {
    if (Editor.onSelect) Editor.onSelect(Editor.selectedId, Editor.selectedIds.slice());
  },

  exportPng: function (design) {
    const canvas = document.createElement("canvas");
    canvas.width = design.width;
    canvas.height = design.height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = design.background;
    ctx.fillRect(0, 0, design.width, design.height);
    (design.layers || []).forEach(function (layer) { Editor.drawLayer(ctx, layer); });
    return canvas.toDataURL("image/png");
  },

  toSvg: function (design) {
    const parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + design.width + '" height="' + design.height + '" viewBox="0 0 ' + design.width + ' ' + design.height + '">'];
    parts.push('<rect width="' + design.width + '" height="' + design.height + '" fill="' + design.background + '"/>');
    (design.layers || []).forEach(function (layer) {
      const opacity = Number(layer.opacity) / 100;
      const transform = ' transform="rotate(' + layer.rotation + ' ' + (layer.x + layer.width / 2) + ' ' + (layer.y + layer.height / 2) + ')"';
      if (layer.type === "rect" || layer.type === "mask") {
        parts.push('<rect x="' + layer.x + '" y="' + layer.y + '" width="' + layer.width + '" height="' + layer.height + '" fill="' + layer.fill + '" opacity="' + opacity + '"' + transform + "/>");
      } else if (layer.type === "ellipse") {
        parts.push('<ellipse cx="' + (layer.x + layer.width / 2) + '" cy="' + (layer.y + layer.height / 2) + '" rx="' + (layer.width / 2) + '" ry="' + (layer.height / 2) + '" fill="' + layer.fill + '" opacity="' + opacity + '"' + transform + "/>");
      } else if (layer.type === "text") {
        const lines = String(layer.text || "").split("\n");
        lines.forEach(function (line, index) {
          const y = layer.y + Number(layer.fontSize) + index * Number(layer.fontSize) * Number(layer.lineHeight);
          const anchor = layer.align === "center" ? "middle" : layer.align === "right" ? "end" : "start";
          const x = layer.align === "center" ? layer.x + layer.width / 2 : layer.align === "right" ? layer.x + layer.width : layer.x;
          parts.push('<text x="' + x + '" y="' + y + '" fill="' + layer.fill + '" opacity="' + opacity + '" font-family="' + layer.fontFamily + ', SimHei, sans-serif" font-size="' + layer.fontSize + '" font-weight="' + layer.fontWeight + '" text-anchor="' + anchor + '"' + transform + ">" + Editor.escapeXml(line) + "</text>");
        });
      }
    });
    parts.push("</svg>");
    return parts.join("");
  },

  escapeXml: function (value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
};
