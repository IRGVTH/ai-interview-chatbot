import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InterviewModule } from './interview/interview.module';
import { GeminiModule } from './gemini/gemini.module';
import { ChatModule } from './chat/chat.module';
import { ReportModule } from './report/report.module';
import { AdminModule } from './admin/admin.module';
import { ResumeModule } from './resume/resume.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    InterviewModule,
    GeminiModule,
    ChatModule,
    ReportModule,
    AdminModule,
    ResumeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
