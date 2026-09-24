import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';

import { siteConfig, SITE_URL } from '../site.config.ts';
import { getAllPosts } from '../lib/content.ts';

export const GET: APIRoute = async () => {
	const posts = await getAllPosts();

	return rss({
		title: `${siteConfig.siteName} — ${siteConfig.tagline}`,
		description: siteConfig.description,
		site: SITE_URL,
		customData: `<language>${siteConfig.lang}</language>`,
		items: posts
			// Taslaklar beslemeye hiçbir zaman girmez.
			.filter((post) => !post.data.draft)
			.map((post) => ({
				title: post.data.title,
				description: post.data.description,
				pubDate: post.data.date,
				link: post.url,
				categories: [post.data.category, ...post.data.tags],
				author: post.data.author,
			})),
	});
};
