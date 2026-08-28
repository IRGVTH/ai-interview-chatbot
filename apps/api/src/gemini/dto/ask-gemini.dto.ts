import { IsString, MinLength } from "class-validator";

export class AskGeminiDto {
  @IsString()
  @MinLength(1)
  prompt!: string;
}