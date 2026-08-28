import { Module } from '@nestjs/common';
import { GeminiModule } from '../gemini/gemini.module';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [GeminiModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
