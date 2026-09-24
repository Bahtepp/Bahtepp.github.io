/**
 * Önizleme, sitenin kendi Markdown motorunu kullanır.
 *
 * Özellikler ve eklentiler src/markdown/plugins.ts içinden alınır; yani
 * astro.config.mjs ile birebir aynı yapılandırma. Böylece paneldeki önizleme
 * ile yayınlanan sayfa arasında dipnot, tablo ve bağlantı davranışı farkı olmaz.
 */

import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';

import { markdownFeatures, markdownHastPlugins } from '../../../src/markdown/plugins.ts';

let rendererPromise;

async function getRenderer() {
	rendererPromise ??= createSatteriMarkdownProcessor({
		features: markdownFeatures,
		hastPlugins: markdownHastPlugins,
		syntaxHighlight: 'shiki',
		shikiConfig: { theme: 'github-dark', wrap: false },
	}).catch(() =>
		// Vurgulayıcı kurulamazsa önizleme kod renklendirmesi olmadan çalışmaya devam eder.
		createSatteriMarkdownProcessor({
			features: markdownFeatures,
			hastPlugins: markdownHastPlugins,
		}),
	);
	return rendererPromise;
}

/** Markdown metnini siteyle aynı HTML'e çevirir. */
export async function renderMarkdown(markdown) {
	const renderer = await getRenderer();
	const result = await renderer.render(String(markdown ?? ''));
	return { html: result.code, headings: result.metadata.headings };
}
