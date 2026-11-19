const HelpView = {
  render: function (container) {
    container.innerHTML = UI.pageHead("帮助与合规", "设计流程、技术边界与常见问题") +
      '<div class="two-col"><div class="card"><div class="card-head"><h3>设计流程</h3></div><div class="card-body">' +
      '<ol class="help-list"><li>在设计项目新建项目，填写名称、编码与画布尺寸，可选择模板。</li><li>在编辑器新增文本、矩形与椭圆，拖拽调整位置，按住 Shift 多选。</li><li>使用栅格、对齐与黄金分割线辅助排版；从色板或图片提取主色。</li><li>执行对比度检查与布尔运算，完成后生成印前预检。</li><li>保存版本，导出PNG、SVG或JSON，分享只读链接给审核人。</li></ol></div></div>' +
      '<div class="card"><div class="card-head"><h3>技术边界</h3></div><div class="card-body">' +
      '<ul class="help-list"><li>画布使用浏览器Canvas 2D绘制，不包含WebGL、WASM与GPU滤镜。</li>' +
      '<li>智能配色使用K-Means像素聚类与色板距离，不调用生成式人工智能。</li>' +
      '<li>布尔运算以离屏Canvas掩膜实现，结果为栅格化掩膜图层。</li>' +
      '<li>印前预检采用RGB转CMYK、总墨量、出血与DPI的固定规则，不包含ICC色彩管理与生产级RIP。</li>' +
      '<li>软件为本地单机，不提供微服务、MongoDB、Elasticsearch、Redis与实时协同。</li></ul></div></div></div>' +
      '<div class="card"><div class="card-head"><h3>常见问题</h3></div><div class="card-body">' +
      '<div class="faq"><strong>画布与导出尺寸如何对应？</strong><p>画布宽高即为导出像素尺寸；DPI参与预检判断，不改变画布像素数。</p></div>' +
      '<div class="faq"><strong>对比度如何判定？</strong><p>按WCAG相对亮度公式计算前景与背景比值，7以上为AAA，4.5以上为AA，3以上仅适合大字号。</p></div>' +
      '<div class="faq"><strong>总墨量如何计算？</strong><p>背景色转换为CMYK后，C、M、Y、K四值之和即为总墨量，超过300%视为不合格。</p></div>' +
      '<div class="faq"><strong>分享页显示什么？</strong><p>分享页只显示项目名称、画布尺寸、图层数量与画布内容，不显示内部记录。</p></div>' +
      '<div class="faq"><strong>数据保存在哪里？</strong><p>保存在软件目录的data/db.json；备份时同时保留secret.key。</p></div>' +
      '</div></div>';
  }
};
App.register("help", HelpView);
