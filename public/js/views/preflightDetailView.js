const PreflightDetailView = {
  render: async function (container, params) {
    const data = (await API.get("/api/preflights/" + encodeURIComponent(params.id))).data;
    const row = data.preflight;
    const design = data.design;
    container.innerHTML = UI.pageHead("预检详情", row.id + " · " + row.designName,
      '<a class="btn" href="#/preflights">返回列表</a>' +
      '<button class="btn" id="export-json">导出JSON</button><button class="btn" id="export-csv">导出CSV</button>') +
      '<div class="kpi-grid">' +
      '<div class="kpi"><strong>' + row.score + '</strong><span>综合分</span></div>' +
      '<div class="kpi"><strong>' + row.totalInk + '%</strong><span>总墨量</span></div>' +
      '<div class="kpi"><strong>' + row.minContrast + '</strong><span>最小对比度</span></div>' +
      '<div class="kpi"><strong>' + row.contrastLevel + '</strong><span>对比等级</span></div>' +
      '<div class="kpi"><strong>' + row.dpi + '</strong><span>DPI</span></div>' +
      '<div class="kpi"><strong>' + row.bleed + 'mm</strong><span>出血</span></div>' +
      '</div>' +
      '<div class="two-col"><div class="card"><div class="card-head"><h3>预检结论</h3></div><div class="card-body">' +
      '<p style="line-height:1.9">' + UI.esc(row.conclusion) + '</p>' +
      UI.table({
        columns: [{ title: "项目", key: "label" }, { title: "数值", key: "value" }],
        rows: [
          { label: "画布尺寸", value: row.width + " × " + row.height + " px" },
          { label: "背景色", value: row.background },
          { label: "CMYK", value: row.cmyk.c + " / " + row.cmyk.m + " / " + row.cmyk.y + " / " + row.cmyk.k },
          { label: "对比度得分", value: row.contrastScore },
          { label: "墨量得分", value: row.inkScore },
          { label: "DPI得分", value: row.dpiScore },
          { label: "生成时间", value: UI.fmtDateTime(row.createdAt) }
        ],
        empty: "—"
      }) + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>关联项目</h3></div><div class="card-body">' +
      (design ? '<p>' + UI.esc(design.name) + '（' + design.code + '）</p><p class="muted">画布 ' + design.width + ' × ' + design.height + ' px，图层 ' + (design.layers || []).length + ' 个。</p><a class="btn" href="#/editor/' + UI.esc(design.id) + '">打开编辑器</a>' : UI.empty("项目不存在", "记录仍保留")) +
      '</div></div></div>';
    container.querySelector("#export-json").addEventListener("click", async function () {
      const result = (await API.get("/api/preflights/" + row.id + "/export/json")).data;
      UI.downloadText(result.filename, result.content, result.type);
    });
    container.querySelector("#export-csv").addEventListener("click", async function () {
      const result = (await API.get("/api/preflights/" + row.id + "/export/csv")).data;
      UI.downloadText(result.filename, result.content, result.type);
    });
  }
};
App.register("preflight-detail", PreflightDetailView);
