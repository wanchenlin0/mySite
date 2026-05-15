class PDFExporter {
    constructor() {
        this.llmService = new LLMService();
        // Uses window.print() for best Chinese character support without custom fonts
    }

    async exportWeeklyReport(record) {
        // 1. 先讓使用者選日期範圍
        const range = await this.showDateRangePicker(new Date(record.date));
        if (!range) return; // 使用者取消

        try {
            const { startDate, endDate } = range;
            const records = await this.getRecordsForRange(startDate, endDate);

            if (records.length === 0) {
                Utils.showNotification('選取的日期範圍內沒有紀錄', 'error');
                return;
            }

            // 2. Batch Summarize with Parallel Requests
            const recordsWithSummary = await Promise.all(records.map(async (rec) => {
                let summary = "";
                try {
                    const result = await this.llmService.summarize(rec.content);
                    summary = (result && result.trim().length > 0)
                        ? result
                        : "（本週無具體開發實作事項）";
                } catch (e) {
                    console.error(`摘要失敗 (ID: ${rec.id}):`, e);
                    // 摘要失敗時，將原始內容轉成條列式
                    summary = rec.content
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => line.length > 0)
                        .map(line => `• ${line}`)
                        .join('\n');
                }
                return {
                    ...rec,
                    summary: summary.replace(/\n\s*\n/g, '\n').trim()
                };
            }));

            // Sort by date ascending for the table
            recordsWithSummary.sort((a, b) => new Date(a.date) - new Date(b.date));

            // 3. Create Print View
            this.printRecord(recordsWithSummary, startDate);

        } catch (error) {
            console.error(error);
            Utils.showNotification('匯出失敗', 'error');
        }
    }

    showDateRangePicker(defaultDate) {
        return new Promise((resolve) => {
            // 預設為所在週的週一到週日
            const d = new Date(defaultDate);
            const day = d.getDay() || 7;
            const monday = new Date(d);
            monday.setDate(d.getDate() - (day - 1));
            monday.setHours(0, 0, 0, 0);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);

            const fmt = (date) => date.toISOString().split('T')[0];

            const overlay = document.createElement('div');
            Object.assign(overlay.style, {
                position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
                backgroundColor: 'rgba(0,0,0,0.7)', zIndex: '99999',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(5px)',
            });

            overlay.innerHTML = `
                <div style="background: #1e1e2e; border: 1px solid rgba(255,255,255,0.15); border-radius: 16px;
                            padding: 2rem; width: 340px; color: #e0e0e0; font-family: sans-serif;">
                    <h3 style="margin: 0 0 1.2rem; font-size: 1.1rem; color: #fff;">選擇匯出日期範圍</h3>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-size: 0.85rem; color: #aaa; margin-bottom: 0.4rem;">開始日期</label>
                        <input type="date" id="pdf-start-date" value="${fmt(monday)}"
                            style="width: 100%; padding: 0.6rem 0.8rem; background: rgba(255,255,255,0.07);
                                   border: 1px solid rgba(255,255,255,0.15); border-radius: 8px;
                                   color: #e0e0e0; font-size: 0.95rem; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; font-size: 0.85rem; color: #aaa; margin-bottom: 0.4rem;">結束日期</label>
                        <input type="date" id="pdf-end-date" value="${fmt(sunday)}"
                            style="width: 100%; padding: 0.6rem 0.8rem; background: rgba(255,255,255,0.07);
                                   border: 1px solid rgba(255,255,255,0.15); border-radius: 8px;
                                   color: #e0e0e0; font-size: 0.95rem; box-sizing: border-box;">
                    </div>
                    <div style="display: flex; gap: 0.75rem;">
                        <button id="pdf-range-cancel"
                            style="flex: 1; padding: 0.7rem; background: transparent;
                                   border: 1px solid rgba(255,255,255,0.2); border-radius: 10px;
                                   color: #aaa; cursor: pointer; font-size: 0.95rem;">取消</button>
                        <button id="pdf-range-confirm"
                            style="flex: 2; padding: 0.7rem;
                                   background: linear-gradient(135deg, #667eea, #764ba2);
                                   border: none; border-radius: 10px;
                                   color: #fff; font-weight: 600; cursor: pointer; font-size: 0.95rem;">產生 PDF</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            overlay.querySelector('#pdf-range-cancel').onclick = () => {
                document.body.removeChild(overlay);
                resolve(null);
            };

            overlay.querySelector('#pdf-range-confirm').onclick = () => {
                const startVal = overlay.querySelector('#pdf-start-date').value;
                const endVal = overlay.querySelector('#pdf-end-date').value;
                if (!startVal || !endVal) return;
                document.body.removeChild(overlay);
                resolve({
                    startDate: new Date(startVal + 'T00:00:00'),
                    endDate: new Date(endVal + 'T23:59:59'),
                });
            };
        });
    }

    async getRecordsForRange(startDate, endDate) {
        const data = await ApiClient.getAllRecords();
        const allRecords = (data.records || []).filter(r => {
            const rd = new Date(r.date);
            return rd >= startDate && rd <= endDate;
        });

        // 為每筆紀錄附加留言
        await Promise.all(allRecords.map(async (r) => {
            try {
                const { comments } = await ApiClient.getComments(r.id);
                r.feedback = comments.map(c => c.content).join('\n');
            } catch (e) {
                r.feedback = '';
            }
        }));

        return allRecords;
    }

    summaryToHtml(text) {
        const items = text.split('\n')
            .map(line => line.replace(/^[-•]\s*/, '').trim())
            .filter(line => line.length > 0)
            .map(line => `<li>${Utils.escapeHtml(line)}</li>`)
            .join('');
        return `<ul style="margin: 0; padding-left: 16px; font-size: 13px; line-height: 1.6;">${items}</ul>`;
    }

    printRecord(records, refDate) {
        // Prepare data
        const year = refDate.getFullYear();
        const month = refDate.getMonth() + 1;

        // Calculate Total Hours (Assuming 8 hours per record)
        // Calculate Total Hours & Generate Rows
        let totalHours = 0;
        const hourlyRate = 200;

        const rowsHtml = records.map(r => {
            // Default times if not present
            const startTime = r.startTime || '09:00';
            const endTime = r.endTime || '18:00';

            // Calculate duration in hours
            const start = parseInt(startTime.split(':')[0]) + parseInt(startTime.split(':')[1]) / 60;
            const end = parseInt(endTime.split(':')[0]) + parseInt(endTime.split(':')[1]) / 60;
            const duration = Math.max(0, end - start);

            // Deduction Rule: If duration > 4 hours, deduct 1 hour (lunch break)
            const billableHours = duration > 4 ? duration - 1 : duration;

            totalHours += billableHours;

            return `
             <tr>
                <td style="padding: 8px; border: 1px solid #000; text-align: center;">${new Date(r.date).getMonth() + 1}/${new Date(r.date).getDate()}</td>
                <td style="padding: 8px; border: 1px solid #000; text-align: center;">${this.getWeekday(r.date)}</td>
                <td style="padding: 8px; border: 1px solid #000; text-align: center;">${startTime}</td>
                <td style="padding: 8px; border: 1px solid #000; text-align: center;">${endTime}</td>
                <td style="padding: 8px; border: 1px solid #000; text-align: center;">${billableHours}</td>
                <td class="summary-cell" style="padding: 8px; border: 1px solid #000; text-align: left; vertical-align: top;">${this.summaryToHtml(r.summary)}</td>
                <td style="padding: 8px; border: 1px solid #000; vertical-align: top; white-space: pre-wrap; line-height: 1.4;">${Utils.escapeHtml(r.feedback || '')}</td>
            </tr>
        `}).join('');

        // Fill empty rows to make table look complete (min 5 rows)
        const rowsNeeded = Math.max(0, 5 - records.length);
        const emptyRowsHtml = Array(rowsNeeded).fill('').map(() => `
            <tr>
                <td style="padding: 8px; border: 1px solid #000;"></td>
                <td style="padding: 8px; border: 1px solid #000;"></td>
                <td style="padding: 8px; border: 1px solid #000;"></td>
                <td style="padding: 8px; border: 1px solid #000;"></td>
                <td style="padding: 8px; border: 1px solid #000;"></td>
                <td style="padding: 8px; border: 1px solid #000;"></td>
                <td style="padding: 8px; border: 1px solid #000;"></td>
            </tr>
        `).join('');

        const printContent = `
            <div class="print-container" style="font-family: 'BiauKai', 'DFKai-SB', serif; padding: 5px 30px; color: #000; width: 100%; box-sizing: border-box; background: white;">
                
                <!-- 頁首 (Image-based Letterhead) Legacy Style -->
                <div style="width: 100%; margin-bottom: 0px;">
                    <img src="頁首.png" style="width: 100%; height: auto;" alt="eLAND Letterhead">
                </div>

                <h2 style="text-align: center; margin-bottom: 10px; font-size: 24px; letter-spacing: 2px;">實習生工時記錄表（每週）</h2>
                
                <div style="margin-bottom: 10px; font-size: 15px;">
                  <table style="width: 100%;">
                    <tr>
                      <td style="padding: 2px 0;"><strong>月份</strong>：${year}年${month}月</td>
                      <td style="padding: 2px 0;"><strong>實習部門</strong>：產品研發二部</td>
                      <td style="padding: 2px 0;"><strong>實習生姓名</strong>：林婉蓁</td>
                    </tr>
                  </table>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; table-layout: fixed;">
                    <colgroup>
                        <col style="width: 11%;"> <!-- 日期 -->
                        <col style="width: 6%;">  <!-- 星期 -->
                        <col style="width: 9%;">  <!-- 起時 -->
                        <col style="width: 9%;">  <!-- 迄時 -->
                        <col style="width: 5%;">  <!-- 時數 -->
                        <col style="width: 30%;"> <!-- 摘要 -->
                        <col style="width: 30%;"> <!-- 回饋 -->
                    </colgroup>
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
                        ${rowsHtml}
                        ${emptyRowsHtml}
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000; text-align: center; font-weight: bold;">合計</td>
                            <td colspan="6" style="padding: 8px; border: 1px solid #000; text-align: center;">${totalHours} 小時 (本週)</td>
                        </tr>
                         <tr>
                            <td style="padding: 8px; border: 1px solid #000; text-align: center; font-weight: bold;">金額</td>
                             <td colspan="6" style="padding: 8px; border: 1px solid #000; text-align: center;"></td>
                        </tr>

                        <!-- Signature Section (Integrated) -->
                        <tr>
                            <td colspan="7" style="padding: 0; border: 1px solid #000;">
                                <table style="width: 100%; border-collapse: collapse; border: none; margin: 0; text-align: center; table-layout: fixed;">
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
                                            <td style="padding: 8px; border-right: 1px solid #000; height: 60px; vertical-align: bottom;"></td>
                                            <td style="padding: 8px; border-right: 1px solid #000; height: 60px; vertical-align: bottom;"></td>
                                            <td style="padding: 8px; border-right: 1px solid #000; height: 60px; vertical-align: bottom;"></td>
                                            <td style="padding: 8px; height: 60px; vertical-align: bottom;"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
                 
                <div class="notes" style="font-size: 12px; color: #666; border-top: 1px solid #ccc; padding-top: 10px;">
                    <p><strong>注意事項</strong>：<br>
                    1. 每週一繳交上一週工時記錄表。<br>
                    2. 逾期繳交者，於次月再行補發上月之工讀金。<br>
                    3. 經主管同意可遠端工作，工作起訖時間不包含用餐，為實際工時。<br>
                    4. 工時核對以系統出勤打卡為準據。</p>
                </div>
            </div>
        `;

        // --- Overlay UI Implementation ---

        // 1. Create Overlay
        const overlay = document.createElement('div');
        overlay.id = 'pdfPreviewOverlay';
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.85)', zIndex: '99999',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            overflowY: 'auto', backdropFilter: 'blur(5px)'
        });

        // 2. Print Specific Styles (Hide Overlay background, show content)
        const printStyle = document.createElement('style');
        printStyle.id = 'pdf-export-style';
        printStyle.innerHTML = `
            @page {
                size: A4;
                margin: 0.4cm;
            }
            @media print {
                body > * { display: none !important; }
                #pdfPreviewOverlay { 
                    position: absolute !important; top: 0 !important; left: 0 !important;
                    width: 100% !important; height: auto !important;
                    background: white !important; z-index: 99999 !important;
                    display: block !important; overflow: visible !important;
                }
                #pdfPreviewOverlay .toolbar { display: none !important; }
                #pdfPreviewOverlay .a4-container {
                    box-shadow: none !important; margin: 0 !important;
                    width: 100% !important; height: auto !important;
                }
            }
        `;
        document.head.appendChild(printStyle);

        // 3. Toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'toolbar';
        Object.assign(toolbar.style, {
            position: 'sticky', top: '30px', zIndex: '100000',
            display: 'flex', gap: '20px', padding: '12px 30px',
            backgroundColor: 'white', borderRadius: '50px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', marginBottom: '30px', marginTop: '30px'
        });

        // Print Button
        const printBtn = document.createElement('button');
        printBtn.innerHTML = '🖨️ 列印 / 另存 PDF';
        // Add styling... 
        Object.assign(printBtn.style, {
            padding: '10px 25px', border: 'none', borderRadius: '25px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            color: 'white', fontWeight: 'bold', cursor: 'pointer'
        });
        printBtn.onclick = () => window.print();

        toolbar.appendChild(printBtn);
        overlay.appendChild(toolbar);

        // 4. Content Container
        const container = document.createElement('div');
        container.id = 'a4-container'; // ID for click checking
        container.className = 'a4-container';
        container.innerHTML = printContent; // The generated A4 HTML
        Object.assign(container.style, {
            width: '210mm', minHeight: '297mm', padding: '20px',
            backgroundColor: '#ffffff', boxShadow: '0 0 30px rgba(0,0,0,0.5)',
            marginBottom: '50px', flexShrink: '0', boxSizing: 'border-box', height: 'auto'
        });
        overlay.appendChild(container);

        // 5. Click Backdrop to Close
        overlay.addEventListener('click', (e) => {
            // Close if clicking overlay directly or toolbar (but not buttons? toolbar takes full width? no, flex)
            // Ideally only close if not clicking printBtn or container
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                const style = document.getElementById('pdf-export-style');
                if (style) style.remove();
            }
        });

        // 5. Show
        document.body.appendChild(overlay);
    }

    getWeekday(dateString) {
        const date = new Date(dateString);
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        return weekdays[date.getDay()];
    }
}
