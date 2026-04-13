# 治愈太阳 SunMe

一个 Chrome 浏览器插件，在你的网页上显示一个温暖治愈的太阳动画。

## 效果

- 径向渐变的暖色太阳，带呼吸感光晕脉冲
- 12 条旋转光芒，波浪式明暗交替
- 缓慢旋转的波浪边框 SVG
- 轻柔上下浮动动画
- 可爱的笑脸表情

## 功能

| 功能 | 说明 |
|------|------|
| 拖拽移动 | 按住太阳拖动到任意位置 |
| 点击隐藏 | 点击太阳本体可收缩隐藏，再次点击插件图标恢复 |
| 设置地区 | 悬停太阳右下角出现 📍 按钮，输入城市名（如"北京"） |
| 自动定位 | 地区留空则通过 IP 自动检测城市 |
| 天气获取 | 使用 [Open-Meteo](https://open-meteo.com/) 免费天气 API，无需 API Key |

## 安装

1. 克隆仓库
   ```bash
   git clone https://github.com/ATCBK/SunMe.git
   ```
2. 打开 Chrome，地址栏输入 `chrome://extensions/`
3. 右上角开启「开发者模式」
4. 点击「加载已解压的扩展程序」，选择 `Sun` 文件夹
5. 点击浏览器工具栏中的太阳图标，太阳即出现在页面上

## 文件结构

```
Sun/
├── manifest.json       # Chrome MV3 清单
├── background.js       # Service Worker，处理图标点击和脚本注入
├── widget/
│   ├── widget.css      # 太阳样式 + CSS 动画
│   └── widget.js       # 太阳 DOM 创建 + 拖拽 + 交互逻辑
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## 技术栈

- Chrome Extension Manifest V3
- 纯 CSS 动画（无依赖）
- SVG 波浪边框
- Open-Meteo 天气 API（免费，无需密钥）
- ipinfo.io IP 定位

## License

MIT
