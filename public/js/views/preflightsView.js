const PreflightsView = {
  state: { page: 1, size: 10, keyword: "", designId: "" },
  render: async function (container) {
    async function load() {
      const query = "?page=" + PreflightsView.state.page + "&size=" + PreflightsView.state.size +
        "&keyword=" + encodeURIComponent(PreflightsView.state.keyword) +
        "&designId=" + encodeURIComponent(PreflightsView.state.designId);
      const data = (await API.get("/api/preflights" + query)).data;
      PreflightsView.data = data;
      container.innerHTML = UI.pageHead("印前预检", "按固定规则检查总墨量、对比度、出血与DPI") +
        '<div class="kpi-grid">' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.total) + '</strong><span>预检记录</span></div>' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.passed) + '</strong><span>通过</span></div>' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.average) + '</strong><span>平均分</span></div>' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.designs) + '</strong><span>设计项目</span></div>' +
        '</div>' +
        '<div class="card"><div class="card-body"><div class="filter-row">' +
        '<input class="input" id="pf-keyword" placeholder="搜索项目或结论" value="' + UI.esc(PreflightsView.state.keyword) + '">' +
        '<button class="btn" id="pf-search">查询</button></div></div></div>' +
        '<div class="card"><div class="card-body">' +
        UI.table({
          columns: [
            { title: "预检", key: "id", render: function (row) { return '<a href="#/preflights/' + UI.esc(row.id) + '">' + UI.esc(row.id) + "</a>"; } },
            { title: "项目", key: "designName" },
            { title: "画布", key: "width", render: function (row) { return row.width + " × " + row.height; } },
            { title: "DPI", key: "dpi", align: "right" },
            { title: "总墨量", key: "totalInk", align: "right" },
            { title: "对比度", key: "minContrast", align: "right" },
            { title: "等级", key: "contrastLevel" },
            { title: "综合分", key: "score", align: "right" },
            { title: "结论", key: "pass", render: function (row) { return row.pass ? UI.badge("通过", "green") : UI.badge("未通过", "amber"); } },
            { title: "时间", key: "createdAt", render: function (row) { return UI.fmtDateTime(row.createdAt); } }
          ],
          rows: data.rows,
          empty: "暂无预检记录"
        }) + UI.pagination(stateOf()) + '</div></div>';
      container.querySelector("#pf-search").addEventListener("click", function () {
        PreflightsView.state.keyword = container.querySelector("#pf-keyword").value.trim();
        PreflightsView.state.page = 1;
        load();
      });
      UI.bindPagination(container, stateOf(), load);
    }
    function stateOf() {
      return { page: PreflightsView.state.page, size: PreflightsView.state.size, total: PreflightsView.data.total };
    }
    await load();
  }
};
App.register("preflights", PreflightsView);
