/**
 * Hakkımda sayfası: profil bilgileri src/site.config.ts içinde,
 * metin src/content/pages/hakkimda.md içinde tutulur.
 *
 * Config dosyası kör string replace ile yeniden yazılmaz. Yalnızca
 * author, authorBio, profileImage ve links.* alanları güncellenir;
 * diğer ayarlar ve yorumlar aynen kalır.
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
const BIO_MAX = 240;
const BODY_MAX = 40_000;
const LINK_MAX = 240;

const LINK_KEYS = ['email', 'github', 'x', 'linkedin'];

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

/**
 * Tek satırlık TypeScript string özelliğini okur.
 * `author` ile `authorBio` karışmasın diye kelime sınırı kullanılır.
 */
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

function requireEmail(value) {
	const text = requireSingleLine(value, 'E-posta', LINK_MAX);
	if (text && !EMAIL_RE.test(text)) {
		throw new AdminError('E-posta adresi geçerli görünmüyor.');
	}
	return text;
}

function requireHttpUrl(value, label) {
	const text = requireSingleLine(value, label, LINK_MAX);
	if (!text) return '';
	let parsed;
	try {
		parsed = new URL(text);
	} catch {
		throw new AdminError(`${label} geçerli bir adres olmalıdır (https://… ile başlamalı).`);
	}
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw new AdminError(`${label} yalnızca http veya https olabilir.`);
	}
	return text;
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

function assertProtectedConfig(before, after) {
	for (const marker of PROTECTED_MARKERS) {
		if (!after.includes(marker)) {
			throw new AdminError(`site.config.ts güncellemesi ${marker} alanını kaybetti; dosya yazılmadı.`);
		}
	}

	const beforeProtected = maskEditable(before);
	const afterProtected = maskEditable(after);
	if (beforeProtected !== afterProtected) {
		throw new AdminError(
			'site.config.ts güncellemesi izin verilen alanların dışında bir değişiklik üretti; dosya yazılmadı.',
		);
	}
}

/** Düzenlenebilir alanları maskeleyerek geri kalan dosyayı karşılaştırılabilir hale getirir. */
function maskEditable(source) {
	let next = source;
	for (const key of ['author', 'authorBio', 'profileImage', ...LINK_KEYS]) {
		next = next.replace(
			new RegExp(`((?:^|\\n)[ \\t]*\\b${key}:\\s*)(['"])(?:\\\\.|(?!\\2).)*\\2`, 'm'),
			`$1''`,
		);
	}
	return next;
}

function serializeAboutPage(title, body) {
	const clean = String(body ?? '').replace(/\r\n/g, '\n').replace(/^\uFEFF/, '');
	return `---\ntitle: ${JSON.stringify(title)}\n---\n\n${clean.replace(/\n+$/, '')}\n`;
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
		links: {
			email: readTsStringProp(configSource, 'email'),
			github: readTsStringProp(configSource, 'github'),
			x: readTsStringProp(configSource, 'x'),
			linkedin: readTsStringProp(configSource, 'linkedin'),
		},
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

	const links = {
		email: requireEmail(payload?.links?.email),
		github: requireHttpUrl(payload?.links?.github, 'GitHub'),
		x: requireHttpUrl(payload?.links?.x, 'X / Twitter'),
		linkedin: requireHttpUrl(payload?.links?.linkedin, 'LinkedIn'),
	};

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
		links.email !== current.links.email ||
		links.github !== current.links.github ||
		links.x !== current.links.x ||
		links.linkedin !== current.links.linkedin;

	const pageChanged = body.replace(/\n+$/, '') !== current.body.replace(/\n+$/, '');

	const written = [];

	if (configChanged) {
		const before = await fs.readFile(SITE_CONFIG_PATH, 'utf8');
		let next = before;
		next = replaceTsStringProp(next, 'author', author);
		next = replaceTsStringProp(next, 'authorBio', authorBio);
		next = replaceTsStringProp(next, 'profileImage', profileImage);
		next = replaceTsStringProp(next, 'email', links.email);
		next = replaceTsStringProp(next, 'github', links.github);
		next = replaceTsStringProp(next, 'x', links.x);
		next = replaceTsStringProp(next, 'linkedin', links.linkedin);
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
		...current,
		author,
		authorBio,
		profileImage,
		links,
		body,
		image: imageResult,
		written,
		message: 'Hakkımda sayfası başarıyla güncellendi.',
	};
}
