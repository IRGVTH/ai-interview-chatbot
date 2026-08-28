import { Module } from '@nestjs/common';
import { GeminiModule } from '../gemini/gemini.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [GeminiModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
