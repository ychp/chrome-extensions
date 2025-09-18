/**
 * Time Convertor Background Script
 * 处理插件安装、更新和消息通信
 */

class TimeConvertorBackground {
  constructor() {
    this.isEnabled = true;
    this.init();
  }

  init() {
    // 监听插件安装事件
    chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));
    
    // 监听来自content script的消息
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // 监听标签页更新事件
    chrome.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));
  }

  /**
   * 处理插件安装
   */
  handleInstalled(details) {
    console.log('Time Convertor installed:', details.reason);
    
    if (details.reason === 'install') {
      // 首次安装时的初始化
      this.setDefaultSettings();
    } else if (details.reason === 'update') {
      // 更新时的处理
      console.log('Time Convertor updated to version:', chrome.runtime.getManifest().version);
    }
  }

  /**
   * 设置默认配置
   */
  setDefaultSettings() {
    const defaultSettings = {
      enabled: true,
      autoDetect: true,
      showRelativeTime: true,
      theme: 'auto'
    };

    chrome.storage.sync.set({ timeConvertorSettings: defaultSettings }, () => {
      console.log('Default settings saved');
    });
  }

  /**
   * 处理消息
   */
  handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'log':
        this.appendLog(request.level || 'info', request.message, request.meta || {});
        sendResponse && sendResponse({ ok: true });
        break;
      case 'toggle':
        this.toggleExtension(request.enabled);
        sendResponse({ success: true });
        break;
      
      case 'getSettings':
        this.getSettings().then(settings => {
          sendResponse({ settings });
        });
        return true; // 保持消息通道开放
      
      case 'updateSettings':
        this.updateSettings(request.settings).then(() => {
          sendResponse({ success: true });
        });
        return true;
      
      default:
        sendResponse({ error: 'Unknown action' });
    }
  }

  /**
   * 追加日志到本地存储（保留最近200条）
   */
  appendLog(level, message, meta) {
    const entry = {
      ts: Date.now(),
      level,
      message,
      meta
    };
    chrome.storage.local.get(['tcLogs'], (res) => {
      const logs = Array.isArray(res.tcLogs) ? res.tcLogs : [];
      logs.push(entry);
      const MAX_LOGS = 200;
      const trimmed = logs.length > MAX_LOGS ? logs.slice(logs.length - MAX_LOGS) : logs;
      chrome.storage.local.set({ tcLogs: trimmed });
    });
  }

  /**
   * 切换插件启用状态
   */
  async toggleExtension(enabled) {
    this.isEnabled = enabled;
    
    // 更新存储的设置
    const settings = await this.getSettings();
    settings.enabled = enabled;
    await this.updateSettings(settings);
    
    // 通知所有标签页
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'toggle',
          enabled: enabled
        });
      } catch (error) {
        // 忽略无法发送消息的标签页（如chrome://页面）
        console.debug('Cannot send message to tab:', tab.id, error.message);
      }
    }
  }

  /**
   * 获取设置
   */
  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['timeConvertorSettings'], (result) => {
        const defaultSettings = {
          enabled: true,
          autoDetect: true,
          showRelativeTime: true,
          theme: 'auto'
        };
        resolve(result.timeConvertorSettings || defaultSettings);
      });
    });
  }

  /**
   * 更新设置
   */
  async updateSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ timeConvertorSettings: settings }, () => {
        resolve();
      });
    });
  }

  /**
   * 处理标签页更新
   */
  handleTabUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
      // 标签页加载完成后，发送当前设置
      this.getSettings().then(settings => {
        chrome.tabs.sendMessage(tabId, {
          action: 'settingsUpdate',
          settings: settings
        }).catch(error => {
          // 忽略无法发送消息的标签页
          console.debug('Cannot send settings to tab:', tabId, error.message);
        });
      });
    }
  }

  /**
   * 获取插件状态
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      version: chrome.runtime.getManifest().version
    };
  }
}

// 初始化background script
const timeConvertorBackground = new TimeConvertorBackground();

// 导出供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimeConvertorBackground;
}
