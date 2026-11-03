import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { SendMessageDto } from './send-message.dto';

describe('SendMessageDto production validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });
  const validate = (body: Record<string, unknown>) =>
    pipe.transform(body, { type: 'body', metatype: SendMessageDto });

  it('accepts a client requestId on both message endpoint DTOs', async () => {
    await expect(
      validate({
        content: 'Hello',
        requestId: '9e676c87-64e4-4d60-aa9c-b1f123523cb4',
      }),
    ).resolves.toMatchObject({
      content: 'Hello',
      requestId: '9e676c87-64e4-4d60-aa9c-b1f123523cb4',
    });
  });

  it('keeps older clients without requestId compatible', async () => {
    await expect(validate({ content: 'Hello' })).resolves.toMatchObject({
      content: 'Hello',
    });
  });

  it.each([42, '', 'x'.repeat(129)])(
    'rejects an invalid requestId: %s',
    async (requestId) => {
      await expect(
        validate({ content: 'Hello', requestId }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('continues rejecting other unknown fields', async () => {
    await expect(
      validate({ content: 'Hello', unexpected: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
