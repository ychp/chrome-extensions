# favorite-sync

导出 Arc 浏览器「已固定（Pinned）」标签为标准 Netscape 书签 HTML，保留文件夹/分组结构。

> 平台支持：仅支持 macOS（依赖 `~/Library/Application Support/Arc/StorableSidebar.json`）。

## 两种导出路径
- 点击扩展图标：
  - 优先调用原生宿主读取 `~/Library/Application Support/Arc/StorableSidebar.json`，为每个 Space 生成一个 HTML 并触发保存。
  - 失败时回退：使用 `tabs/tabGroups` 或书签树的“疑似 Pinned 文件夹”导出。

## 目录结构
- `manifest.json`：扩展清单（MV3）。
- `background.js`：点击图标触发导出逻辑，含原生宿主与回退方案。
- `arc-export.js`：独立解析器，可直接把 `StorableSidebar.json` 转为 HTML。
- `native-host.js`：Native Messaging 宿主（Node 实现）。
- `native-host.sh`：宿主包装器，解决 Node 路径差异。
- `native-host.json`：宿主清单样例（安装脚本会写入系统目录）。
- `install-native-host.sh`：安装脚本，注入扩展 ID，复制清单到系统目录。
- `favorites.png`：图标。

以下文件属于运行时产物，已从仓库删除且不应提交：
- `*.html` 导出结果（例如 `Arc Space.html`）
- `native-host.log` 日志

## 安装原生宿主（首次）
1. 赋权：
```bash
chmod +x <workspace>/favorite-sync/native-host.sh
chmod +x <workspace>/favorite-sync/native-host.js
```
2. 安装清单（把 <EXT_ID> 换成扩展 ID）：
```bash
EXT_ID=<EXT_ID> <workspace>/favorite-sync/install-native-host.sh
```
native-host.json 文件中配置为
```json
{
  "name": "com.ychp.arc.export_pins",
  "description": "Arc pinned tabs exporter host",
  "path": "<workspace>/favorite-sync/native-host.sh",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://abcdefghijklmnopqrstuvwxyzabcdef/"
  ]
}
```

3. 在 Arc “重新加载”扩展后使用。

## 命令行导出（可选）
```bash
node <workspace>/favorite-sync/arc-export.js \
  "$HOME/Library/Application Support/Arc/StorableSidebar.json" \
  <workspace>/favorite-sync
```
