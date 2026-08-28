import {
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

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
  @IsIn(["0-1", "1-3", "3+"])
  experienceLevel?: string;

  @IsOptional()
  @IsIn(["easy", "medium", "hard"])
  difficulty?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  summary?: string;
}