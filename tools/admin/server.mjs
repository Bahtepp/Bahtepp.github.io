/**
 * BAHTEP yerel içerik yönetim paneli.
 *
 * Bu sunucu yalnızca kendi bilgisayarında çalışır: 127.0.0.1 dışına açılmaz ve
 * Astro build'inin bir parçası değildir, bu yüzden GitHub Pages'te yayınlanmaz.
 *
 * Çalıştırmak için:  npm run admin
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
	AdminError,
	COLLECTIONS,
	IMAGES_DIR,
	IMAGE_UPLOAD_EXTENSIONS,
	MAX_BODY_BYTES,
	MAX_IMAGE_BYTES,
	ROOT,
	imageFilePath,
} from './lib/project.mjs';
import { siteConfig } from '../../src/site.config.ts';
import * as store from './lib/store.mjs';
import * as git from './lib/git.mjs';
import { joinFootnoteDefinitions } from './lib/frontmatter.mjs';
import { renderMarkdown } from './lib/preview.mjs';
import * as about from './lib/about.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UI_DIR = path.join(HERE, 'ui');
const CODEMIRROR = path.join(ROOT, 'node_modules', 'codemirror');

const HOST = '127.0.0.1';
const DEFAULT_PORT = Number(process.env.BAHTEP_ADMIN_PORT) || 3000;
const DEV_PORT = 4321;

/** Tarayıcıya servis edilen sabit dosyalar. Bu listenin dışına çıkılamaz. */
const STATIC_FILES = new Map([
	['/', { file: path.join(UI_DIR, 'index.html'), type: 'text/html; charset=utf-8' }],
	['/admin.css', { file: path.join(UI_DIR, 'admin.css'), type: 'text/css; charset=utf-8' }],
	['/admin.js', { file: path.join(UI_DIR, 'admin.js'), type: 'text/javascript; charset=utf-8' }],
	['/lib.js', { file: path.join(UI_DIR, 'lib.js'), type: 'text/javascript; charset=utf-8' }],
	// Önizlemenin siteyle aynı görünmesi için sitenin kendi stil dosyası.
	['/site.css', { file: path.join(ROOT, 'src', 'styles', 'global.css'), type: 'text/css; charset=utf-8' }],
	['/vendor/codemirror.css', { file: path.join(CODEMIRROR, 'lib', 'codemirror.css'), type: 'text/css; charset=utf-8' }],
	['/vendor/codemirror.js', { file: path.join(CODEMIRROR, 'lib', 'codemirror.js'), type: 'text/javascript; charset=utf-8' }],
	['/vendor/xml.js', { file: path.join(CODEMIRROR, 'mode', 'xml', 'xml.js'), type: 'text/javascript; charset=utf-8' }],
	['/vendor/meta.js', { file: path.join(CODEMIRROR, 'mode', 'meta.js'), type: 'text/javascript; charset=utf-8' }],
	['/vendor/markdown.js', { file: path.join(CODEMIRROR, 'mode', 'markdown', 'markdown.js'), type: 'text/javascript; charset=utf-8' }],
	['/vendor/continuelist.js', { file: path.join(CODEMIRROR, 'addon', 'edit', 'continuelist.js'), type: 'text/javascript; charset=utf-8' }],
]);

const IMAGE_TYPES = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml',
	'.avif': 'image/avif',
	'.gif': 'image/gif',
};

let devServerChild = null;

function sendJson(res, status, payload) {
	const body = JSON.stringify(payload);
	res.writeHead(status, {
		'content-type': 'application/json; charset=utf-8',
		'cache-control': 'no-store',
	});
	res.end(body);
}

function sendText(res, status, text) {
	res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
	res.end(text);
}

function readBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		req.on('data', (chunk) => {
			size += chunk.length;
			if (size > MAX_BODY_BYTES) {
				reject(new AdminError('Gönderilen veri çok büyük.', 413));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on('end', () => {
			if (chunks.length === 0) return resolve({});
			try {
				resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
			} catch {
				reject(new AdminError('İstek gövdesi okunamadı.'));
			}
		});
		req.on('error', reject);
	});
}

/**
 * Yalnızca yerel makineden gelen istekler kabul edilir.
 * Yazma isteklerinde ayrıca panelin kendi başlığı aranır: tarayıcılar bu başlığı
 * başka bir siteden izinsiz gönderemez, böylece dışarıdan tetiklenen istekler durur.
 */
function checkRequest(req, port) {
	const hostHeader = String(req.headers.host ?? '');
	const hostName = hostHeader.replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
	if (!['127.0.0.1', 'localhost', '::1'].includes(hostName)) {
		throw new AdminError('Bu panel yalnızca yerel adresten açılabilir.', 403);
	}

	if (req.method === 'GET' || req.method === 'HEAD') return;

	if (req.headers['x-bahtep-admin'] !== '1') {
		throw new AdminError('Eksik panel başlığı. İsteği panel arayüzünden gönder.', 403);
	}

	const origin = req.headers.origin;
	if (origin && ![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(origin)) {
		throw new AdminError('İzin verilmeyen kaynak.', 403);
	}
}

async function serveStatic(res, route) {
	const entry = STATIC_FILES.get(route);
	if (!entry) return false;
	try {
		const data = await fs.readFile(entry.file);
		res.writeHead(200, { 'content-type': entry.type, 'cache-control': 'no-store' });
		res.end(data);
	} catch {
		sendText(res, 404, 'Dosya bulunamadı.');
	}
	return true;
}

async function serveImage(res, route) {
	const name = decodeURIComponent(route.slice('/images/'.length));
	const filePath = imageFilePath(name);
	const type = IMAGE_TYPES[path.extname(name).toLowerCase()];
	if (!type) {
		sendText(res, 415, 'Desteklenmeyen görsel türü.');
		return;
	}
	try {
		const data = await fs.readFile(filePath);
		res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
		res.end(data);
	} catch {
		sendText(res, 404, 'Görsel bulunamadı.');
	}
}

function startDevServer() {
	if (devServerChild && devServerChild.exitCode === null) {
		return { started: false, alreadyRunning: true };
	}
	// Sabit komut ve argümanlar: kullanıcıdan gelen hiçbir veri buraya girmez.
	devServerChild = spawn(
		process.execPath,
		[path.join(ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs'), 'dev', '--port', String(DEV_PORT)],
		{ cwd: ROOT, stdio: 'ignore', windowsHide: true },
	);
	devServerChild.on('exit', () => {
		devServerChild = null;
	});
	return { started: true };
}

const routes = {
	'/api/bootstrap': async () => {
		const [list, images, devRunning] = await Promise.all([
			store.listContent(),
			store.listImages(),
			store.probeDevServer(DEV_PORT),
		]);
		const tags = new Set();
		for (const item of list.items) for (const tag of item.tags) tags.add(tag);

		return {
			collections: Object.values(COLLECTIONS).map((c) => ({
				key: c.key,
				label: c.label,
				singular: c.singular,
				badge: c.badge,
				urlBase: c.urlBase,
			})),
			site: { name: siteConfig.siteName, author: siteConfig.author },
			today: new Date().toISOString().slice(0, 10),
			devUrl: `http://localhost:${DEV_PORT}`,
			devRunning,
			items: list.items,
			problems: list.problems,
			images,
			knownTags: [...tags].sort((a, b) => a.localeCompare(b, 'tr')),
			limits: {
				imageMb: MAX_IMAGE_BYTES / 1024 / 1024,
				imageExtensions: IMAGE_UPLOAD_EXTENSIONS,
			},
		};
	},

	'/api/content': async () => store.listContent(),

	'/api/entry': async (body) => {
		const entry = await store.readEntry(body.collection, body.slug);
		return { entry, footnoteCheck: store.checkFootnotes(entry.body, entry.footnotes) };
	},

	'/api/save': async (body) => {
		const result = await store.saveEntry(body);
		return { ...result, message: 'İçerik başarıyla kaydedildi.' };
	},

	'/api/draft': async (body) => store.setDraft(body.collection, body.slug, body.draft),

	'/api/delete': async (body) => store.deleteEntry(body.collection, body.slug, body.confirm),

	'/api/images': async () => ({ images: await store.listImages() }),

	'/api/save-image': async (body) => store.saveImage(body),

	'/api/preview': async (body) => {
		const source = body.footnotes?.length
			? joinFootnoteDefinitions(body.markdown ?? '', body.footnotes)
			: String(body.markdown ?? '');
		return renderMarkdown(source);
	},

	'/api/git': async () => git.status(),

	'/api/git/push': async (body) => {
		if (body.approved !== true) {
			throw new AdminError('Gönderim için açık onay gerekiyor.', 403);
		}
		return git.commitAndPush(body.message, { push: body.push !== false });
	},

	'/api/dev-server': async () => ({
		running: await store.probeDevServer(DEV_PORT),
		url: `http://localhost:${DEV_PORT}`,
	}),

	'/api/about': async () => about.readAbout(),

	'/api/save-about': async (body) => {
		let savedImage = null;
		if (body.imageUpload) {
			savedImage = await store.saveImage(body.imageUpload);
		}
		return about.saveAbout({ ...body, savedImage, imageUpload: undefined });
	},

	'/api/dev-server/start': async () => {
		const running = await store.probeDevServer(DEV_PORT);
		if (running) return { started: false, alreadyRunning: true, url: `http://localhost:${DEV_PORT}` };
		const result = startDevServer();
		return { ...result, url: `http://localhost:${DEV_PORT}` };
	},
};

function createServer(port) {
	return http.createServer(async (req, res) => {
		let route = '/';
		try {
			route = new URL(req.url, `http://${HOST}:${port}`).pathname;
			checkRequest(req, port);

			if (req.method === 'GET' || req.method === 'HEAD') {
				if (route.startsWith('/images/')) return await serveImage(res, route);
				if (await serveStatic(res, route)) return;
			}

			const handler = routes[route];
			if (!handler) {
				sendText(res, 404, 'Bulunamadı.');
				return;
			}

			const body = req.method === 'POST' ? await readBody(req) : {};
			sendJson(res, 200, { ok: true, data: await handler(body) });
		} catch (error) {
			const status = error instanceof AdminError ? error.status : 500;
			if (status === 500) {
				console.error(`[admin] ${route} hatası:`, error);
			}
			sendJson(res, status, { ok: false, error: error.message });
		}
	});
}

/** Port meşgulse sırayla sonraki portlar denenir, bulunan port ekrana yazılır. */
function listen(port, attemptsLeft) {
	const server = createServer(port);

	server.once('error', (error) => {
		if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
			console.log(`  ${port} portu meşgul, ${port + 1} deneniyor...`);
			listen(port + 1, attemptsLeft - 1);
			return;
		}
		if (error.code === 'EADDRINUSE') {
			console.error(
				`\n  Hata: ${DEFAULT_PORT}-${port} portları meşgul.\n` +
					'  O portları kullanan programı kapat ya da başka bir port seç:\n' +
					'    Windows PowerShell:  $env:BAHTEP_ADMIN_PORT=3100; npm run admin\n',
			);
		} else {
			console.error('\n  Panel başlatılamadı:', error.message, '\n');
		}
		process.exit(1);
	});

	server.listen(port, HOST, () => {
		console.log('\n  BAHTEP - Icerik Yonetimi (yerel)');
		console.log(`  Panel:  http://localhost:${port}`);
		console.log('  Kapatmak icin: Ctrl+C\n');
	});

	const shutdown = () => {
		if (devServerChild) devServerChild.kill();
		server.close(() => process.exit(0));
		setTimeout(() => process.exit(0), 1000);
	};
	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);
}

await fs.mkdir(IMAGES_DIR, { recursive: true });
listen(DEFAULT_PORT, 10);
