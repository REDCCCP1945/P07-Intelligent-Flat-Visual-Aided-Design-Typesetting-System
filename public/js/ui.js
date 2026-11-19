const UI = {
  esc: function (value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  },
  fmtInt: function (value) {
    const num = Number(value || 0);
    return num.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
  },
  fmtNumber: function (value, digits) {
    const num = Number(value || 0);
    return num.toLocaleString("zh-CN", { minimumFractionDigits: digits === undefined ? 2 : digits, maximumFractionDigits: digits === undefined ? 2 : digits });
  },
  fmtMoney: function (value) {
    const num = Number(value || 0);
    if (num >= 100000000) return (num / 100000000).toFixed(2) + "亿";
    if (num >= 10000) return (num / 10000).toFixed(2) + "万";
    return UI.fmtNumber(num, 2);
  },
  fmtPct: function (value, digits) {
    return Number(value || 0).toFixed(digits === undefined ? 2 : digits) + "%";
  },
  fmtDate: function (value) {
    return String(value || "").slice(0, 10);
  },
  fmtDateTime: function (value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("zh-CN", { hour12: false });
  },
  today: function () {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  },
  daysAgo: function (days) {
    const date = new Date(Date.now() - days * 86400000);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  },
  toast: function (message, type) {
    const root = document.getElementById("toast-root");
    const node = document.createElement("div");
    node.className = "toast " + (type || "");
    node.textContent = message;
    root.appendChild(node);
    setTimeout(function () {
      node.style.opacity = "0";
      node.style.transition = "opacity .2s";
      setTimeout(function () { node.remove(); }, 220);
    }, 2600);
  },
  modal: function (options) {
    const root = document.getElementById("modal-root");
    const mask = document.createElement("div");
    mask.className = "modal-mask";
    const size = options.size === "wide" ? " wide" : options.size === "narrow" ? " narrow" : "";
    mask.innerHTML = '<div class="modal' + size + '"><div class="modal-head"><h3>' + UI.esc(options.title) +
      '</h3><button class="modal-close" type="button">×</button></div><div class="modal-body">' + (options.body || "") +
      '</div><div class="modal-foot"></div></div>';
    root.appendChild(mask);
    const foot = mask.querySelector(".modal-foot");
    if (options.buttons) {
      options.buttons.forEach(function (button) {
        const node = document.createElement("button");
        node.type = "button";
        node.className = "btn " + (button.className || "");
        node.textContent = button.text;
        node.addEventListener("click", function () {
          if (button.onClick) button.onClick(UI.modalApi(mask, close));
          else close();
        });
        foot.appendChild(node);
      });
    } else {
      const node = document.createElement("button");
      node.type = "button";
      node.className = "btn";
      node.textContent = "关闭";
      node.addEventListener("click", function () { close(); });
      foot.appendChild(node);
    }
    function close() {
      mask.remove();
    }
    mask.querySelector(".modal-close").addEventListener("click", close);
    mask.addEventListener("mousedown", function (event) {
      if (event.target === mask && options.maskClose !== false) close();
    });
    if (options.onMount) options.onMount(mask, close);
    return { element: mask, close: close };
  },
  modalApi: function (mask, close) {
    return {
      root: mask,
      close: close,
      find: function (selector) { return mask.querySelector(selector); },
      findAll: function (selector) { return Array.prototype.slice.call(mask.querySelectorAll(selector)); }
    };
  },
  confirm: function (options) {
    return new Promise(function (resolve) {
      UI.modal({
        title: options.title || "确认操作",
        size: "narrow",
        body: '<p style="line-height:1.9;margin:0">' + UI.esc(options.message || "") + "</p>",
        buttons: [
          { text: "取消", onClick: function (api) { api.close(); resolve(false); } },
          { text: options.okText || "确认", className: options.danger ? "danger" : "primary", onClick: function (api) { api.close(); resolve(true); } }
        ]
      });
    });
  },
  table: function (options) {
    const columns = options.columns || [];
    const rows = options.rows || [];
    let head = "<tr>" + columns.map(function (column) {
      return '<th class="' + (column.align === "right" ? "num" : "") + '"' + (column.width ? ' style="width:' + column.width + '"' : "") + ">" + UI.esc(column.title) + "</th>";
    }).join("") + "</tr>";
    if (!rows.length) {
      const span = columns.length;
      return '<div class="table-wrap"><table class="data"><thead>' + head + '</thead><tbody><tr class="empty-row"><td colspan="' + span + '">' +
        UI.esc(options.empty || "暂无数据") + "</td></tr></tbody></table></div>";
    }
    const body = rows.map(function (row, index) {
      return "<tr" + (options.onRow ? ' data-row="' + index + '" style="cursor:pointer"' : "") + ">" + columns.map(function (column) {
        let value = column.render ? column.render(row, index) : UI.esc(row[column.key]);
        if (value === undefined || value === null) value = "";
        return '<td class="' + (column.align === "right" ? "num" : "") + (column.className ? " " + column.className : "") + '">' + value + "</td>";
      }).join("") + "</tr>";
    }).join("");
    return '<div class="table-wrap"><table class="data"><thead>' + head + "</thead><tbody>" + body + "</tbody></table></div>";
  },
  pagination: function (state, onChange) {
    const totalPages = Math.max(1, Math.ceil(state.total / state.size));
    const page = Math.max(1, Math.min(state.page, totalPages));
    return '<div class="pagination"><span>共 ' + UI.fmtInt(state.total) + " 条 · 第 " + page + " / " + totalPages + ' 页</span>' +
      '<button type="button" data-page="' + (page - 1) + '"' + (page <= 1 ? " disabled" : "") + ">上一页</button>" +
      '<button type="button" data-page="' + (page + 1) + '"' + (page >= totalPages ? " disabled" : "") + ">下一页</button></div>";
  },
  bindPagination: function (container, state, onChange) {
    const buttons = container.querySelectorAll(".pagination button[data-page]");
    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener("click", function () {
        const page = Number(button.getAttribute("data-page"));
        if (!page || page === state.page) return;
        state.page = page;
        onChange();
      });
    });
  },
  statusBadge: function (status) {
    const map = {
      active: ["启用", "green"], archived: ["已归档", "gray"], disabled: ["停用", "gray"],
      pending: ["待处理", "amber"], replied: ["已回复", "blue"], closed: ["已关闭", "gray"]
    };
    const item = map[status] || [status, "gray"];
    return '<span class="badge ' + item[1] + '">' + UI.esc(item[0]) + "</span>";
  },
  roleName: function (role) {
    return { ADMIN: "系统管理员", DESIGNER: "视觉设计师", VIEWER: "审核访客" }[role] || role;
  },
  formData: function (form) {
    const data = {};
    Array.prototype.forEach.call(form.elements, function (element) {
      if (!element.name) return;
      if (element.type === "checkbox") data[element.name] = element.checked;
      else data[element.name] = element.value;
    });
    return data;
  },
  clearErrors: function (form) {
    Array.prototype.forEach.call(form.querySelectorAll(".field-error"), function (node) { node.remove(); });
    Array.prototype.forEach.call(form.querySelectorAll(".input.invalid"), function (node) { node.classList.remove("invalid"); });
  },
  showError: function (form, error) {
    UI.clearErrors(form);
    if (error.field) {
      const input = form.querySelector('[name="' + error.field + '"]');
      if (input) {
        input.classList.add("invalid");
        const node = document.createElement("span");
        node.className = "field-error";
        node.textContent = error.message;
        (input.parentElement || input).appendChild(node);
        input.focus();
        return;
      }
    }
    UI.toast(error.message || "操作失败", "error");
  },
  readFile: function (file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = function () { reject(new Error("文件读取失败")); };
      reader.readAsText(file, "utf-8");
    });
  },
  downloadText: function (filename, content, type) {
    const blob = new Blob([content], { type: type || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  },
  pageHead: function (title, subtitle, actions) {
    return '<div class="page-head"><div class="page-title"><h1>' + UI.esc(title) + "</h1>" +
      (subtitle ? "<p>" + UI.esc(subtitle) + "</p>" : "") + "</div>" +
      '<div class="page-actions">' + (actions || "") + "</div></div>";
  },
  empty: function (title, text) {
    return '<div class="empty-state"><strong>' + UI.esc(title) + "</strong><p>" + UI.esc(text || "") + "</p></div>";
  },
  badge: function (text, tone) {
    return '<span class="badge ' + (tone || "") + '">' + UI.esc(text) + "</span>";
  },
  optionList: function (values, selected) {
    return values.map(function (value) {
      const item = typeof value === "string" ? { value: value, label: value } : value;
      return '<option value="' + UI.esc(item.value) + '"' + (String(item.value) === String(selected) ? " selected" : "") + ">" + UI.esc(item.label) + "</option>";
    }).join("");
  }
};

