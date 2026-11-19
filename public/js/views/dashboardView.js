const DashboardView = {
  render: async function (container) {
    const data = (await API.get("/api/dashboard")).data;
    const categoryNames = { social: "社交媒体", poster: "海报", card: "卡片", slide: "演示", print: "印刷品", custom: "自定义" };
    const categoryItems = Object.keys(data.categories).map(function (key, index) {
      return { name: categoryNames[key] || key, value: data.categories[key], color: Charts.palette[index % Charts.palette.length] };
    });
    container.innerHTML = UI.pageHead("工作台", "项目、图层、预检与版本概览", '<button class="btn primary" id="quick-design">新建设计项目</button>') +
      '<div class="kpi-grid">' +
      '<div class="kpi"><strong>' + UI.fmtInt(data.designCount) + '</strong><span>设计项目</span></div>' +
      '<div class="kpi"><strong>' + UI.fmtInt(data.layerTotal) + '</strong><span>图层总数</span></div>' +
      '<div class="kpi"><strong>' + UI.fmtInt(data.templateCount) + '</strong><span>内置模板</span></div>' +
      '<div class="kpi"><strong>' + UI.fmtInt(data.paletteCount) + '</strong><span>启用色板</span></div>' +
      '<div class="kpi"><strong>' + UI.fmtInt(data.preflightCount) + '</strong><span>预检记录</span></div>' +
      '<div class="kpi"><strong>' + UI.fmtInt(data.averageScore) + '</strong><span>平均预检分</span></div>' +
      '</div>' +
      '<div class="two-col"><div class="card"><div class="card-head"><h3>模板类别分布</h3><span class="muted">全部项目</span></div><div class="card-body">' + Charts.donut(categoryItems) + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>最近预检</h3><a href="#/preflights">查看全部</a></div><div class="card-body">' +
      UI.table({
        columns: [
          { title: "预检", key: "id", render: function (row) { return '<a href="#/preflights/' + UI.esc(row.id) + '">' + UI.esc(row.id) + "</a>"; } },
          { title: "项目", key: "designName" },
          { title: "总墨量", key: "totalInk", align: "right" },
          { title: "综合分", key: "score", align: "right" },
          { title: "结论", key: "pass", render: function (row) { return row.pass ? UI.badge("通过", "green") : UI.badge("未通过", "amber"); } }
        ],
        rows: data.recentPreflights,
        empty: "暂无预检"
      }) + '</div></div></div>' +
      '<div class="card"><div class="card-head"><h3>最近项目</h3><a href="#/designs">查看全部</a></div><div class="card-body">' +
      UI.table({
        columns: [
          { title: "项目", key: "name", render: function (row) { return '<a href="#/editor/' + UI.esc(row.id) + '">' + UI.esc(row.name) + "</a>"; } },
          { title: "画布", key: "width", render: function (row) { return row.width + " × " + row.height + " px"; } },
          { title: "图层", key: "layerCount", align: "right" },
          { title: "更新时间", key: "updatedAt", render: function (row) { return UI.fmtDateTime(row.updatedAt); } }
        ],
        rows: data.recentDesigns,
        empty: "暂无项目"
      }) + '</div></div>';
    container.querySelector("#quick-design").addEventListener("click", function () { location.hash = "#/designs"; });
  }
};

App.register("dashboard", DashboardView);
