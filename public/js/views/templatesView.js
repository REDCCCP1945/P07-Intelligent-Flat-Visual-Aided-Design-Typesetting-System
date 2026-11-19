const TemplatesView = {
  render: async function (container) {
    const data = (await API.get("/api/templates")).data;
    container.innerHTML = UI.pageHead("模板库", "内置模板可直接应用到项目") +
      '<div class="template-grid">' + data.rows.map(function (item) {
        return '<div class="template-card"><div class="template-head"><strong>' + UI.esc(item.name) + '</strong><span class="badge blue">' + UI.esc(item.categoryName) + '</span></div>' +
          '<p class="muted">' + UI.esc(item.description || "") + '</p>' +
          '<div class="template-meta"><span>' + item.width + " × " + item.height + ' px</span><span>' + item.layerCount + ' 个图层</span><span>已用 ' + item.designCount + " 次</span></div>" +
          (App.user.role === "VIEWER" ? "" : '<button class="btn mini primary" data-apply="' + UI.esc(item.id) + '">应用到项目</button>') +
          '</div>';
      }).join("") + '</div>';
    container.querySelectorAll("[data-apply]").forEach(function (button) {
      button.addEventListener("click", function () { TemplatesView.openApply(button.getAttribute("data-apply")); });
    });
  },
  openApply: async function (templateId) {
    const designs = (await API.get("/api/designs?page=1&size=50")).data.rows;
    if (!designs.length) { UI.toast("请先创建项目", "error"); return; }
    const body = '<form id="apply-form"><div class="field"><label>选择项目</label><select class="input" name="designId">' +
      UI.optionList(designs.map(function (item) { return { value: item.id, label: item.name + "（" + item.width + "×" + item.height + "）" }; }), designs[0].id) +
      '</select></div><div class="field"><label>应用方式</label><select class="input" name="mode"><option value="replace">替换现有图层</option><option value="append">追加到现有图层</option></select></div></form>';
    UI.modal({
      title: "应用模板",
      body: body,
      buttons: [
        { text: "取消" },
        { text: "应用", className: "primary", onClick: async function (api) {
          const form = api.find("#apply-form");
          try {
            const result = await API.post("/api/templates/" + templateId + "/apply", UI.formData(form));
            api.close();
            UI.toast("模板已应用", "success");
            location.hash = "#/editor/" + result.data.design.id;
          } catch (error) { UI.toast(error.message, "error"); }
        } }
      ]
    });
  }
};
App.register("templates", TemplatesView);
