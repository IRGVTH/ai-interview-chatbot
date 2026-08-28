import { Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ReportService } from "./report.service";

@Controller("report")
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get("overview")
  getOverview(@Req() req: any) {
    return this.reportService.getOverview(req.user.id);
  }

  @Get("sessions/:id/evaluation")
  getEvaluation(@Req() req: any, @Param("id") id: string) {
    return this.reportService.getEvaluation(req.user.id, id);
  }

  @Post("sessions/:id/evaluate")
  evaluate(@Req() req: any, @Param("id") id: string) {
    return this.reportService.evaluateSession(req.user.id, id);
  }
}