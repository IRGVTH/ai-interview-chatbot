import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/types/authenticated-request';
import { ChatService } from './chat.service';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('sessions')
  createSession(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateChatSessionDto,
  ) {
    return this.chatService.createSession(req.user.id, dto);
  }

  @Get('sessions')
  findAll(@Req() req: AuthenticatedRequest) {
    return this.chatService.findAll(req.user.id);
  }

  @Get('sessions/:id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.chatService.findOne(req.user.id, id);
  }

  @Post('sessions/:id/messages')
  sendMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(req.user.id, id, dto);
  }

  @Post('sessions/:id/messages/stream')
  sendMessageStream(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    return this.chatService.sendMessageStream(req.user.id, id, dto, res);
  }

  @Delete('sessions/:id/messages')
  clearMessages(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.chatService.clearMessages(req.user.id, id);
  }
}
