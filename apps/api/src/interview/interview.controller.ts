import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateInterviewDto } from "./dto/create-interview.dto";
import { UpdateInterviewDto } from "./dto/update-interview.dto";
import { InterviewService } from "./interview.service";

@Controller("interviews")
@UseGuards(JwtAuthGuard)
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateInterviewDto) {
    return this.interviewService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.interviewService.findAllByUser(req.user.id);
  }

  @Get(":id")
  findOne(@Req() req: any, @Param("id") id: string) {
    return this.interviewService.findOne(req.user.id, id);
  }

  @Patch(":id")
  update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateInterviewDto,
  ) {
    return this.interviewService.update(req.user.id, id, dto);
  }

  @Delete(":id")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.interviewService.remove(req.user.id, id);
  }
}