// ===================================
// 紀錄詳情頁邏輯
// ===================================

const dataManager = new DataManager();
let currentRecordId = null;
let currentRecord = null;

// ===================================
// 初始化
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    currentRecordId = Utils.getUrlParameter('id');

    if (!currentRecordId) {
        showError('找不到紀錄 ID');
        return;
    }

    loadRecord();
    setupEventListeners();
});

// ===================================
// 載入紀錄
// ===================================

function loadRecord() {
    currentRecord = dataManager.getRecordById(currentRecordId);

    if (!currentRecord) {
        showError('紀錄不存在');
        return;
    }

    renderRecord();
    loadAdjacentRecords();
}

function renderRecord() {
    // 麵包屑
    document.getElementById('breadcrumbTitle').textContent = currentRecord.title;

    // 日期
    document.getElementById('recordDate').textContent = Utils.formatDate(currentRecord.date);

    // 標題
    document.getElementById('recordTitle').textContent = currentRecord.title;
    document.title = `${currentRecord.title} | 實習紀錄網站`;

    // 標籤
    const tagsContainer = document.getElementById('recordTags');
    if (currentRecord.tags && currentRecord.tags.length > 0) {
        tagsContainer.innerHTML = currentRecord.tags
            .map(tag => `<span class="tag">${Utils.escapeHtml(tag)}</span>`)
            .join('');
    } else {
        tagsContainer.innerHTML = '';
    }

    // 內容
    const contentContainer = document.getElementById('recordContent');
    const paragraphs = currentRecord.content.split('\n').filter(p => p.trim());
    contentContainer.innerHTML = paragraphs
        .map(p => `<p>${Utils.escapeHtml(p)}</p>`)
        .join('');

    // Meta 資訊
    document.getElementById('createdAt').textContent = Utils.formatRelativeTime(currentRecord.createdAt);

    if (currentRecord.updatedAt) {
        document.getElementById('updatedAtContainer').style.display = 'flex';
        document.getElementById('updatedAt').textContent = Utils.formatRelativeTime(currentRecord.updatedAt);
    }
}

function loadAdjacentRecords() {
    const adjacent = dataManager.getAdjacentRecords(currentRecordId);

    // 上一篇
    if (adjacent.prev) {
        const prevLink = document.getElementById('prevRecord');
        prevLink.href = `record-detail.html?id=${adjacent.prev.id}`;
        prevLink.querySelector('.nav-title').textContent = adjacent.prev.title;
        prevLink.style.display = 'block';
    }

    // 下一篇
    if (adjacent.next) {
        const nextLink = document.getElementById('nextRecord');
        nextLink.href = `record-detail.html?id=${adjacent.next.id}`;
        nextLink.querySelector('.nav-title').textContent = adjacent.next.title;
        nextLink.style.display = 'block';
    }
}

// ===================================
// 操作功能
// ===================================

function editRecord() {
    window.location.href = `add-record.html?id=${currentRecordId}`;
}

function deleteRecord() {
    if (!Utils.confirm(`確定要刪除「${currentRecord.title}」嗎？\n此操作無法復原！`)) {
        return;
    }

    const success = dataManager.deleteRecord(currentRecordId);

    if (success) {
        Utils.showNotification('🗑️ 紀錄已刪除');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } else {
        Utils.showNotification('❌ 刪除失敗', 'error');
    }
}

// ===================================
// 錯誤處理
// ===================================

function showError(message) {
    const container = document.querySelector('.record-detail');
    container.innerHTML = `
    <div class="glass-card">
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h2>糟糕！</h2>
        <p>${message}</p>
        <a href="index.html" class="btn btn-primary" style="margin-top: var(--spacing-md);">返回首頁</a>
      </div>
    </div>
  `;
}

// ===================================
// 事件監聽器
// ===================================

function setupEventListeners() {
    document.getElementById('editBtn').addEventListener('click', editRecord);
    document.getElementById('deleteBtn').addEventListener('click', deleteRecord);

    // 鍵盤快捷鍵
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + E: 編輯
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            editRecord();
        }

        // Ctrl/Cmd + Delete: 刪除
        if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
            e.preventDefault();
            deleteRecord();
        }

        // Esc: 返回
        if (e.key === 'Escape') {
            window.location.href = 'index.html';
        }
    });
}
