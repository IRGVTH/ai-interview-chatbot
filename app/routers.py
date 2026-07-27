from fastapi import APIRouter, HTTPException
from app.schemas import (
    QuestionGenerateRequest,
    QuestionListResponse,
    AnswerEvaluationRequest,
    AnswerEvaluationResponse,
    InterviewSessionSummaryRequest,
    FinalInterviewReport
)
from app.services import InterviewAIService

router = APIRouter(prefix="/api/v1/interview", tags=["AI Interview Chatbot"])

@router.post("/generate-questions", response_model=QuestionListResponse)
async def generate_questions(payload: QuestionGenerateRequest):
    try:
        return await InterviewAIService.generate_interview_questions(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluate-answer", response_model=AnswerEvaluationResponse)
async def evaluate_answer(payload: AnswerEvaluationRequest):
    try:
        return await InterviewAIService.evaluate_answer(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/final-report", response_model=FinalInterviewReport)
async def generate_final_report(payload: InterviewSessionSummaryRequest):
    try:
        return await InterviewAIService.generate_final_report(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
