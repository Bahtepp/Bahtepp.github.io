/**
 * Agent'tan gelen doğrulanmış makaleyi yeni bir Araştırma taslağına çevirir.
 * Kayıt mevcut saveEntry üzerinden gider. Yayın, güncelleme ve git yoktur.
 */

import { AdminError } from './project.mjs';
import { requireFootnoteKey } from './frontmatter.mjs';

const ALLOWED_KEYS = new Set(['title', 'description', 'tags', 'body', 'sources']);
const TEST_HOSTS = new Set(['example.com', 'example.org', 'example.net']);
const SOURCE_ID_RE = /^src-\d+$/;

function fail(message, code, status = 400) {
	throw new AdminError(message, status, code);
}

function clean(value) {
	return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function assertAgentDraftShape(payload) {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
		fail('İstek gövdesi okunamadı.', 'save_failed');
	}
	for (const key of Object.keys(payload)) {
		if (!ALLOWED_KEYS.has(key)) {
			fail(`Bu alan agent taslağında kabul edilmiyor: ${key}`, 'forbidden_field');
		}
	}
}

function hostnameOf(url) {
	try {
		return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
	} catch {
		return '';
	}
}

function assertProductionSource(source) {
	const sourceId = clean(source.sourceId);
	const url = clean(source.url);
	if (!SOURCE_ID_RE.test(sourceId)) {
		fail(`Kaynak kimliği geçersiz: ${sourceId || '(boş)'}`, 'invalid_source');
	}
	if (/test-src/i.test(sourceId) || /test-src/i.test(url)) {
		fail('Test kaynağı BAHTEP taslağına gönderilemez.', 'invalid_source');
	}
	let parsed;
	try {
		parsed = new URL(url);
	} catch {
		fail(`Kaynak adresi geçersiz: ${sourceId}`, 'invalid_source');
	}
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		fail(`Kaynak adresi geçersiz: ${sourceId}`, 'invalid_source');
	}
	if (TEST_HOSTS.has(hostnameOf(url))) {
		fail('Test kaynağı BAHTEP taslağına gönderilemez.', 'invalid_source');
	}
}

function stripLeadTitle(body) {
	return String(body ?? '')
		.replace(/\r\n/g, '\n')
		.trim()
		.replace(/^##(?!#)[^\n]*(?:\n+|$)/, '')
		.trim();
}

function stripBibliography(body) {
	const lines = String(body).replace(/\r\n/g, '\n').split('\n');
	let cut = lines.length;
	for (let index = lines.length - 1; index >= 0; index -= 1) {
		const line = lines[index].trim();
		if (line === '') {
			cut = index;
			continue;
		}
		if (/^\[\^[^\]]+\]:/.test(line)) {
			cut = index;
			continue;
		}
		if (/^#{1,6}\s+Kaynakça\s*$/i.test(line)) {
			cut = index;
			break;
		}
		break;
	}
	return lines.slice(0, cut).join('\n').trim();
}

const FOOTNOTE_KEY_MAX = 60;

function footnoteBase(source, slugify) {
	const label = clean(`${source.publisher} ${source.title}`) || hostnameOf(source.url);
	let base = slugify(label).replace(/^-+|-+$/g, '');
	if (!base || /^(test-)?src-\d+$/.test(base)) base = slugify(hostnameOf(source.url)).replace(/^-+|-+$/g, '');
	if (!base) fail(`Kaynak için dipnot anahtarı üretilemedi: ${source.sourceId}`, 'invalid_source');
	return base;
}

function clipFootnoteKey(value, max) {
	return String(value).slice(0, max).replace(/-+$/g, '');
}

function acceptKey(value) {
	try {
		return requireFootnoteKey(value);
	} catch (error) {
		fail(error.message, 'invalid_source');
	}
}

function uniqueKey(base, used) {
	const first = clipFootnoteKey(base, FOOTNOTE_KEY_MAX);
	if (first && !used.has(first)) return acceptKey(first);
	for (let number = 2; number < 100; number += 1) {
		const suffix = `-${number}`;
		const stem = clipFootnoteKey(base, FOOTNOTE_KEY_MAX - suffix.length);
		if (!stem) continue;
		const candidate = `${stem}${suffix}`;
		if (candidate.length > FOOTNOTE_KEY_MAX || used.has(candidate)) continue;
		return acceptKey(candidate);
	}
	fail('Dipnot anahtarı üretilemedi.', 'invalid_source');
}

function footnoteText(source) {
	const publisher = clean(source.publisher);
	const title = clean(source.title);
	const parts = [];
	if (publisher) parts.push(publisher);
	if (title && title !== publisher) parts.push(title);
	parts.push(`<${source.url}>`);
	return parts.join(', ');
}

function prepareArticle(payload, slugify) {
	const title = clean(payload.title);
	if (!title) fail('Başlık boş olamaz.', 'save_failed');
	const description = clean(payload.description);
	if (!description) fail('Kısa açıklama zorunludur.', 'invalid_description');

	const tags = Array.isArray(payload.tags)
		? [...new Set(payload.tags.map((tag) => clean(tag)).filter(Boolean))]
		: [];
	if (payload.tags != null && !Array.isArray(payload.tags)) {
		fail('Etiketler liste olmalı.', 'save_failed');
	}

	const rawBody = String(payload.body ?? '');
	if (/\[\^test-src-/i.test(rawBody) || /https?:\/\/(?:www\.)?example\.(?:com|org|net)\b/i.test(rawBody)) {
		fail('Test kaynağı BAHTEP taslağına gönderilemez.', 'invalid_source');
	}

	const listed = Array.isArray(payload.sources) ? payload.sources : null;
	if (!listed) fail('Kaynak listesi eksik.', 'invalid_source');
	const byId = new Map();
	for (const item of listed) {
		const source = {
			sourceId: clean(item?.sourceId),
			title: clean(item?.title),
			publisher: clean(item?.publisher),
			url: clean(item?.url),
		};
		assertProductionSource(source);
		if (byId.has(source.sourceId)) fail(`Kaynak yineleniyor: ${source.sourceId}`, 'invalid_source');
		byId.set(source.sourceId, source);
	}

	let body = stripBibliography(stripLeadTitle(rawBody));
	const referenced = [];
	for (const match of body.matchAll(/\[\^(src-\d+)\]/g)) {
		if (!referenced.includes(match[1])) referenced.push(match[1]);
	}
	for (const sourceId of referenced) {
		if (!byId.has(sourceId)) fail(`Gövde bilinmeyen kaynağı kullanıyor: ${sourceId}`, 'invalid_citation');
	}

	const used = new Set();
	const footnotes = [];
	const keys = new Map();
	for (const sourceId of referenced) {
		const source = byId.get(sourceId);
		const key = uniqueKey(footnoteBase(source, slugify), used);
		used.add(key);
		keys.set(sourceId, key);
		footnotes.push({ key, text: footnoteText(source) });
	}

	body = body.replace(/\[\^(src-\d+)\]/g, (full, sourceId) => {
		const key = keys.get(sourceId);
		return key ? `[^${key}]` : full;
	});

	if (/\[\^src-\d+\]/.test(body) || referenced.some((sourceId) => body.includes(sourceId))) {
		fail('İç kaynak kimliği metinden çıkarılamadı.', 'invalid_citation');
	}
	if (/^#{1,6}\s+Kaynakça\s*$/im.test(body)) {
		fail('Kaynakça başlığı gövdede kalamaz.', 'invalid_citation');
	}

	return { title, description, tags, body, footnotes };
}

function isSlugConflict(error) {
	return typeof error?.message === 'string' && error.message.includes('zaten kullanılıyor');
}

/**
 * Yeni Araştırma taslağı oluşturur.
 * slugify ve save çağıran tarafın mevcut admin fonksiyonlarıdır.
 */
export async function createAgentDraft(payload, { slugify, save }) {
	assertAgentDraftShape(payload);
	const article = prepareArticle(payload, slugify);
	const slug = slugify(article.title);
	if (!slug) fail('Başlık dosya adına dönüştürülemedi.', 'save_failed');

	const entry = {
		collection: 'arastirmalar',
		slug,
		title: article.title,
		description: article.description,
		tags: article.tags,
		draft: true,
		featured: false,
		body: article.body,
		footnotes: article.footnotes,
	};

	try {
		return await save(entry);
	} catch (error) {
		if (isSlugConflict(error)) fail(error.message, 'slug_conflict');
		if (error instanceof AdminError && error.code) throw error;
		fail(error?.message || 'Taslak kaydedilemedi.', 'save_failed', error?.status || 500);
	}
}
