const SettingsView = {
  render: async function (container) {
    const data = (await API.get("/api/settings")).data;
    const settings = data.settings;
    const roles = ["DESIGNER", "VIEWER"];
    const allMenus = [["dashboard", "工作台"], ["designs", "设计项目"], ["editor", "设计编辑器"], ["templates", "模板库"], ["palettes", "色板库"], ["preflights", "印前预检"], ["versions", "版本记录"], ["users", "用户管理"], ["audit", "审计日志"], ["settings", "系统设置"], ["feedback", "反馈与建议"], ["profile", "个人中心"], ["help", "帮助与合规"]];
    container.innerHTML = UI.pageHead("系统设置", "默认画布、角色菜单与数据备份", '<button class="btn" id="backup">导出数据备份</button>') +
      '<div class="two-col"><div class="card"><div class="card-head"><h3>默认参数</h3><span class="muted">用于新建项目</span></div><div class="card-body">' +
      '<form id="settings-form"><div class="form-grid">' +
      '<div class="field"><label>默认宽度</label><input class="input" name="defaultWidth" type="number" min="100" max="10000" value="' + settings.defaultWidth + '"></div>' +
      '<div class="field"><label>默认高度</label><input class="input" name="defaultHeight" type="number" min="100" max="10000" value="' + settings.defaultHeight + '"></div>' +
      '<div class="field"><label>默认DPI</label><input class="input" name="defaultDpi" type="number" min="72" max="600" value="' + settings.defaultDpi + '"></div>' +
      '<div class="field full"><label>本地提示文案</label><textarea class="input" name="aiNotice" rows="3">' + UI.esc(settings.aiNotice) + '</textarea></div>' +
      '</div><button class="btn primary" type="submit">保存设置</button></form></div></div>' +
      '<div class="card"><div class="card-head"><h3>角色菜单</h3><span class="muted">管理员菜单固定</span></div><div class="card-body">' +
      roles.map(function (role) {
        const current = data.roleMenus[role] || [];
        return '<div class="role-menu-block"><h4>' + UI.esc(data.roleNames[role]) + '</h4><div class="checkbox-grid">' +
          allMenus.map(function (item) {
            return '<label><input type="checkbox" data-role="' + role + '" value="' + item[0] + '"' + (current.indexOf(item[0]) >= 0 ? " checked" : "") + "> " + item[1] + "</label>";
          }).join("") + '</div><button class="btn" data-save-role="' + role + '">保存菜单</button></div>';
      }).join("") + '</div></div></div>';
    const form = container.querySelector("#settings-form");
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      try { await API.post("/api/settings", UI.formData(form)); UI.toast("设置已保存", "success"); }
      catch (error) { UI.showError(form, error); }
    });
    container.querySelectorAll("[data-save-role]").forEach(function (button) {
      button.addEventListener("click", async function () {
        const role = button.getAttribute("data-save-role");
        const menus = Array.prototype.slice.call(container.querySelectorAll('input[data-role="' + role + '"]:checked')).map(function (item) { return item.value; });
        try { await API.post("/api/settings/roles", { role: role, menus: menus }); UI.toast("角色菜单已保存", "success"); }
        catch (error) { UI.toast(error.message, "error"); }
      });
    });
    container.querySelector("#backup").addEventListener("click", function () {
      window.open("/api/users/backup?token=" + encodeURIComponent(API.token), "_blank");
    });
  }
};
App.register("settings", SettingsView);
