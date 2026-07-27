from pydantic import BaseModel, Field
from typing import List, Optional

class QuestionGenerateRequest(BaseModel):
    job_title: str = Field(..., example="Full Stack Developer")
    experience_level: str = Field(..., example="Junior / Mid-level")
    skills: List[str] = Field(..., example=["Python", "FastAPI", "React"])

class GeneratedQuestion(BaseModel):
    question_id: int
    question: str
    focus_area: str
    expected_key_points: List[str]

class QuestionListResponse(BaseModel):
    job_title: str
    questions: List[GeneratedQuestion]

class AnswerEvaluationRequest(BaseModel):
    job_title: str
    question: str
    candidate_answer: str

class AnswerEvaluationResponse(BaseModel):
    relevance_score: int = Field(description="คะแนนความตรงประเด็น (1-5)")
    technical_depth_score: int = Field(description="คะแนนความลึกซึ้งทางเทคนิค (1-5)")
    communication_score: int = Field(description="คะแนนทักษะการสื่อสาร (1-5)")
    key_strengths: List[str] = Field(description="จุดเด่นในคำตอบ")
    areas_to_improve: List[str] = Field(description="จุดที่ควรปรับปรุงหรือเพิ่มเติม")
    feedback_summary: str = Field(description="สรุปข้อเสนอแนะภาพรวม")
    suggested_followup_question: Optional[str] = Field(None, description="คำถามเจาะลึกเพิ่มเติม (ถ้ามี)")

class InterviewSessionSummaryRequest(BaseModel):
    job_title: str
    candidate_name: str
    evaluations: List[AnswerEvaluationResponse]

class FinalInterviewReport(BaseModel):
    overall_score: float = Field(description="คะแนนรวมเฉลี่ย (เต็ม 5)")
    passed_recommendation: bool = Field(description="ข้อเสนอแนะว่าควรรับเข้าทำงาน/ผ่านเข้ารอบหรือไม่")
    summary_of_skills: str = Field(description="สรุปทักษะภาพรวมของผู้สมัคร")
    key_recommendations_for_hr: List[str] = Field(description="ข้อเสนอแนะสำหรับทีม HR")
