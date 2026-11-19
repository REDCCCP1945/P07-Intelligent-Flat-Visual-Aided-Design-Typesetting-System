const VersionsView = {
  render: async function (container, params) {
    const query = params.designId ? "?designId=" + encodeURIComponent(params.designId) : "";
    const data = (await API.get("/api/versions" + query)).data;
    container.innerHTML = UI.pageHead("版本记录", "保存的画布快照，不可修改", '<a class="btn" href="#/designs">返回项目</a>') +
      '<div class="card"><div class="card-body">' +
      UI.table({
        columns: [
          { title: "版本", key: "id" },
          { title: "名称", key: "label" },
          { title: "项目", key: "designId", render: function (row) { return '<a href="#/editor/' + UI.esc(row.designId) + '">' + UI.esc(row.designId) + "</a>"; } },
          { title: "画布", key: "snapshot", render: function (row) { return row.snapshot.width + " × " + row.snapshot.height; } },
          { title: "DPI", key: "snapshot", render: function (row) { return row.snapshot.dpi; } },
          { title: "图层", key: "snapshot", render: function (row) { return row.snapshot.layerCount; } },
          { title: "创建人", key: "createdByName" },
          { title: "时间", key: "createdAt", render: function (row) { return UI.fmtDateTime(row.createdAt); } },
          { title: "操作", key: "id", render: function (row) { return '<button class="link" data-compare="' + UI.esc(row.id) + '">对比</button>'; } }
        ],
        rows: data.rows,
        empty: "暂无版本"
      }) + '</div></div>';
    container.querySelectorAll("[data-compare]").forEach(function (button) {
      button.addEventListener("click", function () { VersionsView.openCompare(button.getAttribute("data-compare"), data.rows); });
    });
  },
  openCompare: function (id, rows) {
    const options = rows.map(function (row) { return { value: row.id, label: row.id + " · " + row.label }; });
    const body = '<form id="compare-form"><div class="form-grid">' +
      '<div class="field"><label>版本A</label><select class="input" name="left">' + UI.optionList(options, id) + '</select></div>' +
      '<div class="field"><label>版本B</label><select class="input" name="right">' + UI.optionList(options, rows[0] ? rows[0].id : "") + '</select></div>' +
      '</div><div id="compare-result"></div></form>';
    UI.modal({
      title: "版本对比",
      body: body,
      size: "wide",
      buttons: [
        { text: "对比", className: "primary", onClick: async function (api) {
          const form = api.find("#compare-form");
          try {
            const result = (await API.get("/api/versions/" + form.left.value + "/compare/" + form.right.value)).data;
            api.find("#compare-result").innerHTML = UI.table({
              columns: [
                { title: "字段", key: "field" },
                { title: "版本A", key: "left" },
                { title: "版本B", key: "right" },
                { title: "变化", key: "changed", render: function (row) { return row.changed ? UI.badge("已变化", "amber") : "—"; } }
              ],
              rows: result.rows
            });
          } catch (error) { UI.toast(error.message, "error"); }
        } },
        { text: "关闭" }
      ]
    });
  }
};
App.register("versions", VersionsView);
