const DesignEditorView = {
  container: null,
  params: null,
  design: null,
  palettes: [],
  templates: [],
  zoomLevel: 1,

  render: async function (container, params) {
    DesignEditorView.container = container;
    DesignEditorView.params = params;
    const data = (await API.get("/api/designs/" + encodeURIComponent(params.id))).data;
    DesignEditorView.design = data.design;
    DesignEditorView.palettes = data.palettes;
    DesignEditorView.templates = data.templates;
    const design = data.design;
    const readOnly = App.user.role === "VIEWER";
    const palette = data.palettes.find(function (item) { return item.id === design.paletteId; }) || data.palettes[0];
    container.innerHTML = UI.pageHead(design.name, design.code + " · " + design.width + " × " + design.height + " px · " + design.dpi + " DPI",
      '<a class="btn" href="#/designs">返回列表</a>' +
      (readOnly ? "" : '<button class="btn primary" id="save-version">保存版本</button><button class="btn" id="share-design">分享</button>')) +
      (readOnly ? "" : '<div class="editor-toolbar">' +
        '<button class="btn mini" id="add-text">新增文本</button>' +
        '<button class="btn mini" id="add-rect">新增矩形</button>' +
        '<button class="btn mini" id="add-ellipse">新增椭圆</button>' +
        '<button class="btn mini" id="delete-layer">删除图层</button>' +
        '<button class="btn mini" id="toggle-grid">栅格</button>' +
        '<button class="btn mini" id="toggle-guides">黄金线</button>' +
        '<button class="btn mini" id="zoom-in">放大</button>' +
        '<button class="btn mini" id="zoom-out">缩小</button>' +
        '<span class="editor-hint">画布内拖拽移动图层；按住 Shift 点击可多选；拖动后自动保存位置。</span>' +
      '</div>') +
      '<div class="editor-shell">' +
      '<div>' +
      '<div class="panel-card"><h4>图层（自下而上）</h4><div class="panel-body layer-list" id="layer-list"></div></div>' +
      '<div class="panel-card"><h4>画布设置</h4><div class="panel-body"><form id="canvas-form" class="props-grid">' +
        '<div class="field"><label>宽度 px</label><input class="input" name="width" type="number" min="100" max="10000" value="' + design.width + '"' + (readOnly ? " disabled" : "") + '></div>' +
        '<div class="field"><label>高度 px</label><input class="input" name="height" type="number" min="100" max="10000" value="' + design.height + '"' + (readOnly ? " disabled" : "") + '></div>' +
        '<div class="field"><label>DPI</label><input class="input" name="dpi" type="number" min="72" max="600" value="' + design.dpi + '"' + (readOnly ? " disabled" : "") + '></div>' +
        '<div class="field"><label>出血 mm</label><input class="input" name="bleed" type="number" min="0" max="10" value="' + design.bleed + '"' + (readOnly ? " disabled" : "") + '></div>' +
        '<div class="field full"><label>背景色</label><input class="input" name="background" type="color" value="' + design.background + '"' + (readOnly ? " disabled" : "") + '></div>' +
        (readOnly ? "" : '<div class="field full"><button class="btn mini primary" type="button" id="save-canvas">保存画布参数</button></div>') +
      '</form></div></div>' +
      (readOnly ? "" : '<div class="panel-card"><h4>多尺寸适配</h4><div class="panel-body"><div class="field"><label>目标尺寸</label><select class="input" id="adapt-size">' +
        '<option value="1080x1080">1080 × 1080</option><option value="1242x1660">1242 × 1660</option><option value="1920x1080">1920 × 1080</option><option value="2480x3508">2480 × 3508</option></select></div>' +
        '<div class="btn-row" style="margin-top:8px"><button class="btn mini" id="adapt-apply">按比例适配</button></div></div></div>') +
      '</div>' +
      '<div><div class="editor-canvas-panel"><div class="editor-stage" id="stage"><canvas id="design-canvas"></canvas></div></div></div>' +
      '<div>' +
      '<div class="panel-card"><h4>图层属性</h4><div class="panel-body"><form id="layer-form" class="props-grid">' +
        '<div class="field full"><label>名称</label><input class="input" name="name" value=""></div>' +
        '<div class="field"><label>X</label><input class="input" name="x" type="number" value=""></div>' +
        '<div class="field"><label>Y</label><input class="input" name="y" type="number" value=""></div>' +
        '<div class="field"><label>宽</label><input class="input" name="width" type="number" value=""></div>' +
        '<div class="field"><label>高</label><input class="input" name="height" type="number" value=""></div>' +
        '<div class="field"><label>旋转</label><input class="input" name="rotation" type="number" min="-180" max="180" value=""></div>' +
        '<div class="field"><label>透明度</label><input class="input" name="opacity" type="number" min="0" max="100" value=""></div>' +
        '<div class="field full"><label>填充</label><input class="input" name="fill" type="color" value="#173A5E"></div>' +
        '<div class="field full"><label>文本</label><input class="input" name="text" value=""></div>' +
        '<div class="field"><label>字号</label><input class="input" name="fontSize" type="number" min="8" max="200" value=""></div>' +
        '<div class="field"><label>字重</label><select class="input" name="fontWeight"><option value="400">常规</option><option value="500">中等</option><option value="700">加粗</option></select></div>' +
        '<div class="field"><label>字体</label><select class="input" name="fontFamily"><option>SimHei</option><option>SimSun</option><option>KaiTi</option><option>Microsoft YaHei</option><option>Arial</option></select></div>' +
        '<div class="field"><label>行高</label><input class="input" name="lineHeight" type="number" step="0.1" min="1" max="3" value=""></div>' +
        '<div class="field full"><label>对齐</label><select class="input" name="align"><option value="left">左对齐</option><option value="center">居中</option><option value="right">右对齐</option></select></div>' +
        '</form></div></div>' +
      (readOnly ? "" : '<div class="panel-card"><h4>对齐与分布</h4><div class="panel-body btn-row">' +
        '<button class="btn mini" data-align="left">左对齐</button><button class="btn mini" data-align="centerX">水平居中</button><button class="btn mini" data-align="right">右对齐</button>' +
        '<button class="btn mini" data-align="top">顶对齐</button><button class="btn mini" data-align="centerY">垂直居中</button><button class="btn mini" data-align="bottom">底对齐</button>' +
        '</div></div>') +
      '<div class="panel-card"><h4>配色与对比</h4><div class="panel-body">' +
        '<div class="field"><label>色板</label><select class="input" id="palette-select">' + data.palettes.map(function (item) {
          return '<option value="' + UI.esc(item.id) + '"' + (palette && palette.id === item.id ? " selected" : "") + ">" + UI.esc(item.name) + "</option>";
        }).join("") + '</select></div>' +
        '<div class="swatch-row" id="palette-colors"></div>' +
        '<div class="field" style="margin-top:10px"><label>实景取色（上传图片）</label><input class="input" id="extract-file" type="file" accept="image/png,image/jpeg,image/gif,image/webp"></div>' +
        '<div class="swatch-row" id="extract-result"></div>' +
        '<div class="btn-row" style="margin-top:8px"><button class="btn mini" id="contrast-check">检查对比度</button><span class="zoom-label" id="contrast-result"></span></div>' +
        '</div></div>' +
      (readOnly ? "" : '<div class="panel-card"><h4>布尔运算</h4><div class="panel-body">' +
        '<div class="btn-row"><button class="btn mini" data-bool="union">合并</button><button class="btn mini" data-bool="intersect">相交</button><button class="btn mini" data-bool="subtract">减去</button></div>' +
        '<p class="muted" style="font-size:12px;margin:8px 0 0">先在图层列表按住 Shift 选择两个矩形或椭圆，再执行运算。</p></div></div>') +
      '<div class="panel-card"><h4>导出与预检</h4><div class="panel-body"><div class="export-row">' +
        '<button class="btn mini" id="export-png">导出PNG</button><button class="btn mini" id="export-svg">导出SVG</button><button class="btn mini" id="export-json">导出JSON</button>' +
        (readOnly ? "" : '<button class="btn mini primary" id="make-preflight">生成印前预检</button>') +
        '</div></div></div>' +
      '</div></div>';

    Editor.mount(container.querySelector("#design-canvas"), design, function () { DesignEditorView.saveLayer(); });
    Editor.showGrid = true;
    Editor.showGuides = true;
    Editor.gridStep = 20;
    Editor.render();
    Editor.onSelect = function (id) { DesignEditorView.onSelect(id); };
    DesignEditorView.renderLayers();
    DesignEditorView.renderPalette(palette);
    DesignEditorView.bind(readOnly, data);
  },

  renderLayers: function () {
    const list = document.getElementById("layer-list");
    const design = DesignEditorView.design;
    const typeNames = { text: "文本", rect: "矩形", ellipse: "椭圆", mask: "掩膜" };
    list.innerHTML = (design.layers || []).slice().reverse().map(function (layer) {
      const active = layer.id === Editor.selectedId ? " active" : "";
      return '<div class="layer-row' + active + '" data-layer="' + UI.esc(layer.id) + '"><span class="swatch" style="background:' + UI.esc(layer.fill) + '"></span>' +
        '<span class="layer-name">' + UI.esc(layer.name) + '</span><span class="layer-type">' + typeNames[layer.type] + "</span></div>";
    }).join("") || UI.empty("暂无图层", "使用上方按钮新增文本或图形");
    list.querySelectorAll("[data-layer]").forEach(function (row) {
      row.addEventListener("click", function (event) {
        const id = row.getAttribute("data-layer");
        if (event.shiftKey) {
          const index = Editor.selectedIds.indexOf(id);
          if (index >= 0) Editor.selectedIds.splice(index, 1);
          else Editor.selectedIds.push(id);
          Editor.selectedId = id;
          Editor.render();
          DesignEditorView.onSelect(id);
        } else {
          Editor.selectLayer(id);
        }
      });
    });
  },

  onSelect: function (id) {
    DesignEditorView.renderLayers();
    const form = document.getElementById("layer-form");
    if (!form) return;
    const layer = Editor.layerById(id);
    if (!layer) {
      Array.prototype.forEach.call(form.elements, function (element) {
        if (element.type !== "button") element.value = "";
      });
      return;
    }
    form.name.value = layer.name;
    form.x.value = layer.x;
    form.y.value = layer.y;
    form.width.value = layer.width;
    form.height.value = layer.height;
    form.rotation.value = layer.rotation;
    form.opacity.value = layer.opacity;
    form.fill.value = layer.fill;
    form.text.value = layer.text;
    form.fontSize.value = layer.fontSize;
    form.fontWeight.value = layer.fontWeight;
    form.fontFamily.value = layer.fontFamily;
    form.lineHeight.value = layer.lineHeight;
    form.align.value = layer.align;
  },

  saveLayer: async function () {
    const layer = Editor.layerById(Editor.selectedId);
    if (!layer) return;
    try {
      await API.put("/api/designs/" + DesignEditorView.design.id + "/layers/" + layer.id, layer);
      const row = DesignEditorView.design.layers.find(function (item) { return item.id === layer.id; });
      if (row) row.name = layer.name;
      DesignEditorView.renderLayers();
    } catch (error) { UI.toast(error.message, "error"); }
  },

  applyLayerForm: async function () {
    const form = document.getElementById("layer-form");
    const layer = Editor.layerById(Editor.selectedId);
    if (!layer) { UI.toast("请先选择图层", "error"); return; }
    const patch = {
      name: form.name.value.trim(),
      x: Number(form.x.value),
      y: Number(form.y.value),
      width: Number(form.width.value),
      height: Number(form.height.value),
      rotation: Number(form.rotation.value),
      opacity: Number(form.opacity.value),
      fill: form.fill.value,
      text: form.text.value,
      fontSize: Number(form.fontSize.value),
      fontWeight: Number(form.fontWeight.value),
      fontFamily: form.fontFamily.value,
      lineHeight: Number(form.lineHeight.value),
      align: form.align.value
    };
    try {
      const result = await API.put("/api/designs/" + DesignEditorView.design.id + "/layers/" + layer.id, patch);
      Object.assign(layer, result.data.layer);
      Editor.render();
      DesignEditorView.renderLayers();
      UI.toast("图层已保存", "success");
    } catch (error) { UI.toast(error.message, "error"); }
  },

  createLayer: async function (type) {
    const design = DesignEditorView.design;
    const body = {
      type: type,
      name: type === "text" ? "文本图层" : type === "rect" ? "矩形图层" : "椭圆图层",
      x: Math.round(design.width * 0.12), y: Math.round(design.height * 0.12),
      width: type === "text" ? Math.round(design.width * 0.5) : Math.round(design.width * 0.2),
      height: type === "text" ? 120 : Math.round(design.height * 0.2),
      fill: type === "text" ? "#173A5E" : "#C9A46A",
      text: type === "text" ? "在此输入文字" : "",
      fontSize: Math.max(16, Math.round(design.width / 20)),
      fontFamily: "SimHei", fontWeight: 700, lineHeight: 1.5, align: "left"
    };
    try {
      const result = await API.post("/api/designs/" + design.id + "/layers", body);
      design.layers = result.data.layers;
      Editor.selectedId = result.data.layer.id;
      Editor.selectedIds = [result.data.layer.id];
      Editor.render();
      DesignEditorView.renderLayers();
      DesignEditorView.onSelect(result.data.layer.id);
      UI.toast("图层已新增", "success");
    } catch (error) { UI.toast(error.message, "error"); }
  },

  deleteLayer: async function () {
    const layer = Editor.layerById(Editor.selectedId);
    if (!layer) { UI.toast("请先选择图层", "error"); return; }
    try {
      const result = await API.del("/api/designs/" + DesignEditorView.design.id + "/layers/" + layer.id);
      DesignEditorView.design.layers = result.data.layers;
      Editor.selectedId = "";
      Editor.selectedIds = [];
      Editor.render();
      DesignEditorView.renderLayers();
      DesignEditorView.onSelect("");
    } catch (error) { UI.toast(error.message, "error"); }
  },

  renderPalette: function (palette) {
    const row = document.getElementById("palette-colors");
    if (!row) return;
    const colors = palette ? palette.colors : [];
    row.innerHTML = colors.map(function (color) {
      return '<button type="button" class="swatch-btn" data-color="' + UI.esc(color) + '" style="background:' + UI.esc(color) + '" title="' + UI.esc(color) + '"></button>';
    }).join("");
    row.querySelectorAll("[data-color]").forEach(function (button) {
      button.addEventListener("click", function () { DesignEditorView.applyColor(button.getAttribute("data-color")); });
    });
  },

  applyColor: async function (color) {
    const layer = Editor.layerById(Editor.selectedId);
    if (!layer) { UI.toast("请先选择图层", "error"); return; }
    layer.fill = color;
    Editor.render();
    await DesignEditorView.saveLayer();
    UI.toast("已应用颜色 " + color, "success");
  },

  extractColors: function (file) {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = function () {
      const clusters = ColorTool.kmeans(image, 5, 8);
      URL.revokeObjectURL(url);
      const box = document.getElementById("extract-result");
      box.innerHTML = clusters.map(function (item) {
        return '<button type="button" class="swatch-btn" data-color="' + UI.esc(item.hex) + '" style="background:' + UI.esc(item.hex) + '" title="' + item.hex + " · " + item.share + '%"></button>';
      }).join("");
      box.querySelectorAll("[data-color]").forEach(function (button) {
        button.addEventListener("click", function () { DesignEditorView.applyColor(button.getAttribute("data-color")); });
      });
      UI.toast("已提取 " + clusters.length + " 个主色", "success");
    };
    image.onerror = function () { UI.toast("图片读取失败", "error"); };
    image.src = url;
  },

  bind: function (readOnly, data) {
    const container = DesignEditorView.container;
    const design = DesignEditorView.design;
    function bind(id, event, handler) {
      const node = container.querySelector("#" + id);
      if (node) node.addEventListener(event, handler);
    }
    bind("add-text", "click", function () { DesignEditorView.createLayer("text"); });
    bind("add-rect", "click", function () { DesignEditorView.createLayer("rect"); });
    bind("add-ellipse", "click", function () { DesignEditorView.createLayer("ellipse"); });
    bind("delete-layer", "click", function () { DesignEditorView.deleteLayer(); });
    bind("toggle-grid", "click", function () { Editor.showGrid = !Editor.showGrid; Editor.render(); });
    bind("toggle-guides", "click", function () { Editor.showGuides = !Editor.showGuides; Editor.render(); });
    bind("zoom-in", "click", function () {
      DesignEditorView.zoomLevel = Math.min(2.4, DesignEditorView.zoomLevel * 1.2);
      const canvas = document.getElementById("design-canvas");
      canvas.style.width = Math.round(parseFloat(canvas.style.width) * 1.2) + "px";
      canvas.style.height = Math.round(parseFloat(canvas.style.height) * 1.2) + "px";
    });
    bind("zoom-out", "click", function () {
      DesignEditorView.zoomLevel = Math.max(0.4, DesignEditorView.zoomLevel / 1.2);
      const canvas = document.getElementById("design-canvas");
      canvas.style.width = Math.round(parseFloat(canvas.style.width) / 1.2) + "px";
      canvas.style.height = Math.round(parseFloat(canvas.style.height) / 1.2) + "px";
    });
    const layerForm = document.getElementById("layer-form");
    if (layerForm) {
      Array.prototype.forEach.call(layerForm.elements, function (element) {
        if (!element.name) return;
        element.addEventListener("change", function () { DesignEditorView.applyLayerForm(); });
      });
      Array.prototype.forEach.call(layerForm.elements, function (element) {
        if (readOnly) element.disabled = true;
      });
    }
    bind("save-canvas", "click", async function () {
      const form = document.getElementById("canvas-form");
      try {
        await API.put("/api/designs/" + design.id, UI.formData(form));
        UI.toast("画布参数已保存", "success");
        DesignEditorView.render(DesignEditorView.container, DesignEditorView.params);
      } catch (error) { UI.showError(form, error); }
    });
    bind("save-version", "click", function () {
      const body = '<div class="field"><label>版本标签</label><input class="input" id="version-label" value="V1.0 方案" maxlength="40"></div>';
      UI.modal({
        title: "保存版本快照", body: body,
        buttons: [{ text: "取消" }, { text: "保存", className: "primary", onClick: async function (api) {
          const label = api.find("#version-label").value.trim() || "未命名版本";
          try {
            await API.post("/api/versions", { designId: design.id, label: label });
            api.close();
            UI.toast("版本已保存", "success");
          } catch (error) { UI.toast(error.message, "error"); }
        } }]
      });
    });
    bind("share-design", "click", async function () {
      try {
        const result = await API.post("/api/designs/" + design.id + "/share", {});
        const link = location.origin + result.data.url;
        UI.modal({
          title: "分享链接", body: '<p style="line-height:1.9">只读链接有效期24小时：</p><input class="input" id="share-link" value="' + UI.esc(link) + '">',
          buttons: [{ text: "关闭" }, { text: "复制链接", className: "primary", onClick: function (api) {
            const input = api.find("#share-link");
            input.select();
            document.execCommand("copy");
            UI.toast("已复制", "success");
            api.close();
          } }]
        });
      } catch (error) { UI.toast(error.message, "error"); }
    });
    bind("adapt-apply", "click", async function () {
      const value = document.getElementById("adapt-size").value.split("x");
      try {
        await API.post("/api/designs/" + design.id + "/adapt", { targetWidth: Number(value[0]), targetHeight: Number(value[1]) });
        UI.toast("已按比例适配", "success");
        DesignEditorView.render(DesignEditorView.container, DesignEditorView.params);
      } catch (error) { UI.toast(error.message, "error"); }
    });
    container.querySelectorAll("[data-align]").forEach(function (button) {
      button.addEventListener("click", async function () {
        if (Editor.selectedIds.length < 2) { UI.toast("请按住 Shift 至少选择两个图层", "error"); return; }
        try {
          const result = await API.post("/api/designs/" + design.id + "/align", { ids: Editor.selectedIds, mode: button.getAttribute("data-align") });
          design.layers = result.data.layers;
          Editor.render();
          DesignEditorView.renderLayers();
          UI.toast("已对齐", "success");
        } catch (error) { UI.toast(error.message, "error"); }
      });
    });
    container.querySelectorAll("[data-bool]").forEach(function (button) {
      button.addEventListener("click", async function () {
        if (Editor.selectedIds.length !== 2) { UI.toast("请按住 Shift 选择两个图层", "error"); return; }
        const a = Editor.layerById(Editor.selectedIds[0]);
        const b = Editor.layerById(Editor.selectedIds[1]);
        if (!a || !b || a.type === "text" || b.type === "text") { UI.toast("布尔运算仅支持矩形与椭圆", "error"); return; }
        const result = MaskTool.combine(a, b, button.getAttribute("data-bool"), design.width, design.height);
        try {
          await API.del("/api/designs/" + design.id + "/layers/" + a.id);
          await API.del("/api/designs/" + design.id + "/layers/" + b.id);
          const created = await API.post("/api/designs/" + design.id + "/layers", {
            type: "rect", name: "布尔掩膜 " + result.area + "px",
            x: result.bbox.x, y: result.bbox.y, width: Math.max(1, result.bbox.width), height: Math.max(1, result.bbox.height),
            fill: a.fill, opacity: a.opacity, rotation: 0,
            text: "", fontSize: 24, fontFamily: "SimHei", fontWeight: 400, lineHeight: 1.5, align: "left"
          });
          design.layers = created.data.layers;
          Editor.selectedId = created.data.layer.id;
          Editor.selectedIds = [created.data.layer.id];
          Editor.render();
          DesignEditorView.renderLayers();
          DesignEditorView.onSelect(created.data.layer.id);
          UI.toast("布尔运算完成，掩膜面积 " + result.area + " 像素", "success");
        } catch (error) { UI.toast(error.message, "error"); }
      });
    });
    bind("palette-select", "change", function () {
      const item = DesignEditorView.palettes.find(function (row) { return row.id === document.getElementById("palette-select").value; });
      DesignEditorView.renderPalette(item);
    });
    bind("extract-file", "change", function (event) {
      const file = event.target.files && event.target.files[0];
      if (file) DesignEditorView.extractColors(file);
    });
    bind("contrast-check", "click", function () {
      const layer = Editor.layerById(Editor.selectedId) || (design.layers || []).find(function (item) { return item.type === "text"; });
      if (!layer) { UI.toast("没有可检查的文本图层", "error"); return; }
      const ratio = ColorTool.contrast(layer.fill, design.background);
      const level = ColorTool.level(ratio);
      document.getElementById("contrast-result").textContent = "对比度 " + ratio + " · " + level;
    });
    bind("export-png", "click", function () {
      const url = Editor.exportPng(design);
      const link = document.createElement("a");
      link.href = url;
      link.download = design.code + ".png";
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
    bind("export-svg", "click", function () {
      UI.downloadText(design.code + ".svg", Editor.toSvg(design), "image/svg+xml;charset=utf-8");
    });
    bind("export-json", "click", function () {
      UI.downloadText(design.code + ".json", JSON.stringify(design, null, 2), "application/json;charset=utf-8");
    });
    bind("make-preflight", "click", async function () {
      try {
        const result = await API.post("/api/preflights", { designId: design.id });
        const row = result.data.preflight;
        UI.modal({
          title: "印前预检结果",
          body: '<div class="kpi-grid"><div class="kpi"><strong>' + row.score + '</strong><span>综合分</span></div>' +
            '<div class="kpi"><strong>' + row.totalInk + '%</strong><span>总墨量</span></div>' +
            '<div class="kpi"><strong>' + row.minContrast + '</strong><span>最小对比度</span></div>' +
            '<div class="kpi"><strong>' + (row.pass ? "通过" : "未通过") + '</strong><span>预检结论</span></div></div>' +
            '<p style="line-height:1.9">' + UI.esc(row.conclusion) + "</p>",
          buttons: [{ text: "关闭" }, { text: "查看记录", className: "primary", onClick: function (api) { api.close(); location.hash = "#/preflights/" + row.id; } }]
        });
      } catch (error) { UI.toast(error.message, "error"); }
    });
  }
};

App.register("editor", DesignEditorView);
