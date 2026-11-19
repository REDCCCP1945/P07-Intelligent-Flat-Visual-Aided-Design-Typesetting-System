const MaskTool = {
  drawShape: function (ctx, layer) {
    ctx.fillStyle = "#000000";
    if (layer.type === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(
        Number(layer.x) + Number(layer.width) / 2,
        Number(layer.y) + Number(layer.height) / 2,
        Number(layer.width) / 2, Number(layer.height) / 2,
        0, 0, Math.PI * 2
      );
      ctx.fill();
    } else {
      ctx.fillRect(Number(layer.x), Number(layer.y), Number(layer.width), Number(layer.height));
    }
  },
  combine: function (a, b, operation, width, height) {
    const left = document.createElement("canvas");
    left.width = width;
    left.height = height;
    const leftCtx = left.getContext("2d");
    MaskTool.drawShape(leftCtx, a);

    const right = document.createElement("canvas");
    right.width = width;
    right.height = height;
    const rightCtx = right.getContext("2d");
    MaskTool.drawShape(rightCtx, b);

    const result = document.createElement("canvas");
    result.width = width;
    result.height = height;
    const ctx = result.getContext("2d");
    ctx.fillStyle = a.fill || "#173A5E";
    if (operation === "union") {
      ctx.drawImage(left, 0, 0);
      ctx.drawImage(right, 0, 0);
    } else if (operation === "intersect") {
      const merged = document.createElement("canvas");
      merged.width = width;
      merged.height = height;
      const mergedCtx = merged.getContext("2d");
      mergedCtx.drawImage(left, 0, 0);
      mergedCtx.globalCompositeOperation = "source-in";
      mergedCtx.drawImage(right, 0, 0);
      ctx.drawImage(merged, 0, 0);
    } else if (operation === "subtract") {
      ctx.drawImage(left, 0, 0);
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(right, 0, 0);
      ctx.globalCompositeOperation = "source-over";
    }
    const data = ctx.getImageData(0, 0, width, height).data;
    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 0) {
          area += 1;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    return {
      dataUrl: result.toDataURL("image/png"),
      area: area,
      bbox: area ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : { x: 0, y: 0, width: 0, height: 0 }
    };
  }
};
