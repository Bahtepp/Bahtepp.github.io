/**
 * Git işlemleri.
 *
 * Kurallar:
 * - Komutlar her zaman sabit argüman dizisiyle, kabuk (shell) kullanılmadan çalışır.
 *   Kullanıcının yazdığı metin hiçbir zaman komut satırına birleştirilmez.
 * - force push yoktur, geçmişi değiştiren hiçbir komut çağrılmaz.
 * - Hiçbir token, kullanıcı adı veya şifre istenmez ve saklanmaz.
 */

import { execFile } from 'node:child_process';

import { AdminError, ROOT } from './project.mjs';

/** Paneldeki hiçbir akışın çağırmasına izin verilmeyen argümanlar. */
const FORBIDDEN = new Set(['--force', '-f', '--force-with-lease', 'reset', 'rebase', 'filter-branch']);

function run(args, { timeout = 120_000 } = {}) {
	for (const arg of args) {
		if (FORBIDDEN.has(arg)) {
			throw new AdminError(`Bu git argümanı panelde yasaktır: ${arg}`, 403);
		}
	}

	return new Promise((resolve) => {
		execFile(
			'git',
			args,
			{ cwd: ROOT, timeout, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
			(error, stdout, stderr) => {
				resolve({
					ok: !error,
					code: error?.code ?? 0,
					stdout: String(stdout ?? '').trim(),
					stderr: String(stderr ?? '').trim(),
					command: `git ${args.join(' ')}`,
				});
			},
		);
	});
}

function describeChange(code) {
	const map = {
		'??': 'yeni dosya',
		A: 'eklendi',
		M: 'değişti',
		D: 'silindi',
		R: 'adı değişti',
		C: 'kopyalandı',
		U: 'çakışma',
	};
	const key = code.trim();
	return map[key] ?? map[key[0]] ?? 'değişti';
}

/** Gönderilecek dosyaları ve dalın durumunu döndürür. */
export async function status() {
	const isRepo = await run(['rev-parse', '--is-inside-work-tree']);
	if (!isRepo.ok) {
		return { isRepo: false, files: [], branch: '', ahead: 0, remote: '', message: 'Bu klasör bir git deposu değil.' };
	}

	const [porcelain, branch, remote, ahead] = await Promise.all([
		run(['status', '--porcelain=v1']),
		run(['rev-parse', '--abbrev-ref', 'HEAD']),
		run(['remote', 'get-url', 'origin']),
		run(['rev-list', '--count', '@{upstream}..HEAD']),
	]);

	const files = porcelain.stdout
		? porcelain.stdout.split('\n').map((line) => ({
				status: describeChange(line.slice(0, 2)),
				path: line.slice(3).trim(),
			}))
		: [];

	return {
		isRepo: true,
		files,
		branch: branch.stdout,
		remote: remote.stdout,
		ahead: ahead.ok ? Number(ahead.stdout) || 0 : 0,
		hasUpstream: ahead.ok,
	};
}

/** Commit mesajını doğrular. Tek argüman olarak geçirilir, kabuk yorumlaması yoktur. */
function requireMessage(message) {
	const value = String(message ?? '').trim();
	if (!value) throw new AdminError('Commit mesajı boş olamaz.');
	if (value.length > 500) throw new AdminError('Commit mesajı çok uzun (en fazla 500 karakter).');
	return value;
}

/**
 * Kullanıcının açık onayı ile: git add -A, git commit, git push.
 * Herhangi bir adım hata verirse sonraki adımlar çalıştırılmaz ve
 * git'in kendi hata metni olduğu gibi gösterilir.
 */
export async function commitAndPush(message, { push = true } = {}) {
	const commitMessage = requireMessage(message);
	const steps = [];

	const info = await status();
	if (!info.isRepo) throw new AdminError('Bu klasör bir git deposu değil.');
	if (info.files.length === 0) {
		throw new AdminError('Gönderilecek bir değişiklik yok.');
	}

	const add = await run(['add', '--all']);
	steps.push(add);
	if (!add.ok) return { ok: false, steps };

	const commit = await run(['commit', '-m', commitMessage]);
	steps.push(commit);
	if (!commit.ok) return { ok: false, steps };

	if (!push) return { ok: true, steps, pushed: false };

	const pushArgs = info.hasUpstream ? ['push'] : ['push', '--set-upstream', 'origin', info.branch];
	const pushed = await run(pushArgs);
	steps.push(pushed);

	return { ok: pushed.ok, steps, pushed: pushed.ok };
}
