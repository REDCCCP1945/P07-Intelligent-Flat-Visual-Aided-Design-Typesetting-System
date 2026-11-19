const UsersView = {
  render: async function (container) {
    const data = (await API.get("/api/users")).data;
    container.innerHTML = UI.pageHead("用户管理", "系统管理员、咨询师/导览员、现场运营三类角色", '<button class="btn primary" id="user-add">新增用户</button>') +
      '<div class="card"><div class="card-body">' +
      UI.table({
        columns: [
          { title: "用户名", key: "username" },
          { title: "姓名", key: "name" },
          { title: "角色", key: "roleName" },
          { title: "状态", key: "status", render: function (row) { return UI.statusBadge(row.status); } },
          { title: "最近登录", key: "lastLoginAt", render: function (row) { return row.lastLoginAt ? UI.fmtDateTime(row.lastLoginAt) : "—"; } },
          { title: "操作", key: "id", render: function (row) {
            return '<button class="link" data-toggle="' + UI.esc(row.id) + '">' + (row.status === "active" ? "停用" : "启用") + '</button>' +
              '<button class="link" data-reset="' + UI.esc(row.id) + '">重置密码</button>' +
              '<button class="link" data-role="' + UI.esc(row.id) + '">变更角色</button>';
          } }
        ],
        rows: data.rows,
        empty: "暂无用户"
      }) + '</div></div>';
    container.querySelector("#user-add").addEventListener("click", function () { UsersView.openForm(data, container); });
    container.querySelectorAll("[data-toggle]").forEach(function (button) {
      button.addEventListener("click", async function () {
        try { await API.post("/api/users/" + button.getAttribute("data-toggle") + "/toggle", {}); UsersView.render(container); }
        catch (error) { UI.toast(error.message, "error"); }
      });
    });
    container.querySelectorAll("[data-reset]").forEach(function (button) {
      button.addEventListener("click", function () { UsersView.openReset(button.getAttribute("data-reset"), container); });
    });
    container.querySelectorAll("[data-role]").forEach(function (button) {
      button.addEventListener("click", function () { UsersView.openRole(button.getAttribute("data-role"), data, container); });
    });
  },
  openForm: function (data, container) {
    const body = '<form id="user-form"><div class="form-grid">' +
      '<div class="field"><label>用户名</label><input class="input" name="username" placeholder="4到20位字母、数字或下划线"></div>' +
      '<div class="field"><label>姓名</label><input class="input" name="name"></div>' +
      '<div class="field"><label>角色</label><select class="input" name="role">' + UI.optionList(data.roles.map(function (role) { return { value: role, label: data.roleNames[role] }; }), "GUIDE") + '</select></div>' +
      '<div class="field"><label>初始密码</label><input class="input" name="password" type="password" placeholder="至少8位，含大小写与数字"></div>' +
      '</div></form>';
    UI.modal({
      title: "新增用户",
      body: body,
      buttons: [
        { text: "取消" },
        { text: "创建", className: "primary", onClick: async function (api) {
          const form = api.find("#user-form");
          try { await API.post("/api/users", UI.formData(form)); api.close(); UI.toast("已创建", "success"); UsersView.render(container); }
          catch (error) { UI.showError(form, error); }
        } }
      ]
    });
  },
  openReset: function (id, container) {
    const body = '<form id="reset-form"><div class="field"><label>新密码</label><input class="input" name="password" type="password" placeholder="至少8位，含大小写与数字"></div></form>';
    UI.modal({
      title: "重置密码",
      body: body,
      buttons: [
        { text: "取消" },
        { text: "重置", className: "primary", onClick: async function (api) {
          const form = api.find("#reset-form");
          try { await API.post("/api/users/" + id + "/reset", UI.formData(form)); api.close(); UI.toast("密码已重置", "success"); }
          catch (error) { UI.showError(form, error); }
        } }
      ]
    });
  },
  openRole: function (id, data, container) {
    const body = '<form id="role-form"><div class="field"><label>新角色</label><select class="input" name="role">' + UI.optionList(data.roles.map(function (role) { return { value: role, label: data.roleNames[role] }; }), "GUIDE") + '</select></div></form>';
    UI.modal({
      title: "变更角色",
      body: body,
      buttons: [
        { text: "取消" },
        { text: "保存", className: "primary", onClick: async function (api) {
          const form = api.find("#role-form");
          try { await API.post("/api/users/" + id + "/role", UI.formData(form)); api.close(); UI.toast("角色已更新", "success"); UsersView.render(container); }
          catch (error) { UI.showError(form, error); }
        } }
      ]
    });
  }
};
App.register("users", UsersView);
