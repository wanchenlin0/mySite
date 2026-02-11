# 實習紀錄網站 v2

一個現代化、美觀的實習紀錄管理網站，採用**前後端分離架構**，每位用戶只能看到自己的實習紀錄。

## 🚀 快速開始（v2 前後端分離版）

### 1. 設定後端環境

```bash
cd backend

# 複製環境變數設定
copy .env.example .env
# 或 Linux/Mac:
# cp .env.example .env
```

編輯 `backend/.env`，填入以下設定：
```
DATABASE_URL=sqlite:///./mysite.db
JWT_SECRET=your-long-random-secret-key
OPENAI_API_KEY=sk-proj-your-openai-api-key
FRONTEND_URL=http://localhost:5500
```

### 2. 啟動後端（Windows）

```bash
cd backend
start.bat
```

或手動啟動：
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

後端啟動後：
- API 服務：`http://localhost:8000`
- Swagger 文件：`http://localhost:8000/docs`

### 3. 啟動前端

使用 VS Code Live Server（推薦）或任意靜態伺服器，開啟前端目錄。

預設連接 `http://localhost:8000`（可在 `js/api-client.js` 修改 `BASE_URL`）。

### 4. 使用方式

1. 開啟 `login.html` 進行**註冊**
2. 登入後進入個人的實習紀錄首頁
3. 如有舊的 LocalStorage 資料，登入後可點選「匯入現有資料」

---

## ✨ 功能特色

### 核心功能
- 📝 **新增紀錄** - 透過直觀的表單介面新增實習紀錄
- 📚 **時間軸展示** - 以時間軸方式展示所有實習紀錄
- 🔍 **即時搜尋** - 快速搜尋標題、內容或標籤
- 🏷️ **標籤系統** - 為紀錄添加標籤，方便分類管理
- 💾 **本地儲存** - 使用 LocalStorage 實現資料持久化
- 🗑️ **刪除功能** - 可以刪除不需要的紀錄

### 設計特色
- 🎨 **深色玻璃擬態設計** - 現代化的視覺效果
- 🌈 **動態漸層背景** - 流動的背景動畫
- ✨ **流暢微互動** - hover 效果、按鈕動畫、卡片浮起
- 📱 **完整響應式** - 支援桌面、平板和手機裝置
- 🎭 **精美動畫** - CSS 動畫打造流暢的使用體驗

## 🚀 快速開始

### 方法一：直接開啟
1. 在專案目錄中找到 `index.html`
2. 雙擊開啟或右鍵選擇瀏覽器開啟
3. 開始使用！

### 方法二：使用本地伺服器（推薦）
```bash
# 使用 npx 啟動 http-server（無需安裝）
npx -y http-server -p 8080

# 或使用 Python (Python 3)
python -m http.server 8080

# 或使用 Python (Python 2)
python -m SimpleHTTPServer 8080
```

然後在瀏覽器中開啟 `http://localhost:8080`

## 📖 使用說明

### 新增實習紀錄
1. 在頁面頂部找到「新增實習紀錄」區塊
2. 填寫以下資訊：
   - **日期**：選擇紀錄的日期（預設為今天）
   - **標題**：簡短描述這筆紀錄
   - **內容描述**：詳細記錄今天的實習經歷
   - **標籤**：添加相關標籤（多個標籤用逗號分隔）
3. 點擊「新增紀錄」按鈕
4. 紀錄會自動出現在下方的時間軸中

### 搜尋紀錄
- 在搜尋框中輸入關鍵字
- 系統會即時篩選符合的紀錄
- 搜尋範圍包含標題、內容和標籤

### 刪除紀錄
- 在每筆紀錄的底部點擊「🗑️ 刪除」按鈕
- 確認刪除後，紀錄會立即移除

## 🛠️ 技術架構

### 前端技術
- **HTML5** - 語意化標籤，SEO 最佳實踐
- **CSS3** - 變數系統、Flexbox、Grid、動畫
- **Vanilla JavaScript** - ES6+ 語法，物件導向設計

### 設計系統
- **CSS 變數** - 統一管理顏色、間距、字型
- **玻璃擬態效果** - backdrop-filter + 半透明背景
- **動態漸層** - CSS keyframe 動畫
- **響應式設計** - Mobile-first 方法

### 資料儲存
- **LocalStorage** - 瀏覽器本地儲存
- **JSON 格式** - 結構化資料管理

## 📁 專案結構

```
mySite/
├── index.html       # 主頁面 - HTML 結構
├── styles.css       # 樣式表 - 設計系統與所有樣式
├── app.js          # 應用邏輯 - JavaScript 功能
└── README.md       # 說明文件
```

## 🎨 設計規範

### 配色方案
- **主背景**：深藍黑色 (#0a0e27)
- **次要背景**：深藍色 (#151932)
- **主要漸層**：紫色到粉紅 (#667eea → #764ba2)
- **強調漸層**：粉紅到紅 (#f093fb → #f5576c)
- **文字顏色**：白色、灰色層級

### 視覺效果
- **玻璃擬態**：毛玻璃效果 + 半透明
- **動畫**：淡入、滑入、脈衝、懸停
- **陰影**：多層次陰影 + 發光效果

## 💡 特色說明

### 自動化功能
- 新增紀錄時自動設定今天的日期
- 提交後自動捲動到紀錄區域
- 顯示成功/刪除通知訊息
- 初次使用時自動載入範例資料

### 安全性
- XSS 防護 - HTML 內容轉義
- 輸入驗證 - 表單必填欄位檢查

### 用戶體驗
- 平滑捲動動畫
- 即時搜尋回饋
- 確認刪除對話框
- 空狀態提示

## 🌐 瀏覽器支援

- ✅ Chrome / Edge (Chromium) - 最新版本
- ✅ Firefox - 最新版本
- ✅ Safari - 最新版本
- ⚠️ IE11 - 不支援（backdrop-filter 等現代功能）

## 📝 資料格式

每筆紀錄的資料結構：
```javascript
{
  id: "1234567890",           // 唯一識別碼
  date: "2026-02-02",         // 日期
  title: "標題",               // 標題
  content: "內容描述",         // 內容
  tags: ["標籤1", "標籤2"],   // 標籤陣列
  createdAt: "2026-02-02T08:00:00.000Z"  // 建立時間
}
```

## 🔮 未來改進方向

- 📊 統計圖表展示
- 📤 匯出為 PDF 或 Markdown
- 🌙 淺色/深色模式切換
- 🔐 雲端同步功能
- 🖼️ 圖片上傳支援
- 📌 置頂重要紀錄
- 🎯 目標設定與追蹤

## 📄 授權

此專案為個人學習專案，可自由使用和修改。

## 🙏 致謝

- **Google Fonts** - Inter 字體
- **CSS Glassmorphism** - 玻璃擬態設計靈感
- **Modern Web Design** - 當代網頁設計最佳實踐

---

**開始記錄你的實習旅程吧！** ✨
