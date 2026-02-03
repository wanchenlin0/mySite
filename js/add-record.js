// ===================================
// 新增/編輯紀錄頁邏輯
// ===================================

const dataManager = new DataManager();
let editMode = false;
let editRecordId = null;

// ===================================
// 初始化
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    editRecordId = Utils.getUrlParameter('id');
    editMode = !!editRecordId;

    setupForm();
    setupEventListeners();

    if (editMode) {
        loadRecordForEdit();
    } else {
        setDefaultDate();
    }
});

// ===================================
// 表單設定
// ===================================

function setupForm() {
    if (editMode) {
        document.getElementById('pageTitle').innerHTML = '✏️ 編輯實習紀錄';
        document.getElementById('breadcrumbTitle').textContent = '編輯紀錄';
        document.getElementById('submitText').textContent = '💾 更新紀錄';
        document.title = '編輯紀錄 | 實習紀錄網站';
    } else {
        document.getElementById('submitText').textContent = '💾 儲存紀錄';
    }
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('recordDate').value = today;
}

function loadRecordForEdit() {
    const record = dataManager.getRecordById(editRecordId);

    if (!record) {
        Utils.showNotification('❌ 找不到要編輯的紀錄', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    // 填入表單
    document.getElementById('recordDate').value = record.date;
    document.getElementById('recordTitle').value = record.title;
    document.getElementById('recordContent').value = record.content;
    document.getElementById('recordTags').value = record.tags ? record.tags.join(', ') : '';

    // 更新字數提示
    updateCharCount();
}

// ===================================
// 表單處理
// ===================================

function handleSubmit(event) {
    event.preventDefault();

    // 收集表單資料
    const formData = {
        date: document.getElementById('recordDate').value,
        title: document.getElementById('recordTitle').value.trim(),
        content: document.getElementById('recordContent').value.trim(),
        tags: document.getElementById('recordTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
    };

    // 驗證
    if (!formData.title || !formData.content) {
        Utils.showNotification('❌ 請填寫所有必填欄位', 'error');
        return;
    }

    // 儲存
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>處理中...</span>';

    setTimeout(() => {
        let recordId;

        if (editMode) {
            // 編輯模式
            const updated = dataManager.updateRecord(editRecordId, formData);
            if (updated) {
                recordId = editRecordId;
                Utils.showNotification('✅ 紀錄已更新');
            } else {
                Utils.showNotification('❌ 更新失敗', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span id="submitText">💾 更新紀錄</span>';
                return;
            }
        } else {
            // 新增模式
            const newRecord = dataManager.addRecord(formData);
            recordId = newRecord.id;
            Utils.showNotification('✅ 紀錄已儲存');
        }

        // 跳轉到詳情頁
        setTimeout(() => {
            window.location.href = `record-detail.html?id=${recordId}`;
        }, 800);
    }, 300);
}

function handleReset() {
    if (!Utils.confirm('確定要重置表單嗎？所有未儲存的內容將會遺失。')) {
        return;
    }

    document.getElementById('recordForm').reset();
    if (!editMode) {
        setDefaultDate();
    } else {
        loadRecordForEdit();
    }
    updateCharCount();
}

function handleCancel() {
    if (formHasChanges()) {
        if (!Utils.confirm('確定要離開嗎？未儲存的變更將會遺失。')) {
            return;
        }
    }

    if (editMode) {
        window.location.href = `record-detail.html?id=${editRecordId}`;
    } else {
        window.location.href = 'index.html';
    }
}

function formHasChanges() {
    const title = document.getElementById('recordTitle').value.trim();
    const content = document.getElementById('recordContent').value.trim();
    const tags = document.getElementById('recordTags').value.trim();

    return title.length > 0 || content.length > 0 || tags.length > 0;
}

// ===================================
// 字數統計
// ===================================

function updateCharCount() {
    // 標題字數
    const title = document.getElementById('recordTitle').value;
    document.getElementById('titleHint').textContent = `${title.length} / 100`;

    // 內容字數
    const content = document.getElementById('recordContent').value;
    const charCount = content.length;
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    document.getElementById('contentHint').textContent =
        `${charCount} 字元 · 約 ${wordCount} 字`;
}

// ===================================
// 事件監聽器
// ===================================

function setupEventListeners() {
    // 表單提交
    document.getElementById('recordForm').addEventListener('submit', handleSubmit);

    // 按鈕
    document.getElementById('resetBtn').addEventListener('click', handleReset);
    document.getElementById('cancelBtn').addEventListener('click', handleCancel);

    // 字數統計
    document.getElementById('recordTitle').addEventListener('input', updateCharCount);
    document.getElementById('recordContent').addEventListener('input', updateCharCount);

    // 離開前警告
    window.addEventListener('beforeunload', (e) => {
        if (formHasChanges()) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // 鍵盤快捷鍵
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + S: 儲存
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            document.getElementById('recordForm').dispatchEvent(new Event('submit'));
        }

        // Esc: 取消
        if (e.key === 'Escape') {
            handleCancel();
        }
    });

    // Auto-save to localStorage (草稿功能)
    let autoSaveTimeout;
    const formInputs = document.querySelectorAll('#recordForm input, #recordForm textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(saveDraft, 2000);
        });
    });
}

// ===================================
// 草稿功能
// ===================================

function saveDraft() {
    if (editMode) return; // 編輯模式不儲存草稿

    const draft = {
        date: document.getElementById('recordDate').value,
        title: document.getElementById('recordTitle').value,
        content: document.getElementById('recordContent').value,
        tags: document.getElementById('recordTags').value,
        savedAt: new Date().toISOString()
    };

    localStorage.setItem('recordDraft', JSON.stringify(draft));
}

function loadDraft() {
    const draft = localStorage.getItem('recordDraft');
    if (!draft) return false;

    const data = JSON.parse(draft);

    if (Utils.confirm('偵測到未完成的草稿，是否要載入？')) {
        document.getElementById('recordDate').value = data.date;
        document.getElementById('recordTitle').value = data.title;
        document.getElementById('recordContent').value = data.content;
        document.getElementById('recordTags').value = data.tags;
        updateCharCount();
        return true;
    }

    return false;
}

function clearDraft() {
    localStorage.removeItem('recordDraft');
}

// 頁面載入時檢查草稿
if (!editMode) {
    setTimeout(() => {
        if (loadDraft()) {
            Utils.showNotification('📝 已載入草稿');
        }
    }, 500);
}
