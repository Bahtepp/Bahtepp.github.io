/**
 * Hakkımda sayfası: profil bilgileri src/site.config.ts içinde,
 * metin src/content/pages/hakkimda.md içinde tutulur.
 *
 * Config dosyası kör string replace ile yeniden yazılmaz. Yalnızca
 * author, authorBio, profileImage ve links bloğu güncellenir.
 * links hem eski sabit nesne hem yeni dizi biçiminde okunabilir;
 * kaydetme her zaman dizi yazar.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import {
	AdminError,
	ABOUT_PAGE_PATH,
	CONTENT_ROOT,
	SITE_CONFIG_PATH,
	assertInside,
	imageFilePath,
} from './project.mjs';
import { parseFile } from './frontmatter.mjs';

const AUTHOR_MAX = 80;
const BIO_MAX = 400;
const BODY_MAX = 40_000;
const LINK_MAX = 240;
const LINK_COUNT_MAX = 30;

const ALLOWED_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

const LEGACY_LINK_LABELS = {
	email: 'E-posta',
	github: 'GitHub',
	x: 'X',
	twitter: 'X',
	linkedin: 'LinkedIn',
	instagram: 'Instagram',
	youtube: 'YouTube',
};

const PROTECTED_MARKERS = [
	'siteName:',
	'tagline:',
	'description:',
	'domain:',
	'githubPagesUrl:',
	'useCustomDomain:',
	'navigation',
	'wordsPerMinute:',
	'defaultImage:',
	'lang:',
	'locale:',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeTsString(value) {
	return String(value)
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/\r/g, '')
		.replace(/\n/g, '\\n');
}

function unescapeTsString(value) {
	return String(value)
		.replace(/\\n/g, '\n')
		.replace(/\\'/g, "'")
		.replace(/\\"/g, '"')
		.replace(/\\\\/g, '\\');
}

function readTsStringProp(source, key) {
	const re = new RegExp(`(?:^|\\n)[ \\t]*\\b${key}:\\s*(['"])((?:\\\\.|(?!\\1).)*)\\1`, 'm');
	const match = re.exec(source);
	if (!match) {
		throw new AdminError(`site.config.ts içinde ${key} alanı bulunamadı.`);
	}
	return unescapeTsString(match[2]);
}

function replaceTsStringProp(source, key, value) {
	const re = new RegExp(`((?:^|\\n)[ \\t]*\\b${key}:\\s*)(['"])(?:\\\\.|(?!\\2).)*\\2`, 'm');
	if (!re.test(source)) {
		throw new AdminError(`site.config.ts içinde ${key} alanı bulunamadı; dosya yazılmadı.`);
	}
	return source.replace(re, `$1'${escapeTsString(value)}'`);
}

function findBalancedBlock(source, start) {
	const open = source[start];
	if (open !== '{' && open !== '[') return null;
	const close = open === '{' ? '}' : ']';
	let depth = 0;
	for (let index = start; index < source.length; index += 1) {
		const char = source[index];
		if (char === open) depth += 1;
		if (char === close) {
			depth -= 1;
			if (depth === 0) return { start, end: index + 1, text: source.slice(start, index + 1) };
		}
	}
	return null;
}

function findLinksBlock(source) {
	const match = /(?:^|\n)([ \t]*)\blinks:\s*/.exec(source);
	if (!match) return null;
	const valueStart = match.index + match[0].length;
	const block = findBalancedBlock(source, valueStart);
	if (!block) return null;
	return {
		indent: match[1] ?? '\t',
		start: match.index + (source[match.index] === '\n' ? 1 : 0),
		end: block.end,
		text: block.text,
	};
}

function parseQuotedPairs(block) {
	const pairs = [];
	const re = /(?:^|[{\s,])([A-Za-z_][\w]*)\s*:\s*(['"])((?:\\.|.)*?)(\2)/g;
	let match;
	while ((match = re.exec(block))) {
		pairs.push({ key: match[1], value: unescapeTsString(match[3]) });
	}
	return pairs;
}

function normalizeLinkUrl(raw) {
	const text = String(raw ?? '').trim();
	if (!text) return '';
	if (EMAIL_RE.test(text) && !/^[a-z]+:/i.test(text)) return `mailto:${text}`;
	return text;
}

function readLinks(source) {
	const block = findLinksBlock(source);
	if (!block) return [];

	const text = block.text.trim();
	if (text.startsWith('[')) {
		const items = [];
		const objectRe = /\{[^{}]*\}/g;
		let objectMatch;
		while ((objectMatch = objectRe.exec(text))) {
			const pairs = Object.fromEntries(parseQuotedPairs(objectMatch[0]).map((pair) => [pair.key, pair.value]));
			const label = String(pairs.label ?? '').trim();
			const url = normalizeLinkUrl(pairs.url ?? pairs.href ?? '');
			if (label && url) items.push({ label, url });
		}
		return items;
	}

	return parseQuotedPairs(text)
		.filter((pair) => pair.key !== 'links')
		.map((pair) => {
			const url = normalizeLinkUrl(pair.value);
			if (!url) return null;
			const label = LEGACY_LINK_LABELS[pair.key] ?? pair.key;
			return { label, url };
		})
		.filter(Boolean);
}

function serializeLinks(links, indent = '\t') {
	const inner = indent + '\t';
	if (links.length === 0) return `${indent}links: [],`;
	const rows = links.map((link) => `${inner}{ label: '${escapeTsString(link.label)}', url: '${escapeTsString(link.url)}' },`);
	return `${indent}links: [\n${rows.join('\n')}\n${indent}],`;
}

function replaceLinksBlock(source, links) {
	const block = findLinksBlock(source);
	if (!block) {
		throw new AdminError('site.config.ts içinde links alanı bulunamadı; dosya yazılmadı.');
	}
	const serialized = serializeLinks(links, block.indent);
	let after = source.slice(block.end);
	if (after.startsWith(',')) after = after.slice(1);
	if (after.startsWith('\r\n')) after = after.slice(2);
	else if (after.startsWith('\n')) after = after.slice(1);
	return `${source.slice(0, block.start)}${serialized}\n${after}`;
}

function requireSingleLine(value, label, max) {
	const text = String(value ?? '').replace(/\r/g, '').trim();
	if (text.includes('\n')) {
		throw new AdminError(`${label} tek satır olmalıdır.`);
	}
	if (text.length > max) {
		throw new AdminError(`${label} en fazla ${max} karakter olabilir.`);
	}
	return text;
}

function requireLinkUrl(value, label) {
	const text = requireSingleLine(value, label, LINK_MAX);
	if (!text) throw new AdminError(`${label} için bir adres yaz.`);

	const normalized = normalizeLinkUrl(text);
	let parsed;
	try {
		parsed = new URL(normalized);
	} catch {
		throw new AdminError(`${label} geçerli bir adres olmalıdır (https:// veya mailto:).`);
	}
	if (!ALLOWED_LINK_PROTOCOLS.has(parsed.protocol)) {
		throw new AdminError(`${label} yalnızca http, https veya mailto olabilir.`);
	}
	return normalized;
}

function requireLinks(raw) {
	if (raw == null) return [];
	if (!Array.isArray(raw)) {
		throw new AdminError('Bağlantılar dizi olmalıdır.');
	}
	if (raw.length > LINK_COUNT_MAX) {
		throw new AdminError(`En fazla ${LINK_COUNT_MAX} bağlantı eklenebilir.`);
	}

	const out = [];
	for (const [index, item] of raw.entries()) {
		const label = requireSingleLine(item?.label, `Bağlantı ${index + 1} adı`, 80);
		const url = String(item?.url ?? '').trim();
		if (!label && !url) continue;
		if (!label) throw new AdminError(`Bağlantı ${index + 1} için bir ad yaz.`);
		out.push({ label, url: requireLinkUrl(url, label) });
	}
	return out;
}

function requireProfileImagePath(value) {
	const text = requireSingleLine(value, 'Profil fotoğrafı', 180);
	if (!text.startsWith('/images/')) {
		throw new AdminError('Profil fotoğrafı /images/ altında olmalıdır.');
	}
	const fileName = text.slice('/images/'.length);
	imageFilePath(fileName);
	return `/images/${fileName}`;
}

function maskEditable(source) {
	let next = source;
	for (const key of ['author', 'authorBio', 'profileImage']) {
		next = next.replace(
			new RegExp(`((?:^|\\n)[ \\t]*\\b${key}:\\s*)(['"])(?:\\\\.|(?!\\2).)*\\2`, 'm'),
			`$1''`,
		);
	}
	const block = findLinksBlock(next);
	if (block) {
		let after = next.slice(block.end);
		if (after.startsWith(',')) after = after.slice(1);
		if (after.startsWith('\r\n')) after = after.slice(2);
		else if (after.startsWith('\n')) after = after.slice(1);
		next = `${next.slice(0, block.start)}${block.indent}links: [],\n${after}`;
	}
	return next;
}

function assertProtectedConfig(before, after) {
	for (const marker of PROTECTED_MARKERS) {
		if (!after.includes(marker)) {
			throw new AdminError(`site.config.ts güncellemesi ${marker} alanını kaybetti; dosya yazılmadı.`);
		}
	}
	if (maskEditable(before) !== maskEditable(after)) {
		throw new AdminError(
			'site.config.ts güncellemesi izin verilen alanların dışında bir değişiklik üretti; dosya yazılmadı.',
		);
	}
}

function serializeAboutPage(title, body) {
	const clean = String(body ?? '').replace(/\r\n/g, '\n').replace(/^\uFEFF/, '');
	return `---\ntitle: ${JSON.stringify(title)}\n---\n\n${clean.replace(/\n+$/, '')}\n`;
}

function linksEqual(left, right) {
	return JSON.stringify(left) === JSON.stringify(right);
}

async function exists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

export async function readAbout() {
	const [configSource, pageRaw] = await Promise.all([
		fs.readFile(SITE_CONFIG_PATH, 'utf8'),
		fs.readFile(ABOUT_PAGE_PATH, 'utf8'),
	]);

	const { data, body } = parseFile(pageRaw);

	return {
		author: readTsStringProp(configSource, 'author'),
		authorBio: readTsStringProp(configSource, 'authorBio'),
		profileImage: readTsStringProp(configSource, 'profileImage'),
		links: readLinks(configSource),
		title: typeof data.title === 'string' ? data.title : 'Hakkımda',
		body: String(body ?? '').replace(/^\n+/, ''),
		previewPath: '/hakkimda/',
	};
}

export async function saveAbout(payload) {
	const current = await readAbout();

	const author = requireSingleLine(payload?.author, 'Görünen isim', AUTHOR_MAX);
	if (!author) throw new AdminError('Görünen isim boş olamaz.');

	const authorBio = requireSingleLine(payload?.authorBio, 'Kısa tanım', BIO_MAX);
	if (!authorBio) throw new AdminError('Kısa tanım / ünvan boş olamaz.');

	const body = String(payload?.body ?? '').replace(/\r\n/g, '\n');
	if (body.length > BODY_MAX) {
		throw new AdminError(`Hakkımda yazısı çok uzun (en fazla ${BODY_MAX} karakter).`);
	}

	const links = requireLinks(payload?.links);

	let profileImage = current.profileImage;
	let imageResult = null;

	if (payload?.savedImage?.path) {
		imageResult = payload.savedImage;
		profileImage = requireProfileImagePath(payload.savedImage.path);
	} else if (payload?.profileImage) {
		profileImage = requireProfileImagePath(payload.profileImage);
		const fileName = profileImage.slice('/images/'.length);
		if (!(await exists(imageFilePath(fileName)))) {
			throw new AdminError('Seçilen profil görseli public/images içinde bulunamadı.');
		}
	}

	const configChanged =
		author !== current.author ||
		authorBio !== current.authorBio ||
		profileImage !== current.profileImage ||
		!linksEqual(links, current.links);

	const pageChanged = body.replace(/\n+$/, '') !== current.body.replace(/\n+$/, '');
	const written = [];

	if (configChanged) {
		const before = await fs.readFile(SITE_CONFIG_PATH, 'utf8');
		let next = before;
		next = replaceTsStringProp(next, 'author', author);
		next = replaceTsStringProp(next, 'authorBio', authorBio);
		next = replaceTsStringProp(next, 'profileImage', profileImage);
		next = replaceLinksBlock(next, links);
		assertProtectedConfig(before, next);
		await fs.writeFile(SITE_CONFIG_PATH, next, 'utf8');
		written.push('src/site.config.ts');
	}

	if (pageChanged) {
		const target = assertInside(CONTENT_ROOT, ABOUT_PAGE_PATH);
		await fs.mkdir(path.dirname(target), { recursive: true });
		await fs.writeFile(target, serializeAboutPage(current.title || 'Hakkımda', body), 'utf8');
		written.push('src/content/pages/hakkimda.md');
	}

	if (imageResult) {
		written.push(`public${imageResult.path}`);
	}

	return {
		...(await readAbout()),
		image: imageResult,
		written,
		message: 'Hakkımda sayfası başarıyla güncellendi.',
	};
}
