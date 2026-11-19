const store = require("./store");
const audit = require("./audit");
const userService = require("./userService");

function get(ctx) {
  ctx.ok({
    settings: store.db.settings,
    roleMenus: store.db.settings.roleMenus,
    roleNames: userService.ROLE_NAMES,
    palettes: store.db.palettes
  });
}

function save(ctx) {
  const body = ctx.body || {};
  const settings = store.db.settings;
  if (body.defaultWidth !== undefined) {
    const width = Number(body.defaultWidth);
    if (!Number.isFinite(width) || width < 100 || width > 10000) {
      ctx.fail(400, "默认宽度无效", "defaultWidth");
      return;
    }
    settings.defaultWidth = width;
  }
  if (body.defaultHeight !== undefined) {
    const height = Number(body.defaultHeight);
    if (!Number.isFinite(height) || height < 100 || height > 10000) {
      ctx.fail(400, "默认高度无效", "defaultHeight");
      return;
    }
    settings.defaultHeight = height;
  }
  if (body.defaultDpi !== undefined) {
    const dpi = Number(body.defaultDpi);
    if (!Number.isFinite(dpi) || dpi < 72 || dpi > 600) {
      ctx.fail(400, "默认DPI无效", "defaultDpi");
      return;
    }
    settings.defaultDpi = dpi;
  }
  if (typeof body.aiNotice === "string" && body.aiNotice.trim()) settings.aiNotice = body.aiNotice.trim().slice(0, 300);
  store.save();
  audit.write(ctx.user, "系统设置", "保存默认参数", "画布与DPI", settings.defaultWidth + "x" + settings.defaultHeight + "/" + settings.defaultDpi, ctx.req);
  ctx.ok({ settings: settings });
}

function roleMenu(ctx) {
  ctx.ok({ roleMenus: store.db.settings.roleMenus, roleNames: userService.ROLE_NAMES });
}

function roleMenuSave(ctx) {
  const body = ctx.body || {};
  const role = String(body.role || "");
  const menus = Array.isArray(body.menus) ? body.menus.slice() : null;
  if (!userService.ROLE_NAMES[role]) {
    ctx.fail(400, "角色无效", "role");
    return;
  }
  if (!menus) {
    ctx.fail(400, "菜单列表无效", "menus");
    return;
  }
  if (role === "ADMIN") {
    ctx.fail(409, "内置管理员菜单不能修改");
    return;
  }
  store.db.settings.roleMenus[role] = menus;
  store.save();
  audit.write(ctx.user, "权限", "调整角色菜单", userService.ROLE_NAMES[role], menus.join("、"), ctx.req);
  ctx.ok({ roleMenus: store.db.settings.roleMenus });
}

module.exports = { get: get, save: save, roleMenu: roleMenu, roleMenuSave: roleMenuSave };
