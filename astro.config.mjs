// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { satteri } from '@astrojs/markdown-satteri';

import { SITE_URL } from './src/site.config.ts';
import { markdownFeatures, markdownHastPlugins } from './src/markdown/plugins.ts';

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
		// Özellikler ve eklentiler src/markdown/plugins.ts içinde tanımlıdır;
		// yerel yönetim panelinin önizlemesi de aynı dosyayı kullanır.
		processor: satteri({
			features: markdownFeatures,
			hastPlugins: markdownHastPlugins,
		}),
	},
});
