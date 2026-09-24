import { siteConfig } from '../site.config.ts';

/**
 * Markdown gövdesinden tahmini okuma süresini (dakika) hesaplar.
 * Kod blokları, bağlantı adresleri ve işaretleme karakterleri sayıma katılmaz.
 */
export function getReadingTime(body: string | undefined): number {
	if (!body) return 1;

	const plain = body
		.replace(/^---[\s\S]*?---/, ' ')
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`[^`]*`/g, ' ')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/<\/?[^>]+>/g, ' ')
		.replace(/[#>*_~|=+-]/g, ' ');

	const words = plain.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / siteConfig.wordsPerMinute));
}

/** "8 dk okuma" biçiminde metin üretir. */
export function formatReadingTime(minutes: number): string {
	return `${minutes} dk okuma`;
}
