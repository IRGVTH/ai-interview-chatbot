export type EvaluationPromptInput = {
  position: string;
  experienceLevel: string;
  difficulty: string;
  question: string;
  answer: string;
};

export function buildEvaluationPrompt(input: EvaluationPromptInput) {
  return `
You are an interview evaluator.

Evaluate the candidate's answer for the following interview.

Position: ${input.position}
Experience level: ${input.experienceLevel}
Difficulty: ${input.difficulty}

Question:
${input.question}

Candidate answer:
${input.answer}

Return ONLY valid JSON in this format:
{
  "communication": number,
  "technical": number,
  "confidence": number,
  "overall": number,
  "strengths": [string, string],
  "improvements": [string, string],
  "feedback": string
}

Rules:
- Scores must be numbers from 0 to 10.
- feedback must be short and clear.
- strengths and improvements must each contain 2 items.
- Do not include markdown.
- Do not include extra text outside JSON.
`.trim();
}