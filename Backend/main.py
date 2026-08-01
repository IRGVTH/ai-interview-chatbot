import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI

app = FastAPI()

# ใส่ API Key ของคุณตรงนี้ หรือตั้งใน Environment Variable
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", "your-api-key-here"))

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat(payload: ChatRequest):
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": payload.message}
            ]
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
