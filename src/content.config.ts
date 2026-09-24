import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

import { siteConfig } from './site.config.ts';

/**
 * Üç içerik türünün paylaştığı frontmatter alanları.
 * `category` her koleksiyonda kendi varsayılan değeriyle eklenir.
 */
const baseSchema = z.object({
	/** Yazının başlığı. Zorunlu. */
	title: z.string(),
	/** Listelerde ve arama motorlarında görünen kısa açıklama. Zorunlu. */
	description: z.string(),
	/** Yayın tarihi, örn. 2026-09-24. Zorunlu. */
	date: z.coerce.date(),
	/** Sonradan güncellediysen güncelleme tarihi. */
	updatedDate: z.coerce.date().optional(),
	/** Etiketler. Küçük harf ve tire ile yazılması önerilir. */
	tags: z.array(z.string()).default([]),
	/** Yazar adı. Boş bırakılırsa merkezi ayardaki isim kullanılır. */
	author: z.string().default(siteConfig.author),
	/** `true` ise yazı yayınlanmış sitede görünmez. */
	draft: z.boolean().default(false),
	/** `true` ise ana sayfada öne çıkan yazı olarak seçilebilir. */
	featured: z.boolean().default(false),
	/** Kapak görseli, örn. "/images/ornek.jpg". */
	image: z.string().optional(),
	/** Kapak görselinin alternatif metni (erişilebilirlik için). */
	imageAlt: z.string().optional(),
});

const yazilar = defineCollection({
	loader: glob({ base: './src/content/yazilar', pattern: '**/*.{md,mdx}' }),
	schema: baseSchema.extend({
		category: z.string().default('Fikir'),
	}),
});

const arastirmalar = defineCollection({
	loader: glob({ base: './src/content/arastirmalar', pattern: '**/*.{md,mdx}' }),
	schema: baseSchema.extend({
		category: z.string().default('Araştırma'),
	}),
});

const notlar = defineCollection({
	loader: glob({ base: './src/content/notlar', pattern: '**/*.{md,mdx}' }),
	schema: baseSchema.extend({
		category: z.string().default('Not'),
	}),
});

/**
 * Statik sayfa metinleri. Liste, RSS ve etiket sayfalarına girmez;
 * yalnızca ilgili Astro sayfası (ör. /hakkimda/) bunları okur.
 */
const pages = defineCollection({
	loader: glob({ base: './src/content/pages', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
	}),
});

export const collections = { yazilar, arastirmalar, notlar, pages };
