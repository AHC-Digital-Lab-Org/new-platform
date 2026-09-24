// Arranca backend y frontend en paralelo (sin dependencias, multiplataforma).
import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = ['backend', 'frontend'].map((ws) =>
  spawn(npm, ['run', 'dev', '-w', ws], { stdio: 'inherit', shell: process.platform === 'win32' }),
);

const stop = () => children.forEach((c) => c.kill());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
children.forEach((c) => c.on('exit', (code) => { if (code) { stop(); process.exit(code); } }));
