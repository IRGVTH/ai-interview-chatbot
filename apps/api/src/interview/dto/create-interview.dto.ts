import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateInterviewDto {
  @IsOptional()
  @IsIn(['HR', 'Technical', 'Coding', 'Behavioral'])
  interviewType?: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(2)
  position!: string;

  @IsIn(['0-1', '1-3', '3+'])
  experienceLevel!: string;

  @IsIn(['easy', 'medium', 'hard'])
  difficulty!: string;

  @IsOptional()
  @IsString()
  resumeFileName?: string;

  @IsOptional()
  @IsString()
  resumeText?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  summary?: string;
}
