// ===================================
// 全域變數
// ===================================

let allRecords = [];
let currentSort = 'date-desc';
const INTERNSHIP_TARGET_HOURS = 324;

function parseHourMinute(value, fallback) {
  const raw = (value || fallback || '').trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function calculateRecordHours(record) {
  const startMinutes = parseHourMinute(record.startTime, '09:00');
  const endMinutes = parseHourMinute(record.endTime, '18:00');
  if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
    return 0;
  }
  return (endMinutes - startMinutes) / 60;
}

function updateHoursProgress(records) {
  const totalHours = records.reduce((sum, record) => sum + calculateRecordHours(record), 0);
  const roundedHours = Math.round(totalHours * 10) / 10;
  const progress = INTERNSHIP_TARGET_HOURS > 0
    ? Math.min((roundedHours / INTERNSHIP_TARGET_HOURS) * 100, 100)
    : 0;
  const remaining = Math.max(INTERNSHIP_TARGET_HOURS - roundedHours, 0);

  const textEl = document.getElementById('internshipHoursText');
  const subtextEl = document.getElementById('internshipHoursSubtext');
  const barEl = document.getElementById('internshipHoursBar');
  if (!textEl || !subtextEl || !barEl) return;

  textEl.textContent = `${roundedHours} / ${INTERNSHIP_TARGET_HOURS} 小時`;
  subtextEl.textContent = remaining > 0
    ? `目前完成 ${progress.toFixed(1)}%，距離目標還差 ${Math.round(remaining * 10) / 10} 小時`
    : '已達成 324 小時目標';
  barEl.style.width = `${progress}%`;
}

// ===================================
// 初始化
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
  const ok = await Auth.init();
  if (!ok) return; // 未登入，Auth.init 會自動跳轉

  if (Auth.isViewer) {
    ['navAddBtn', 'fabAddBtn', 'emptyAddBtn'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  await loadProfile();
  await loadRecords();
  setupEventListeners();
});

// ===================================
// 個人資料管理
// ===================================

async function loadProfile() {
  try {
    const { profile } = await ApiClient.getProfile();
    renderProfile(profile);
  } catch (e) {
    console.error('載入個人資料失敗', e);
  }
}

function renderProfile(profile) {
  document.getElementById('profileName').textContent = profile.name;
  document.getElementById('profileCompany').textContent = profile.company;
  document.getElementById('profilePosition').textContent = profile.position;
  document.getElementById('profileInterests').textContent = profile.interests || '尚無興趣';

  const linksContainer = document.getElementById('profileLinks');
  linksContainer.innerHTML = '';
  if (profile.email) {
    linksContainer.innerHTML += `<a href="mailto:${profile.email}" class="profile-link" title="Email">📧</a>`;
  }
  if (profile.github) {
    linksContainer.innerHTML += `<a href="${Utils.escapeHtml(profile.github)}" class="profile-link" target="_blank" title="GitHub">💻 GitHub</a>`;
  }
  if (profile.linkedin) {
    linksContainer.innerHTML += `<a href="${Utils.escapeHtml(profile.linkedin)}" class="profile-link" target="_blank" title="LinkedIn">💼 LinkedIn</a>`;
  }
}

async function openProfileModal() {
  try {
    const { profile } = await ApiClient.getProfile();
    document.getElementById('inputName').value = profile.name;
    document.getElementById('inputCompany').value = profile.company;
    document.getElementById('inputPosition').value = profile.position;
    document.getElementById('inputInterests').value = profile.interests || '';
    document.getElementById('inputEmail').value = profile.email || '';
    document.getElementById('inputGithub').value = profile.github || '';
    document.getElementById('inputLinkedin').value = profile.linkedin || '';
    document.getElementById('profileModal').classList.add('active');
  } catch (e) {
    Utils.showNotification('載入個人資料失敗', 'error');
  }
}

function closeProfileModal() {
  document.getElementById('profileModal').classList.remove('active');
}

async function saveProfile(event) {
  event.preventDefault();
  const profile = {
    name: document.getElementById('inputName').value,
    company: document.getElementById('inputCompany').value,
    position: document.getElementById('inputPosition').value,
    interests: document.getElementById('inputInterests').value,
    email: document.getElementById('inputEmail').value,
    github: document.getElementById('inputGithub').value,
    linkedin: document.getElementById('inputLinkedin').value
  };

  try {
    const { profile: updated } = await ApiClient.saveProfile(profile);
    renderProfile(updated);
    closeProfileModal();
  } catch (e) {
    Utils.showNotification('儲存失敗：' + e.message, 'error');
  }
}

// ===================================
// 列表渲染
// ===================================

async function loadRecords(search = '') {
  try {
    const { records } = await ApiClient.getAllRecords(currentSort, search);
    allRecords = records;
    renderRecords(allRecords);
    updateStatistics(allRecords);
    updateHoursProgress(allRecords);
  } catch (e) {
    Utils.showNotification('載入紀錄失敗', 'error');
  }
}

function renderRecords(records) {
  const container = document.getElementById('recordsContainer');

  if (records.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p>目前沒有紀錄</p>
        <p style="color: var(--color-text-muted); margin-top: 0.5rem;">點擊下方按鈕開始您的第一筆紀錄！</p>
        <a href="add-record.html" class="btn btn-primary" style="margin-top: var(--spacing-md);">+ 新增第一筆</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="timeline">
      ${records.map((record, index) => createRecordCard(record, index)).join('')}
    </div>
  `;
}

function createRecordCard(record, index) {
  const tagsHTML = record.tags && record.tags.length > 0
    ? `<div class="timeline-tags">
        ${record.tags.map(tag => `<span class="tag">${Utils.escapeHtml(tag)}</span>`).join('')}
      </div>`
    : '';

  const commentBadge = record.hasCommented
    ? `<span style="display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.55rem; border-radius: 999px; background: rgba(59, 130, 246, 0.12); color: #1d4ed8; font-size: 0.75rem; font-weight: 700;">已留言</span>`
    : '';

  const excerpt = Utils.getExcerpt(record.content, 150);
  const timeInfo = (record.startTime && record.endTime)
    ? `🕒 ${record.startTime} - ${record.endTime}`
    : `🕒 09:00 - 18:00 (預設)`;

  return `
    <div class="timeline-item" style="animation-delay: ${index * 0.1}s">
      <div class="timeline-marker"></div>
      <div class="glass-card timeline-content record-card" onclick="window.location.href='record-detail.html?id=${record.id}'">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.4rem;">
          <div class="timeline-date" style="margin-bottom: 0;">${Utils.formatDate(record.date)}</div>
          ${commentBadge}
        </div>
        <h3 class="timeline-title">${Utils.escapeHtml(record.title)}</h3>
        <p class="timeline-description">${excerpt}</p>
        ${tagsHTML}
        <div class="record-meta">
          <span class="record-time">${timeInfo}</span>
          <span class="record-link">查看更多 →</span>
        </div>
      </div>
    </div>
  `;
}

// ===================================
// 搜尋功能
// ===================================

let searchTimeout;

function handleSearch(event) {
  const query = event.target.value;
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    if (query.trim()) {
      try {
        const { records } = await ApiClient.getAllRecords(currentSort, query);
        renderRecords(records);
        showSearchResults(records, query);
      } catch (e) {
        console.error('搜尋失敗', e);
      }
    } else {
      await loadRecords();
      hideSearchResults();
    }
  }, 300);
}

function showSearchResults(results, query) {
  const resultsContainer = document.getElementById('searchResults');
  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <div class="search-result-item">
        <p style="color: var(--color-text-muted);">找不到相關紀錄</p>
      </div>
    `;
  } else {
    resultsContainer.innerHTML = results.slice(0, 5).map(record => `
      <a href="record-detail.html?id=${record.id}" class="search-result-item">
        <div class="search-result-title">${Utils.highlightText(record.title, query)}</div>
        <div class="search-result-excerpt">${Utils.getExcerpt(record.content, 60)}</div>
      </a>
    `).join('');
  }
  resultsContainer.classList.add('active');
}

function hideSearchResults() {
  document.getElementById('searchResults').classList.remove('active');
}

// ===================================
// 統計數據
// ===================================

function updateStatistics(records) {
  document.getElementById('totalRecords').textContent = records.length;

  const allTags = new Set();
  records.forEach(record => {
    if (record.tags) record.tags.forEach(tag => allTags.add(tag));
  });
  document.getElementById('totalTags').textContent = allTags.size;

  if (records.length > 0) {
    const dates = records.map(r => new Date(r.date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const dayCount = Math.floor((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
    document.getElementById('dayCount').textContent = dayCount;
  } else {
    document.getElementById('dayCount').textContent = 0;
  }
}

// ===================================
// 事件監聽
// ===================================

function setupEventListeners() {
  const editProfileBtn = document.getElementById('editProfileBtn');
  if (editProfileBtn) editProfileBtn.addEventListener('click', openProfileModal);

  const closeModalBtn = document.getElementById('closeModalBtn');
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeProfileModal);

  const cancelProfileBtn = document.getElementById('cancelProfileBtn');
  if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', closeProfileModal);

  document.getElementById('profileForm').addEventListener('submit', saveProfile);

  document.getElementById('profileModal').addEventListener('click', (e) => {
    if (e.target.id === 'profileModal') closeProfileModal();
  });

  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', handleSearch);
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) {
      document.getElementById('searchResults').classList.add('active');
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) hideSearchResults();
  });

  document.getElementById('sortSelect').addEventListener('change', (e) => {
    currentSort = e.target.value;
    loadRecords();
  });

  document.getElementById('exportPdfBtn').addEventListener('click', startPDFExport);

  // 登出按鈕（若有）
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => Auth.logout());
}

// ===================================
// PDF 匯出功能
// ===================================

async function startPDFExport() {
  const btn = document.getElementById('exportPdfBtn');
  const pdfExporter = new PDFExporter();

  let targetDate = new Date();
  if (allRecords.length > 0) {
    const sorted = [...allRecords].sort((a, b) => new Date(b.date) - new Date(a.date));
    targetDate = new Date(sorted[0].date);
  }

  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ 處理中...';
  btn.disabled = true;

  try {
    await pdfExporter.exportWeeklyReport({ date: targetDate });
  } catch (error) {
    console.error(error);
    Utils.showNotification('匯出失敗: ' + error.message, 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}
