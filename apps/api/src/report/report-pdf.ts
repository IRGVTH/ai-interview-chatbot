import * as PDFDocument from 'pdfkit';
import { join } from 'path';
import { RUBRIC, gradeFromScore } from './rubric';
import { ReportService } from './report.service';
// Bundled OFL font works in production without a network or OS font dependency.
export async function renderReportPdf(
  session: Awaited<ReturnType<ReportService['getSessionReport']>>,
) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 48,
    info: { Title: 'AI Interview Report', Author: 'InterviewAI' },
  });
  const buffers: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (b: Buffer) => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
  });
  doc.font(join(__dirname, 'fonts', 'Sarabun-Regular.ttf'));
  const text = (s: string, size = 12) => {
    if (size >= 15 && doc.y > doc.page.height - doc.page.margins.bottom - 100)
      doc.addPage();
    doc.fontSize(size).text(s, { lineGap: 4 }).moveDown(0.5);
  };
  const e = session.evaluation;
  text('รายงานผลการฝึกสัมภาษณ์ AI Interview Chatbot', 19);
  text(session.interview.title, 15);
  text(
    `${session.interview.interviewType} / ${session.interview.position} / ${session.interview.difficulty}`,
  );
  text(
    `รอบ ${session.id}\nวันที่ ${session.createdAt.toISOString()}\nเกณฑ์ ${e.rubricVersion}\nคะแนนรวม ${e.overall} / 10 · เกรด ${gradeFromScore(e.overall) ?? 'ยังไม่ประเมิน'}`,
  );
  text('เกณฑ์ที่ใช้ประเมิน', 15);
  text(RUBRIC.gradeScale.description);
  const rubric = e.rubricSnapshot as unknown as typeof RUBRIC | null;
  text(rubric?.anchors ?? 'ผลเดิมก่อนบันทึกเวอร์ชันเกณฑ์ กรุณาประเมินใหม่');
  text(rubric?.limitation ?? RUBRIC.limitation);
  const reasons = e.dimensionFeedback as Record<string, string> | null;
  for (const d of rubric?.dimensions ?? RUBRIC.dimensions) {
    text(
      `${d.label}: ${e[d.key as 'technical' | 'communication' | 'language' | 'confidence'] ?? 'ไม่ได้ประเมิน'} / 10`,
    );
    if (reasons?.[d.key]) text(reasons[d.key]);
  }
  text('สรุปผลและข้อจำกัด', 15);
  text(e.feedback);
  for (const [label, items] of [
    ['จุดแข็ง', e.strengths],
    ['ข้อควรปรับปรุง', e.improvements],
  ] as const) {
    text(label, 15);
    for (const item of items as string[]) text(`• ${item}`);
  }
  if (Array.isArray(e.exampleAnswers)) {
    text('ตัวอย่างคำตอบที่ดีขึ้น', 15);
    for (const item of e.exampleAnswers as {
      question: string;
      originalAnswer: string;
      answer: string;
    }[]) {
      text(`คำถาม: ${item.question}`);
      text(`คำตอบเดิม: ${item.originalAnswer}`);
      text(`ตัวอย่าง: ${item.answer}`);
    }
  }
  doc.end();
  return done;
}
