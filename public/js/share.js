const ShareView = {
  start: async function () {
    const root = document.getElementById("share-root");
    const token = new URLSearchParams(location.search).get("token") || "";
    if (!token) {
      root.innerHTML = '<div class="share-card"><h1>分享链接无效</h1><p>链接缺少令牌，请向分享人重新获取。</p></div>';
      return;
    }
    try {
      const data = (await API.get("/api/share/" + encodeURIComponent(token))).data;
      const design = data.design;
      root.innerHTML = '<div class="share-card">' +
        '<div class="share-head"><div><h1>' + UI.esc(design.name) + '</h1><p>' + UI.esc(design.code) + ' · ' + design.width + ' × ' + design.height + ' px · ' + design.layerCount + ' 个图层</p></div>' +
        '<span class="badge blue">只读预览</span></div>' +
        '<div class="share-stage"><canvas id="share-canvas"></canvas></div>' +
        '<div class="share-meta">' +
        '<span>经办人：' + UI.esc(design.ownerName || "") + '</span>' +
        '<span>到期时间：' + UI.fmtDateTime(new Date(data.shareExpiresAt).toISOString()) + '</span>' +
        '<span>本页面仅展示画布与图层内容，不显示内部记录。</span>' +
        '</div></div>';
      const canvas = document.getElementById("share-canvas");
      const maxW = 900;
      const maxH = 620;
      const scale = Math.min(maxW / design.width, maxH / design.height);
      canvas.width = design.width;
      canvas.height = design.height;
      canvas.style.width = Math.round(design.width * scale) + "px";
      canvas.style.height = Math.round(design.height * scale) + "px";
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = design.background;
      ctx.fillRect(0, 0, design.width, design.height);
      (design.layers || []).forEach(function (layer) { Editor.drawLayer(ctx, layer); });
    } catch (error) {
      root.innerHTML = '<div class="share-card"><h1>无法打开分享</h1><p>' + UI.esc(error.message) + "</p></div>";
    }
  }
};
