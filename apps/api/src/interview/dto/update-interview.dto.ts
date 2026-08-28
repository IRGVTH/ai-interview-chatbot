import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateInterviewDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  position?: string;

  @IsOptional()
  @IsString()
  @IsIn(["0-1", "1-3", "3+"])
  experienceLevel?: string;

  @IsOptional()
  @IsString()
  @IsIn(["easy", "medium", "hard"])
  difficulty?: string;

  @IsOptional()
  @IsString()
  @IsIn(["draft", "active", "completed"])
  status?: string;

  @IsOptional()
  @IsString()
  summary?: string;
}