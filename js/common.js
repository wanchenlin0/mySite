// ===================================
// 共用模組（v2 — 前後端分離版）
// 資料操作已移至 api-client.js
// ===================================

// ===================================
// 共用工具函數
// ===================================

const Utils = {
    // 格式化日期
    formatDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekday = weekdays[date.getDay()];

        return `${year}年${month}月${day}日 (週${weekday})`;
    },

    // 格式化相對時間
    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 30) {
            return this.formatDate(dateString);
        } else if (days > 0) {
            return `${days} 天前`;
        } else if (hours > 0) {
            return `${hours} 小時前`;
        } else if (minutes > 0) {
            return `${minutes} 分鐘前`;
        } else {
            return '剛剛';
        }
    },

    // HTML 轉義
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 取得內容摘要
    getExcerpt(text, length = 100) {
        const escaped = this.escapeHtml(text);
        return escaped.length > length
            ? escaped.substring(0, length) + '...'
            : escaped;
    },

    // 從 URL 取得參數
    getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    },

    // 顯示通知
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? 'var(--color-primary)' : '#dc2626'};
      color: white;
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      box-shadow: var(--shadow-lg);
      font-weight: 600;
      font-size: 0.9rem;
      z-index: 1000;
      animation: slideInRight 0.3s ease;
    `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    // 確認對話框
    confirm(message) {
        return window.confirm(message);
    },

    // 高亮搜尋關鍵字
    highlightText(text, query) {
        if (!query) return this.escapeHtml(text);

        const escaped = this.escapeHtml(text);
        const regex = new RegExp(`(${query})`, 'gi');
        return escaped.replace(regex, '<mark>$1</mark>');
    }
};

// 導出給其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Utils };
}
