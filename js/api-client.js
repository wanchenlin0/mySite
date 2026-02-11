/**
 * ApiClient — 封裝所有後端 API 呼叫，取代 DataManager 的 localStorage 操作
 */
const ApiClient = {
    BASE_URL: 'https://unpickable-aurorally-floria.ngrok-free.dev',

    get accessToken() { return sessionStorage.getItem('access_token'); },
    set accessToken(val) {
        if (val) sessionStorage.setItem('access_token', val);
        else sessionStorage.removeItem('access_token');
    },

    async request(path, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': '1',
            ...options.headers,
        };

        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        let response = await fetch(`${this.BASE_URL}${path}`, {
            ...options,
            headers,
            credentials: 'include', // 攜帶 httpOnly Cookie（Refresh Token）
        });

        // Access Token 過期：自動刷新後重試
        if (response.status === 401 && this.accessToken) {
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
                headers['Authorization'] = `Bearer ${this.accessToken}`;
                response = await fetch(`${this.BASE_URL}${path}`, {
                    ...options,
                    headers,
                    credentials: 'include',
                });
            } else {
                window.location.href = '/login.html';
                return null;
            }
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: '請求失敗' }));
            throw new Error(err.detail || `HTTP ${response.status}`);
        }

        return response.json();
    },

    async refreshAccessToken() {
        try {
            const res = await fetch(`${this.BASE_URL}/api/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                this.accessToken = data.access_token;
                return true;
            }
            return false;
        } catch {
            return false;
        }
    },

    // ===== 認證 =====

    async login(email, password) {
        const data = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        if (data) {
            this.accessToken = data.access_token;
        }
        return data;
    },

    async register(email, password) {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    },

    async logout() {
        await this.request('/api/auth/logout', { method: 'POST' }).catch(() => {});
        this.accessToken = null;
        window.location.href = '/login.html';
    },

    async getMe() {
        return this.request('/api/auth/me');
    },

    // ===== 紀錄 CRUD =====

    async getAllRecords(sort = 'date-desc', search = '') {
        const params = new URLSearchParams();
        if (sort) params.set('sort', sort);
        if (search) params.set('search', search);
        return this.request(`/api/records?${params}`);
    },

    async getRecordById(id) {
        return this.request(`/api/records/${id}`);
    },

    async getAdjacentRecords(id) {
        return this.request(`/api/records/${id}/adjacent`);
    },

    async addRecord(data) {
        return this.request('/api/records', {
            method: 'POST',
            body: JSON.stringify({
                date: data.date,
                start_time: data.startTime || null,
                end_time: data.endTime || null,
                title: data.title,
                content: data.content,
                tags: data.tags || [],
            }),
        });
    },

    async updateRecord(id, data) {
        return this.request(`/api/records/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                date: data.date,
                start_time: data.startTime || null,
                end_time: data.endTime || null,
                title: data.title,
                content: data.content,
                tags: data.tags || [],
            }),
        });
    },

    async deleteRecord(id) {
        return this.request(`/api/records/${id}`, { method: 'DELETE' });
    },

    // ===== 留言 =====

    async getComments(recordId) {
        return this.request(`/api/records/${recordId}/comments`);
    },

    async addComment(recordId, content) {
        return this.request(`/api/records/${recordId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    },

    async updateComment(commentId, content) {
        return this.request(`/api/comments/${commentId}`, {
            method: 'PUT',
            body: JSON.stringify({ content }),
        });
    },

    async deleteComment(commentId) {
        return this.request(`/api/comments/${commentId}`, { method: 'DELETE' });
    },

    // ===== 個人資料 =====

    async getProfile() {
        return this.request('/api/profile');
    },

    async saveProfile(data) {
        return this.request('/api/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    // ===== LLM 摘要 =====

    async summarize(content) {
        const data = await this.request('/api/llm/summarize', {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
        return data ? data.summary : '';
    },
};
