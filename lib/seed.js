const auth = require("./auth");
const layout = require("./layoutService");

function user(id, username, name, role, password) {
  const salt = auth.createSalt();
  return {
    id: id, username: username, name: name, role: role,
    email: username + "@school.local", status: "active",
    salt: salt, passwordHash: auth.hashPassword(password, salt),
    createdAt: "2026-03-15T08:00:00.000Z", lastLoginAt: ""
  };
}

function layer(id, type, name, x, y, width, height, options) {
  const extra = options || {};
  return {
    id: id, type: type, name: name, x: x, y: y, width: width, height: height,
    rotation: extra.rotation || 0, opacity: extra.opacity === undefined ? 100 : extra.opacity,
    fill: extra.fill || "#173A5E", text: extra.text || "",
    fontSize: extra.fontSize || 24, fontFamily: extra.fontFamily || "SimHei",
    fontWeight: extra.fontWeight || 400, lineHeight: extra.lineHeight || 1.5,
    align: extra.align || "left"
  };
}

function preflightOf(design, id) {
  const rgb = layout.hexToRgb(design.background);
  const cmyk = layout.rgbToCmyk(rgb.r, rgb.g, rgb.b);
  const ink = layout.totalInk(cmyk);
  const textLayers = (design.layers || []).filter(function (item) { return item.type === "text"; });
  let minContrast = 21;
  textLayers.forEach(function (item) {
    minContrast = Math.min(minContrast, layout.contrastRatio(item.fill, design.background));
  });
  const contrastScore = layout.clamp(Math.round(Number(minContrast) / 7 * 100), 0, 100);
  const verdict = layout.preflightVerdict(design.dpi, ink, design.bleed);
  const score = Math.round(contrastScore * 0.4 + verdict.inkScore * 0.4 + verdict.dpiScore * 0.2);
  return {
    id: id, designId: design.id, designName: design.name,
    width: design.width, height: design.height, dpi: design.dpi, bleed: design.bleed,
    background: design.background, cmyk: cmyk, totalInk: ink,
    minContrast: minContrast, contrastLevel: layout.contrastLevel(Number(minContrast)),
    contrastScore: contrastScore, inkScore: verdict.inkScore, dpiScore: verdict.dpiScore,
    pass: verdict.pass, score: score,
    conclusion: verdict.pass ? "对比度、总墨量与分辨率均满足规则，可进入导出。" : "预检未通过：请检查DPI、总墨量与出血。",
    createdAt: "2026-03-15T10:0" + id.slice(-1) + ":00.000Z"
  };
}

function build(secret, dir) {
  const users = [
    user("USR-01", "admin01", "系统管理员", "ADMIN", "Admin@2026"),
    user("USR-02", "designer01", "视觉设计师", "DESIGNER", "Designer@2026"),
    user("USR-03", "viewer01", "审核访客", "VIEWER", "Viewer@2026")
  ];
  const palettes = [
    { id: "PAL-01", name: "品牌蓝金", colors: ["#173A5E", "#2F6F8F", "#C9A46A", "#F5F0E6", "#FFFFFF"], enabled: true, description: "深蓝与暖金，适合品牌主视觉", createdAt: "2026-03-15T08:00:00.000Z" },
    { id: "PAL-02", name: "国潮朱红", colors: ["#A62B2B", "#D94F3D", "#E8B44A", "#F5E6C8", "#2B1A1A"], enabled: true, description: "节庆与国潮主题", createdAt: "2026-03-15T08:00:00.000Z" },
    { id: "PAL-03", name: "青绿山水", colors: ["#1F6F5C", "#4E9E86", "#A8C8B8", "#E8F0EA", "#20302A"], enabled: true, description: "自然与文化主题", createdAt: "2026-03-15T08:00:00.000Z" },
    { id: "PAL-04", name: "中性灰阶", colors: ["#111111", "#444444", "#888888", "#CCCCCC", "#F7F7F7"], enabled: true, description: "文字与版式辅助", createdAt: "2026-03-15T08:00:00.000Z" },
    { id: "PAL-05", name: "暖阳橙", colors: ["#C75B12", "#E88A3C", "#F2C078", "#FFF1DE", "#3A2416"], enabled: true, description: "促销与活动主题", createdAt: "2026-03-15T08:00:00.000Z" },
    { id: "PAL-06", name: "学术靛蓝", colors: ["#1B2A5B", "#3D5A9E", "#8EA6D8", "#E6ECF7", "#101528"], enabled: true, description: "课程与学术场景", createdAt: "2026-03-15T08:00:00.000Z" },
    { id: "PAL-07", name: "木色自然", colors: ["#6B4F2A", "#A67C4E", "#D9C3A3", "#F4EDE2", "#2C2118"], enabled: true, description: "食品与手作主题", createdAt: "2026-03-15T08:00:00.000Z" },
    { id: "PAL-08", name: "高对比黑白", colors: ["#000000", "#333333", "#777777", "#BBBBBB", "#FFFFFF"], enabled: true, description: "印刷与对比度检查", createdAt: "2026-03-15T08:00:00.000Z" }
  ];
  const templates = [
    {
      id: "TPL-01", name: "社交媒体方图", category: "social", width: 1080, height: 1080,
      description: "方形主图，标题与色块对称",
      layers: [
        layer("TL-01", "rect", "标题底色", 90, 160, 900, 210, { fill: "#173A5E" }),
        layer("TL-02", "text", "主标题", 120, 205, 840, 120, { fill: "#FFFFFF", text: "主标题文字", fontSize: 84, fontWeight: 700 }),
        layer("TL-03", "text", "副标题", 120, 420, 840, 60, { fill: "#C9A46A", text: "副标题与说明", fontSize: 40, fontWeight: 400 }),
        layer("TL-04", "ellipse", "装饰圆形", 720, 620, 260, 260, { fill: "#C9A46A", opacity: 70 }),
        layer("TL-05", "text", "页脚", 120, 950, 840, 40, { fill: "#173A5E", text: "陕西理工大学", fontSize: 28 })
      ]
    },
    {
      id: "TPL-02", name: "促销海报", category: "poster", width: 1242, height: 1660,
      description: "纵向海报，上方标题下方信息",
      layers: [
        layer("TL-11", "rect", "顶部色带", 0, 0, 1242, 260, { fill: "#A62B2B" }),
        layer("TL-12", "text", "海报标题", 90, 90, 1060, 120, { fill: "#FFFFFF", text: "活动主标题", fontSize: 96, fontWeight: 700 }),
        layer("TL-13", "text", "活动说明", 90, 340, 1060, 220, { fill: "#2B1A1A", text: "活动说明文字，可分多行排版。", fontSize: 44, lineHeight: 1.8 }),
        layer("TL-14", "rect", "信息底色", 90, 1200, 1060, 300, { fill: "#F5E6C8" }),
        layer("TL-15", "text", "时间地点", 130, 1260, 980, 180, { fill: "#2B1A1A", text: "时间与地点信息", fontSize: 36, lineHeight: 1.6 })
      ]
    },
    {
      id: "TPL-03", name: "品牌名片", category: "card", width: 900, height: 540,
      description: "横向名片，左侧姓名右侧信息",
      layers: [
        layer("TL-21", "rect", "左侧色块", 0, 0, 300, 540, { fill: "#1F6F5C" }),
        layer("TL-22", "text", "姓名", 40, 200, 220, 60, { fill: "#FFFFFF", text: "姓名", fontSize: 40, fontWeight: 700 }),
        layer("TL-23", "text", "职位", 40, 270, 220, 40, { fill: "#E8F0EA", text: "职位名称", fontSize: 24 }),
        layer("TL-24", "text", "联系方式", 350, 200, 500, 160, { fill: "#20302A", text: "电话与邮箱", fontSize: 28, lineHeight: 2 })
      ]
    },
    {
      id: "TPL-04", name: "演示封面", category: "slide", width: 1920, height: 1080,
      description: "宽屏封面，标题居中",
      layers: [
        layer("TL-31", "rect", "背景块", 0, 0, 1920, 1080, { fill: "#1B2A5B" }),
        layer("TL-32", "text", "课程标题", 240, 380, 1440, 160, { fill: "#FFFFFF", text: "课程或汇报标题", fontSize: 108, fontWeight: 700, align: "center" }),
        layer("TL-33", "text", "副标题", 240, 580, 1440, 80, { fill: "#8EA6D8", text: "副标题与单位", fontSize: 44, align: "center" }),
        layer("TL-34", "rect", "装饰线", 840, 700, 240, 8, { fill: "#8EA6D8" })
      ]
    },
    {
      id: "TPL-05", name: "印刷A4页", category: "print", width: 2480, height: 3508,
      description: "A4印刷页，含出血提示",
      layers: [
        layer("TL-41", "rect", "页眉色带", 0, 0, 2480, 260, { fill: "#173A5E" }),
        layer("TL-42", "text", "页眉标题", 180, 80, 2120, 100, { fill: "#FFFFFF", text: "文档标题", fontSize: 64, fontWeight: 700 }),
        layer("TL-43", "text", "正文块", 180, 420, 2120, 2400, { fill: "#111111", text: "正文内容按行高与字号排版。", fontSize: 36, lineHeight: 1.8 }),
        layer("TL-44", "text", "页脚", 180, 3300, 2120, 60, { fill: "#444444", text: "陕西理工大学", fontSize: 28 })
      ]
    }
  ];
  const specs = [
    { id: "DSG-01", name: "春季新品主图", code: "spring-main", width: 1080, height: 1080, dpi: 300, background: "#F5F0E6", bleed: 3, templateId: "TPL-01", paletteId: "PAL-01", description: "春季茶饮新品社交媒体主图" },
    { id: "DSG-02", name: "非遗市集海报", code: "heritage-poster", width: 1242, height: 1660, dpi: 300, background: "#F5E6C8", bleed: 3, templateId: "TPL-02", paletteId: "PAL-02", description: "非遗市集活动海报" },
    { id: "DSG-03", name: "品牌名片", code: "brand-card", width: 900, height: 540, dpi: 300, background: "#FFFFFF", bleed: 3, templateId: "TPL-03", paletteId: "PAL-03", description: "文创品牌名片" },
    { id: "DSG-04", name: "课程封面", code: "course-cover", width: 1920, height: 1080, dpi: 150, background: "#101528", bleed: 0, templateId: "TPL-04", paletteId: "PAL-06", description: "课程汇报封面" },
    { id: "DSG-05", name: "产品折页", code: "product-folder", width: 2480, height: 3508, dpi: 300, background: "#FFFFFF", bleed: 3, templateId: "TPL-05", paletteId: "PAL-07", description: "产品说明折页" },
    { id: "DSG-06", name: "节日促销图", code: "festival-promo", width: 1080, height: 1080, dpi: 72, background: "#FFF1DE", bleed: 0, templateId: "TPL-01", paletteId: "PAL-05", description: "节日促销方图" }
  ];
  const designs = specs.map(function (spec, index) {
    const template = templates.find(function (item) { return item.id === spec.templateId; });
    const layers = JSON.parse(JSON.stringify(template.layers)).map(function (item, layerIndex) {
      item.id = spec.id + "-L" + (layerIndex + 1);
      return item;
    });
    if (spec.id === "DSG-01") {
      layers[1].text = "春季新品";
      layers[2].text = "山野茶香系列";
      layers[4].text = "陕西理工大学文创";
    }
    if (spec.id === "DSG-02") {
      layers[1].text = "非遗市集";
      layers[2].text = "手作与传统的相遇";
      layers[4].text = "三月二十日 中心广场";
    }
    if (spec.id === "DSG-03") {
      layers[1].text = "吕宝来";
      layers[2].text = "视觉设计师";
      layers[3].text = "电话 0916-0000000\n邮箱 design@school.local";
    }
    if (spec.id === "DSG-04") {
      layers[1].text = "平面视觉与排版";
      layers[2].text = "陕西理工大学 2026";
    }
    if (spec.id === "DSG-05") {
      layers[1].text = "产品说明";
      layers[2].text = "本页说明产品参数、使用方式与注意事项，正文按行高与字号排版，导出前执行印前预检。";
      layers[3].text = "陕西理工大学";
    }
    if (spec.id === "DSG-06") {
      layers[1].text = "节日促销";
      layers[2].text = "限时优惠活动";
      layers[4].text = "活动最终解释权归主办方所有";
    }
    return Object.assign({}, spec, {
      status: "active",
      ownerId: "USR-02",
      ownerName: "视觉设计师",
      templateName: template.name,
      layers: layers,
      shareToken: "",
      shareExpiresAt: 0,
      versionCount: 1,
      createdBy: "USR-02",
      createdByName: "视觉设计师",
      createdAt: "2026-03-15T09:0" + index + ":00.000Z",
      updatedAt: "2026-03-15T09:0" + index + ":00.000Z"
    });
  });
  const preflights = designs.slice(0, 5).map(function (design, index) {
    return preflightOf(design, "PRE-0" + (index + 1));
  });
  const versions = designs.slice(0, 5).map(function (design, index) {
    return {
      id: "VER-0" + (index + 1),
      designId: design.id,
      label: "V1.0 初始方案",
      snapshot: {
        width: design.width, height: design.height, dpi: design.dpi,
        background: design.background, bleed: design.bleed,
        layerCount: design.layers.length,
        checksum: design.layers.map(function (item) { return item.type + ":" + item.x + "," + item.y + "," + item.width + "," + item.height; }).join("|")
      },
      createdBy: "USR-02",
      createdByName: "视觉设计师",
      createdAt: "2026-03-15T11:0" + index + ":00.000Z"
    };
  });
  const feedback = [
    { id: "FB-01", userId: "USR-02", userName: "视觉设计师", type: "建议", content: "希望增加更多社媒尺寸预设。", status: "replied", reply: "已记录，后续版本评估。", createdAt: "2026-03-15T12:00:00.000Z", repliedAt: "2026-03-15T12:30:00.000Z" },
    { id: "FB-02", userId: "USR-03", userName: "审核访客", type: "问题", content: "分享页能否隐藏图层信息？", status: "closed", reply: "分享页只展示画布与图层内容，不显示内部记录。", createdAt: "2026-03-15T13:00:00.000Z", repliedAt: "2026-03-15T13:10:00.000Z" }
  ];
  const auditLogs = [
    { id: "LOG-01", userId: "USR-02", username: "designer01", role: "DESIGNER", category: "项目", action: "创建项目", target: "DSG-01", detail: "春季新品主图", ip: "127.0.0.1", createdAt: "2026-03-15T09:00:00.000Z" },
    { id: "LOG-02", userId: "USR-02", username: "designer01", role: "DESIGNER", category: "预检", action: "生成预检", target: "PRE-01", detail: "春季新品主图", ip: "127.0.0.1", createdAt: "2026-03-15T10:01:00.000Z" }
  ];
  return {
    meta: { createdAt: "2026-03-15T08:00:00.000Z", version: 1 },
    users: users,
    tokens: [],
    designs: designs,
    palettes: palettes,
    templates: templates,
    preflights: preflights,
    versions: versions,
    feedback: feedback,
    auditLogs: auditLogs,
    settings: {
      softwareName: "智能平面视觉辅助设计与排版系统",
      softwareVersion: "V1.0.0",
      defaultWidth: 1080,
      defaultHeight: 1080,
      defaultDpi: 300,
      aiNotice: "本软件的配色、排版与预检由本地规则算法计算，不调用生成式人工智能。",
      roleMenus: {
        ADMIN: ["dashboard", "designs", "templates", "palettes", "preflights", "versions", "users", "audit", "settings", "feedback", "profile", "help"],
        DESIGNER: ["dashboard", "designs", "templates", "palettes", "preflights", "versions", "feedback", "profile", "help"],
        VIEWER: ["dashboard", "designs", "preflights", "versions", "feedback", "profile", "help"]
      }
    }
  };
}

module.exports = { build: build };
