/**
 * Auth — 認證狀態管理與頁面守衛
 */
const Auth = {
    role: null,

    get isViewer() { return this.role === 'viewer'; },

    /**
     * 所有需要登入的頁面都在 DOMContentLoaded 呼叫此函數
     * 會嘗試用 Refresh Token Cookie 換取新的 Access Token
     * 若失敗則跳轉到登入頁面
     */
    async init() {
        // 先確保有 access token
        if (!ApiClient.accessToken) {
            const ok = await ApiClient.refreshAccessToken();
            if (!ok) {
                window.location.href = '/login.html';
                return false;
            }
        }

        // 取得用戶資訊（含 role）
        try {
            const me = await ApiClient.getMe();
            this.role = me.role;
        } catch (e) {
            window.location.href = '/login.html';
            return false;
        }

        return true;
    },

    async logout() {
        await ApiClient.logout();
    },
};
