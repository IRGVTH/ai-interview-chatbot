import {
  RUBRIC,
  RUBRIC_VERSION,
  total30,
  grade30,
  DimensionKey,
} from './rubric';
import * as PDFDocument from 'pdfkit';
import { join } from 'node:path';

export type PdfReport = {
  id: string;
  title: string | null;
  lastMessageAt?: Date | null;
  interview: {
    title: string;
    interviewType?: string | null;
    position: string;
    experienceLevel: string;
    difficulty: string;
  };
  evaluation: {
    language?: number | null;
    rubricVersion?: string;
    rubricSnapshot?: unknown;
    dimensionFeedback?: Record<string, string> | null;
    evaluatedThrough?: Date | null;
    communication: number;
    technical: number;
    confidence: number;
    overall: number;
    strengths: string[];
    improvements: string[];
    feedback: string;
    updatedAt: Date;
  } | null;
};

// Exports saved scores and rubric reasons; no new AI request during download.
export async function renderReportPdf(session: PdfReport): Promise<Buffer> {
  const e = session.evaluation;
  if (!e) throw new Error('An evaluation is required');
  const doc = new PDFDocument({
    size: 'A4',
    margin: 48,
    bufferPages: true,
    info: { Title: 'AI Interview Report', Author: 'InterviewAI' },
  });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  try {
    doc.font(join(__dirname, 'fonts', 'Sarabun-Regular.ttf'));
    const text = (value: string, size = 12) => {
      if (size >= 15 && doc.y > doc.page.height - 150) doc.addPage();
      doc
        .fillColor('#172033')
        .fontSize(size)
        .text(value, { lineGap: 4 })
        .moveDown(0.5);
    };
    text('รายงานผลการฝึกสัมภาษณ์', 21);
    text('AI Interview Chatbot', 13);
    text(session.interview.title, 16);
    text(
      `ประเภทการสัมภาษณ์: ${session.interview.interviewType || 'ไม่ได้ระบุ (ข้อมูลเดิม)'}`,
    );
    text(`รอบฝึก: ${session.title || 'Practice Chat'}\nรหัสรอบ: ${session.id}`);
    text(
      `ตำแหน่ง: ${session.interview.position}\nประสบการณ์: ${session.interview.experienceLevel}\nความยาก: ${session.interview.difficulty}`,
    );
    text(
      `ประเมินเมื่อ: ${new Intl.DateTimeFormat('th-TH', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(e.updatedAt)}`,
    );
    const isNew =
      e.rubricVersion === RUBRIC_VERSION && typeof e.language === 'number';
    if (isNew) {
      const scores = {
        technical: e.technical,
        communication: e.communication,
        language: e.language,
        confidence: e.confidence,
      };
      const total = total30(scores);
      const rubric =
        e.rubricSnapshot && typeof e.rubricSnapshot === 'object'
          ? (e.rubricSnapshot as typeof RUBRIC)
          : RUBRIC;
      text(`คะแนนรวม ${total} / 30 · เกรด ${grade30(total)}`, 17);
      text(`เกณฑ์ ${e.rubricVersion}`);
      text(rubric.formula || RUBRIC.formula);
      text(rubric.gradeScale?.description || RUBRIC.gradeScale.description);
      for (const d of rubric.dimensions || RUBRIC.dimensions) {
        const raw = scores[d.key as DimensionKey];
        text(
          `${d.label}: ${raw} / 10 (คิดเป็น ${Number((raw * 0.75).toFixed(2))} / 7.5)`,
          15,
        );
        text(
          `เหตุผลที่ได้คะแนน: ${e.dimensionFeedback?.[d.key] || 'ไม่มีเหตุผลที่บันทึกไว้ กรุณาประเมินใหม่'}`,
        );
        text(`วัดจาก: ${d.criteria}`);
        for (const level of d.levels) text(level, 10);
      }
      text(rubric.limitation || RUBRIC.limitation, 10);
    } else {
      text('ผลประเมินเดิม (เต็ม 10)', 16);
      text(
        `ความถูกต้องและเนื้อหา: ${e.technical}\nความชัดเจน: ${e.communication}\nการสื่อสารที่สะท้อนความมั่นใจ: ${e.confidence}\nคะแนนรวมเดิม: ${e.overall} / 10`,
      );
      text(
        'ต้องประเมินใหม่เพื่อให้ได้คะแนนเต็ม 30 พร้อมคะแนนภาษาและเหตุผลครบ 4 ด้าน',
      );
    }
    text('ข้อเสนอแนะ', 16);
    text(e.feedback || 'ไม่มีข้อเสนอแนะ');
    for (const [label, values] of [
      ['จุดแข็ง', e.strengths],
      ['ข้อควรปรับปรุง', e.improvements],
    ] as const) {
      text(label, 16);
      for (const value of values) text(`• ${value}`);
      if (!values.length) text('ไม่มีข้อมูล');
    }
    text(
      'รายงานนี้เป็นผลการฝึกจาก AI เพื่อพัฒนาตนเอง ไม่ใช่ผลการคัดเลือกเข้าทำงาน',
    );
    const range = doc.bufferedPageRange();
    for (let index = 0; index < range.count; index++) {
      doc.switchToPage(range.start + index);
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc
        .fontSize(9)
        .fillColor('#64748b')
        .text(`หน้า ${index + 1} / ${range.count}`, 48, doc.page.height - 34, {
          lineBreak: false,
          align: 'right',
          width: doc.page.width - 96,
        });
      doc.page.margins.bottom = bottom;
    }
    doc.end();
  } catch (error) {
    doc.destroy(
      error instanceof Error ? error : new Error('PDF generation failed'),
    );
  }
  return result;
}
