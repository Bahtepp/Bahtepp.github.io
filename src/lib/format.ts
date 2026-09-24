import { siteConfig } from '../site.config.ts';

const longDate = new Intl.DateTimeFormat('tr-TR', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: 'UTC',
});

const shortDate = new Intl.DateTimeFormat('tr-TR', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	timeZone: 'UTC',
});

/** 24 Eylül 2026 */
export function formatDate(date: Date): string {
	return longDate.format(date);
}

/** 24 Eyl 2026 */
export function formatDateShort(date: Date): string {
	return shortDate.format(date);
}

/** <time datetime="..."> için makine okunur tarih. */
export function toISODate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** Etiketleri URL'de kullanılabilir hale getirir: "Yapay Zekâ" -> "yapay-zeka" */
export function slugifyTag(tag: string): string {
	const map: Record<string, string> = {
		ç: 'c',
		ğ: 'g',
		ı: 'i',
		İ: 'i',
		ö: 'o',
		ş: 's',
		ü: 'u',
		â: 'a',
		î: 'i',
		û: 'u',
	};

	return tag
		.trim()
		.toLocaleLowerCase(siteConfig.lang)
		.replace(/[çğıİöşüâîû]/g, (ch) => map[ch] ?? ch)
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
