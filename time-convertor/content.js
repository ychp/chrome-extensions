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
    // 监听文本选择事件
    document.addEventListener('mouseup', this.handleTextSelection.bind(this));
    document.addEventListener('keyup', this.handleTextSelection.bind(this));
    
    // 监听点击事件，用于关闭弹窗
    document.addEventListener('click', this.handleClick.bind(this));
    
    // 监听滚动事件，调整弹窗位置
    window.addEventListener('scroll', this.handleScroll.bind(this));
  }

  // 无日志版本

  /**
   * 处理文本选择事件
   */
  handleTextSelection(event) {
    if (!this.isEnabled) {
      return;
    }

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length === 0) {
      this.hidePopup();
      return;
    }

    // 检测是否为时间戳
    const timestampInfo = this.detectTimestamp(selectedText);
    if (timestampInfo) {
      this.showPopup(event, selectedText, timestampInfo);
    } else {
      this.hidePopup();
    }
  }

  /**
   * 检测文本是否为时间戳
   * @param {string} text - 选中的文本
   * @returns {Object|null} - 时间戳信息或null
   */
  detectTimestamp(text) {
    const trimmedText = text.trim();
    
    // 检查文本格式是否合理
    const formatCheck = this.checkTimestampFormat(trimmedText);
    if (!formatCheck.isValid) {
      return null;
    }

    const cleanText = formatCheck.extractedNumber;
    const parsedNumber = parseInt(cleanText, 10);

    // 判断时间戳单位（秒或毫秒），先归一化到秒再做范围判断
    const MILLIS_DIGITS_THRESHOLD = 12;
    let actualTimestamp = parsedNumber;
    let unit = 'seconds';
    if (cleanText.length >= MILLIS_DIGITS_THRESHOLD) {
      actualTimestamp = Math.floor(parsedNumber / 1000);
      unit = 'milliseconds';
    }

    // 合理范围（以秒为单位）
    const MIN_TIMESTAMP_SECONDS = 946684800;
    const MAX_TIMESTAMP_SECONDS = 4102444800;
    if (actualTimestamp < MIN_TIMESTAMP_SECONDS || actualTimestamp > MAX_TIMESTAMP_SECONDS) {
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
      return null;
    }
  }

  /**
   * 检查时间戳格式是否有效
   * @param {string} text - 选中的文本
   * @returns {Object} - { isValid: boolean, extractedNumber: string }
   */
  checkTimestampFormat(text) {
    // 纯数字：直接接受
    if (/^\d+$/.test(text)) {
      return { isValid: true, extractedNumber: text };
    }

    // 允许的常见格式：
    // 1. 前缀为时间戳标识符: ts:1234567890, timestamp:1234567890
    // 2. 单位后缀: 1234567890s, 1234567890ms, 1234567890000ms
    // 3. 括号包围: (1234567890), [1234567890], {1234567890}
    // 4. 前后有空格或常见标点: 1234567890, 1234567890.
    
    // 检查是否包含非数字字符
    const hasNonDigits = /[^\d]/.test(text);
    if (!hasNonDigits) {
      return { isValid: true, extractedNumber: text };
    }

    // 提取数字部分
    const numberMatch = text.match(/\d+/);
    if (!numberMatch) {
      return { isValid: false, extractedNumber: '' };
    }

    const extractedNumber = numberMatch[0];
    const nonDigitParts = text.split(/\d+/).filter(part => part.length > 0);

    // 如果没有非数字部分，说明是纯数字（已处理）
    if (nonDigitParts.length === 0) {
      return { isValid: true, extractedNumber };
    }

    // 检查非数字部分是否都是允许的字符
    const allowedChars = /^[\s\[\]\{\}\(\)\.,;:\-_=]*$/;
    const hasInvalidChars = nonDigitParts.some(part => !allowedChars.test(part));
    
    // 如果包含不允许的字符（如字母），检查是否是已知的时间戳前缀或单位后缀
    if (hasInvalidChars) {
      const lowerText = text.toLowerCase();
      
      // 检查是否是有效的时间戳前缀格式
      const validPrefixPatterns = [
        /^ts[:\s]?\d+/i,
        /^timestamp[:\s]?\d+/i,
        /^time[:\s]?\d+/i,
        /^unix[:\s]?\d+/i,
        /^unix[:\s]timestamp[:\s]?\d+/i
      ];
      
      const hasValidPrefix = validPrefixPatterns.some(pattern => pattern.test(lowerText));
      
      // 检查是否是有效的单位后缀格式
      const hasValidSuffix = /^\d+[sm]{1,2}(?:ec)?(?:onds)?(?:ec)?$/i.test(text) ||
                             /^\d+ms$/i.test(text) ||
                             /^\d+s$/i.test(text);

      if (!hasValidPrefix && !hasValidSuffix) {
        return { isValid: false, extractedNumber: '' };
      }
    }

    // 最终检查：数字部分必须占文本的主要部分（至少50%）
    if (extractedNumber.length < text.length * 0.5) {
      return { isValid: false, extractedNumber: '' };
    }

    return { isValid: true, extractedNumber };
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

    // 计算锚点（鼠标或选区），后续边界处理都基于该锚点，不再直接访问 event.pageX/Y
    const MARGIN = 10;
    let anchorX;
    let anchorY;
    if (typeof event?.pageX === 'number' && typeof event?.pageY === 'number') {
      anchorX = event.pageX;
      anchorY = event.pageY;
    } else {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selRect = range.getBoundingClientRect();
        anchorX = selRect.left + window.scrollX + selRect.width / 2;
        anchorY = selRect.top + window.scrollY + selRect.height;
      } else {
        anchorX = 10;
        anchorY = 10;
      }
    }

    // 初始位置：锚点右下角
    let left = anchorX + MARGIN;
    let top = anchorY + MARGIN;

    // 右边界：转到锚点左侧
    if (left + rect.width > viewportWidth + window.scrollX) {
      left = anchorX - rect.width - MARGIN;
    }

    // 下边界：转到锚点上方
    if (top + rect.height > viewportHeight + window.scrollY) {
      top = anchorY - rect.height - MARGIN;
    }

    // 最终兜底，防止越界
    left = Math.max(window.scrollX + MARGIN, left);
    top = Math.max(window.scrollY + MARGIN, top);

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
    }
  }

  /**
   * 处理点击事件
   */
  handleClick(event) {
    const CLICK_SUPPRESS_MS = 200;
    if (Date.now() - this.justShownAtMs < CLICK_SUPPRESS_MS) {
      return;
    }
    if (this.popup && !this.popup.contains(event.target)) {
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
