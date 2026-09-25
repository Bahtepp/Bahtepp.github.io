/**
 * İçerik dosyalarını okuma, oluşturma, güncelleme ve silme işlemleri.
 * Bütün yol üretimi project.mjs üzerinden yapılır, böylece panel yalnızca
 * izin verilen üç içerik klasörü ile public/images içine dokunabilir.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';

import { slugifyTag } from '../../../src/lib/format.ts';
import { siteConfig } from '../../../src/site.config.ts';

import {
	AdminError,
	COLLECTIONS,
	CONTENT_EXTENSIONS,
	IMAGES_DIR,
	IMAGE_LIST_EXTENSIONS,
	IMAGE_UPLOAD_EXTENSIONS,
	MAX_IMAGE_BYTES,
	contentFilePath,
	imageFilePath,
	requireCollection,
	requireSlug,
} from './project.mjs';
import {
	findFootnoteReferences,
	joinFootnoteDefinitions,
	parseFile,
	requireDateString,
	resolvePublishDates,
	serializeFile,
	splitFootnoteDefinitions,
	toDateString,
} from './frontmatter.mjs';

/** Başlıktan dosya adı üretir; site etiket slug'ları ile aynı kuralları kullanır. */
export function slugify(text) {
	return slugifyTag(String(text ?? ''));
}

async function exists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

/** Bir slug için herhangi bir uzantıda dosya var mı? Varsa yolunu döndürür. */
async function findExistingFile(collectionKey, slug) {
	for (const ext of CONTENT_EXTENSIONS) {
		const candidate = contentFilePath(collectionKey, slug, ext);
		if (await exists(candidate)) return { filePath: candidate, ext };
	}
	return null;
}

function summarize(collectionKey, fileName, data, stat) {
	const collection = COLLECTIONS[collectionKey];
	const slug = path.basename(fileName, path.extname(fileName));
	return {
		collection: collectionKey,
		collectionLabel: collection.label,
		badge: typeof data.category === 'string' && data.category ? data.category : collection.badge,
		slug,
		fileName,
		ext: path.extname(fileName),
		title: typeof data.title === 'string' ? data.title : '(başlıksız)',
		description: typeof data.description === 'string' ? data.description : '',
		date: toDateString(data.date),
		publishedAt: toDateString(data.publishedAt),
		updatedDate: toDateString(data.updatedDate),
		tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
		draft: data.draft === true,
		featured: data.featured === true,
		image: typeof data.image === 'string' ? data.image : '',
		url: `${collection.urlBase}/${slug}/`,
		modified: stat.mtime.toISOString(),
	};
}

/** Üç koleksiyondaki bütün içerikleri listeler (klasörlerin doğrudan içindeki dosyalar). */
export async function listContent() {
	const items = [];
	const problems = [];

	for (const key of Object.keys(COLLECTIONS)) {
		const dir = COLLECTIONS[key].dir;
		let names;
		try {
			names = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			continue;
		}

		for (const entry of names) {
			if (!entry.isFile()) continue;
			if (!CONTENT_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) continue;

			const filePath = path.join(dir, entry.name);
			try {
				const [raw, stat] = await Promise.all([
					fs.readFile(filePath, 'utf8'),
					fs.stat(filePath),
				]);
				const { data } = parseFile(raw);
				items.push(summarize(key, entry.name, data, stat));
			} catch (error) {
				problems.push({ file: `${key}/${entry.name}`, message: error.message });
			}
		}
	}

	items.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title, 'tr'));
	return { items, problems };
}

/** Düzenleme için tek bir içeriği tüm ayrıntılarıyla okur. */
export async function readEntry(collectionKey, slug) {
	requireCollection(collectionKey);
	const safeSlug = requireSlug(slug);
	const found = await findExistingFile(collectionKey, safeSlug);
	if (!found) {
		throw new AdminError('İçerik bulunamadı.', 404);
	}

	const raw = await fs.readFile(found.filePath, 'utf8');
	const { data, body } = parseFile(raw);
	const split = splitFootnoteDefinitions(body);

	return {
		collection: collectionKey,
		slug: safeSlug,
		ext: found.ext,
		title: typeof data.title === 'string' ? data.title : '',
		description: typeof data.description === 'string' ? data.description : '',
		date: toDateString(data.date),
		publishedAt: toDateString(data.publishedAt),
		updatedDate: toDateString(data.updatedDate),
		tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
		draft: data.draft === true,
		featured: data.featured === true,
		image: typeof data.image === 'string' ? data.image : '',
		imageAlt: typeof data.imageAlt === 'string' ? data.imageAlt : '',
		body: split.body,
		footnotes: split.definitions,
		url: `${COLLECTIONS[collectionKey].urlBase}/${safeSlug}/`,
	};
}

function buildFrontmatter(original, input) {
	// Panelin tanımadığı alanlar (elle eklenmiş bir şey olabilir) korunur.
	const data = { ...original };

	data.title = input.title;
	data.description = input.description;
	data.date = input.date;
	if (input.publishedAt) data.publishedAt = input.publishedAt;
	else delete data.publishedAt;
	data.draft = input.draft;
	data.featured = input.featured;

	// Boş kalan seçimlik alanlar dosyaya hiç yazılmaz.
	if (input.updatedDate) data.updatedDate = input.updatedDate;
	else delete data.updatedDate;

	if (input.tags.length > 0) data.tags = input.tags;
	else delete data.tags;

	if (input.image) data.image = input.image;
	else delete data.image;

	if (input.imageAlt && input.image) data.imageAlt = input.imageAlt;
	else delete data.imageAlt;

	// Yeni dosyada yazar yazılmaz (şema varsayılanı kullanılır).
	// Mevcut dosyada varsa olduğu gibi bırakılır.
	if (!Object.hasOwn(original, 'author')) {
		delete data.author;
	}

	return data;
}

function normalizeInput(payload) {
	const title = String(payload?.title ?? '').trim();
	if (!title) {
		throw new AdminError('Başlık boş olamaz.');
	}

	const description = String(payload?.description ?? '').trim();
	if (!description) {
		throw new AdminError('Kısa açıklama zorunludur (şema bu alanı istiyor).');
	}

	const tags = Array.isArray(payload?.tags)
		? [...new Set(payload.tags.map((tag) => String(tag).trim()).filter(Boolean))]
		: [];

	const image = String(payload?.image ?? '').trim();

	return {
		title,
		description,
		updatedDate: payload?.updatedDate ? requireDateString(payload.updatedDate, 'Son güncelleme tarihi') : '',
		tags,
		draft: payload?.draft === true,
		featured: payload?.featured === true,
		image,
		imageAlt: String(payload?.imageAlt ?? '').trim(),
		body: String(payload?.body ?? ''),
		footnotes: Array.isArray(payload?.footnotes) ? payload.footnotes : [],
	};
}

/**
 * Yeni içerik oluşturur veya var olanı günceller.
 * Aynı slug'a sahip bir dosya varsa asla üzerine yazılmaz.
 */
export async function saveEntry(payload) {
	const collection = requireCollection(payload?.collection);
	const input = normalizeInput(payload);
	const targetSlug = requireSlug(payload?.slug);

	const isUpdate = Boolean(payload?.originalSlug);
	let original = {};
	let originalFile = null;
	let originalCollectionKey = collection.key;

	if (isUpdate) {
		const originalSlug = requireSlug(payload.originalSlug);
		originalCollectionKey = payload.originalCollection
			? requireCollection(payload.originalCollection).key
			: collection.key;
		originalFile = await findExistingFile(originalCollectionKey, originalSlug);
		if (!originalFile) {
			throw new AdminError('Güncellenecek içerik bulunamadı.', 404);
		}
		const raw = await fs.readFile(originalFile.filePath, 'utf8');
		original = parseFile(raw).data;
	}

	const dates = resolvePublishDates(original, {
		isUpdate,
		publishing: input.draft === false,
	});

	// Görsel seçildiyse önce public/images içine kopyalanır.
	let imagePath = input.image;
	if (payload?.imageUpload) {
		const saved = await saveImage(payload.imageUpload);
		imagePath = saved.path;
	}

	const data = buildFrontmatter(original, { ...input, ...dates, image: imagePath });
	const collectionChanged = isUpdate && originalCollectionKey !== collection.key;
	if (!Object.hasOwn(data, 'category') || collectionChanged) {
		data.category = collection.badge;
	}
	const body = joinFootnoteDefinitions(input.body, input.footnotes);
	const contents = serializeFile(data, body);

	const ext = originalFile?.ext ?? '.md';
	const targetPath = contentFilePath(collection.key, targetSlug, ext);
	const isRename = isUpdate && targetPath !== originalFile.filePath;

	if (!isUpdate || isRename) {
		// wx: dosya zaten varsa yazma başarısız olur, yani üzerine yazılmaz.
		const clash = await findExistingFile(collection.key, targetSlug);
		if (clash) {
			throw new AdminError(
				`"${targetSlug}" dosya adı bu bölümde zaten kullanılıyor. Başka bir dosya adı seç.`,
			);
		}
		try {
			await fs.writeFile(targetPath, contents, { encoding: 'utf8', flag: 'wx' });
		} catch (error) {
			if (error.code === 'EEXIST') {
				throw new AdminError(`"${targetSlug}" dosya adı zaten kullanılıyor.`);
			}
			throw error;
		}
		if (isRename) {
			// Yeni dosya sorunsuz yazıldıktan sonra eskisi kaldırılır.
			await fs.unlink(originalFile.filePath);
		}
	} else {
		await fs.writeFile(targetPath, contents, 'utf8');
	}

	if (data.featured === true) {
		await clearOtherFeatured(collection.key, targetSlug);
	}

	return {
		collection: collection.key,
		slug: targetSlug,
		renamedFrom: isRename ? path.basename(originalFile.filePath) : null,
		movedFrom: collectionChanged ? originalCollectionKey : null,
		image: imagePath,
		url: `${collection.urlBase}/${targetSlug}/`,
		date: data.date,
		publishedAt: data.publishedAt ?? '',
		draft: data.draft === true,
		featured: data.featured === true,
	};
}

/** Taslak durumunu tek alan değiştirerek günceller. */
export async function setDraft(collectionKey, slug, draft) {
	requireCollection(collectionKey);
	const safeSlug = requireSlug(slug);
	const found = await findExistingFile(collectionKey, safeSlug);
	if (!found) throw new AdminError('İçerik bulunamadı.', 404);

	const raw = await fs.readFile(found.filePath, 'utf8');
	const { data, body } = parseFile(raw);
	const dates = resolvePublishDates(data, { isUpdate: true, publishing: draft === false });
	data.date = dates.date;
	if (dates.publishedAt) data.publishedAt = dates.publishedAt;
	else delete data.publishedAt;
	data.draft = draft === true;
	await fs.writeFile(found.filePath, serializeFile(data, body), 'utf8');
	return {
		collection: collectionKey,
		slug: safeSlug,
		draft: data.draft,
		date: data.date,
		publishedAt: data.publishedAt ?? '',
	};
}

/** Ana sayfa tek öne çıkan kart gösterdiği için yeni seçimde diğerleri kapanır. */
async function clearOtherFeatured(keepCollection, keepSlug) {
	const { items } = await listContent();
	for (const item of items) {
		if (!item.featured) continue;
		if (item.collection === keepCollection && item.slug === keepSlug) continue;

		const found = await findExistingFile(item.collection, item.slug);
		if (!found) continue;

		const raw = await fs.readFile(found.filePath, 'utf8');
		const parsed = parseFile(raw);
		if (parsed.data.featured !== true) continue;
		parsed.data.featured = false;
		await fs.writeFile(found.filePath, serializeFile(parsed.data, parsed.body), 'utf8');
	}
}

/**
 * İçeriği siler. İki aşamalı onayın ikinci adımı sunucuda da doğrulanır:
 * istemcinin dosya adını birebir göndermesi gerekir.
 */
export async function deleteEntry(collectionKey, slug, confirmSlug) {
	requireCollection(collectionKey);
	const safeSlug = requireSlug(slug);
	if (String(confirmSlug ?? '').trim() !== safeSlug) {
		throw new AdminError('Silme onayı eşleşmedi. Dosya adını birebir yazman gerekiyor.');
	}
	const found = await findExistingFile(collectionKey, safeSlug);
	if (!found) throw new AdminError('İçerik bulunamadı.', 404);
	await fs.unlink(found.filePath);
	return { deleted: `${collectionKey}/${path.basename(found.filePath)}` };
}

/** public/images içindeki görselleri listeler. */
export async function listImages() {
	let names;
	try {
		names = await fs.readdir(IMAGES_DIR, { withFileTypes: true });
	} catch {
		return [];
	}

	const out = [];
	for (const entry of names) {
		if (!entry.isFile()) continue;
		if (!IMAGE_LIST_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) continue;
		const stat = await fs.stat(path.join(IMAGES_DIR, entry.name));
		out.push({
			name: entry.name,
			path: `/images/${entry.name}`,
			size: stat.size,
			modified: stat.mtime.toISOString(),
		});
	}
	out.sort((a, b) => b.modified.localeCompare(a.modified));
	return out;
}

/** Yüklenen görseli public/images içine güvenli bir adla kopyalar. */
export async function saveImage(upload) {
	const rawName = String(upload?.name ?? '').trim();
	const ext = path.extname(rawName).toLowerCase();
	if (!IMAGE_UPLOAD_EXTENSIONS.includes(ext)) {
		throw new AdminError(
			`Bu görsel biçimi kabul edilmiyor. İzin verilenler: ${IMAGE_UPLOAD_EXTENSIONS.join(', ')}`,
		);
	}

	const base64 = String(upload?.data ?? '').replace(/^data:[^;]+;base64,/, '');
	let buffer;
	try {
		buffer = Buffer.from(base64, 'base64');
	} catch {
		throw new AdminError('Görsel verisi okunamadı.');
	}
	if (buffer.length === 0) throw new AdminError('Görsel dosyası boş.');
	if (buffer.length > MAX_IMAGE_BYTES) {
		throw new AdminError(
			`Görsel çok büyük (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Sınır ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`,
		);
	}

	const stem = slugify(path.basename(rawName, ext)) || 'gorsel';
	await fs.mkdir(IMAGES_DIR, { recursive: true });

	// Var olan bir görselin üzerine yazılmaz; gerekirse sonuna sayı eklenir.
	let fileName = `${stem}${ext}`;
	for (let n = 2; await exists(imageFilePath(fileName)); n += 1) {
		fileName = `${stem}-${n}${ext}`;
		if (n > 200) throw new AdminError('Uygun bir görsel adı bulunamadı.');
	}

	const target = imageFilePath(fileName);
	await fs.writeFile(target, buffer, { flag: 'wx' });
	return { name: fileName, path: `/images/${fileName}`, size: buffer.length };
}

/** Astro geliştirme sunucusu açık mı? "Sitede Önizle" bunu kullanır. */
export function probeDevServer(port = 4321) {
	return new Promise((resolve) => {
		const socket = net.connect({ host: '127.0.0.1', port });
		const done = (running) => {
			socket.destroy();
			resolve(running);
		};
		socket.setTimeout(700);
		socket.once('connect', () => done(true));
		socket.once('timeout', () => done(false));
		socket.once('error', () => done(false));
	});
}

/** Metinde tanımsız kalan veya hiç kullanılmayan dipnotları bildirir. */
export function checkFootnotes(body, definitions) {
	const referenced = new Set(findFootnoteReferences(body));
	const defined = new Set((definitions ?? []).map((d) => String(d?.key ?? '').trim()).filter(Boolean));
	return {
		missing: [...referenced].filter((key) => !defined.has(key)),
		unused: [...defined].filter((key) => !referenced.has(key)),
	};
}
