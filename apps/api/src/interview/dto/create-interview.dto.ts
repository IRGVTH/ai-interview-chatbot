import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class CreateInterviewDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(2)
  position!: string;

  @IsString()
  @IsIn(["0-1", "1-3", "3+"])
  experienceLevel!: string;

  @IsString()
  @IsIn(["easy", "medium", "hard"])
  difficulty!: string;

  @IsOptional()
  @IsString()
  summary?: string;
}