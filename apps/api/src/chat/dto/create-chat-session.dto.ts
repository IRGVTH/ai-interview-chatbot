import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateChatSessionDto {
  @IsString()
  @MinLength(1)
  interviewId!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;
}