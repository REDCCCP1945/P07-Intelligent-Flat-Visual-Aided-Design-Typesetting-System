const FeedbackView = {
  render: async function (container) {
    const data = (await API.get("/api/feedback")).data;
    const isAdmin = App.user.role === "ADMIN";
    container.innerHTML = UI.pageHead("反馈与建议", "提交使用问题与建议，管理员回复后可在本页查看", '<button class="btn primary" id="feedback-add">提交反馈</button>') +
      '<div class="card"><div class="card-body">' +
      UI.table({
        columns: [
          { title: "时间", key: "createdAt", render: function (row) { return UI.fmtDateTime(row.createdAt); } },
          { title: "提交人", key: "userName" },
          { title: "类型", key: "type" },
          { title: "内容", key: "content" },
          { title: "状态", key: "status", render: function (row) { return UI.statusBadge(row.status); } },
          { title: "回复", key: "reply", render: function (row) { return row.reply ? UI.esc(row.reply) : "—"; } },
          { title: "操作", key: "id", render: function (row) {
            const buttons = [];
            if (isAdmin && row.status !== "closed") buttons.push('<button class="link" data-reply="' + UI.esc(row.id) + '">回复</button>');
            if (row.status !== "closed") buttons.push('<button class="link" data-close="' + UI.esc(row.id) + '">关闭</button>');
            return buttons.join("") || "—";
          } }
        ],
        rows: data.rows,
        empty: "暂无反馈"
      }) + '</div></div>';
    container.querySelector("#feedback-add").addEventListener("click", function () { FeedbackView.openCreate(container); });
    container.querySelectorAll("[data-reply]").forEach(function (button) {
      button.addEventListener("click", function () { FeedbackView.openReply(button.getAttribute("data-reply"), container); });
    });
    container.querySelectorAll("[data-close]").forEach(function (button) {
      button.addEventListener("click", async function () {
        try { await API.post("/api/feedback/" + button.getAttribute("data-close") + "/close", {}); FeedbackView.render(container); }
        catch (error) { UI.toast(error.message, "error"); }
      });
    });
  },
  openCreate: function (container) {
    const body = '<form id="feedback-form"><div class="form-grid">' +
      '<div class="field"><label>类型</label><select class="input" name="type">' + UI.optionList(["问题", "建议", "其他"], "建议") + '</select></div>' +
      '<div class="field full"><label>内容</label><textarea class="input" name="content" rows="4" placeholder="5到500个字符"></textarea></div>' +
      '</div></form>';
    UI.modal({
      title: "提交反馈",
      body: body,
      buttons: [
        { text: "取消" },
        { text: "提交", className: "primary", onClick: async function (api) {
          const form = api.find("#feedback-form");
          try { await API.post("/api/feedback", UI.formData(form)); api.close(); UI.toast("已提交", "success"); FeedbackView.render(container); }
          catch (error) { UI.showError(form, error); }
        } }
      ]
    });
  },
  openReply: function (id, container) {
    const body = '<form id="reply-form"><div class="field"><label>回复内容</label><textarea class="input" name="reply" rows="4" placeholder="2到300个字符"></textarea></div></form>';
    UI.modal({
      title: "回复反馈",
      body: body,
      buttons: [
        { text: "取消" },
        { text: "回复", className: "primary", onClick: async function (api) {
          const form = api.find("#reply-form");
          try { await API.post("/api/feedback/" + id + "/reply", UI.formData(form)); api.close(); UI.toast("已回复", "success"); FeedbackView.render(container); }
          catch (error) { UI.showError(form, error); }
        } }
      ]
    });
  }
};
App.register("feedback", FeedbackView);
