const ProfileView = {
  render: async function (container) {
    const data = (await API.get("/api/profile")).data;
    const user = data.user;
    container.innerHTML = UI.pageHead("个人中心", "账号资料与密码修改") +
      '<div class="two-col"><div class="card"><div class="card-head"><h3>账号信息</h3><span class="muted">' + UI.esc(data.roleName) + '</span></div><div class="card-body">' +
      '<table class="info-table"><tbody>' +
      '<tr><td>用户名</td><td>' + UI.esc(user.username) + '</td></tr>' +
      '<tr><td>姓名</td><td>' + UI.esc(user.name) + '</td></tr>' +
      '<tr><td>角色</td><td>' + UI.esc(data.roleName) + '</td></tr>' +
      '<tr><td>邮箱</td><td>' + UI.esc(user.email || "—") + '</td></tr>' +
      '<tr><td>创建时间</td><td>' + UI.fmtDateTime(user.createdAt) + '</td></tr>' +
      '<tr><td>最近登录</td><td>' + (user.lastLoginAt ? UI.fmtDateTime(user.lastLoginAt) : "—") + '</td></tr>' +
      '</tbody></table>' +
      '<form id="profile-form" class="form-grid" style="margin-top:18px">' +
      '<div class="field"><label>姓名</label><input class="input" name="name" value="' + UI.esc(user.name) + '"></div>' +
      '<div class="field"><label>邮箱</label><input class="input" name="email" value="' + UI.esc(user.email || "") + '"></div>' +
      '<div class="field full"><button class="btn primary" type="submit">保存资料</button></div></form></div></div>' +
      '<div class="card"><div class="card-head"><h3>修改密码</h3><span class="muted">修改后需重新登录</span></div><div class="card-body">' +
      '<form id="password-form"><div class="field"><label>原密码</label><input class="input" name="oldPassword" type="password"></div>' +
      '<div class="field"><label>新密码</label><input class="input" name="newPassword" type="password" placeholder="至少8位，含大小写与数字"></div>' +
      '<button class="btn primary" type="submit">修改密码</button></form>' +
      '<p class="muted">连续5次密码错误会锁定10分钟。管理员重置密码后应立即修改。</p></div></div></div>';
    const profileForm = container.querySelector("#profile-form");
    profileForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      try {
        await API.post("/api/profile", UI.formData(profileForm));
        UI.toast("资料已保存", "success");
        ProfileView.render(container);
      } catch (error) { UI.showError(profileForm, error); }
    });
    const passwordForm = container.querySelector("#password-form");
    passwordForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      try {
        await API.post("/api/auth/password", UI.formData(passwordForm));
        API.setToken("");
        App.showLogin("密码已更新，请重新登录");
      } catch (error) { UI.showError(passwordForm, error); }
    });
  }
};
App.register("profile", ProfileView);
