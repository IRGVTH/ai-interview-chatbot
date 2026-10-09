import { BadRequestException, Injectable } from '@nestjs/common';
import * as mammoth from 'mammoth';

@Injectable()
export class ResumeService {
  private cleanText(text: string) {
    return text
      .split(String.fromCharCode(0))
      .join('')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  async extractText(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Resume file is required');
    }

    const isPdf = file.mimetype === 'application/pdf';
    const isDocx =
      file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isPdf && !isDocx) {
      throw new BadRequestException('Only PDF and DOCX files are supported');
    }

    let text = '';

    try {
      if (isPdf) {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: file.buffer });

        try {
          const result = await parser.getText();
          text = result.text || '';
        } finally {
          await parser.destroy();
        }
      }

      if (isDocx) {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        text = result.value || '';
      }
    } catch {
      throw new BadRequestException(
        'อ่าน Resume ไม่ได้ กรุณาใช้ PDF ที่มีข้อความหรือ DOCX หรือฝึกโดยไม่ใช้ Resume',
      );
    }
    text = this.cleanText(text);
    if (text.length > 50000)
      throw new BadRequestException('Resume text exceeds 50,000 characters');

    if (!text) {
      throw new BadRequestException('Could not extract text from resume');
    }

    return {
      fileName: file.originalname.split(String.fromCharCode(0)).join('').trim(),
      mimeType: file.mimetype,
      text,
    };
  }
}
