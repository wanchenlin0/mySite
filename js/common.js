// ===================================
// 共用資料管理模組
// ===================================

class DataManager {
    constructor() {
        this.recordsKey = 'internshipRecords';
        this.profileKey = 'userProfile';
        this.fixDuplicateIds(); // 初始化時檢測並修復 ID
    }

    // 檢測並修復重複 ID
    fixDuplicateIds() {
        try {
            const stored = localStorage.getItem(this.recordsKey);
            if (!stored) return;

            const records = JSON.parse(stored);
            if (!Array.isArray(records)) return;

            const seenIds = new Set();
            let hasDuplicates = false;
            let fixedCount = 0;

            const fixedRecords = records.map(record => {
                if (record.id && seenIds.has(record.id)) {
                    hasDuplicates = true;
                    // 生成新 ID: timestamp_random
                    const newId = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    fixedCount++;
                    return { ...record, id: newId };
                }
                if (record.id) {
                    seenIds.add(record.id);
                }
                return record;
            });

            if (hasDuplicates) {
                console.warn(`Found ${fixedCount} duplicate IDs. Fixing...`);
                localStorage.setItem(this.recordsKey, JSON.stringify(fixedRecords));
                // 延遲通知以免干擾 UI 初始化
                setTimeout(() => {
                    if (typeof Utils !== 'undefined' && Utils.showNotification) {
                        // Utils.showNotification(`🔧 已自動修復 ${fixedCount} 筆資料索引衝突`, 'success'); // 已停用通知
                    }
                }, 1000);
            }
        } catch (e) {
            console.error('Error fixing duplicate IDs:', e);
        }
    }

    // ===================================
    // 紀錄管理
    // ===================================

    // 取得所有紀錄
    getAllRecords() {
        const stored = localStorage.getItem(this.recordsKey);
        return stored ? JSON.parse(stored) : [];
    }

    // 儲存所有紀錄
    saveRecords(records) {
        localStorage.setItem(this.recordsKey, JSON.stringify(records));
    }

    // 根據 ID 取得單筆紀錄
    getRecordById(id) {
        const records = this.getAllRecords();
        return records.find(record => record.id === id);
    }

    // 新增紀錄
    addRecord(record) {
        const records = this.getAllRecords();
        const newRecord = {
            id: Date.now().toString(),
            ...record,
            createdAt: new Date().toISOString()
        };
        records.unshift(newRecord);
        this.saveRecords(records);
        return newRecord;
    }

    // 更新紀錄
    updateRecord(id, updatedData) {
        const records = this.getAllRecords();
        const index = records.findIndex(record => record.id === id);
        if (index !== -1) {
            records[index] = {
                ...records[index],
                ...updatedData,
                updatedAt: new Date().toISOString()
            };
            this.saveRecords(records);
            return records[index];
        }
        return null;
    }

    // 刪除紀錄
    deleteRecord(id) {
        const records = this.getAllRecords();
        const filtered = records.filter(record => record.id !== id);
        this.saveRecords(filtered);
        return filtered.length < records.length;
    }

    // 搜尋紀錄
    searchRecords(query) {
        if (!query.trim()) {
            return this.getAllRecords();
        }

        const records = this.getAllRecords();
        return records.filter(record => {
            const searchText = `${record.title} ${record.content} ${record.tags.join(' ')}`.toLowerCase();
            return searchText.includes(query.toLowerCase());
        });
    }

    // 取得上一篇和下一篇
    getAdjacentRecords(currentId) {
        const records = this.getAllRecords();
        const currentIndex = records.findIndex(r => r.id === currentId);

        return {
            prev: currentIndex > 0 ? records[currentIndex - 1] : null,
            next: currentIndex < records.length - 1 ? records[currentIndex + 1] : null
        };
    }

    // ===================================
    // 個人資料管理
    // ===================================

    // 取得個人資料
    getProfile() {
        const stored = localStorage.getItem(this.profileKey);
        return stored ? JSON.parse(stored) : this.getDefaultProfile();
    }

    // 儲存個人資料
    saveProfile(profile) {
        localStorage.setItem(this.profileKey, JSON.stringify(profile));
    }

    // 預設個人資料
    getDefaultProfile() {
        return {
            name: "您的姓名",
            company: "目前實習公司",
            position: "實習職位",
            interests: "您的興趣...",
            email: "",
            github: "",
            linkedin: ""
        };
    }
}

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
      background: ${type === 'success' ? 'var(--gradient-primary)' : 'var(--gradient-accent)'};
      color: white;
      padding: var(--spacing-md) var(--spacing-lg);
      border-radius: var(--radius-full);
      box-shadow: var(--shadow-lg);
      font-weight: 600;
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

// ===================================
// 初始化範例資料
// ===================================

function initializeSampleData() {
    const dataManager = new DataManager();
    const records = dataManager.getAllRecords();

    if (records.length === 0) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);

        const sampleRecords = [
            {
                date: today.toISOString().split('T')[0],
                title: '學習新技術',
                content: '今天學習了如何使用 JavaScript 開發動態網頁，並完成了一個實習紀錄系統。收穫很多！學習了 LocalStorage 的使用、URL 參數處理，以及如何設計多頁面網站架構。',
                tags: ['程式設計', 'JavaScript', '學習']
            },
            {
                date: yesterday.toISOString().split('T')[0],
                title: '團隊會議',
                content: '參加了第一次團隊會議，認識了所有的團隊成員，大家都很友善。主管分享了專案的目標和期望，也說明了未來幾個月的工作規劃。',
                tags: ['團隊合作', '會議', '溝通']
            },
            {
                date: lastWeek.toISOString().split('T')[0],
                title: '第一天報到',
                content: '今天是實習的第一天！非常興奮也有點緊張。公司環境很好，同事們都很熱情。期待接下來的實習旅程！HR 帶我參觀了辦公室，介紹了公司文化和福利制度。',
                tags: ['新開始', '報到', '第一天']
            }
        ];

        sampleRecords.forEach(record => dataManager.addRecord(record));
    }

    // 初始化個人資料（如果不存在）
    const profile = dataManager.getProfile();
    if (profile.name === "您的姓名") {
        // 可以在這裡設定預設值
    }
}

// 導出給其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataManager, Utils, initializeSampleData };
}
