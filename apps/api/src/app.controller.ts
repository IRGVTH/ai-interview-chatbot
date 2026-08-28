import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      message: "AI Interview Chatbot API",
    };
  }

  @Get("health")
  health() {
    return {
      status: "ok",
    };
  }
}