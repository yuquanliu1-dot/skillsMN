# macOS 应用图标修复说明

## 问题描述

在 macOS 下，应用图标显示为 Electron 默认图标，而不是自定义的 SkillsMN 图标。

## 根本原因

1. `package.json` 中的 `build` 配置缺少 macOS 的图标配置
2. macOS 需要 `.icns` 格式的图标文件，而不是简单的 PNG
3. 主进程中图标的加载逻辑没有正确处理 macOS 的特殊情况

## 解决方案

### 1. 更新 package.json

添加了 macOS 和 Linux 的图标配置：

```json
"mac": {
  "icon": "resources/icons/icon",
  "category": "public.app-category.developer-tools",
  "target": [
    {
      "target": "dmg",
      "arch": ["x64", "arm64"]
    }
  ]
},
"linux": {
  "icon": "resources/icons",
  "target": [
    {
      "target": "AppImage",
      "arch": ["x64"]
    }
  ]
}
```

### 2. 创建 macOS iconset

创建了 `resources/icons/icon.iconset/` 目录，包含所有必需的尺寸：

```
icon.iconset/
├── icon_16x16.png
├── icon_16x16@2x.png
├── icon_32x32.png
├── icon_32x32@2x.png
├── icon_128x128.png
├── icon_128x128@2x.png
├── icon_256x256.png
├── icon_256x256@2x.png
├── icon_512x512.png
└── icon_512x512@2x.png
```

### 3. 更新主进程图标加载逻辑

修改了 `src/main/index.ts` 中的图标加载逻辑：

```typescript
let iconPath: string | undefined;
if (isDev) {
  iconPath = path.join(__dirname, '../../../resources/icons/icon.png');
} else {
  // In production, macOS uses the bundle icon
  if (process.platform !== 'darwin') {
    iconPath = path.join(process.resourcesPath, 'icons', 'icon.png');
  }
  // On macOS, iconPath stays undefined to use the bundle icon
}
```

## 工作原理

### 开发环境
- macOS: 使用 `BrowserWindow` 的 `icon` 参数（虽然通常被忽略）
- Windows/Linux: 使用 `icon` 参数设置窗口图标

### 生产环境
- macOS: electron-builder 自动从 `icon.iconset` 生成 `.icns` 文件，并包含在 `.app` bundle 中
- Windows: 使用 `icon.ico`
- Linux: 使用 PNG 图标文件

## 构建脚本

提供了自动化脚本创建 iconset：

```bash
bash scripts/create-macos-iconset.sh
```

## 验证

打包后验证图标是否正确：

```bash
npm run package:mac
```

检查生成的 `.app` bundle：

```bash
# 查看应用的图标文件
ls -la release/mac-arm64/SkillsMN.app/Contents/Resources/

# 在 Finder 中查看应用图标
open release/mac-arm64/
```

## 注意事项

1. **1024x1024 图标**: 当前 `icon_512x512@2x.png` 使用的是 512x512 的图标，理想情况下应该使用 1024x1024 的图标以获得最佳质量

2. **图标缓存**: macOS 可能会缓存应用图标，如果图标没有更新，可以：
   - 重新构建应用
   - 清除图标缓存：`rm -rf /Library/Caches/com.apple.iconservices/`
   - 重启 Finder

3. **代码签名**: macOS 应用需要正确签名才能显示自定义图标

## 跨平台图标支持

现在应用支持所有主要平台的图标：
- ✅ Windows: `.ico` 格式
- ✅ macOS: `.icns` 格式（从 iconset 生成）
- ✅ Linux: PNG 文件
