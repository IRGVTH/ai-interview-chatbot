import { Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedRequest } from "../common/types/authenticated-request";
import { ReportService } from "./report.service";

@Controller("report")
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get("overview")
  getOverview(@Req() req: AuthenticatedRequest) {
    return this.reportService.getOverview(req.user.id);
  }

  @Get("sessions/:id/evaluation")
  getEvaluation(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.reportService.getEvaluation(req.user.id, id);
  }

  @Post("sessions/:id/evaluate")
  evaluate(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.reportService.evaluateSession(req.user.id, id);
  }
}