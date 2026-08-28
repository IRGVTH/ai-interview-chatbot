export type QuestionGeneratorInput = {
  position: string;
  experienceLevel: string;
  difficulty: string;
  topic?: string;
};

export function buildQuestionGeneratorPrompt(input: QuestionGeneratorInput) {
  return `
You are an interview question generator.

Generate exactly 1 interview question.

Position: ${input.position}
Experience level: ${input.experienceLevel}
Difficulty: ${input.difficulty}
Topic: ${input.topic || 'general'}

Rules:
- Output only the question.
- Keep it short and natural.
- Make it suitable for a ${input.position} interview.
- Do not include explanation.
- Do not add numbering.
- Do not add markdown.

Question:
`.trim();
}
