import { Module } from '@nestjs/common';
import { GeminiModule } from '../gemini/gemini.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ReportModule } from '../report/report.module';

@Module({
  imports: [GeminiModule, ReportModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
