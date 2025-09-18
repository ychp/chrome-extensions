# Tab Sorter

窗口数量统计 & 标签排序的 Chrome 扩展。

- 一键按规则对“当前窗口”的所有标签进行排序并重排位置
- 扩展图标展示所有窗口的标签总数（badge）
- 支持三种排序模式，可在“选项”页切换

## 安装

1. 打开 `chrome://extensions/`，开启“开发者模式”
2. 点击“加载已解压的扩展程序”，选择本目录 `tab-sorter`

## 使用

- 点击扩展图标：对当前窗口的全部标签排序并移动到新顺序位置
- 在扩展详情页打开“扩展选项”或右键扩展图标进入“选项”设置排序模式

## 排序模式

- Dictionary Ascending（字典升序）
- Dictionary Descending（字典降序）
- LUR（Last Used Recent，按最近访问时间降序）

说明：字典排序基于标签 `title` 的大小写无关比较；LUR 依赖 `tab.lastAccessed` 字段。

## 选项页

- 文件：`options.html`、`options.js`
- 存储键：`chrome.storage.sync.type`，默认 `dicAsc`

## 主要实现

- 入口：`background.js`
  - `chrome.action.onClicked` → `sortAndMoveTabsByConfig`
  - `sortAndMoveTabsByConfig` 读取选项并调用 `sortAndMoveTabs`
  - `sortAndMoveTabs` 根据模式排序后，依次 `chrome.tabs.move` 调整索引
  - `chrome.tabs.onCreated/onRemoved` → 统计标签总数并更新 badge（`setBadgeText`）

## 权限

- `tabs`：读取与移动标签
- `storage`：保存排序模式
- `activeTab`、`scripting`：基础扩展能力

## 图标

- 文件：`sort-ascending.png`（多尺寸共用）

## 目录结构

```
.
├── background.js
├── manifest.json
├── options.html
├── options.js
└── sort-ascending.png
```
