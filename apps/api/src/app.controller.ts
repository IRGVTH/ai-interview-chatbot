import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello() {
    return {
      message: 'AI Interview Chatbot API',
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'api',
    };
  }
}