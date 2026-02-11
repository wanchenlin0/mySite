/**
 * LLMService v2 — 透過後端代理呼叫 OpenAI
 * API Key 存在後端 .env，前端不再持有任何 Key
 */
class LLMService {
    async summarize(text) {
        return ApiClient.summarize(text);
    }
}
