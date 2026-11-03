import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { renderReportPdf } from './report-pdf';
import { RUBRIC, RUBRIC_VERSION } from './rubric';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/types/authenticated-request';
import { ReportService } from './report.service';

@Controller('report')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('rubric')
  rubric() {
    return RUBRIC;
  }

  @Get('sessions/:id/pdf')
  async pdf(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const session = await this.reportService.getSessionReport(req.user.id, id);
    if (!session.evaluation) {
      throw new BadRequestException('กรุณาประเมินคะแนนก่อนดาวน์โหลด PDF');
    }
    const e = session.evaluation;
    if (
      e.rubricVersion === RUBRIC_VERSION &&
      session.lastMessageAt &&
      (!e.evaluatedThrough || e.evaluatedThrough < session.lastMessageAt)
    ) {
      throw new BadRequestException(
        'บทสนทนาเปลี่ยนแล้ว กรุณาประเมินใหม่ก่อนส่งออก PDF',
      );
    }
    const bytes = await renderReportPdf(session);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="interview-report.pdf"',
    );
    res.setHeader('Cache-Control', 'no-store');
    res.send(bytes);
  }

  @Get('overview')
  getOverview(@Req() req: AuthenticatedRequest) {
    return this.reportService.getOverview(req.user.id);
  }

  @Get('sessions/:id/evaluation')
  getEvaluation(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.reportService.getEvaluation(req.user.id, id);
  }

  @Post('sessions/:id/evaluate')
  evaluate(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.reportService.evaluateSession(req.user.id, id);
  }
}
