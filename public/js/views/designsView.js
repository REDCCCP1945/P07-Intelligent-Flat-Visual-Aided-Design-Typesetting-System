const DesignsView = {
  state: { page: 1, size: 10, keyword: "", templateId: "", status: "", data: null },
  render: async function (container) {
    async function load() {
      const query = "?page=" + DesignsView.state.page + "&size=" + DesignsView.state.size +
        "&keyword=" + encodeURIComponent(DesignsView.state.keyword) +
        "&templateId=" + encodeURIComponent(DesignsView.state.templateId) +
        "&status=" + encodeURIComponent(DesignsView.state.status);
      const data = (await API.get("/api/designs" + query)).data;
      DesignsView.state.data = data;
      container.innerHTML = UI.pageHead("设计项目", "按模板、画布与状态组织平面设计稿", App.user.role === "VIEWER" ? "" : '<button class="btn primary" id="design-add">新建项目</button>') +
        '<div class="kpi-grid">' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.total) + '</strong><span>全部项目</span></div>' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.active) + '</strong><span>进行中</span></div>' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.archived) + '</strong><span>已归档</span></div>' +
        '<div class="kpi"><strong>' + UI.fmtInt(data.summary.palettes) + '</strong><span>启用色板</span></div>' +
        '</div>' +
        '<div class="card"><div class="card-body">' +
        '<div class="filter-row">' +
        '<input class="input" id="d-keyword" placeholder="搜索名称、编码或说明" value="' + UI.esc(DesignsView.state.keyword) + '">' +
        '<select class="input" id="d-template"><option value="">全部模板</option>' + data.templates.map(function (item) {
          return '<option value="' + UI.esc(item.id) + '"' + (DesignsView.state.templateId === item.id ? " selected" : "") + ">" + UI.esc(item.name) + "</option>";
        }).join("") + '</select>' +
        '<select class="input" id="d-status"><option value="">全部状态</option>' +
        '<option value="active"' + (DesignsView.state.status === "active" ? " selected" : "") + '>进行中</option>' +
        '<option value="archived"' + (DesignsView.state.status === "archived" ? " selected" : "") + '>已归档</option></select>' +
        '<button class="btn" id="d-search">查询</button>' +
        '</div></div></div>' +
        '<div class="card"><div class="card-body">' +
        UI.table({
          columns: [
            { title: "项目", key: "name", render: function (row) { return '<a href="#/editor/' + UI.esc(row.id) + '">' + UI.esc(row.name) + "</a>"; } },
            { title: "编码", key: "code" },
            { title: "画布", key: "width", render: function (row) { return row.width + " × " + row.height + " px"; } },
            { title: "DPI", key: "dpi", align: "right" },
            { title: "图层", key: "layerCount", align: "right" },
            { title: "状态", key: "status", render: function (row) { return UI.statusBadge(row.status); } },
            { title: "更新时间", key: "updatedAt", render: function (row) { return UI.fmtDateTime(row.updatedAt); } },
            { title: "操作", key: "id", render: function (row) {
              if (App.user.role === "VIEWER") return '<a class="btn mini" href="#/editor/' + UI.esc(row.id) + '">查看</a>';
              return '<a class="btn mini" href="#/editor/' + UI.esc(row.id) + '">编辑</a> ' +
                '<button class="btn mini" data-duplicate="' + UI.esc(row.id) + '">复制</button> ' +
                '<button class="btn mini" data-archive="' + UI.esc(row.id) + '">' + (row.status === "archived" ? "恢复" : "归档") + "</button>";
            } }
          ],
          rows: data.rows,
          empty: "暂无项目"
        }) + UI.pagination(DesignsView.state) + '</div></div>';
      container.querySelector("#d-search").addEventListener("click", function () {
        DesignsView.state.keyword = container.querySelector("#d-keyword").value.trim();
        DesignsView.state.templateId = container.querySelector("#d-template").value;
        DesignsView.state.status = container.querySelector("#d-status").value;
        DesignsView.state.page = 1;
        load();
      });
      UI.bindPagination(container, DesignsView.state, load);
      container.querySelectorAll("[data-duplicate]").forEach(function (button) {
        button.addEventListener("click", async function () {
          try { await API.post("/api/designs/" + button.getAttribute("data-duplicate") + "/duplicate", {}); UI.toast("已复制", "success"); load(); }
          catch (error) { UI.toast(error.message, "error"); }
        });
      });
      container.querySelectorAll("[data-archive]").forEach(function (button) {
        button.addEventListener("click", async function () {
          try { await API.post("/api/designs/" + button.getAttribute("data-archive") + "/archive", {}); load(); }
          catch (error) { UI.toast(error.message, "error"); }
        });
      });
      const add = container.querySelector("#design-add");
      if (add) add.addEventListener("click", function () { DesignsView.openCreate(data); });
    }
    DesignEditorView.container = container;
    await load();
  },
  openCreate: function (data) {
    const body = '<form id="design-form"><div class="form-grid">' +
      '<div class="field"><label>项目名称</label><input class="input" name="name" placeholder="2到40个字符"></div>' +
      '<div class="field"><label>项目编码</label><input class="input" name="code" placeholder="字母、数字或连字符"></div>' +
      '<div class="field"><label>画布宽度</label><input class="input" name="width" type="number" min="100" max="10000" value="1080"></div>' +
      '<div class="field"><label>画布高度</label><input class="input" name="height" type="number" min="100" max="10000" value="1080"></div>' +
      '<div class="field"><label>DPI</label><input class="input" name="dpi" type="number" min="72" max="600" value="300"></div>' +
      '<div class="field"><label>出血（毫米）</label><input class="input" name="bleed" type="number" min="0" max="10" value="3"></div>' +
      '<div class="field"><label>背景色</label><input class="input" name="background" type="color" value="#FFFFFF"></div>' +
      '<div class="field"><label>模板</label><select class="input" name="templateId"><option value="">空白画布</option>' + data.templates.map(function (item) {
        return '<option value="' + UI.esc(item.id) + '">' + UI.esc(item.name) + "（" + item.width + "×" + item.height + "）</option>";
      }).join("") + '</select></div>' +
      '<div class="field full"><label>说明</label><input class="input" name="description" placeholder="不超过200个字符"></div>' +
      '</div></form>';
    UI.modal({
      title: "新建设计项目",
      body: body,
      buttons: [
        { text: "取消" },
        { text: "创建", className: "primary", onClick: async function (api) {
          const form = api.find("#design-form");
          UI.clearErrors(form);
          try {
            const result = await API.post("/api/designs", UI.formData(form));
            api.close();
            UI.toast("项目已创建", "success");
            location.hash = "#/editor/" + result.data.design.id;
          } catch (error) { UI.showError(form, error); }
        } }
      ]
    });
  }
};

App.register("designs", DesignsView);
