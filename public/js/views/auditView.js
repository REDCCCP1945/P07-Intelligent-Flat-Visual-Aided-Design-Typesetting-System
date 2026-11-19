const AuditView = {
  state: { page: 1, size: 20, category: "", keyword: "" },
  render: async function (container) {
    async function load() {
      const data = (await API.get("/api/logs?page=" + AuditView.state.page + "&size=" + AuditView.state.size + "&category=" + encodeURIComponent(AuditView.state.category) + "&keyword=" + encodeURIComponent(AuditView.state.keyword))).data;
      container.innerHTML = UI.pageHead("审计日志", "登录、档案、会话、播控、报告与管理操作留痕") +
        '<div class="card"><div class="card-body"><div class="filter-bar">' +
        '<input class="input" id="log-keyword" placeholder="用户、动作或对象" value="' + UI.esc(AuditView.state.keyword) + '">' +
        '<select class="input" id="log-category"><option value="">全部类别</option>' + ["认证", "档案", "主题", "音频", "会话", "报告", "用户管理", "系统管理", "反馈", "权限"].map(function (item) {
          return '<option value="' + item + '"' + (AuditView.state.category === item ? " selected" : "") + ">" + item + "</option>";
        }).join("") + '</select><button class="btn" id="log-search">查询</button></div>' +
        UI.table({
          columns: [
            { title: "时间", key: "createdAt", render: function (row) { return UI.fmtDateTime(row.createdAt); } },
            { title: "用户", key: "username" },
            { title: "角色", key: "role" },
            { title: "类别", key: "category" },
            { title: "动作", key: "action" },
            { title: "对象", key: "target" },
            { title: "详情", key: "detail" },
            { title: "来源", key: "ip" }
          ],
          rows: data.rows,
          empty: "暂无日志"
        }) + UI.pagination(data, function () {}) + '</div></div>';
      UI.bindPagination(container, AuditView.state, load);
      container.querySelector("#log-search").addEventListener("click", function () {
        AuditView.state.keyword = container.querySelector("#log-keyword").value.trim();
        AuditView.state.category = container.querySelector("#log-category").value;
        AuditView.state.page = 1;
        load();
      });
    }
    await load();
  }
};
App.register("audit", AuditView);
