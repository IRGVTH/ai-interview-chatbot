const FOCUS: Record<string, string> = {
  HR: 'Focus on motivation, career goals, teamwork, availability, and suitability for the role. Avoid coding tests.',
  Technical:
    'Focus on role-specific technical concepts, troubleshooting, architecture, and practical tradeoffs.',
  Coding:
    'Focus on coding tasks, algorithms, code reasoning, debugging, correctness, and complexity.',
  Behavioral:
    'Focus on past experiences, decisions, teamwork, conflict, and STAR-style evidence. Avoid coding tests.',
};

export function interviewTypeContext(value?: string | null): string {
  return value && Object.hasOwn(FOCUS, value)
    ? `Interview type: ${value}\n${FOCUS[value]}`
    : 'Interview type: Unspecified (legacy interview). Use a balanced role-based interview; do not infer a selected type.';
}
