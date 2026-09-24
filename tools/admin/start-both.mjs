/**
 * `npm run edit` — Astro geliştirme sunucusunu ve yönetim panelini birlikte başlatır.
 *
 * Komutlar sabittir, kabuk (shell) kullanılmaz. Biri kapanırsa diğeri de kapatılır,
 * böylece arkada başıboş süreç kalmaz.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

const jobs = [
	{
		name: 'site ',
		args: [path.join(ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs'), 'dev'],
	},
	{
		name: 'panel',
		args: [path.join(HERE, 'server.mjs')],
	},
];

const children = [];
let closing = false;

function stopAll(code) {
	if (closing) return;
	closing = true;
	for (const child of children) {
		if (child.exitCode === null) child.kill();
	}
	process.exit(code ?? 0);
}

for (const job of jobs) {
	const child = spawn(process.execPath, job.args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
	children.push(child);

	const forward = (stream, target) => {
		stream.setEncoding('utf8');
		let rest = '';
		stream.on('data', (chunk) => {
			const lines = (rest + chunk).split('\n');
			rest = lines.pop() ?? '';
			for (const line of lines) target.write(`[${job.name}] ${line}\n`);
		});
	};

	forward(child.stdout, process.stdout);
	forward(child.stderr, process.stderr);

	child.on('exit', (code) => {
		if (!closing) {
			console.log(`\n[${job.name.trim()}] kapandı (kod ${code}). Diğer süreç de kapatılıyor.\n`);
			stopAll(code ?? 0);
		}
	});
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
