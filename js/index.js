// ===================================
// 全域變數
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
  document.getElementById('profileInterests').textContent = profile.interests || '尚無興趣';

  // 顯示連結
  const linksContainer = document.getElementById('profileLinks');
  linksContainer.innerHTML = '';

  if (profile.email) {
    linksContainer.innerHTML += `<a href="mailto:${profile.email}" class="profile-link" title="Email">📧</a>`;
  }
  if (profile.github) {
    linksContainer.innerHTML += `<a href="${profile.github}" class="profile-link" target="_blank" title="GitHub">💻 GitHub</a>`;
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
// 列表渲染
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
        <div class="empty-state-icon">📝</div>
        <p>目前沒有紀錄</p>
        <p style="color: var(--color-text-muted); margin-top: 0.5rem;">點擊下方按鈕開始您的第一筆紀錄！</p>
        <a href="add-record.html" class="btn btn-primary" style="margin-top: var(--spacing-md);">+ 新增第一筆</a>
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

  // 時間顯示：顯示建立與更新時間
  const timeInfo = record.updatedAt
    ? `📅 建立於：${Utils.formatRelativeTime(record.createdAt)}<br>🔄 更新於：${Utils.formatRelativeTime(record.updatedAt)}`
    : `📅 建立於：${Utils.formatRelativeTime(record.createdAt)}`;

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
// 事件監聽
// ===================================

function setupEventListeners() {
  // 個人資料編輯
  document.getElementById('editProfileBtn').addEventListener('click', openProfileModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeProfileModal);
  document.getElementById('cancelProfileBtn').addEventListener('click', closeProfileModal);
  document.getElementById('profileForm').addEventListener('submit', saveProfile);

  // 點擊 modal 外部關閉
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

  // 點擊外部關閉搜尋結果
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

  // 匯出 PDF
  document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
}

// ===================================
// PDF 匯出功能
// ===================================

function exportToPDF() {
  // 檢查套件是否已載入
  if (typeof html2pdf === 'undefined') {
    Utils.showNotification('❌ PDF 工具未載入，請確認網路連線', 'error');
    console.error('html2pdf library not found');
    return;
  }

  const btn = document.getElementById('exportPdfBtn');
  const records = dataManager.getAllRecords();

  if (records.length === 0) {
    Utils.showNotification('❌ 沒有可匯出的紀錄', 'error');
    return;
  }

  // 更改按鈕狀態
  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ 處理中...';
  btn.disabled = true;

  // 準備數據：按日期排序
  records.sort((a, b) => new Date(a.date) - new Date(b.date));

  // 計算總時數
  let totalHours = 0;
  const hourlyRate = 200; // 時薪設定

  const tableRows = records.map(record => {
    // 計算單日工時
    let hours = 0;
    if (record.startTime && record.endTime) {
      const start = new Date(`2000-01-01T${record.startTime}`);
      const end = new Date(`2000-01-01T${record.endTime}`);
      const diff = (end - start) / (1000 * 60 * 60); // 小時
      hours = diff > 0 ? diff : 0;
      totalHours += hours;
    }

    // 格式化日期與星期
    const dateObj = new Date(record.date);
    const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[dateObj.getDay()];

    return `
      <tr>
        <td style="padding: 8px; border: 1px solid #000; text-align: center;">${dateStr}</td>
        <td style="padding: 8px; border: 1px solid #000; text-align: center;">${weekday}</td>
        <td style="padding: 8px; border: 1px solid #000; text-align: center;">${record.startTime || '-'}</td>
        <td style="padding: 8px; border: 1px solid #000; text-align: center;">${record.endTime || '-'}</td>
        <td style="padding: 8px; border: 1px solid #000; text-align: center;">${hours > 0 ? hours.toFixed(1) : '-'}</td>
        <td style="padding: 8px; border: 1px solid #000;">${record.title}</td>
        <td style="padding: 8px; border: 1px solid #000;">
          <br><br>
        </td> <!-- 主管回饋欄位預留空間 -->
      </tr>
    `;
  }).join('');

  // 計算總金額
  const totalAmount = Math.round(totalHours * hourlyRate);

  // 建立 PDF 內容 HTML
  const profile = dataManager.getProfile();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const department = '產品研發二部'; // 預設部門
  const name = '林婉蓁'; // 預設姓名

  // 如果 Profile 有填，優先使用 Profile，否則用預設值
  const displayDepartment = profile.position !== '實習職位' ? profile.position : department;
  const displayName = profile.name !== '您的姓名' ? profile.name : name;

  const exportHTML = `
    <div style="font-family: 'BiauKai', 'DFKai-SB', serif; padding: 40px; color: #000; width: 100%; box-sizing: border-box;">
      
      <!-- 頁首 (Image-based Letterhead) -->
      <div style="width: 100%; margin-bottom: 20px;">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAArwAAABLCAYAAACSslTLAAAAAXNSR0IArs4c6QAAIABJREFUeF7t3XVcFtn7//EXIVhgY2CLRRlrKxbg2omJHSgGKiC6rrF2rLW2rh0odmEiK2BjICC4JuhaoIgizX37+903iqCg6GeXXf1e85/DzJwzzxkej7eHa87RePPmzRtkEwEREAEREAEREAEREIHvVEBDAu93+mTltkRABERABERABERABNQCEnjlRRABERABERABERABEfiuBSTwftePV25OBERABERABERABERAAq+8AyIgAiIgAiIgAiIgAt+1gATe7/rxys2JgAiIgAiIgAiIgAhI4JV3QAREQAREQAREQARE4LsWkMD7XT9euTkREAEREAEREAEREAEJvPIOiIAIiIAIiIAIiIAIfNcCEni/68crNycCIiACIiACIiACIiCBV94BERABERABERABERCB71pAAu93/Xjl5kRABERABERABERABCTwyjsgAiIgAiIgAiIgAiLwXQv8T4E3Ji6BP4JCqV+hOHlz5/iuoeTmREAEREAEREAEREAEvk2Brw68d8Mi+WW3DxPa1aNCsQLf5t1Lr0VABERABERABERABL57ga8KvP6hT+m50p153RvTzLzsd48kNygCIiACIiACIiACIvDtCnxx4L0X9gKr2W50qlmBud2bprnzxy+iiI5PwKiIjPh+u6+E9FwEREAEREAEREAEvi+BLwq88QlJtJi3k/vPX3Hhl14U0MuZouERGMKVe48Z1aImOtra35eS3I0IiIAIiIAIiIAIiMA3K/BFgXf5ics4bPFkQffGODSvmXLTBy7fZKWnH672bdJ8vJaUpEBbW+sjHKVSSXRcAtqamuTIrpMh3uu4eHxu/EVCkiLlGLOSBpQ1yJtpcIVSief1UGLiE1PO0dDQwNK4JLly6Ka5jqpf52495FlUbMr+OkbFKJw3d5rj/EKeEPrsVcq+HDraNDEuhc+NB0TFJXzUt2zamhTInYOKRfLLx32ZfnJyoAiIgAiIgAiIgAj8PQKZDryqGRkqjl2DQvmGwFn9yJ87eXQ34H44Nkv2sbKvNU1MSqf0yjMwhIJ6OTAvVVi972VMPL//4cfey7cI/OsZMQmJaGpoUDhPLuoZFaN7ncq0rGqEKhy+2248fEb96a5ExMSn7FvUvTEjU4Xt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dCBufx9KDdbg6ZMN6Qbej5/3IBJClhC0tD0/uniQd6Q3Pu3PMdT+V07cV5DXtDZFQx9heeAskyt4YGfUi5jFD9iSph7lfVNpZmnQDGb9IFsmHnuOftHCFK/RgpJ+q4lyCmZzscmpAq9qIHkElVucovvpq8yoEc/+vuXoemMkfmd+opJWAsHrB2E78RjP9YtSuHgNWpT0Y3WUE483F8vYuJrnZ/v7rfzKS+D9Vp6U9FMEREAEREAERODzAnFh3L75gCjtIpSvZEjuDNZ6yPBCijvMH7AKpw1zP9+WHPHNCEjg/WYelXRUBERABERABETgnxZQ3NnDav+q2Hco+083JdfPQgEJvFmILU2JgAiIgAiIgAiIgAhkvYAE3qw3lxZFQAREQAREQAREQASyUEACbxZiS1MiIAIiIAIiIAIiIAJZLyCBN+vNpUUREAEREAEREAEREIEsFJDAm4XY0pQIiIAIiIAIiIAIiEDWC0jgzXpzaVEEREAEREAEREAERCALBSTwZiG2NCUCIiACIiACIiACIpD1AhJ4s95cWhQBERABERABERABEchCAQm8WYgtTYmACIiACIiACIiACGS9gATerDeXFkVABERABERABERABLJQQAJvFmJLUyIgAiIgAiIgAiIgAlkvIIE3682lRREQAREQAREQAREQgSwUkMCbhdjSlAiIgAiIgAiIgAiIQNYLSODNenNpUQREQAREQAREQAREIAsF/h+yqwJM7heT5QAAAABJRU5ErkJggg==" style="width: 100%; height: auto; object-fit: contain;" alt="eLAND Letterhead">
      </div>

      <h2 style="text-align: center; margin-bottom: 25px; font-size: 24px; letter-spacing: 2px;">實習生工時記錄表（每週）</h2>
      
      <div style="margin-bottom: 20px; font-size: 15px;">
        <table style="width: 100%;">
          <tr>
            <td style="padding: 5px 0;"><strong>月份</strong>：${currentYear}年 ${currentMonth}月</td>
            <td style="padding: 5px 0;"><strong>實習部門</strong>：${displayDepartment}</td>
            <td style="padding: 5px 0;"><strong>實習生姓名</strong>：${displayName}</td>
          </tr>
        </table>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; table-layout: fixed;">
        <thead>
          <tr>
            <th rowspan="2" style="padding: 8px; border: 1px solid #000; width: 10%;">日期</th>
            <th rowspan="2" style="padding: 8px; border: 1px solid #000; width: 8%;">星期</th>
            <th colspan="2" style="padding: 8px; border: 1px solid #000; width: 24%;">工作起迄時間</th>
            <th rowspan="2" style="padding: 8px; border: 1px solid #000; width: 8%;">時數</th>
            <th colspan="2" style="padding: 8px; border: 1px solid #000; width: 50%;">工作摘要</th>
          </tr>
          <tr>
            <th style="padding: 8px; border: 1px solid #000;">起</th>
            <th style="padding: 8px; border: 1px solid #000;">迄</th>
            <th style="padding: 8px; border: 1px solid #000;">實習生說明</th>
            <th style="padding: 8px; border: 1px solid #000;">主管／指導者回饋</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
          <tr>
            <td style="padding: 8px; border: 1px solid #000; text-align: center; font-weight: bold;">合計</td>
            <td colspan="6" style="padding: 8px; border: 1px solid #000; text-align: center;">${totalHours.toFixed(1)} 小時 (本週)</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #000; text-align: center; font-weight: bold;">金額</td>
            <td colspan="6" style="padding: 8px; border: 1px solid #000; text-align: center;">${totalAmount.toLocaleString()} 元</td>
          </tr>
          <!-- 簽核欄位 (併入表格) -->
          <tr>
            <td colspan="7" style="padding: 0; border: 1px solid #000;">
              <table style="width: 100%; border-collapse: collapse; border: none; margin: 0; text-align: center;">
                <thead>
                  <tr>
                     <th style="padding: 8px; border-right: 1px solid #000; border-bottom: 1px solid #000; width: 25%;">核准</th>
                     <th style="padding: 8px; border-right: 1px solid #000; border-bottom: 1px solid #000; width: 25%;">人事單位</th>
                     <th style="padding: 8px; border-right: 1px solid #000; border-bottom: 1px solid #000; width: 25%;">直屬（部門）主管</th>
                     <th style="padding: 8px; border-bottom: 1px solid #000; width: 25%;">填表人</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 8px; border-right: 1px solid #000; height: 50px; vertical-align: bottom;"></td>
                    <td style="padding: 8px; border-right: 1px solid #000; height: 50px; vertical-align: bottom;"></td>
                    <td style="padding: 8px; border-right: 1px solid #000; height: 50px; vertical-align: bottom;"></td>
                    <td style="padding: 8px; height: 50px; vertical-align: bottom;"></td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div style="margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #ccc; padding-top: 10px;">
        <p><strong>注意事項</strong>：<br>
        1. 每週一繳交上一週工時記錄表。<br>
        2. 逾期繳交者，於次月再行補發上月之工讀金。<br>
        3. 經主管同意可遠端工作，工作起訖時間不包含用餐，為實際工時。<br>
        4. 工時核對以系統出勤打卡為準據。</p>
      </div>
    </div>
  `;

  // 建立預覽 Overlay
  const overlay = document.createElement('div');
  overlay.id = 'pdfPreviewOverlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.85)'; // 深色背景讓文件更清晰
  overlay.style.zIndex = '99999';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.overflowY = 'auto'; // 允許捲動
  overlay.style.backdropFilter = 'blur(5px)';

  // 加入列印專用樣式 (確保列印/存檔時只顯示預覽內容)
  const printStyle = document.createElement('style');
  printStyle.innerHTML = `
    @media print {
      body > * { display: none !important; } /* 隱藏所有背景 */
      #pdfPreviewOverlay { 
        display: flex !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: auto !important;
        background: white !important;
        z-index: 99999 !important;
        overflow: visible !important;
      }
      #pdfPreviewOverlay .toolbar { display: none !important; } /* 隱藏工具列 */
      #pdfPreviewOverlay .a4-container {
        display: block !important;
        margin: 0 auto !important;
        box-shadow: none !important;
        width: 210mm !important;
        height: 297mm !important;
        page-break-after: always;
      }
      @page { margin: 0; size: A4 portrait; }
    }
  `;
  document.head.appendChild(printStyle);

  // 工具列
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar'; // 方便 CSS 選取
  toolbar.style.position = 'sticky';
  toolbar.style.top = '30px';
  toolbar.style.zIndex = '100000';
  toolbar.style.display = 'flex';
  toolbar.style.gap = '20px';
  toolbar.style.padding = '12px 30px';
  toolbar.style.backgroundColor = 'white';
  toolbar.style.borderRadius = '50px';
  toolbar.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
  toolbar.style.marginBottom = '30px';
  toolbar.style.marginTop = '30px';

  // 下載按鈕 (實際上是觸發瀏覽器列印窗)
  const downloadBtn = document.createElement('button');
  downloadBtn.innerHTML = '🖨️ 列印 / 另存 PDF';
  downloadBtn.style.padding = '10px 25px';
  downloadBtn.style.border = 'none';
  downloadBtn.style.borderRadius = '25px';
  downloadBtn.style.background = 'linear-gradient(135deg, #6366f1, #a855f7)';
  downloadBtn.style.color = 'white';
  downloadBtn.style.fontWeight = 'bold';
  downloadBtn.style.fontSize = '1.1rem';
  downloadBtn.style.cursor = 'pointer';
  downloadBtn.style.transition = 'transform 0.2s, box-shadow 0.2s';
  downloadBtn.onmouseover = () => { downloadBtn.style.transform = 'translateY(-2px)'; downloadBtn.style.boxShadow = '0 5px 15px rgba(99, 102, 241, 0.4)'; };
  downloadBtn.onmouseout = () => { downloadBtn.style.transform = 'none'; downloadBtn.style.boxShadow = 'none'; };

  // 關閉按鈕
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '❌ 關閉預覽';
  closeBtn.style.padding = '10px 25px';
  closeBtn.style.border = '1px solid #ddd';
  closeBtn.style.borderRadius = '25px';
  closeBtn.style.background = '#f8f9fa';
  closeBtn.style.color = '#333';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.style.fontSize = '1.1rem';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onmouseover = () => { closeBtn.style.background = '#e9ecef'; };
  closeBtn.onmouseout = () => { closeBtn.style.background = '#f8f9fa'; };

  toolbar.appendChild(downloadBtn);
  toolbar.appendChild(closeBtn);
  overlay.appendChild(toolbar);

  // A4 容器
  const container = document.createElement('div');
  container.className = 'a4-container'; // 方便 CSS 選取
  container.innerHTML = exportHTML;
  container.style.width = '210mm';
  container.style.minHeight = '297mm'; // A4 height
  container.style.padding = '20px';
  container.style.backgroundColor = '#ffffff';
  container.style.boxShadow = '0 0 30px rgba(0,0,0,0.5)'; // 加強陰影
  container.style.marginBottom = '50px';

  overlay.appendChild(container);

  // 先把 Overlay 加入 DOM
  document.body.appendChild(overlay);

  // 恢復按鈕狀態
  btn.innerHTML = originalText;
  btn.disabled = false;

  // 關閉功能
  closeBtn.onclick = () => {
    document.body.removeChild(overlay);
    document.head.removeChild(printStyle); // 清除樣式
  };

  // 下載 (列印) 功能 - 使用原生 window.print() 以確保樣式一致
  downloadBtn.onclick = () => {
    window.print();
  };
}


