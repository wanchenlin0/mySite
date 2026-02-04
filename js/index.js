// ===================================
// 首頁邏輯
// ===================================

const dataManager = new DataManager();
let allRecords = [];
let currentSort = 'date-desc';

// ===================================
// 初始化
// ===================================

document.addEventListener('DOMContentLoaded', () => {
  initializeSampleData();
  loadProfile();
  loadRecords();
  setupEventListeners();
  updateStatistics();
});

// ===================================
// 個人資料管理
// ===================================

function loadProfile() {
  const profile = dataManager.getProfile();

  document.getElementById('profileName').textContent = profile.name;
  document.getElementById('profileCompany').textContent = profile.company;
  document.getElementById('profilePosition').textContent = profile.position;
  document.getElementById('profileInterests').textContent = profile.interests || '尚未填寫';

  // 社群連結
  const linksContainer = document.getElementById('profileLinks');
  linksContainer.innerHTML = '';

  if (profile.email) {
    linksContainer.innerHTML += `<a href="mailto:${profile.email}" class="profile-link" title="Email">📧</a>`;
  }
  if (profile.github) {
    linksContainer.innerHTML += `<a href="${profile.github}" class="profile-link" target="_blank" title="GitHub">🔗 GitHub</a>`;
  }
  if (profile.linkedin) {
    linksContainer.innerHTML += `<a href="${profile.linkedin}" class="profile-link" target="_blank" title="LinkedIn">💼 LinkedIn</a>`;
  }
}

function openProfileModal() {
  const profile = dataManager.getProfile();

  document.getElementById('inputName').value = profile.name;
  document.getElementById('inputCompany').value = profile.company;
  document.getElementById('inputPosition').value = profile.position;
  document.getElementById('inputInterests').value = profile.interests || '';
  document.getElementById('inputEmail').value = profile.email || '';
  document.getElementById('inputGithub').value = profile.github || '';
  document.getElementById('inputLinkedin').value = profile.linkedin || '';

  document.getElementById('profileModal').classList.add('active');
}

function closeProfileModal() {
  document.getElementById('profileModal').classList.remove('active');
}

function saveProfile(event) {
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

  dataManager.saveProfile(profile);
  loadProfile();
  closeProfileModal();
  Utils.showNotification('✅ 個人資料已更新');
}

// ===================================
// 紀錄管理
// ===================================

function loadRecords() {
  allRecords = dataManager.getAllRecords();
  sortRecords();
  renderRecords(allRecords);
}

function sortRecords() {
  switch (currentSort) {
    case 'date-desc':
      allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case 'date-asc':
      allRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case 'title':
      allRecords.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }
}

function renderRecords(records) {
  const container = document.getElementById('recordsContainer');

  if (records.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>目前還沒有任何紀錄</p>
        <p style="color: var(--color-text-muted); margin-top: 0.5rem;">開始新增你的第一筆實習紀錄吧！</p>
        <a href="add-record.html" class="btn btn-primary" style="margin-top: var(--spacing-md);">+ 新增第一筆紀錄</a>
      </div>
    `;
    return;
  }

  const timelineHTML = `
    <div class="timeline">
      ${records.map((record, index) => createRecordCard(record, index)).join('')}
    </div>
  `;

  container.innerHTML = timelineHTML;
}

function createRecordCard(record, index) {
  const tagsHTML = record.tags && record.tags.length > 0
    ? `<div class="timeline-tags">
        ${record.tags.map(tag => `<span class="tag">${Utils.escapeHtml(tag)}</span>`).join('')}
      </div>`
    : '';

  const excerpt = Utils.getExcerpt(record.content, 150);

  // 時間資訊：顯示建立時間，如果有更新時間也顯示
  const timeInfo = record.updatedAt
    ? `📅 建立：${Utils.formatRelativeTime(record.createdAt)}<br>✏️ 更新：${Utils.formatRelativeTime(record.updatedAt)}`
    : `📅 建立：${Utils.formatRelativeTime(record.createdAt)}`;

  return `
    <div class="timeline-item" style="animation-delay: ${index * 0.1}s">
      <div class="timeline-marker"></div>
      <div class="glass-card timeline-content record-card" onclick="window.location.href='record-detail.html?id=${record.id}'">
        <div class="timeline-date">${Utils.formatDate(record.date)}</div>
        <h3 class="timeline-title">${Utils.escapeHtml(record.title)}</h3>
        <p class="timeline-description">${excerpt}</p>
        ${tagsHTML}
        <div class="record-meta">
          <span class="record-time">${timeInfo}</span>
          <span class="record-link">查看詳情 →</span>
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
  searchTimeout = setTimeout(() => {
    if (query.trim()) {
      const results = dataManager.searchRecords(query);
      renderRecords(results);
      showSearchResults(results, query);
    } else {
      renderRecords(allRecords);
      hideSearchResults();
    }
  }, 300);
}

function showSearchResults(results, query) {
  const resultsContainer = document.getElementById('searchResults');

  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <div class="search-result-item">
        <p style="color: var(--color-text-muted);">沒有找到相關紀錄</p>
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
// 統計資訊
// ===================================

function updateStatistics() {
  const records = dataManager.getAllRecords();

  // 總紀錄數
  document.getElementById('totalRecords').textContent = records.length;

  // 總標籤數
  const allTags = new Set();
  records.forEach(record => {
    if (record.tags) {
      record.tags.forEach(tag => allTags.add(tag));
    }
  });
  document.getElementById('totalTags').textContent = allTags.size;

  // 實習天數
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
// 事件監聽器
// ===================================

function setupEventListeners() {
  // 個人資料編輯
  document.getElementById('editProfileBtn').addEventListener('click', openProfileModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeProfileModal);
  document.getElementById('cancelProfileBtn').addEventListener('click', closeProfileModal);
  document.getElementById('profileForm').addEventListener('submit', saveProfile);

  // 點擊 modal 背景關閉
  document.getElementById('profileModal').addEventListener('click', (e) => {
    if (e.target.id === 'profileModal') {
      closeProfileModal();
    }
  });

  // 搜尋
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', handleSearch);
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) {
      document.getElementById('searchResults').classList.add('active');
    }
  });

  // 點擊外部隱藏搜尋結果
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
      hideSearchResults();
    }
  });

  // 排序
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    currentSort = e.target.value;
    loadRecords();
  });
}
