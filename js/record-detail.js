// ===================================
// 紀錄詳情頁邏輯
// ===================================

let currentRecordId = null;
let currentRecord = null;

// ===================================
// 初始化
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
    const ok = await Auth.init();
    if (!ok) return;

    currentRecordId = Utils.getUrlParameter('id');

    if (!currentRecordId) {
        showError('找不到紀錄 ID');
        return;
    }

    await loadRecord();
    await loadComments();
    setupEventListeners();

    if (Auth.isViewer) {
        document.getElementById('editBtn').style.display = 'none';
        document.getElementById('deleteBtn').style.display = 'none';
    }
});

// ===================================
// 載入紀錄
// ===================================

async function loadRecord() {
    try {
        const { record } = await ApiClient.getRecordById(currentRecordId);
        currentRecord = record;
        renderRecord();
        await loadAdjacentRecords();
    } catch (e) {
        showError('紀錄不存在或無權限存取');
    }
}

function renderRecord() {
    document.getElementById('breadcrumbTitle').textContent = currentRecord.title;
    document.getElementById('recordTitle').textContent = currentRecord.title;
    document.title = `${currentRecord.title} | 實習紀錄網站`;

    const tagsContainer = document.getElementById('recordTags');
    if (currentRecord.tags && currentRecord.tags.length > 0) {
        tagsContainer.innerHTML = currentRecord.tags
            .map(tag => `<span class="tag">${Utils.escapeHtml(tag)}</span>`)
            .join('');
    } else {
        tagsContainer.innerHTML = '';
    }

    const timeContainer = document.getElementById('recordDate');
    if (currentRecord.startTime && currentRecord.endTime) {
        timeContainer.innerHTML = `${Utils.formatDate(currentRecord.date)} <span style="font-size: 0.8em; opacity: 0.8; margin-left: 10px;">(🕒 ${currentRecord.startTime} - ${currentRecord.endTime})</span>`;
    } else {
        timeContainer.textContent = Utils.formatDate(currentRecord.date);
    }

    const contentContainer = document.getElementById('recordContent');
    const paragraphs = currentRecord.content.split('\n').filter(p => p.trim());
    contentContainer.innerHTML = paragraphs
        .map(p => `<p>${Utils.escapeHtml(p)}</p>`)
        .join('');

    document.getElementById('createdAt').textContent = Utils.formatRelativeTime(currentRecord.createdAt);

    if (currentRecord.updatedAt) {
        document.getElementById('updatedAtContainer').style.display = 'flex';
        document.getElementById('updatedAt').textContent = Utils.formatRelativeTime(currentRecord.updatedAt);
    }

}

// ===================================
// 留言功能
// ===================================

let currentUserId = null;

async function loadComments() {
    try {
        const me = await ApiClient.getMe();
        currentUserId = me.id;
        const { comments } = await ApiClient.getComments(currentRecordId);
        renderComments(comments);
    } catch (e) {
        console.error('載入留言失敗', e);
    }
}

function renderComments(comments) {
    const list = document.getElementById('commentsList');
    if (comments.length === 0) {
        list.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.85rem;">目前還沒有留言</p>';
        return;
    }
    list.innerHTML = comments.map(c => {
        const isOwn = c.user_id === currentUserId;
        const time = c.updatedAt
            ? `${Utils.formatRelativeTime(c.createdAt)} (已編輯)`
            : Utils.formatRelativeTime(c.createdAt);
        return `
        <div id="comment-${c.id}" style="padding: 0.75rem; background: var(--color-bg-secondary);
             border-radius: 8px; margin-bottom: 0.75rem; border: 1px solid var(--color-border);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="font-size: 0.8rem; font-weight: 600; color: var(--color-primary);">${Utils.escapeHtml(c.user_email)}</span>
                <span style="font-size: 0.75rem; color: var(--color-text-muted);">${time}</span>
            </div>
            <div class="comment-content" style="font-size: 0.9rem; color: var(--color-text-primary); white-space: pre-wrap;">${Utils.escapeHtml(c.content)}</div>
            ${isOwn ? `
            <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
                <button onclick="startEditComment('${c.id}', ${JSON.stringify(c.content).replace(/'/g, "&#39;")})"
                    style="font-size: 0.75rem; padding: 2px 10px; background: transparent;
                           border: 1px solid var(--color-border); border-radius: 6px;
                           color: var(--color-text-secondary); cursor: pointer;">編輯</button>
                <button onclick="confirmDeleteComment('${c.id}')"
                    style="font-size: 0.75rem; padding: 2px 10px; background: transparent;
                           border: 1px solid #fca5a5; border-radius: 6px;
                           color: #dc2626; cursor: pointer;">刪除</button>
            </div>` : ''}
        </div>`;
    }).join('');
}

function startEditComment(commentId, originalContent) {
    const el = document.getElementById(`comment-${commentId}`);
    const contentDiv = el.querySelector('.comment-content');
    contentDiv.innerHTML = `
        <textarea style="width: 100%; padding: 0.5rem; background: var(--color-bg-primary);
                         border: 1px solid var(--color-primary); border-radius: 6px;
                         font-size: 0.9rem; font-family: var(--font-family); resize: vertical;
                         box-sizing: border-box; min-height: 60px;">${Utils.escapeHtml(originalContent)}</textarea>
        <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
            <button onclick="submitEditComment('${commentId}', this)"
                style="font-size: 0.75rem; padding: 2px 10px; background: var(--color-primary);
                       border: none; border-radius: 6px; color: white; cursor: pointer;">儲存</button>
            <button onclick="loadComments()"
                style="font-size: 0.75rem; padding: 2px 10px; background: transparent;
                       border: 1px solid var(--color-border); border-radius: 6px;
                       color: var(--color-text-secondary); cursor: pointer;">取消</button>
        </div>`;
    el.querySelector('.comment-content textarea').focus();
}

async function submitEditComment(commentId, btn) {
    const el = document.getElementById(`comment-${commentId}`);
    const content = el.querySelector('textarea').value.trim();
    if (!content) return;
    btn.disabled = true;
    try {
        await ApiClient.updateComment(commentId, content);
        await loadComments();
    } catch (e) {
        Utils.showNotification('❌ 編輯失敗：' + e.message, 'error');
        btn.disabled = false;
    }
}

async function confirmDeleteComment(commentId) {
    if (!Utils.confirm('確定要刪除這則留言嗎？')) return;
    try {
        await ApiClient.deleteComment(commentId);
        await loadComments();
    } catch (e) {
        Utils.showNotification('❌ 刪除失敗：' + e.message, 'error');
    }
}

async function addComment() {
    const btn = document.getElementById('addCommentBtn');
    const input = document.getElementById('commentInput');
    const content = input.value.trim();
    if (!content) return;
    btn.disabled = true;
    btn.textContent = '送出中...';
    try {
        await ApiClient.addComment(currentRecordId, content);
        input.value = '';
        await loadComments();
    } catch (e) {
        Utils.showNotification('❌ 送出失敗：' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '送出';
    }
}

async function loadAdjacentRecords() {
    try {
        const { prev, next } = await ApiClient.getAdjacentRecords(currentRecordId);

        if (prev) {
            const prevLink = document.getElementById('prevRecord');
            prevLink.href = `record-detail.html?id=${prev.id}`;
            prevLink.querySelector('.nav-title').textContent = prev.title;
            prevLink.style.display = 'block';
        }

        if (next) {
            const nextLink = document.getElementById('nextRecord');
            nextLink.href = `record-detail.html?id=${next.id}`;
            nextLink.querySelector('.nav-title').textContent = next.title;
            nextLink.style.display = 'block';
        }
    } catch (e) {
        console.error('載入相鄰紀錄失敗', e);
    }
}

// ===================================
// 操作功能
// ===================================

function editRecord() {
    window.location.href = `add-record.html?id=${currentRecordId}`;
}

async function deleteRecord() {
    if (!Utils.confirm(`確定要刪除「${currentRecord.title}」嗎？\n此操作無法復原！`)) return;

    try {
        await ApiClient.deleteRecord(currentRecordId);
        window.location.href = 'index.html';
    } catch (e) {
        Utils.showNotification('❌ 刪除失敗：' + e.message, 'error');
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
    document.getElementById('addCommentBtn').addEventListener('click', addComment);
    document.getElementById('commentInput').addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') addComment();
    });

document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            if (!Auth.isViewer) editRecord();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
            e.preventDefault();
            if (!Auth.isViewer) deleteRecord();
        }
        if (e.key === 'Escape') {
            window.location.href = 'index.html';
        }
    });
}
