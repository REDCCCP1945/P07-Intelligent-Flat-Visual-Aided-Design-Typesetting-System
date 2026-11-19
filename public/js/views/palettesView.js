const PalettesView = {
  render: async function (container) {
    async function load() {
      const data = (await API.get("/api/palettes")).data;
      container.innerHTML = UI.pageHead("色板库", "预设色板用于配色与对比检查", App.user.role === "ADMIN" ? '<button class="btn primary" id="palette-add">新增色板</button>' : "") +
        '<div class="card"><div class="card-body">' +
        UI.table({
          columns: [
            { title: "名称", key: "name" },
            { title: "颜色", key: "colors", render: function (row) {
              return '<div class="color-strip">' + row.colors.map(function (color) {
                return '<span class="color-dot" style="background:' + UI.esc(color) + '" title="' + UI.esc(color) + '"></span>';
              }).join("") + "</div>";
            } },
            { title: "数量", key: "colorCount", align: "right" },
            { title: "和谐度", key: "harmony", align: "right" },
            { title: "状态", key: "enabled", render: function (row) { return UI.statusBadge(row.enabled ? "active" : "disabled"); } },
            { title: "说明", key: "description" },
            { title: "操作", key: "id", render: function (row) {
              if (App.user.role !== "ADMIN") return "—";
              return '<button class="link" data-edit="' + UI.esc(row.id) + '">编辑</button> <button class="link" data-toggle="' + UI.esc(row.id) + '">' + (row.enabled ? "停用" : "启用") + "</button>";
            } }
          ],
          rows: data.rows,
          empty: "暂无色板"
        }) + '</div></div>';
      const add = container.querySelector("#palette-add");
      if (add) add.addEventListener("click", function () { PalettesView.openForm(null); });
      container.querySelectorAll("[data-edit]").forEach(function (button) {
        button.addEventListener("click", function () {
          const row = data.rows.find(function (item) { return item.id === button.getAttribute("data-edit"); });
          PalettesView.openForm(row);
        });
      });
      container.querySelectorAll("[data-toggle]").forEach(function (button) {
        button.addEventListener("click", async function () {
          try { await API.post("/api/palettes/" + button.getAttribute("data-toggle") + "/toggle", {}); load(); }
          catch (error) { UI.toast(error.message, "error"); }
        });
      });
    }
    PalettesView.load = load;
    await load();
  },
  openForm: function (row) {
    const body = '<form id="palette-form"><div class="form-grid">' +
      '<div class="field"><label>名称</label><input class="input" name="name" value="' + (row ? UI.esc(row.name) : "") + '"></div>' +
      '<div class="field"><label>颜色（逗号分隔）</label><input class="input" name="colors" value="' + (row ? UI.esc(row.colors.join(",")) : "#173A5E,#2F6F8F,#C9A46A,#F5F0E6,#FFFFFF") + '"></div>' +
      '<div class="field full"><label>说明</label><input class="input" name="description" value="' + (row ? UI.esc(row.description || "") : "") + '"></div>' +
      '</div></form>';
    UI.modal({
      title: row ? "编辑色板" : "新增色板",
      body: body,
      buttons: [
        { text: "取消" },
        { text: "保存", className: "primary", onClick: async function (api) {
          const form = api.find("#palette-form");
          const values = UI.formData(form);
          values.colors = String(values.colors || "").split(/[,，\s]+/).filter(Boolean);
          try {
            if (row) await API.put("/api/palettes/" + row.id, values);
            else await API.post("/api/palettes", values);
            api.close();
            UI.toast("色板已保存", "success");
            PalettesView.load();
          } catch (error) { UI.showError(form, error); }
        } }
      ]
    });
  }
};
App.register("palettes", PalettesView);
