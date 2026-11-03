import { afterEach, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { fetchReportPdf, saveReportPdf } from '../lib/report-pdf.ts';

afterEach(() => mock.restoreAll());

test('downloads saved evaluations without turn-version metadata', async () => {
  mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://example.test/report/sessions/session-1/pdf');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return new Response('%PDF-1.7\nreport', { headers: { 'Content-Type': 'application/pdf' } });
  });
  const blob = await fetchReportPdf('https://example.test/', 'session-1', 'test-token');
  assert.match(await blob.text(), /^%PDF-/);
});

test('surfaces nested backend validation guidance', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({ message: { message: 'Generate score first' } }, { status: 400 }));
  await assert.rejects(fetchReportPdf('https://example.test', 's', 'token'), /Generate score first/);
});

test('explains missing PDF endpoints', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('', { status: 404 }));
  await assert.rejects(fetchReportPdf('https://example.test', 's', 'token'), /Deploy Backend/);
});

test('does not save an HTML success response as a PDF', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('<html>Login</html>'));
  await assert.rejects(fetchReportPdf('https://example.test', 's', 'token'), /PDF/);
});

test('attaches download link to DOM and releases blob URL after the click', () => {
  const actions = [];
  const link = { click() { actions.push('click'); }, remove() { actions.push('remove'); } };
  const original = globalThis.document;
  globalThis.document = {
    body: { appendChild(node) { assert.equal(node, link); actions.push('append'); } },
    createElement() { return link; },
  };
  try {
    mock.method(URL, 'createObjectURL', () => 'blob:test');
    mock.method(URL, 'revokeObjectURL', url => assert.equal(url, 'blob:test'));
    mock.method(globalThis, 'setTimeout', callback => { actions.push('cleanup'); callback(); });
    saveReportPdf(new Blob(['%PDF-']), 'session-1');
    assert.deepEqual(actions, ['append', 'click', 'remove', 'cleanup']);
    assert.equal(link.download, 'interview-report-session-1.pdf');
  } finally {
    if (original === undefined) delete globalThis.document;
    else globalThis.document = original;
  }
});
