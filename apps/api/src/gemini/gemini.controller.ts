import { Body, Controller, Post } from '@nestjs/common';
import { AskGeminiDto } from './dto/ask-gemini.dto';
import { GeminiService } from './gemini.service';

@Controller('gemini')
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Post('ask')
  async ask(@Body() dto: AskGeminiDto) {
    console.log('Gemini request received:', dto.prompt);
    const result = await this.geminiService.ask(dto.prompt);
    console.log('Gemini request finished');
    return result;
  }
}
