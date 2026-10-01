import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { createAgentDraft } from './lib/agent-draft.mjs';
import { requireFootnoteKey, resolvePublishDates } from './lib/frontmatter.mjs';
import { AdminError } from './lib/project.mjs';
import { slugify } from './lib/store.mjs';

const serverSource = readFileSync(new URL('./server.mjs', import.meta.url), 'utf8');

function article(overrides = {}) {
	return {
		title: 'SiC anahtarlama',
		description: 'Doğrulanmış araştırma taslağının kısa açıklaması.',
		tags: [],
		body: '## SiC anahtarlama\n\nGiriş cümlesi.\n\n### Bölüm\n\nÖlçüm [^src-001] tamam.',
		sources: [
			{
				sourceId: 'src-001',
				title: 'SiC',
				publisher: 'Infineon',
				url: 'https://www.infineon.com/sic',
			},
		],
		...overrides,
	};
}

async function run(payload, save = async (entry) => ({ ...entry, publishedAt: entry.publishedAt })) {
	return createAgentDraft(payload, { slugify, save });
}

test('server route only creates a draft through saveEntry', () => {
	const start = serverSource.indexOf("'/api/agent/draft'");
	const end = serverSource.indexOf("'/api/draft'");
	const route = serverSource.slice(start, end);
	assert.match(route, /save:\s*store\.saveEntry/);
	assert.equal(route.includes('git'), false);
	assert.equal(route.includes('setDraft'), false);
});

test('forbidden agent fields are rejected before save', async () => {
	let called = 0;
	const save = async () => {
		called += 1;
	};
	for (const extra of [
		{ draft: false },
		{ featured: true },
		{ originalSlug: 'eski-yazi' },
		{ publishedAt: '2026-09-24' },
		{ slug: 'baska-slug' },
		{ collection: 'yazilar' },
		{ date: '2026-09-24' },
	]) {
		await assert.rejects(run({ ...article(), ...extra }, save), (error) => {
			assert.equal(error instanceof AdminError, true);
			assert.equal(error.code, 'forbidden_field');
			return true;
		});
	}
	assert.equal(called, 0);
});

test('internal citation becomes one BAHTEP footnote key', async () => {
	let saved;
	const result = await run(article(), async (entry) => {
		saved = entry;
		return entry;
	});
	assert.equal(saved.collection, 'arastirmalar');
	assert.equal(saved.draft, true);
	assert.equal(saved.featured, false);
	assert.equal(Object.hasOwn(saved, 'publishedAt'), false);
	assert.equal(Object.hasOwn(saved, 'originalSlug'), false);
	assert.equal(saved.slug, slugify('SiC anahtarlama'));
	assert.match(saved.body, /\[\^infineon-sic\]/);
	assert.equal(saved.body.includes('src-001'), false);
	assert.equal(saved.body.includes('Kaynakça'), false);
	assert.deepEqual(saved.footnotes, [
		{ key: 'infineon-sic', text: 'Infineon, SiC, <https://www.infineon.com/sic>' },
	]);
	assert.equal(result.slug, saved.slug);
});

test('lead heading is removed and section headings stay', async () => {
	let saved;
	await run(
		article({
			body: '## Başlık\n\nGiriş cümlesi.\n\n### Bölüm\n\nMetin.',
			sources: [],
		}),
		async (entry) => {
			saved = entry;
			return entry;
		},
	);
	assert.equal(saved.body.startsWith('## '), false);
	assert.match(saved.body, /^Giriş cümlesi\./);
	assert.match(saved.body, /### Bölüm/);
	assert.equal(/^#{1,6}\s+Kaynakça/m.test(saved.body), false);
});

test('bibliography block is removed from the body', async () => {
	let saved;
	await run(
		article({
			body: '## SiC anahtarlama\n\nÖlçüm [^src-001] tamam.\n\n### Kaynakça\n\n[^src-001]: Infineon, SiC, https://www.infineon.com/sic\n',
		}),
		async (entry) => {
			saved = entry;
			return entry;
		},
	);
	assert.equal(saved.body.includes('Kaynakça'), false);
	assert.equal(saved.body.includes('[^src-001]:'), false);
	assert.match(saved.body, /\[\^infineon-sic\]/);
});

test('test sources never reach save', async () => {
	let called = 0;
	const save = async () => {
		called += 1;
	};
	await assert.rejects(
		run(
			article({
				sources: [
					{
						sourceId: 'test-src-001',
						title: 'Tezgah',
						publisher: 'TEST DATA',
						url: 'https://example.com/test-data/001',
					},
				],
				body: 'Ölçüm [^src-001] tamam.',
			}),
			save,
		),
		(error) => error.code === 'invalid_source',
	);
	await assert.rejects(
		run(
			article({
				body: 'Ölçüm [^test-src-001] tamam.',
				sources: [],
			}),
			save,
		),
		(error) => error.code === 'invalid_source',
	);
	await assert.rejects(
		run(
			article({
				sources: [
					{
						sourceId: 'src-001',
						title: 'Tezgah',
						publisher: 'TEST DATA',
						url: 'https://example.org/test-data/001',
					},
				],
			}),
			save,
		),
		(error) => error.code === 'invalid_source',
	);
	assert.equal(called, 0);
});

test('slug comes from the admin helper and collision does not invent another', async () => {
	const calls = [];
	await assert.rejects(
		run(article(), async (entry) => {
			calls.push(entry.slug);
			throw new AdminError(`"${entry.slug}" dosya adı bu bölümde zaten kullanılıyor. Başka bir dosya adı seç.`);
		}),
		(error) => {
			assert.equal(error.code, 'slug_conflict');
			return true;
		},
	);
	assert.deepEqual(calls, [slugify('SiC anahtarlama')]);
	assert.equal(calls.some((slug) => /-\d+$/.test(slug)), false);
});

test('duplicate footnote bases get a suffix and content slugs do not', async () => {
	let saved;
	await run(
		article({
			body: 'İlk [^src-001] ve ikinci [^src-002].',
			sources: [
				{
					sourceId: 'src-001',
					title: 'SiC',
					publisher: 'Infineon',
					url: 'https://www.infineon.com/one',
				},
				{
					sourceId: 'src-002',
					title: 'SiC',
					publisher: 'Infineon',
					url: 'https://www.infineon.com/two',
				},
			],
		}),
		async (entry) => {
			saved = entry;
			return entry;
		},
	);
	assert.deepEqual(
		saved.footnotes.map((item) => item.key),
		['infineon-sic', 'infineon-sic-2'],
	);
	assert.equal(saved.slug, slugify(article().title));
	assert.equal(saved.body.includes('src-00'), false);
});

test('long footnote keys stay within 60 characters including the collision suffix', async () => {
	const longTitle = 'anahtarlama kaybi olcum kosulu '.repeat(8).trim();
	assert.ok(slugify(`Infineon ${longTitle}`).length > 60);
	let saved;
	await run(
		article({
			body: 'İlk [^src-001] ve ikinci [^src-002].',
			sources: [
				{
					sourceId: 'src-001',
					title: longTitle,
					publisher: 'Infineon',
					url: 'https://www.infineon.com/one',
				},
				{
					sourceId: 'src-002',
					title: longTitle,
					publisher: 'Infineon',
					url: 'https://www.infineon.com/two',
				},
			],
		}),
		async (entry) => {
			saved = entry;
			return entry;
		},
	);
	const [first, second] = saved.footnotes.map((item) => item.key);
	assert.ok(first.length <= 60);
	assert.ok(second.length <= 60);
	assert.equal(second.endsWith('-2'), true);
	assert.equal(first.endsWith('-'), false);
	assert.equal(requireFootnoteKey(first), first);
	assert.equal(requireFootnoteKey(second), second);
	assert.equal(saved.body.includes('src-00'), false);
});

test('draft save does not carry publishedAt into the existing date rule', async () => {
	let saved;
	await run(article({ body: 'Giriş.\n\n### Bölüm\n\nMetin.', sources: [] }), async (entry) => {
		saved = entry;
		return entry;
	});
	const dates = resolvePublishDates({}, { isUpdate: false, publishing: saved.draft === false });
	assert.equal(saved.draft, true);
	assert.equal(dates.publishedAt, '');
	assert.equal(Object.hasOwn(saved, 'publishedAt'), false);
});

test('missing description fails before save', async () => {
	let called = 0;
	await assert.rejects(run(article({ description: '  ' }), async () => {
		called += 1;
	}), (error) => error.code === 'invalid_description');
	assert.equal(called, 0);
});
