import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { readdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
// Always use a disposable in-memory PostgreSQL instance, never the caller's database.
const db = await PGlite.create();
const port = await new Promise((resolve) => {
  const s = createServer();
  s.listen(0, '127.0.0.1', () => {
    const p = s.address().port;
    s.close(() => resolve(p));
  });
});
const server = new PGLiteSocketServer({
  db,
  port,
  host: '127.0.0.1',
  maxConnections: 1,
});
try {
  const migrations = new URL(
    '../../../packages/database/prisma/migrations/',
    import.meta.url,
  );
  for (const folder of (await readdir(migrations, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    await db.exec(
      await readFile(
        new URL(`${folder.name}/migration.sql`, migrations),
        'utf8',
      ),
    );
  }
  await server.start();
  const env = {
    ...process.env,
    DATABASE_URL: `postgresql://rtm:test@127.0.0.1:${port}/rtm_test`,
    JWT_SECRET: 'rtm-test-only-not-production-secret',
    GOOGLE_CLIENT_ID: 'rtm-test',
    GOOGLE_CLIENT_SECRET: 'rtm-test',
    GOOGLE_CALLBACK_URL: 'http://localhost/auth/google/callback',
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --experimental-vm-modules`,
    RTM_TEST_DATABASE: '1',
  };
  await new Promise((resolve, reject) => {
    const p = spawn(
      'pnpm',
      [
        'exec',
        'jest',
        '--config',
        'test/jest-e2e.json',
        '--runInBand',
        'rtm.e2e-spec.ts',
      ],
      { env, stdio: 'inherit', shell: process.platform === 'win32' },
    );
    p.on('error', reject);
    p.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`Tests failed (${code})`)),
    );
  });
} finally {
  await server.stop();
  await db.close();
}
