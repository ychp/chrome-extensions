/**
 * Time Convertor Content Script
 * 监听页面文本选择，检测时间戳并显示转换结果
 */

class TimeConvertor {
  constructor() {
    this.popup = null;
    this.isEnabled = true;
    this.justShownAtMs = 0;
    this.init();
  }

  init() {
    this.log('info', 'content_init');
    // 监听文本选择事件
    document.addEventListener('mouseup', this.handleTextSelection.bind(this));
    document.addEventListener('keyup', this.handleTextSelection.bind(this));
    
    // 监听点击事件，用于关闭弹窗
    document.addEventListener('click', this.handleClick.bind(this));
    
    // 监听滚动事件，调整弹窗位置
    window.addEventListener('scroll', this.handleScroll.bind(this));
  }

  // 轻量日志：把日志发到后台记录
  log(level, message, meta) {
    try {
      if (typeof console !== 'undefined' && typeof console.log === 'function') {
        if (meta !== undefined) {
          console.log(`[TimeConvertor][${level}] ${message}`, meta);
        } else {
          console.log(`[TimeConvertor][${level}] ${message}`);
        }
      }
    } catch (e) {}
  }

  /**
   * 处理文本选择事件
   */
  handleTextSelection(event) {
    this.log('debug', 'selection_event', { type: event?.type });
    if (!this.isEnabled) {
      this.log('debug', 'ignored_disabled');
      return;
    }

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    this.log('debug', 'selected_text', { text: selectedText });

    if (selectedText.length === 0) {
      this.log('debug', 'empty_selection');
      this.hidePopup();
      return;
    }

    // 检测是否为时间戳
    const timestampInfo = this.detectTimestamp(selectedText);
    if (timestampInfo) {
      this.log('info', 'timestamp_detected', { info: {
        ts: timestampInfo.timestamp,
        unit: timestampInfo.unit
      }});
      this.showPopup(event, selectedText, timestampInfo);
    } else {
      this.log('debug', 'not_timestamp');
      this.hidePopup();
    }
  }

  /**
   * 检测文本是否为时间戳
   * @param {string} text - 选中的文本
   * @returns {Object|null} - 时间戳信息或null
   */
  detectTimestamp(text) {
    // 移除所有非数字字符，检查是否为纯数字
    const cleanText = text.replace(/[^\d]/g, '');
    
    if (cleanText.length === 0) {
      this.log('debug', 'no_digits');
      return null;
    }

    const parsedNumber = parseInt(cleanText, 10);

    // 判断时间戳单位（秒或毫秒），先归一化到秒再做范围判断
    const MILLIS_DIGITS_THRESHOLD = 12; // >=12位基本可判定为毫秒
    let actualTimestamp = parsedNumber;
    let unit = 'seconds';
    if (cleanText.length >= MILLIS_DIGITS_THRESHOLD) {
      actualTimestamp = Math.floor(parsedNumber / 1000);
      unit = 'milliseconds';
    }

    // 合理范围（以秒为单位）
    const MIN_TIMESTAMP_SECONDS = 946684800; // 2000-01-01 00:00:00 UTC
    const MAX_TIMESTAMP_SECONDS = 4102444800; // 2100-01-01 00:00:00 UTC
    if (actualTimestamp < MIN_TIMESTAMP_SECONDS || actualTimestamp > MAX_TIMESTAMP_SECONDS) {
      this.log('debug', 'out_of_range', { actualTimestamp });
      return null;
    }

    try {
      const date = new Date(actualTimestamp * 1000);
      if (isNaN(date.getTime())) {
        return null;
      }

      return {
        timestamp: actualTimestamp,
        originalTimestamp: parsedNumber,
        unit: unit,
        date: date
      };
    } catch (error) {
      this.log('error', 'date_parse_error', { error: String(error) });
      return null;
    }
  }

  /**
   * 显示转换结果弹窗
   */
  showPopup(event, originalText, timestampInfo) {
    this.hidePopup(); // 先隐藏现有弹窗

    const popup = document.createElement('div');
    popup.className = 'time-convertor-popup';
    popup.innerHTML = this.createPopupContent(originalText, timestampInfo);

    document.body.appendChild(popup);
    this.popup = popup;

    // 计算弹窗位置
    this.positionPopup(event, popup);

    // 标记展示时间，避免随后紧接的 click 事件立刻关闭弹窗
    this.justShownAtMs = Date.now();

    this.log('info', 'popup_shown');
  }

  /**
   * 创建弹窗内容
   */
  createPopupContent(originalText, timestampInfo) {
    const { date, unit, originalTimestamp } = timestampInfo;
    
    const formatDate = (date) => {
      const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      return date.toLocaleString('zh-CN', options);
    };

    const formatDateUTC = (date) => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
    };

    return `
      <div class="time-convertor-header">
        <span class="time-convertor-title">时间戳转换</span>
        <button class="time-convertor-close" onclick="this.closest('.time-convertor-popup').remove()">×</button>
      </div>
      <div class="time-convertor-content">
        <div class="time-convertor-item">
          <label>原始文本:</label>
          <span class="time-convertor-value">${originalText}</span>
        </div>
        <div class="time-convertor-item">
          <label>时间戳:</label>
          <span class="time-convertor-value">${originalTimestamp} (${unit})</span>
        </div>
        <div class="time-convertor-item">
          <label>本地时间:</label>
          <span class="time-convertor-value">${formatDate(date)}</span>
        </div>
        <div class="time-convertor-item">
          <label>UTC时间:</label>
          <span class="time-convertor-value">${formatDateUTC(date)}</span>
        </div>
        <div class="time-convertor-item">
          <label>相对时间:</label>
          <span class="time-convertor-value">${this.getRelativeTime(date)}</span>
        </div>
      </div>
      <div class="time-convertor-footer">
        <button class="time-convertor-copy" onclick="navigator.clipboard.writeText('${formatDate(date)}')">复制本地时间</button>
        <button class="time-convertor-copy" onclick="navigator.clipboard.writeText('${formatDateUTC(date)}')">复制UTC时间</button>
      </div>
    `;
  }

  /**
   * 获取相对时间描述
   */
  getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return diffSeconds <= 0 ? '刚刚' : `${diffSeconds}秒前`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else if (diffDays < 30) {
      return `${diffDays}天前`;
    } else {
      return '很久以前';
    }
  }

  /**
   * 定位弹窗
   */
  positionPopup(event, popup) {
    const rect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 如果事件没有坐标（如键盘选择），则根据选区定位
    let left;
    let top;
    if (typeof event?.pageX === 'number' && typeof event?.pageY === 'number') {
      left = event.pageX + 10;
      top = event.pageY + 10;
    } else {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selRect = range.getBoundingClientRect();
        left = selRect.left + window.scrollX + selRect.width / 2;
        top = selRect.top + window.scrollY + selRect.height + 10;
      } else {
        left = 10;
        top = 10;
      }
    }

    // 防止弹窗超出视口右边界
    if (left + rect.width > viewportWidth) {
      left = event.pageX - rect.width - 10;
    }

    // 防止弹窗超出视口下边界
    if (top + rect.height > viewportHeight) {
      top = event.pageY - rect.height - 10;
    }

    // 确保不超出左边界和上边界
    left = Math.max(10, left);
    top = Math.max(10, top);

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  /**
   * 隐藏弹窗
   */
  hidePopup() {
    if (this.popup) {
      this.popup.remove();
      this.popup = null;
      this.log('debug', 'popup_hidden');
    }
  }

  /**
   * 处理点击事件
   */
  handleClick(event) {
    const CLICK_SUPPRESS_MS = 200;
    if (Date.now() - this.justShownAtMs < CLICK_SUPPRESS_MS) {
      this.log('debug', 'suppress_click_close');
      return;
    }
    if (this.popup && !this.popup.contains(event.target)) {
      this.log('debug', 'outside_click_close');
      this.hidePopup();
    }
  }

  /**
   * 处理滚动事件
   */
  handleScroll() {
    if (this.popup) {
      this.hidePopup();
    }
  }

  /**
   * 启用/禁用插件
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.hidePopup();
    }
    this.log('info', 'set_enabled', { enabled });
  }
}

// 初始化插件
const timeConvertor = new TimeConvertor();

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    timeConvertor.setEnabled(request.enabled);
    sendResponse({ success: true });
  }
});
