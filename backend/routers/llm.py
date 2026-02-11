import httpx
import os
from fastapi import APIRouter, Depends, HTTPException
from dotenv import load_dotenv

from models import User
from schemas import SummarizeRequest, SummarizeResponse
from auth import get_current_user

load_dotenv()

router = APIRouter(prefix="/api/llm", tags=["llm"])

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_URL = "https://api.openai.com/v1/chat/completions"

SYSTEM_PROMPT = """你是一個實習紀錄摘要助手。根據使用者提供的實習日誌內容，提取出具體的實作行動。

規則：
- 禁止包含心得、成效、目的、自我期許、狀態描述等主觀內容
- 只保留具體操作、使用的工具、解決的問題
- 輸出條列式，每點用「- 」開頭，句尾加「。」
- 濃縮為 1~3 點，每點嚴格不超過 30 字"""


@router.post("/summarize")
async def summarize(
    req: SummarizeRequest,
    current_user: User = Depends(get_current_user)
):
    """代理 OpenAI API 呼叫，API Key 儲存在後端 .env"""
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="伺服器未設定 OpenAI API Key")

    if not req.content or not req.content.strip():
        raise HTTPException(status_code=400, detail="內容不可為空")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENAI_URL,
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": req.content}
                    ],
                    "max_tokens": 200,
                    "temperature": 0.7
                }
            )
            response.raise_for_status()
            data = response.json()
            summary = data["choices"][0]["message"]["content"].strip()
            return {"summary": summary}

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI API 錯誤：{e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"摘要生成失敗：{str(e)}")
