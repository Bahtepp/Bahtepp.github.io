import { defineHastPlugin } from 'satteri';
import type { SatteriFeatures } from '@astrojs/markdown-satteri';

/**
 * Dış bağlantıları yeni sekmede ve `rel="noopener noreferrer"` ile açar.
 * Build sırasında çalışır, tarayıcıya ek JavaScript göndermez.
 */
export const externalLinksPlugin = defineHastPlugin({
	name: 'bahtep-external-links',
	element: {
		filter: ['a'],
		visit(node, ctx) {
			const href = node.properties?.href;
			if (typeof href !== 'string' || !/^https?:\/\//i.test(href)) return;

			ctx.setProperty(node, 'target', '_blank');
			ctx.setProperty(node, 'rel', 'noopener noreferrer');
		},
	},
});

/**
 * Tabloları kaydırılabilir bir kapsayıcıya alır, böylece geniş tablolar
 * mobilde sayfayı yatay olarak taşırmaz.
 */
export const tableWrapPlugin = defineHastPlugin({
	name: 'bahtep-table-wrap',
	element: {
		filter: ['table'],
		visit(node, ctx) {
			ctx.wrapNode(node, {
				type: 'element',
				tagName: 'div',
				properties: { className: ['table-scroll'] },
				children: [],
			});
		},
	},
});

/**
 * Markdown özellikleri tek yerde tutulur, böylece hem site build'i
 * (astro.config.mjs) hem yerel yönetim panelinin önizlemesi aynı
 * kuralları kullanır ve dipnot başlıkları birbirinden ayrı düşmez.
 */
export const markdownFeatures: SatteriFeatures = {
	smartPunctuation: true,
	gfm: {
		// Dipnot bölümünün Türkçe başlığı ve "metne dön" bağlantısı.
		footnotes: {
			label: 'Kaynakça',
			backContent: '↩',
			backLabel: '{reference} numaralı dipnotun metindeki yerine dön',
		},
	},
};

/** Site ve önizlemenin paylaştığı hast eklentileri. */
export const markdownHastPlugins = [externalLinksPlugin, tableWrapPlugin];
