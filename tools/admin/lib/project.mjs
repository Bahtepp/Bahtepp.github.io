/**
 * Proje yolları, koleksiyon tanımları ve güvenlik doğrulamaları.
 *
 * Bu dosya paneldeki bütün dosya işlemlerinin tek giriş kapısıdır: hangi
 * klasörlere yazılabileceği ve hangi dosya adlarının kabul edildiği burada
 * belirlenir. Panel yalnızca burada tanımlı klasörlerin içine dokunabilir.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Proje kök dizini (package.json'ın bulunduğu yer). */
export const ROOT = path.resolve(here, '..', '..', '..');

export const CONTENT_ROOT = path.join(ROOT, 'src', 'content');
export const IMAGES_DIR = path.join(ROOT, 'public', 'images');

/** Panelin yönettiği üç koleksiyon. src/content.config.ts ile aynı olmalıdır. */
export const COLLECTIONS = {
	yazilar: {
		key: 'yazilar',
		label: 'Fikir Yazıları',
		singular: 'Fikir Yazısı',
		badge: 'Fikir',
		dir: path.join(CONTENT_ROOT, 'yazilar'),
		urlBase: '/yazilar',
	},
	arastirmalar: {
		key: 'arastirmalar',
		label: 'Araştırmalar',
		singular: 'Araştırma',
		badge: 'Araştırma',
		dir: path.join(CONTENT_ROOT, 'arastirmalar'),
		urlBase: '/arastirmalar',
	},
	notlar: {
		key: 'notlar',
		label: 'Notlar',
		singular: 'Not',
		badge: 'Not',
		dir: path.join(CONTENT_ROOT, 'notlar'),
		urlBase: '/notlar',
	},
};

/** Panelin oluşturabileceği/düzenleyebileceği dosya uzantıları. */
export const CONTENT_EXTENSIONS = ['.md', '.mdx'];

/** Yüklenmesine izin verilen görsel uzantıları. */
export const IMAGE_UPLOAD_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/** Medya seçicide listelenen uzantılar (projede hazır duran görseller dahil). */
export const IMAGE_LIST_EXTENSIONS = [...IMAGE_UPLOAD_EXTENSIONS, '.svg', '.avif', '.gif'];

/** Yüklenen bir görsel için üst sınır. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** İstek gövdesi üst sınırı (base64 görsel şişmesine yer bırakır). */
export const MAX_BODY_BYTES = 12 * 1024 * 1024;

/**
 * Panelde kullanıcıya gösterilmeye uygun hata. Sunucu bunları 400 olarak
 * döndürür; beklenmeyen hatalar ise 500 olur ve ayrıntısı gizlenmez çünkü
 * araç yalnızca yerel makinede çalışır.
 */
export class AdminError extends Error {
	constructor(message, status = 400) {
		super(message);
		this.name = 'AdminError';
		this.status = status;
	}
}

/** Koleksiyon anahtarını doğrular ve tanımını döndürür. */
export function requireCollection(key) {
	const collection = Object.hasOwn(COLLECTIONS, key) ? COLLECTIONS[key] : undefined;
	if (!collection) {
		throw new AdminError(`Bilinmeyen içerik türü: ${String(key)}`);
	}
	return collection;
}

/** Dosya adı olarak kabul edilen slug biçimi: küçük harf, rakam ve tek tire. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Slug'ı doğrular. Nokta, eğik çizgi, boşluk ve büyük harf kabul edilmez;
 * bu sayede `../` gibi dizin dışına çıkma denemeleri baştan engellenir.
 */
export function requireSlug(slug) {
	const value = typeof slug === 'string' ? slug.trim() : '';
	if (!value) {
		throw new AdminError('Dosya adı (slug) boş olamaz.');
	}
	if (value.length > 120) {
		throw new AdminError('Dosya adı çok uzun (en fazla 120 karakter).');
	}
	if (!SLUG_PATTERN.test(value)) {
		throw new AdminError(
			'Dosya adı yalnızca küçük harf, rakam ve tire içerebilir. Örnek: yapay-zeka-ve-oyun',
		);
	}
	return value;
}

/** Uzantıyı doğrular. */
export function requireExtension(ext) {
	const value = typeof ext === 'string' ? ext.toLowerCase() : '';
	if (!CONTENT_EXTENSIONS.includes(value)) {
		throw new AdminError(`Desteklenmeyen dosya uzantısı: ${String(ext)}`);
	}
	return value;
}

/**
 * Bir yolun izin verilen klasörün gerçekten içinde kaldığını doğrular.
 * path.resolve sonrası kontrol edildiği için sembolik olmayan bütün
 * `..` denemeleri burada yakalanır.
 */
export function assertInside(baseDir, targetPath) {
	const base = path.resolve(baseDir);
	const target = path.resolve(targetPath);
	if (target !== base && !target.startsWith(base + path.sep)) {
		throw new AdminError('İzin verilmeyen dosya yolu.', 403);
	}
	return target;
}

/** Koleksiyon + slug + uzantıdan güvenli tam dosya yolu üretir. */
export function contentFilePath(collectionKey, slug, ext = '.md') {
	const collection = requireCollection(collectionKey);
	const safeSlug = requireSlug(slug);
	const safeExt = requireExtension(ext);
	return assertInside(collection.dir, path.join(collection.dir, `${safeSlug}${safeExt}`));
}

/** public/images içindeki bir dosya için güvenli tam yol üretir. */
export function imageFilePath(fileName) {
	const value = typeof fileName === 'string' ? fileName : '';
	if (!value || value.includes('/') || value.includes('\\') || value.includes('..')) {
		throw new AdminError('Geçersiz görsel adı.');
	}
	return assertInside(IMAGES_DIR, path.join(IMAGES_DIR, value));
}
