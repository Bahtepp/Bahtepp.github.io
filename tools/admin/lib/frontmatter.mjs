/**
 * Markdown dosyalarının frontmatter ve gövde bölümlerini okuyup yazar,
 * dipnot tanımlarını gövdeden ayırır.
 *
 * Yazma tarafı elle yapılır (hazır bir YAML yazıcısı değil) çünkü dosyaların
 * mevcut içeriklerle aynı biçimde kalması isteniyor: tarihler tırnaksız,
 * metinler çift tırnaklı, etiketler alt alta.
 */

import YAML from 'yaml';

import { AdminError } from './project.mjs';

/** Panelin doğrudan yönettiği frontmatter alanları, dosyaya yazılma sırasıyla. */
const MANAGED_KEYS = [
	'title',
	'description',
	'date',
	'publishedAt',
	'updatedDate',
	'category',
	'tags',
	'author',
	'draft',
	'featured',
	'image',
	'imageAlt',
];

const ISTANBUL_TIME_ZONE = 'Europe/Istanbul';

const FRONTMATTER_RE = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/;

/**
 * Dosya içeriğini frontmatter nesnesi ve gövdeye ayırır.
 * Frontmatter yoksa boş nesne ve tüm metin gövde olarak döner.
 */
export function parseFile(raw) {
	const text = String(raw).replace(/\r\n/g, '\n');
	const match = FRONTMATTER_RE.exec(text);
	if (!match) {
		return { data: {}, body: text.replace(/^\uFEFF/, '') };
	}

	let data;
	try {
		data = YAML.parse(match[1]) ?? {};
	} catch (error) {
		throw new AdminError(
			`Dosyanın frontmatter bölümü okunamadı: ${error.message}`,
		);
	}
	if (typeof data !== 'object' || Array.isArray(data)) {
		throw new AdminError('Dosyanın frontmatter bölümü beklenen biçimde değil.');
	}

	return { data, body: match[2] ?? '' };
}

/** Tarihi dosyada tutulan YYYY-MM-DD metnine çevirir. */
export function toDateString(value) {
	if (value == null || value === '') return '';
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) return '';
		return istanbulDateString(value);
	}
	const text = String(value).trim();
	const direct = /^(\d{4}-\d{2}-\d{2})/.exec(text);
	if (direct) return direct[1];
	const parsed = new Date(text);
	if (Number.isNaN(parsed.getTime())) return '';
	return istanbulDateString(parsed);
}

/** Europe/Istanbul takvim günü, YYYY-MM-DD. */
export function istanbulDateString(now = new Date()) {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: ISTANBUL_TIME_ZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(now);
}

/**
 * Yayın tarihini sunucu tarafında çözer.
 * İlk yayın anında İstanbul günü yazılır; sonraki kayıtlar ve yeniden yayın bu değeri korur.
 * İstemciden gelen tarih kullanılmaz.
 */
export function resolvePublishDates(original, { isUpdate, publishing }) {
	const existingPublishedAt = toDateString(original?.publishedAt);
	const existingDate = toDateString(original?.date);
	const wasLive = isUpdate && original?.draft === false;
	const wasPublished = Boolean(existingPublishedAt) || (wasLive && Boolean(existingDate));

	if (wasPublished) {
		const kept = existingPublishedAt || existingDate;
		return { date: kept, publishedAt: kept };
	}

	if (publishing) {
		const now = istanbulDateString();
		return { date: now, publishedAt: now };
	}

	return {
		date: existingDate || istanbulDateString(),
		publishedAt: '',
	};
}

/** YYYY-MM-DD biçimini ve gerçek bir takvim günü olduğunu doğrular. */
export function requireDateString(value, alanAdi) {
	const text = toDateString(value);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
		throw new AdminError(`${alanAdi} geçerli bir tarih olmalı (örnek: 2026-09-24).`);
	}
	const [y, m, d] = text.split('-').map(Number);
	const date = new Date(Date.UTC(y, m - 1, d));
	if (
		date.getUTCFullYear() !== y ||
		date.getUTCMonth() !== m - 1 ||
		date.getUTCDate() !== d
	) {
		throw new AdminError(`${alanAdi} takvimde olmayan bir gün.`);
	}
	return text;
}

function quote(value) {
	// JSON metin kaçışları YAML çift tırnaklı biçimiyle uyumludur.
	return JSON.stringify(String(value));
}

// Tırnak gerektirmeyen sade etiketler: harf/rakam ile başlar, boşluk ve
// YAML'de anlamı olan karakter içermez. Mevcut içerik dosyalarındaki biçim budur.
const PLAIN_SCALAR_RE = /^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u;

function scalar(value) {
	const text = String(value);
	const looksLikeKeyword = /^(true|false|null|yes|no|on|off|~)$/i.test(text);
	const looksNumeric = /^[-+]?(\d|\.\d)/.test(text);
	return PLAIN_SCALAR_RE.test(text) && !looksLikeKeyword && !looksNumeric ? text : quote(text);
}

function emit(key, value) {
	if (key === 'date' || key === 'updatedDate' || key === 'publishedAt') {
		return `${key}: ${toDateString(value)}`;
	}
	if (key === 'tags') {
		const list = Array.isArray(value) ? value : [];
		return [`${key}:`, ...list.map((tag) => `  - ${scalar(tag)}`)].join('\n');
	}
	if (typeof value === 'boolean') {
		return `${key}: ${value ? 'true' : 'false'}`;
	}
	if (typeof value === 'number') {
		return `${key}: ${value}`;
	}
	if (typeof value === 'string') {
		return `${key}: ${quote(value)}`;
	}
	// Panelin tanımadığı bir yapı (liste/nesne) varsa olduğu gibi korunur.
	return YAML.stringify({ [key]: value }).trimEnd();
}

/**
 * Frontmatter nesnesini dosya metnine çevirir.
 * Bilinen alanlar sabit sırayla, panelin tanımadığı alanlar sonda yazılır;
 * böylece düzenleme sırasında elle eklenmiş bir alan kaybolmaz.
 */
export function serializeFile(data, body) {
	const lines = [];
	for (const key of MANAGED_KEYS) {
		if (!Object.hasOwn(data, key)) continue;
		lines.push(emit(key, data[key]));
	}
	for (const key of Object.keys(data)) {
		if (MANAGED_KEYS.includes(key)) continue;
		lines.push(emit(key, data[key]));
	}

	const text = String(body).replace(/\r\n/g, '\n').replace(/^\n+/, '').trimEnd();
	return `---\n${lines.join('\n')}\n---\n\n${text}\n`;
}

const DEFINITION_RE = /^\[\^([^\]\s]+)\]:[ \t]?(.*)$/;

/**
 * Gövdenin sonundaki dipnot tanımı bloğunu ayırır.
 *
 * Yalnızca dosyanın en sonunda kesintisiz duran tanımlar alınır. Metnin
 * ortasındaki bir tanıma rastlanırsa ayırma orada durur ve o tanım gövdede
 * kalır: Markdown bunu yine doğru işler, yani hiçbir şey kaybolmaz.
 */
export function splitFootnoteDefinitions(body) {
	const lines = String(body).replace(/\r\n/g, '\n').split('\n');
	const found = [];
	let end = lines.length;

	while (end > 0) {
		const line = lines[end - 1];
		if (line.trim() === '') {
			end -= 1;
			continue;
		}
		const match = DEFINITION_RE.exec(line);
		if (!match) break;
		found.unshift({ key: match[1], text: match[2].trim() });
		end -= 1;
	}

	return {
		body: lines.slice(0, end).join('\n').trimEnd(),
		definitions: found,
	};
}

const FOOTNOTE_KEY_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function requireFootnoteKey(key) {
	const value = typeof key === 'string' ? key.trim() : '';
	if (!value) throw new AdminError('Kaynak anahtarı boş olamaz.');
	if (value.length > 60) throw new AdminError('Kaynak anahtarı çok uzun.');
	if (!FOOTNOTE_KEY_RE.test(value)) {
		throw new AdminError(
			`Kaynak anahtarı yalnızca harf, rakam, nokta, alt tire ve tire içerebilir: ${value}`,
		);
	}
	return value;
}

/**
 * Gövdeyi ve dipnot tanımlarını tek metinde birleştirir.
 * Aynı anahtar birden fazla kez verilirse tek tanım yazılır; böylece bir
 * kaynak metinde kaç kez anılırsa anılsın kaynakçada bir kez görünür.
 */
export function joinFootnoteDefinitions(body, definitions) {
	const seen = new Map();
	for (const item of definitions ?? []) {
		const key = requireFootnoteKey(item?.key);
		const text = String(item?.text ?? '').replace(/\s*\n\s*/g, ' ').trim();
		if (!text) {
			throw new AdminError(`"${key}" kaynağının içeriği boş. Kaynağı doldur veya kaldır.`);
		}
		if (!seen.has(key)) seen.set(key, text);
	}

	const base = String(body).replace(/\r\n/g, '\n').trimEnd();
	if (seen.size === 0) return base;

	const block = [...seen.entries()].map(([key, text]) => `[^${key}]: ${text}`).join('\n');
	return base ? `${base}\n\n${block}` : block;
}

/** Gövdede geçen dipnot atıflarını bulur (kod blokları sayılmaz). */
export function findFootnoteReferences(body) {
	const withoutCode = String(body)
		.replace(/^```[\s\S]*?^```/gm, '')
		.replace(/`[^`\n]*`/g, '');
	const keys = new Set();
	for (const match of withoutCode.matchAll(/\[\^([^\]\s]+)\]/g)) {
		keys.add(match[1]);
	}
	return [...keys];
}
