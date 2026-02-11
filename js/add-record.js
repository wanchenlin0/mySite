// ===================================
// 新增/編輯紀錄頁邏輯
// ===================================

let editMode = false;
let editRecordId = null;

// ===================================
// 初始化
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
    const ok = await Auth.init();
    if (!ok) return;

    if (Auth.isViewer) {
        window.location.href = '/index.html';
        return;
    }

    editRecordId = Utils.getUrlParameter('id');
    editMode = !!editRecordId;

    setupForm();
    setupEventListeners();

    if (editMode) {
        await loadRecordForEdit();
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
    document.getElementById('startTime').value = '09:00';
    document.getElementById('endTime').value = '18:00';
}

async function loadRecordForEdit() {
    try {
        const { record } = await ApiClient.getRecordById(editRecordId);

        let safeDate = record.date;
        if (safeDate && safeDate.includes('T')) {
            safeDate = safeDate.split('T')[0];
        }
        document.getElementById('recordDate').value = safeDate;
        document.getElementById('startTime').value = record.startTime || '09:00';
        document.getElementById('endTime').value = record.endTime || '18:00';
        document.getElementById('recordTitle').value = record.title;
        document.getElementById('recordContent').value = record.content;
        document.getElementById('recordTags').value = record.tags ? record.tags.join(', ') : '';
        updateCharCount();
    } catch (e) {
        Utils.showNotification('❌ 找不到要編輯的紀錄', 'error');
        setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    }
}

// ===================================
// 表單處理
// ===================================

async function handleSubmit(event) {
    event.preventDefault();

    const formData = {
        date: document.getElementById('recordDate').value,
        startTime: document.getElementById('startTime').value,
        endTime: document.getElementById('endTime').value,
        title: document.getElementById('recordTitle').value.trim(),
        content: document.getElementById('recordContent').value.trim(),
        tags: document.getElementById('recordTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
    };

    if (!formData.title || !formData.content) {
        Utils.showNotification('❌ 請填寫所有必填欄位', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>處理中...</span>';

    try {
        let recordId;
        if (editMode) {
            const { record } = await ApiClient.updateRecord(editRecordId, formData);
            recordId = record.id;
        } else {
            const { record } = await ApiClient.addRecord(formData);
            recordId = record.id;
        }
        window.location.href = `record-detail.html?id=${recordId}`;
    } catch (e) {
        Utils.showNotification('❌ ' + (e.message || '儲存失敗'), 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span id="submitText">${editMode ? '💾 更新紀錄' : '💾 儲存紀錄'}</span>`;
    }
}

async function handleReset() {
    if (!Utils.confirm('確定要重置表單嗎？所有未儲存的內容將會遺失。')) return;
    document.getElementById('recordForm').reset();
    if (!editMode) {
        setDefaultDate();
    } else {
        await loadRecordForEdit();
    }
    updateCharCount();
}

function handleCancel() {
    if (formHasChanges()) {
        if (!Utils.confirm('確定要離開嗎？未儲存的變更將會遺失。')) return;
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
    const title = document.getElementById('recordTitle').value;
    document.getElementById('titleHint').textContent = `${title.length} / 100`;

    const content = document.getElementById('recordContent').value;
    const charCount = content.length;
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    document.getElementById('contentHint').textContent = `${charCount} 字元 · 約 ${wordCount} 字`;
}

// ===================================
// 事件監聽器
// ===================================

function setupEventListeners() {
    document.getElementById('recordForm').addEventListener('submit', handleSubmit);
    document.getElementById('resetBtn').addEventListener('click', handleReset);
    document.getElementById('cancelBtn').addEventListener('click', handleCancel);
    document.getElementById('recordTitle').addEventListener('input', updateCharCount);
    document.getElementById('recordContent').addEventListener('input', updateCharCount);

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            document.getElementById('recordForm').dispatchEvent(new Event('submit'));
        }
        if (e.key === 'Escape') handleCancel();
    });
}
