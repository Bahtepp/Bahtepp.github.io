// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { satteri } from '@astrojs/markdown-satteri';

import { SITE_URL } from './src/site.config.ts';
import { externalLinksPlugin, tableWrapPlugin } from './src/markdown/plugins.ts';

// https://astro.build/config
export default defineConfig({
	// Canonical adres, sitemap ve RSS bu değerden üretilir.
	// bahtep.com bağlandığında src/site.config.ts içindeki `useCustomDomain` true yapılır.
	site: SITE_URL,

	// Depo adı `bahtepp.github.io` olduğu için site kök dizinde çalışır, `base` gerekmez.

	trailingSlash: 'always',

	build: {
		format: 'directory',
	},

	integrations: [
		sitemap({
			// Arama sayfasının kendisi arama motorlarına gönderilmez.
			filter: (page) => !page.includes('/arama/'),
		}),
		mdx(),
	],

	markdown: {
		processor: satteri({
			features: {
				smartPunctuation: true,
				gfm: {
					// Dipnot bölümünün Türkçe başlığı ve "metne dön" bağlantısı.
					footnotes: {
						label: 'Kaynakça',
						backContent: '↩',
						backLabel: '{reference} numaralı dipnotun metindeki yerine dön',
					},
				},
			},
			hastPlugins: [externalLinksPlugin, tableWrapPlugin],
		}),
	},
});
