// ===================================
// Data Management
// ===================================

class InternshipRecordManager {
  constructor() {
    this.records = this.loadRecords();
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.renderRecords();
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('recordDate').value = today;
  }

  // Load records from localStorage
  loadRecords() {
    const stored = localStorage.getItem('internshipRecords');
    return stored ? JSON.parse(stored) : [];
  }

  // Save records to localStorage
  saveRecords() {
    localStorage.setItem('internshipRecords', JSON.stringify(this.records));
  }

  // Add a new record
  addRecord(record) {
    const newRecord = {
      id: Date.now().toString(),
      ...record,
      createdAt: new Date().toISOString()
    };
    
    this.records.unshift(newRecord);
    this.saveRecords();
    this.renderRecords();
    this.showNotification('✅ 紀錄新增成功！');
  }

  // Delete a record
  deleteRecord(id) {
    this.records = this.records.filter(record => record.id !== id);
    this.saveRecords();
    this.renderRecords();
    this.showNotification('🗑️ 紀錄已刪除');
  }

  // Search records
  searchRecords(query) {
    if (!query.trim()) {
      this.renderRecords();
      return;
    }

    const filtered = this.records.filter(record => {
      const searchText = `${record.title} ${record.content} ${record.tags.join(' ')}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });

    this.renderRecords(filtered);
  }

  // Setup event listeners
  setupEventListeners() {
    // Form submission
    const form = document.getElementById('addRecordForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    resetBtn.addEventListener('click', () => {
      form.reset();
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('recordDate').value = today;
    });

    // Search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
      this.searchRecords(e.target.value);
    });
  }

  // Handle form submission
  handleFormSubmit() {
    const form = document.getElementById('addRecordForm');
    const formData = new FormData(form);

    const record = {
      date: document.getElementById('recordDate').value,
      title: document.getElementById('recordTitle').value,
      content: document.getElementById('recordContent').value,
      tags: document.getElementById('recordTags').value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
    };

    this.addRecord(record);
    form.reset();
    
    // Reset date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('recordDate').value = today;

    // Scroll to records section
    document.querySelector('.records-section').scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  }

  // Render records to the DOM
  renderRecords(recordsToRender = this.records) {
    const container = document.getElementById('recordsContainer');

    if (recordsToRender.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <p>目前還沒有任何紀錄</p>
          <p style="color: var(--color-text-muted); margin-top: 0.5rem;">開始新增你的第一筆實習紀錄吧！</p>
        </div>
      `;
      return;
    }

    const timelineHTML = `
      <div class="timeline">
        ${recordsToRender.map((record, index) => this.createRecordHTML(record, index)).join('')}
      </div>
    `;

    container.innerHTML = timelineHTML;

    // Add delete event listeners
    recordsToRender.forEach(record => {
      const deleteBtn = document.getElementById(`delete-${record.id}`);
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          if (confirm('確定要刪除這筆紀錄嗎？')) {
            this.deleteRecord(record.id);
          }
        });
      }
    });
  }

  // Create HTML for a single record
  createRecordHTML(record, index) {
    const formattedDate = this.formatDate(record.date);
    const tagsHTML = record.tags.length > 0
      ? `<div class="timeline-tags">
          ${record.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>`
      : '';

    return `
      <div class="timeline-item">
        <div class="timeline-marker"></div>
        <div class="glass-card timeline-content">
          <div class="timeline-date">${formattedDate}</div>
          <h3 class="timeline-title">${this.escapeHtml(record.title)}</h3>
          <p class="timeline-description">${this.escapeHtml(record.content)}</p>
          ${tagsHTML}
          <div style="margin-top: var(--spacing-md);">
            <button 
              id="delete-${record.id}" 
              class="btn btn-secondary"
              style="font-size: var(--font-size-sm); padding: var(--spacing-xs) var(--spacing-md);"
            >
              🗑️ 刪除
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Format date to readable Chinese format
  formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[date.getDay()];
    
    return `${year}年${month}月${day}日 (週${weekday})`;
  }

  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Show notification
  showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--gradient-primary);
      color: white;
      padding: var(--spacing-md) var(--spacing-lg);
      border-radius: var(--radius-full);
      box-shadow: var(--shadow-lg);
      font-weight: 600;
      z-index: 1000;
      animation: slideInRight 0.3s ease;
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @keyframes slideOutRight {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100px);
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease forwards';
      setTimeout(() => {
        notification.remove();
        style.remove();
      }, 300);
    }, 3000);
  }
}

// ===================================
// Initialize Application
// ===================================

document.addEventListener('DOMContentLoaded', () => {
  const app = new InternshipRecordManager();
  
  // Add some sample data if no records exist (for demo purposes)
  if (app.records.length === 0) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const sampleRecords = [
      {
        date: today.toISOString().split('T')[0],
        title: '學習新技術',
        content: '今天學習了如何使用 JavaScript 開發動態網頁，並完成了一個實習紀錄系統。收穫很多！',
        tags: ['程式設計', 'JavaScript', '學習']
      },
      {
        date: yesterday.toISOString().split('T')[0],
        title: '團隊會議',
        content: '參加了第一次團隊會議，認識了所有的團隊成員，大家都很友善。主管分享了專案的目標和期望。',
        tags: ['團隊合作', '會議', '溝通']
      },
      {
        date: lastWeek.toISOString().split('T')[0],
        title: '第一天報到',
        content: '今天是實習的第一天！非常興奮也有點緊張。公司環境很好，同事們都很熱情。期待接下來的實習旅程！',
        tags: ['新開始', '報到', '第一天']
      }
    ];

    sampleRecords.forEach(record => app.addRecord(record));
  }
});
