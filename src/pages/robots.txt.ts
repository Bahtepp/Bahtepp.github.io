import type { APIRoute } from 'astro';

import { SITE_URL } from '../site.config.ts';

export const GET: APIRoute = () => {
	const body = [
		'User-agent: *',
		'Allow: /',
		'',
		`Sitemap: ${new URL('/sitemap-index.xml', SITE_URL).href}`,
		'',
	].join('\n');

	return new Response(body, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
