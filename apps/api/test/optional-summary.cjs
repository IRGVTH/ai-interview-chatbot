// Run after `pnpm --filter api build` using Node 22.13+ (supports require(ESM)).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ValidationPipe } = require('@nestjs/common');
const { CreateInterviewDto } = require('../dist/interview/dto/create-interview.dto');
const { UpdateInterviewDto } = require('../dist/interview/dto/update-interview.dto');
const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
const required = { title: 'Practice', position: 'Developer', experienceLevel: '0-1', difficulty: 'easy', interviewType: 'HR' };

for (const [label, dto, base] of [['create', CreateInterviewDto, required], ['update', UpdateInterviewDto, {}]]) {
  for (const [name, value] of [['omitted', undefined], ['empty', ''], ['whitespace', '   '], ['one character', 'ก'], ['normal', 'Practice focus']]) {
    test(`${label}: optional summary accepts ${name}`, async () => {
      const payload = value === undefined ? base : { ...base, summary: value };
      await assert.doesNotReject(pipe.transform(payload, { type: 'body', metatype: dto }));
    });
  }
  test(`${label}: rejects non-string summary`, async () => {
    await assert.rejects(pipe.transform({ ...base, summary: 123 }, { type: 'body', metatype: dto }));
  });
  test(`${label}: still rejects unrelated unknown fields`, async () => {
    await assert.rejects(pipe.transform({ ...base, unknown: true }, { type: 'body', metatype: dto }));
  });
}
test('create: still requires title and position', async () => {
  await assert.rejects(pipe.transform({ ...required, title: '', position: '' }, { type: 'body', metatype: CreateInterviewDto }));
});
