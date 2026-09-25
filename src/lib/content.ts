import { getCollection, type CollectionEntry } from 'astro:content';

import { getReadingTime } from './reading-time.ts';
import { slugifyTag } from './format.ts';

export type CollectionName = 'yazilar' | 'arastirmalar' | 'notlar';

export type AnyEntry =
	| CollectionEntry<'yazilar'>
	| CollectionEntry<'arastirmalar'>
	| CollectionEntry<'notlar'>;

/** Her içerik türünün adı, adresi ve kısa tanımı. */
export const collectionMeta: Record<
	CollectionName,
	{ label: string; singular: string; path: string; description: string }
> = {
	yazilar: {
		label: 'Yazılar',
		singular: 'Fikir yazısı',
		path: '/yazilar/',
		description: 'Düşünceler, görüşler ve denemeler.',
	},
	arastirmalar: {
		label: 'Araştırmalar',
		singular: 'Araştırma',
		path: '/arastirmalar/',
		description: 'Kaynaklara dayanan, daha uzun ve ayrıntılı çalışmalar.',
	},
	notlar: {
		label: 'Notlar',
		singular: 'Not',
		path: '/notlar/',
		description: 'Kısa düşünceler, gözlemler ve kayıtlar.',
	},
};

/**
 * Liste ve kartlarda kullanılan, okunması kolay tek tip içerik nesnesi.
 * Üç koleksiyonun tamamı aynı frontmatter alanlarını paylaştığı için
 * tek bir tip hepsini karşılar.
 */
export interface Post {
	id: string;
	collection: CollectionName;
	url: string;
	readingTime: number;
	entry: AnyEntry;
	data: AnyEntry['data'];
}

/**
 * Taslaklar yalnızca `npm run dev` sırasında görünür.
 * `npm run build` ile alınan yayın sürümünde tamamen atlanırlar.
 */
const showDrafts = import.meta.env.DEV;

function toPost(entry: AnyEntry): Post {
	const collection = entry.collection as CollectionName;

	return {
		id: entry.id,
		collection,
		url: `${collectionMeta[collection].path}${entry.id}/`,
		readingTime: getReadingTime(entry.body),
		entry,
		data: entry.data,
	};
}

function byDateDesc(a: Post, b: Post): number {
	return b.data.date.valueOf() - a.data.date.valueOf();
}

/** Tek bir içerik türünü, en yeniden en eskiye sıralı olarak döndürür. */
export async function getPosts(collection: CollectionName): Promise<Post[]> {
	const entries = await getCollection(collection, ({ data }) => showDrafts || !data.draft);
	return (entries as AnyEntry[]).map(toPost).sort(byDateDesc);
}

/** Üç içerik türünün tamamını birlikte, en yeniden en eskiye sıralı döndürür. */
export async function getAllPosts(): Promise<Post[]> {
	const groups = await Promise.all(
		(Object.keys(collectionMeta) as CollectionName[]).map((name) => getPosts(name)),
	);
	return groups.flat().sort(byDateDesc);
}

/**
 * Ana sayfada gösterilecek öne çıkan yazı.
 * Yalnızca `featured: true` olanlar adaydır; birden fazlaysa en yenisi seçilir.
 * Hiçbiri işaretli değilse bölüm gösterilmez.
 */
export async function getFeaturedPost(): Promise<Post | undefined> {
	const posts = await getAllPosts();
	return posts.find((post) => post.data.featured === true);
}

/** Aynı türdeki bir önceki ve bir sonraki yazı (makale sonu gezinmesi için). */
export function getNeighbours(posts: Post[], id: string): { prev?: Post; next?: Post } {
	const index = posts.findIndex((post) => post.id === id);
	if (index === -1) return {};

	// Liste en yeniden en eskiye sıralı: bir sonraki yazı listede daha yukarıdadır.
	return { next: posts[index - 1], prev: posts[index + 1] };
}

export interface TagInfo {
	slug: string;
	label: string;
	count: number;
}

/** Sitedeki bütün etiketleri, içerik sayısına göre sıralı olarak toplar. */
export async function getAllTags(): Promise<TagInfo[]> {
	const posts = await getAllPosts();
	const tags = new Map<string, TagInfo>();

	for (const post of posts) {
		for (const tag of post.data.tags) {
			const slug = slugifyTag(tag);
			if (!slug) continue;

			const existing = tags.get(slug);
			if (existing) {
				existing.count += 1;
			} else {
				tags.set(slug, { slug, label: tag, count: 1 });
			}
		}
	}

	return [...tags.values()].sort(
		(a, b) => b.count - a.count || a.label.localeCompare(b.label, 'tr'),
	);
}

/** Belirli bir etikete sahip bütün içerikler. */
export async function getPostsByTag(slug: string): Promise<Post[]> {
	const posts = await getAllPosts();
	return posts.filter((post) => post.data.tags.some((tag) => slugifyTag(tag) === slug));
}
