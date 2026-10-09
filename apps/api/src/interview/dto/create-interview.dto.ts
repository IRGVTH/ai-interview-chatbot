import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateInterviewDto {
  @IsIn(['HR', 'Technical', 'Coding', 'Behavioral'])
  interviewType!: string;

  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MinLength(2)
  title!: string;

  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
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
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  summary?: string;
}
