import { renderReportPdf, PdfReport } from './report-pdf';
import * as PDFDocument from 'pdfkit';
import { RUBRIC, RUBRIC_VERSION } from './rubric';

const fixture: PdfReport = {
  id: 'sample-session',
  title: 'ฝึกสัมภาษณ์ IT Support',
  interview: {
    title: 'เตรียมความพร้อมฝึกงาน',
    position: 'IT Support',
    experienceLevel: 'นักศึกษา',
    difficulty: 'ปานกลาง',
  },
  evaluation: {
    communication: 8,
    technical: 7,
    confidence: 8,
    overall: 7.7,
    strengths: ['อธิบายขั้นตอนแก้ปัญหาอย่างเป็นระบบ'],
    improvements: ['เพิ่มตัวอย่างจากประสบการณ์จริง'],
    feedback: 'ตอบได้ชัดเจนและเข้าใจง่าย ควรฝึกสรุปคำตอบให้กระชับ',
    updatedAt: new Date('2026-11-03T05:00:00Z'),
  },
};

describe('Thai report PDF', () => {
  it('exports each dimension out of 30 and their arithmetic mean with a grade', async () => {
    const text = jest.spyOn(
      PDFDocument.prototype as PDFKit.PDFDocument,
      'text',
    );
    try {
      await renderReportPdf({
        ...fixture,
        evaluation: {
          ...fixture.evaluation,
          technical: 24,
          communication: 27,
          language: 21,
          confidence: 30,
          overall: 25.5,
          rubricVersion: RUBRIC_VERSION,
          rubricSnapshot: RUBRIC,
          dimensionFeedback: Object.fromEntries(
            RUBRIC.dimensions.map((d) => [
              d.key,
              'ตอบตรงคำถาม มีเหตุผลรองรับ แต่ยังเพิ่มตัวอย่างได้',
            ]),
          ),
        },
      });
      for (const line of [
        'คะแนนเฉลี่ยทั้ง 4 ด้าน 25.5 / 30 · เกรด A',
        'ความถูกต้องและเนื้อหา: 24 / 30 · เกรด A',
        'ความชัดเจน: 27 / 30 · เกรด A',
        'การใช้ภาษา: 21 / 30 · เกรด B',
        'การสื่อสารที่สะท้อนความมั่นใจ: 30 / 30 · เกรด A',
      ])
        expect(text).toHaveBeenCalledWith(line, { lineGap: 4 });
    } finally {
      text.mockRestore();
    }
  });
  it('produces PDF bytes with the bundled Thai font', async () => {
    const bytes = await renderReportPdf(fixture);
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.toString('latin1')).toContain('Sarabun');
    expect(bytes.toString('latin1')).toContain('%%EOF');
    expect(
      (bytes.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length,
    ).toBe(1);
  });

  it('paginates long feedback', async () => {
    const bytes = await renderReportPdf({
      ...fixture,
      evaluation: {
        ...fixture.evaluation,
        feedback: fixture.evaluation.feedback.repeat(150),
      },
    });
    expect(
      (bytes.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length,
    ).toBeGreaterThan(1);
  });

  it('requires an existing evaluation', async () => {
    await expect(
      renderReportPdf({ ...fixture, evaluation: null }),
    ).rejects.toThrow('An evaluation is required');
  });
});
