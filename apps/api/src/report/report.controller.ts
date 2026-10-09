import { Response } from 'express';
import { renderReportPdf } from './report-pdf';
import { RUBRIC } from './rubric';
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

  @Post('sessions/:id/complete')
  complete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.reportService.evaluateSession(req.user.id, id, true);
  }

  @Get('sessions/:id/pdf')
  async pdf(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const session = await this.reportService.getSessionReport(req.user.id, id);
    if (!session.evaluation)
      throw new BadRequestException('Generate a score before exporting');
    if (session.evaluation.sourceTurnVersion !== session.turnVersion)
      throw new BadRequestException(
        'Conversation changed. Re-score before exporting',
      );
    const bytes = await renderReportPdf(session);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=interview-report.pdf',
    );
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
