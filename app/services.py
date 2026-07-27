from openai import AsyncOpenAI
from config import settings
from app.schemas import (
    QuestionGenerateRequest,
    QuestionListResponse,
    AnswerEvaluationRequest,
    AnswerEvaluationResponse,
    InterviewSessionSummaryRequest,
    FinalInterviewReport
)

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

class InterviewAIService:
    @staticmethod
    async def generate_interview_questions(payload: QuestionGenerateRequest) -> QuestionListResponse:
        prompt = f"""คุณคือ Senior HR/Technical Recruiter ตำแหน่ง {payload.job_title} ({payload.experience_level})
ให้สร้างชุดคำถามสัมภาษณ์จำนวน 3 คำถามที่ครอบคลุมทักษะดังนี้: {', '.join(payload.skills)}"""

        completion = await client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "สร้างคำถามสัมภาษณ์งานอย่างเป็นมืออาชีพและตรงจุด"},
                {"role": "user", "content": prompt}
            ],
            response_format=QuestionListResponse
        )
        return completion.choices[0].message.parsed

    @staticmethod
    async def evaluate_answer(payload: AnswerEvaluationRequest) -> AnswerEvaluationResponse:
        system_prompt = f"คุณคือผู้สัมภาษณ์งานตำแหน่ง {payload.job_title} ให้วิเคราะห์และให้ข้อเสนอแนะอย่างเป็นธรรม"
        user_prompt = f"คำถาม: {payload.question}\nคำตอบของผู้สมัคร: {payload.candidate_answer}"

        completion = await client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format=AnswerEvaluationResponse
        )
        return completion.choices[0].message.parsed

    @staticmethod
    async def generate_final_report(payload: InterviewSessionSummaryRequest) -> FinalInterviewReport:
        system_prompt = "คุณคือ HR Director วิเคราะห์ผลการสัมภาษณ์รวมของผู้สมัครเพื่อออกรายงานสรุปให้ผู้บริหาร"
        user_prompt = f"ผู้สมัคร: {payload.candidate_name}\nตำแหน่ง: {payload.job_title}\nผลประเมินย่อย: {payload.evaluations}"

        completion = await client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format=FinalInterviewReport
        )
        return completion.choices[0].message.parsed
