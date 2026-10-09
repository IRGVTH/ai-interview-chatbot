import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateInterviewDto {
  @IsOptional()
  @IsIn(['HR', 'Technical', 'Coding', 'Behavioral'])
  interviewType?: string;

  @IsOptional()
  @IsString()
  resumeFileName?: string;
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MinLength(2)
  position?: string;

  @IsOptional()
  @IsIn(['0-1', '1-3', '3+'])
  experienceLevel?: string;

  @IsOptional()
  @IsIn(['easy', 'medium', 'hard'])
  difficulty?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  summary?: string;
  @IsOptional()
  @IsString()
  resumeText?: string;
}
