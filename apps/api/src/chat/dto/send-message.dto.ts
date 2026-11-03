import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  content!: string;

  // Optional client correlation metadata; not an idempotency guarantee.
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  requestId?: string;
}
