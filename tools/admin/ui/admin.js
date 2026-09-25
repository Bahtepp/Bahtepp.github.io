/**
 * BAHTEP yerel içerik yönetim paneli — arayüz mantığı.
 */

import {
	$,
	$$,
	api,
	confirmDialog,
	esc,
	formatDate,
	formatSize,
	notice,
	readFileAsBase64,
	slugify,
	toast,
} from './lib.js';

const state = {
	boot: null,
	view: 'list',
	filter: 'all',
	cm: null,
	aboutCm: null,
	pane: 'write',
	aboutPane: 'write',
	/** Düzenleyicinin o anki durumu. */
	form: null,
	about: null,
};

/* ------------------------------------------------------------------ açılış */

async function refreshBoot() {
	state.boot = await api('/api/bootstrap');
	renderDevState();
	renderTagOptions();
	if (state.view === 'list') renderList();
}

async function boot() {
	initTheme();
	bindNav();
	bindListView();
	bindEditor();
	bindAbout();
	bindMedia();
	bindGit();
	bindUnsavedGuard();

	try {
		await refreshBoot();
	} catch (error) {
		notice('#list-problems', `Panel verileri yüklenemedi: ${esc(error.message)}`, 'error');
	}
	setView('list');
}

/* -------------------------------------------------------------------- tema */

function initTheme() {
	const saved = localStorage.getItem('bahtep-admin-theme');
	const theme = saved ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
	applyTheme(theme);
	$('#theme-toggle').addEventListener('click', () => {
		applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
		if (state.pane === 'preview') renderPreview();
	});
}

function applyTheme(theme) {
	document.documentElement.dataset.theme = theme;
	localStorage.setItem('bahtep-admin-theme', theme);
	$('#theme-toggle').textContent = theme === 'dark' ? 'Açık tema' : 'Koyu tema';
}

/* --------------------------------------------------------------- gezinme */

function bindNav() {
	document.addEventListener('click', async (event) => {
		const trigger = event.target.closest('[data-nav]');
		if (!trigger) return;
		const target = trigger.dataset.nav;
		if (target === 'new') {
			if (!(await confirmLeaveAbout())) return;
			openEditor({ collection: trigger.dataset.collection });
			return;
		}
		if (!(await confirmLeaveAbout(target))) return;
		setView(target);
	});
}

function setView(view) {
	const previous = state.view;
	state.view = view;
	$$('.view').forEach((section) => {
		section.hidden = section.dataset.view !== view;
	});
	$$('.sidebar__nav button').forEach((button) => {
		const isCurrent =
			(button.dataset.nav === 'list' && view === 'list') ||
			(button.dataset.nav === view && view !== 'list');
		button.setAttribute('aria-current', isCurrent ? 'true' : 'false');
	});

	if (view === 'list') renderList();
	if (view === 'media') loadMedia();
	if (view === 'git') loadGit();
	if (view === 'about') openAbout({ reload: previous !== 'about' });
	if (view === 'editor' && state.cm) state.cm.refresh();
}

async function renderDevState() {
	const el = $('#dev-state');
	const running = state.boot?.devRunning;
	el.innerHTML = running
		? `Site sunucusu açık · <a href="${esc(state.boot.devUrl)}" target="_blank" rel="noreferrer">${esc(state.boot.devUrl)}</a>`
		: 'Site sunucusu kapalı.';
}

/* --------------------------------------------------------- içerik listesi */

function bindListView() {
	$('#filters').addEventListener('click', (event) => {
		const button = event.target.closest('[data-filter]');
		if (!button) return;
		state.filter = button.dataset.filter;
		renderList();
	});

	$('#content-list').addEventListener('click', async (event) => {
		const button = event.target.closest('button[data-action]');
		if (!button) return;
		const { action, collection, slug } = button.dataset;

		if (action === 'edit') {
			if (!(await confirmLeaveAbout())) return;
			return openEditor({ collection, slug });
		}
		if (action === 'preview') return openOnSite(`${collectionOf(collection).urlBase}/${slug}/`);

		if (action === 'toggle-draft') {
			const draft = button.dataset.draft === 'true';
			try {
				await api('/api/draft', { collection, slug, draft: !draft });
				toast(draft ? 'Yazı yayına alındı.' : 'Yazı taslağa alındı.');
				await refreshBoot();
			} catch (error) {
				toast(error.message, 'error');
			}
			return;
		}

		if (action === 'delete') await deleteFlow(collection, slug, button.dataset.title);
	});
}

function collectionOf(key) {
	return state.boot.collections.find((c) => c.key === key) ?? { urlBase: '', singular: key };
}

function visibleItems() {
	const items = state.boot?.items ?? [];
	if (state.filter === 'all') return items;
	if (state.filter === 'draft') return items.filter((item) => item.draft);
	return items.filter((item) => item.collection === state.filter);
}

function renderList() {
	if (!state.boot) return;

	$$('#filters button').forEach((button) => {
		button.setAttribute('aria-selected', button.dataset.filter === state.filter ? 'true' : 'false');
	});

	const problems = state.boot.problems ?? [];
	notice(
		'#list-problems',
		problems.length
			? `Şu dosyalar okunamadı:<ul>${problems.map((p) => `<li><code>${esc(p.file)}</code> — ${esc(p.message)}</li>`).join('')}</ul>`
			: '',
		'warn',
	);

	const items = visibleItems();
	if (items.length === 0) {
		$('#content-list').innerHTML = '<p class="empty">Bu filtrede içerik yok.</p>';
		return;
	}

	const rows = items
		.map((item) => {
			const status = item.draft
				? '<span class="badge badge--draft">Taslak</span>'
				: '<span class="badge badge--live">Yayında</span>';
			const featured = item.featured ? ' <span class="badge badge--featured">Öne çıkan</span>' : '';
			const updated = item.updatedDate
				? formatDate(item.updatedDate)
				: `<span class="muted">${esc(formatDate(item.modified))}</span>`;
			const attrs = `data-collection="${esc(item.collection)}" data-slug="${esc(item.slug)}"`;
			const publishedLabel =
				item.publishedAt || !item.draft ? formatDate(item.publishedAt || item.date) : '—';

			return `<tr>
				<td class="cell-title">${esc(item.title)}<small>${esc(item.fileName)}</small></td>
				<td><span class="badge">${esc(item.badge)}</span></td>
				<td>${esc(publishedLabel)}</td>
				<td>${status}${featured}</td>
				<td>${updated}</td>
				<td>
					<div class="row-actions">
						<button type="button" class="btn btn--sm" data-action="edit" ${attrs}>Düzenle</button>
						<button type="button" class="btn btn--sm btn--ghost" data-action="preview" ${attrs}>Önizle</button>
						<button type="button" class="btn btn--sm btn--ghost" data-action="toggle-draft" data-draft="${item.draft}" ${attrs}>${
							item.draft ? 'Yayınla' : 'Taslağa Al'
						}</button>
						<button type="button" class="btn btn--sm btn--ghost" data-action="delete" data-title="${esc(item.title)}" ${attrs}>Sil</button>
					</div>
				</td>
			</tr>`;
		})
		.join('');

	$('#content-list').innerHTML = `<table>
		<thead><tr>
			<th>Başlık</th><th>Tür</th><th>Tarih</th><th>Durum</th><th>Son güncelleme</th><th></th>
		</tr></thead>
		<tbody>${rows}</tbody>
	</table>`;
}

/** İki aşamalı silme: önce uyarı, sonra dosya adını birebir yazma. */
async function deleteFlow(collection, slug, title) {
	const first = await confirmDialog({
		title: 'İçeriği sil',
		danger: true,
		confirmText: 'Devam et',
		html: `<p><strong>${esc(title)}</strong> adlı içerik silinecek.</p>
			<p class="muted">Dosya: <code>src/content/${esc(collection)}/${esc(slug)}.md</code></p>
			<p>Bu işlem geri alınamaz. Devam etmek istiyor musun?</p>`,
	});
	if (!first) return;

	const second = await confirmDialog({
		title: 'Silmeyi onayla',
		danger: true,
		confirmText: 'Kalıcı olarak sil',
		html: `<p>Onaylamak için dosya adını birebir yaz: <code>${esc(slug)}</code></p>
			<input type="text" id="delete-confirm" autocomplete="off" spellcheck="false" />`,
		validate: (body) => body.querySelector('#delete-confirm').value.trim() === slug,
	});
	if (!second) return;

	try {
		await api('/api/delete', { collection, slug, confirm: slug });
		toast('İçerik silindi.');
		await refreshBoot();
	} catch (error) {
		toast(error.message, 'error');
	}
}

/* ------------------------------------------------------------- düzenleyici */

function emptyForm(collection) {
	return {
		collection,
		originalCollection: null,
		originalSlug: null,
		ext: '.md',
		slugTouched: false,
		tags: [],
		sources: [],
		image: '',
		imageAlt: '',
		imageUpload: null,
		imagePreview: '',
		sourceSeq: 0,
	};
}

function ensureEditor() {
	if (state.cm) return;
	state.cm = CodeMirror.fromTextArea($('#f-body'), {
		mode: 'markdown',
		lineWrapping: true,
		lineNumbers: false,
		viewportMargin: 30,
		extraKeys: {
			Enter: 'newlineAndIndentContinueMarkdownList',
			'Ctrl-S': () => saveEntry(),
			'Cmd-S': () => saveEntry(),
		},
	});

	let timer;
	state.cm.on('change', () => {
		clearTimeout(timer);
		timer = setTimeout(checkFootnotes, 400);
	});
}

function bindEditor() {
	ensureEditorBindings();
}

function ensureEditorBindings() {
	$('#f-title').addEventListener('input', (event) => {
		if (!state.form.slugTouched && !state.form.originalSlug) {
			$('#f-slug').value = slugify(event.target.value);
			updateSlugHint();
		}
	});

	$('#f-slug').addEventListener('input', () => {
		state.form.slugTouched = true;
		updateSlugHint();
	});

	$('#f-collection').addEventListener('change', (event) => {
		state.form.collection = event.target.value;
		syncCollectionUi();
	});

	$('#f-featured').addEventListener('change', syncFeaturedState);

	$('#btn-save').addEventListener('click', () => saveEntry());
	$('#btn-site-preview').addEventListener('click', () => {
		const slug = $('#f-slug').value.trim();
		if (!slug) return toast('Önce bir dosya adı gerekiyor.', 'error');
		openOnSite(`${collectionOf(state.form.collection).urlBase}/${slug}/`);
	});

	// Yaz / Önizle sekmeleri
	$$('#toolbar [data-pane]').forEach((button) => {
		button.addEventListener('click', () => setPane(button.dataset.pane));
	});

	// Markdown araç çubuğu
	$('#toolbar').addEventListener('click', (event) => {
		const button = event.target.closest('[data-md]');
		if (button) applyMarkdown(button.dataset.md);
	});

	bindTagInput();
	bindCover();
	bindSources();
}

function setPane(pane) {
	state.pane = pane;
	$$('#toolbar [data-pane]').forEach((button) => {
		button.setAttribute('aria-selected', button.dataset.pane === pane ? 'true' : 'false');
	});
	$('#pane-write').hidden = pane !== 'write';
	$('#pane-preview').hidden = pane !== 'preview';
	if (pane === 'write') state.cm.refresh();
	else renderPreview();
}

async function openEditor({ collection, slug }) {
	state.form = emptyForm(collection);
	ensureEditor();
	notice('#editor-message', '');

	if (slug) {
		try {
			const { entry } = await api('/api/entry', { collection, slug });
			fillForm(entry);
		} catch (error) {
			toast(error.message, 'error');
			return;
		}
	} else {
		fillForm({
			collection,
			slug: '',
			title: '',
			description: '',
			date: '',
			publishedAt: '',
			updatedDate: '',
			tags: [],
			draft: true,
			featured: false,
			image: '',
			imageAlt: '',
			body: '',
			footnotes: [],
		});
	}

	setView('editor');
	setPane('write');
	state.cm.refresh();
	$('#f-title').focus();
}

function fillForm(entry) {
	const form = state.form;
	form.collection = entry.collection;
	form.originalCollection = entry.slug ? entry.collection : null;
	form.originalSlug = entry.slug || null;
	form.ext = entry.ext ?? '.md';
	form.slugTouched = Boolean(entry.slug);
	form.tags = [...(entry.tags ?? [])];
	form.image = entry.image ?? '';
	form.imageAlt = entry.imageAlt ?? '';
	form.imageUpload = null;
	form.imagePreview = entry.image ?? '';
	form.sources = (entry.footnotes ?? []).map((item) => ({
		id: `s${(form.sourceSeq += 1)}`,
		mode: 'raw',
		key: item.key,
		text: item.text,
	}));

	const meta = collectionOf(entry.collection);
	$('#editor-title').textContent = entry.slug ? entry.title || '(başlıksız)' : `Yeni ${meta.singular}`;

	$('#f-title').value = entry.title ?? '';
	$('#f-description').value = entry.description ?? '';
	$('#f-collection').value = entry.collection;
	$('#f-slug').value = entry.slug ?? '';
	$('#f-date').value = entry.publishedAt || (!entry.draft && entry.date) || '';
	$('#f-updated').value = entry.updatedDate ?? '';
	$('#f-draft').checked = entry.draft === true;
	$('#f-featured').checked = entry.featured === true;
	$('#f-image-alt').value = form.imageAlt;
	state.cm.setValue(entry.body ?? '');
	state.cm.clearHistory();

	$('#btn-site-preview').hidden = !entry.slug;

	renderTags();
	renderCover();
	renderSources();
	syncCollectionUi();
	syncFeaturedState();
}

function syncCollectionUi() {
	const form = state.form;
	const meta = collectionOf(form.collection);
	$('#editor-path').textContent = form.originalSlug
		? `src/content/${form.collection}/${form.originalSlug}${form.ext ?? '.md'}`
		: `Kaydedildiğinde src/content/${form.collection}/ içine yazılacak.`;
	// Kaynakça bölümü araştırmalarda açık gelir. Diğer türlerde yalnızca dosyada
	// zaten dipnot varsa gösterilir; böylece var olan kaynaklar gözden kaçmaz.
	$('#sources-card').hidden = form.collection !== 'arastirmalar' && form.sources.length === 0;
	updateSlugHint();
}

function syncFeaturedState() {
	$('#featured-state').textContent = $('#f-featured').checked ? 'Açık' : 'Kapalı';
}

function updateSlugHint() {
	const slug = $('#f-slug').value.trim();
	const meta = collectionOf(state.form.collection);
	const clash = (state.boot?.items ?? []).some(
		(item) =>
			item.collection === state.form.collection &&
			item.slug === slug &&
			!(item.collection === state.form.originalCollection && item.slug === state.form.originalSlug),
	);
	$('#slug-hint').innerHTML = slug
		? `Adres: <code>${esc(meta.urlBase)}/${esc(slug)}/</code>${
				clash ? ' <strong>— bu dosya adı zaten kullanılıyor.</strong>' : ''
			}`
		: 'Başlığı yazdığında otomatik oluşur; istersen elle değiştirebilirsin.';
}

/* --------------------------------------------------------------- etiketler */

function bindTagInput() {
	const input = $('#f-tag-input');
	input.setAttribute('list', 'tag-options');

	input.addEventListener('keydown', (event) => {
		if (event.key === 'Enter' || event.key === ',') {
			event.preventDefault();
			addTag(input.value);
			input.value = '';
		} else if (event.key === 'Backspace' && input.value === '' && state.form.tags.length) {
			state.form.tags.pop();
			renderTags();
		}
	});
	input.addEventListener('blur', () => {
		if (input.value.trim()) {
			addTag(input.value);
			input.value = '';
		}
	});

	$('#tag-chips').addEventListener('click', (event) => {
		const button = event.target.closest('button[data-tag]');
		if (!button) return;
		state.form.tags = state.form.tags.filter((tag) => tag !== button.dataset.tag);
		renderTags();
	});
}

function addTag(raw) {
	const tag = String(raw).trim().replace(/,+$/, '');
	if (!tag) return;
	if (!state.form.tags.includes(tag)) state.form.tags.push(tag);
	renderTags();
}

function renderTags() {
	$('#tag-chips').innerHTML = state.form.tags
		.map(
			(tag) =>
				`<span class="chip">${esc(tag)}<button type="button" data-tag="${esc(tag)}" aria-label="${esc(tag)} etiketini kaldır">×</button></span>`,
		)
		.join('');
}

function renderTagOptions() {
	$('#tag-options').innerHTML = (state.boot?.knownTags ?? [])
		.map((tag) => `<option value="${esc(tag)}"></option>`)
		.join('');
}

/* ----------------------------------------------------------- kapak görseli */

function bindCover() {
	$('#btn-pick-file').addEventListener('click', () => $('#f-file').click());

	$('#f-file').addEventListener('change', async (event) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		try {
			await attachImageFile(file);
		} catch (error) {
			toast(error.message, 'error');
		}
	});

	$('#btn-pick-media').addEventListener('click', () => {
		const picker = $('#media-picker');
		picker.hidden = !picker.hidden;
		if (!picker.hidden) renderMediaPicker();
	});

	$('#media-picker').addEventListener('click', (event) => {
		const button = event.target.closest('button[data-path]');
		if (!button) return;
		state.form.imageUpload = null;
		state.form.image = button.dataset.path;
		state.form.imagePreview = button.dataset.path;
		$('#media-picker').hidden = true;
		renderCover();
	});

	$('#btn-clear-image').addEventListener('click', () => {
		state.form.image = '';
		state.form.imageUpload = null;
		state.form.imagePreview = '';
		$('#f-image-alt').value = '';
		renderCover();
	});

	$('#f-image-alt').addEventListener('input', (event) => {
		state.form.imageAlt = event.target.value;
	});
}

async function attachImageFile(file) {
	const limit = state.boot.limits.imageMb;
	const allowed = state.boot.limits.imageExtensions;
	const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
	if (!allowed.includes(ext)) {
		throw new Error(`Bu biçim kabul edilmiyor. İzin verilenler: ${allowed.join(', ')}`);
	}
	if (file.size > limit * 1024 * 1024) {
		throw new Error(`Görsel çok büyük (${formatSize(file.size)}). Sınır ${limit} MB.`);
	}

	const data = await readFileAsBase64(file);
	// Dosya public/images içine kaydetme adımında kopyalanır; şimdilik yalnız önizleme.
	state.form.imageUpload = { name: file.name, data };
	state.form.image = '';
	state.form.imagePreview = `data:${file.type};base64,${data}`;
	renderCover();
}

function renderCover() {
	const form = state.form;
	const cover = $('#cover');
	const hasImage = Boolean(form.imagePreview);

	cover.innerHTML = hasImage
		? `<img src="${esc(form.imagePreview)}" alt="Kapak görseli önizlemesi" />`
		: 'Kapak görseli yok';

	$('#btn-clear-image').hidden = !hasImage;
	$('#image-alt-field').hidden = !hasImage;

	const label = form.imageUpload
		? `Kaydedince <code>public/images/</code> içine kopyalanacak: ${esc(form.imageUpload.name)}`
		: form.image
			? `<code>${esc(form.image)}</code>`
			: '';
	if (label) cover.insertAdjacentHTML('beforeend', `<p class="hint">${label}</p>`);
}

function renderMediaPicker() {
	const images = state.boot?.images ?? [];
	$('#media-picker').innerHTML = images.length
		? images
				.map(
					(image) =>
						`<button type="button" data-path="${esc(image.path)}" title="${esc(image.name)}">
							<img src="${esc(image.path)}" alt="" /><span>${esc(image.name)}</span>
						</button>`,
				)
				.join('')
		: '<p class="hint">public/images klasöründe henüz görsel yok.</p>';
}

/* ---------------------------------------------------------------- kaynaklar */

function bindSources() {
	$('#btn-add-source').addEventListener('click', () => addSource());

	$('#sources-list').addEventListener('click', (event) => {
		const button = event.target.closest('button[data-source-action]');
		if (!button) return;
		const source = state.form.sources.find((item) => item.id === button.dataset.id);
		if (!source) return;

		if (button.dataset.sourceAction === 'insert') insertFootnote(source.key);
		if (button.dataset.sourceAction === 'raw') {
			source.text = sourceText(source);
			source.mode = 'raw';
			renderSources();
		}
		if (button.dataset.sourceAction === 'remove') {
			state.form.sources = state.form.sources.filter((item) => item.id !== source.id);
			renderSources();
		}
	});

	$('#sources-list').addEventListener('input', (event) => {
		const field = event.target.closest('[data-field]');
		if (!field) return;
		const source = state.form.sources.find((item) => item.id === field.dataset.id);
		if (!source) return;
		source[field.dataset.field] = field.value;
		if (field.dataset.field === 'key') {
			$(`[data-preview-for="${source.id}"]`)?.setAttribute('data-key', source.key);
		}
		updateSourcePreview(source);
		checkFootnotes();
	});
}

function addSource(key = '') {
	const source = {
		id: `s${(state.form.sourceSeq += 1)}`,
		mode: 'structured',
		key: key || `kaynak${state.form.sources.length + 1}`,
		author: '',
		workTitle: '',
		publication: '',
		year: '',
		url: '',
		accessed: '',
		note: '',
		text: '',
	};
	state.form.sources.push(source);
	$('#sources-card').hidden = false;
	renderSources();
	$(`[data-field="key"][data-id="${source.id}"]`)?.focus();
	return source;
}

/** Yapılandırılmış alanlardan kaynakça satırını üretir. */
function sourceText(source) {
	if (source.mode === 'raw') return source.text ?? '';
	const parts = [];
	if (source.author?.trim()) parts.push(source.author.trim());
	if (source.workTitle?.trim()) parts.push(`"${source.workTitle.trim()}"`);
	if (source.publication?.trim()) parts.push(source.publication.trim());
	if (source.year?.trim()) parts.push(source.year.trim());
	if (source.url?.trim()) parts.push(`<${source.url.trim()}>`);
	let text = parts.join(', ');
	if (source.accessed?.trim()) text += `${text ? ' ' : ''}(Erişim: ${source.accessed.trim()})`;
	if (source.note?.trim()) text += `${text ? ' — ' : ''}${source.note.trim()}`;
	return text;
}

const SOURCE_FIELDS = [
	['author', 'Yazar / Kurum'],
	['workTitle', 'Çalışma / Sayfa başlığı'],
	['publication', 'Yayın / Site'],
	['year', 'Yıl'],
	['url', 'URL'],
	['accessed', 'Erişim tarihi'],
	['note', 'Not'],
];

function renderSources() {
	const list = $('#sources-list');
	if (state.form.sources.length === 0) {
		list.innerHTML =
			'<p class="hint">Henüz kaynak yok. “+ Kaynak Ekle” ile başla; kaydederken dipnot tanımları dosyanın sonuna yazılır.</p>';
		checkFootnotes();
		return;
	}

	list.innerHTML = state.form.sources
		.map((source) => {
			const head = `<div class="source__head">
				<input type="text" class="source__key" data-field="key" data-id="${source.id}"
					value="${esc(source.key)}" aria-label="Kaynak anahtarı" spellcheck="false" />
				<button type="button" class="btn btn--sm" data-source-action="insert" data-id="${source.id}">Dipnot Ekle</button>
				<span class="source__spacer"></span>
				${
					source.mode === 'structured'
						? `<button type="button" class="btn btn--sm btn--ghost" data-source-action="raw" data-id="${source.id}">Metin olarak düzenle</button>`
						: ''
				}
				<button type="button" class="btn btn--sm btn--ghost" data-source-action="remove" data-id="${source.id}">Kaldır</button>
			</div>`;

			const body =
				source.mode === 'structured'
					? `<div class="source__grid">${SOURCE_FIELDS.map(
							([field, label]) => `<div class="field">
								<label for="${source.id}-${field}">${label}</label>
								<input type="text" id="${source.id}-${field}" data-field="${field}" data-id="${source.id}" value="${esc(source[field])}" />
							</div>`,
						).join('')}</div>`
					: `<div class="field">
							<label for="${source.id}-text">Kaynakça satırı</label>
							<textarea id="${source.id}-text" rows="2" data-field="text" data-id="${source.id}">${esc(source.text)}</textarea>
						</div>`;

			return `<div class="source">${head}${body}
				<p class="source__preview" data-preview-for="${source.id}">${esc(previewLine(source))}</p>
			</div>`;
		})
		.join('');

	checkFootnotes();
}

function previewLine(source) {
	return `[^${source.key}]: ${sourceText(source) || '…'}`;
}

function updateSourcePreview(source) {
	const el = $(`[data-preview-for="${source.id}"]`);
	if (el) el.textContent = previewLine(source);
}

/** Metinde karşılığı olmayan veya hiç kullanılmayan kaynakları bildirir. */
function checkFootnotes() {
	if (!state.cm) return;
	const body = state.cm
		.getValue()
		.replace(/^```[\s\S]*?^```/gm, '')
		.replace(/`[^`\n]*`/g, '');
	const referenced = new Set([...body.matchAll(/\[\^([^\]\s]+)\]/g)].map((m) => m[1]));
	const defined = new Set(state.form.sources.map((source) => source.key.trim()).filter(Boolean));

	const missing = [...referenced].filter((key) => !defined.has(key));
	const unused = [...defined].filter((key) => !referenced.has(key));

	const messages = [];
	if (missing.length) {
		messages.push(
			`Metinde geçen ama kaynak listesinde olmayan dipnotlar: ${missing.map((k) => `<code>[^${esc(k)}]</code>`).join(', ')}`,
		);
	}
	if (unused.length) {
		messages.push(
			`Listede olup metinde kullanılmayan kaynaklar: ${unused.map((k) => `<code>${esc(k)}</code>`).join(', ')}`,
		);
	}
	notice('#sources-warn', messages.join('<br />'), 'warn');
}

/* ----------------------------------------------------- markdown araç çubuğu */

function insertFootnote(key) {
	const clean = String(key ?? '').trim();
	if (!clean) return toast('Önce kaynak anahtarını yaz.', 'error');
	state.cm.replaceSelection(`[^${clean}]`);
	state.cm.focus();
	checkFootnotes();
}

function activeEditor() {
	return state.view === 'about' ? state.aboutCm : state.cm;
}

function wrapSelection(before, after = before) {
	const cm = activeEditor();
	const selection = cm.getSelection();
	cm.replaceSelection(`${before}${selection}${after}`);
	if (!selection) {
		const cursor = cm.getCursor();
		cm.setCursor({ line: cursor.line, ch: cursor.ch - after.length });
	}
	cm.focus();
}

/** Seçili satırların başına işaret koyar; aynı işaret varsa kaldırır. */
function prefixLines(prefixFor) {
	const cm = activeEditor();
	const from = cm.getCursor('from').line;
	const to = cm.getCursor('to').line;
	const existing = /^(#{1,6} |> |- |\d+\. )/;

	for (let line = from; line <= to; line += 1) {
		const text = cm.getLine(line) ?? '';
		const prefix = prefixFor(line - from);
		const stripped = text.replace(existing, '');
		const next = text.startsWith(prefix) ? stripped : prefix + stripped;
		cm.replaceRange(next, { line, ch: 0 }, { line, ch: text.length });
	}
	cm.focus();
}

function insertBlock(text) {
	const cm = activeEditor();
	const cursor = cm.getCursor();
	const line = cm.getLine(cursor.line) ?? '';
	const lead = line.trim() === '' ? '' : '\n\n';
	cm.replaceSelection(`${lead}${text}`);
	cm.focus();
}

async function applyMarkdown(action) {
	switch (action) {
		case 'h2':
			return prefixLines(() => '## ');
		case 'h3':
			return prefixLines(() => '### ');
		case 'bold':
			return wrapSelection('**');
		case 'italic':
			return wrapSelection('*');
		case 'quote':
			return prefixLines(() => '> ');
		case 'ul':
			return prefixLines(() => '- ');
		case 'ol':
			return prefixLines((index) => `${index + 1}. `);
		case 'hr':
			return insertBlock('---\n');
		case 'table':
			return insertBlock('| Başlık | Başlık |\n| --- | --- |\n| Veri | Veri |\n');
		case 'code': {
			const selection = state.cm.getSelection();
			if (selection.includes('\n') || selection === '') return insertBlock('```\n' + selection + '\n```\n');
			return wrapSelection('`');
		}
		case 'link': {
			const cm = activeEditor();
			const selection = cm.getSelection() || 'bağlantı metni';
			cm.replaceSelection(`[${selection}](https://)`);
			const cursor = cm.getCursor();
			cm.setCursor({ line: cursor.line, ch: cursor.ch - 1 });
			return cm.focus();
		}
		case 'image': {
			const path = await chooseImage();
			if (path) insertBlock(`![](${path})\n`);
			return;
		}
		case 'footnote': {
			if (state.form.sources.length === 0) {
				const source = addSource();
				toast('Yeni bir kaynak eklendi. Alanları doldurup “Dipnot Ekle”ye bas.');
				return source;
			}
			return chooseFootnote();
		}
	}
}

/** Medya listesinden görsel seçme penceresi. */
async function chooseImage() {
	const images = state.boot?.images ?? [];
	if (images.length === 0) {
		toast('public/images klasöründe görsel yok. Önce Medya bölümünden yükle.', 'error');
		return null;
	}

	let chosen = null;
	const ok = await confirmDialog({
		title: 'Görsel seç',
		confirmText: 'Ekle',
		html: `<div class="media-picker" style="max-height:16rem">${images
			.map(
				(image) =>
					`<button type="button" data-path="${esc(image.path)}"><img src="${esc(image.path)}" alt="" /><span>${esc(image.name)}</span></button>`,
			)
			.join('')}</div>`,
		onRender: (body, close) => {
			body.addEventListener('click', (event) => {
				const button = event.target.closest('button[data-path]');
				if (!button) return;
				chosen = button.dataset.path;
				close(true);
			});
		},
	}).then((ok) => (ok ? chosen : null));

	return ok;
}

/** Var olan kaynaklardan birini seçip metne dipnot işareti koyar. */
function chooseFootnote() {
	let chosen = null;
	return confirmDialog({
		title: 'Dipnot ekle',
		confirmText: 'Kapat',
		html: `<p>İmlecin olduğu yere eklenecek kaynağı seç:</p>
			<div class="cover__actions">${state.form.sources
				.map(
					(source) =>
						`<button type="button" class="btn btn--sm" data-key="${esc(source.key)}">[^${esc(source.key)}]</button>`,
				)
				.join('')}</div>`,
		onRender: (body, close) => {
			body.addEventListener('click', (event) => {
				const button = event.target.closest('button[data-key]');
				if (!button) return;
				chosen = button.dataset.key;
				close(true);
			});
		},
	}).then((ok) => {
		if (ok && chosen) insertFootnote(chosen);
	});
}

/* ---------------------------------------------------------------- önizleme */

async function renderPreview() {
	const frame = $('#preview-frame');
	const theme = document.documentElement.dataset.theme;

	try {
		const { html } = await api('/api/preview', {
			markdown: state.cm.getValue(),
			footnotes: collectFootnotes({ tolerant: true }),
		});
		frame.srcdoc = `<!doctype html><html lang="tr" data-theme="${theme}"><head><meta charset="utf-8" />
			<link rel="stylesheet" href="/site.css" />
			<style>body{padding:1.5rem clamp(1rem,4vw,2rem);}main{max-width:68ch;margin:0 auto;}</style>
			</head><body><main class="prose">${html}</main></body></html>`;
	} catch (error) {
		frame.srcdoc = `<!doctype html><meta charset="utf-8" /><p style="font-family:sans-serif;color:#a3231a">Önizleme oluşturulamadı: ${esc(error.message)}</p>`;
	}
}

/**
 * Kaynak satırlarını dosyaya yazılacak biçime çevirir.
 * Aynı anahtar bir kez yazılır; sunucu da bunu ayrıca güvenceye alır.
 */
function collectFootnotes({ tolerant = false } = {}) {
	const out = [];
	const seen = new Set();

	for (const source of state.form.sources) {
		const key = source.key.trim();
		const text = sourceText(source).trim();
		if (!key) {
			if (tolerant) continue;
			throw new Error('Bir kaynağın anahtarı boş. Anahtarı yaz veya kaynağı kaldır.');
		}
		if (!text) {
			if (tolerant) continue;
			throw new Error(`"${key}" kaynağının bilgileri boş. Doldur veya kaynağı kaldır.`);
		}
		if (seen.has(key)) {
			if (tolerant) continue;
			throw new Error(`"${key}" anahtarı birden fazla kaynakta kullanılmış. Anahtarlar farklı olmalı.`);
		}
		seen.add(key);
		out.push({ key, text });
	}

	return out;
}

/* ---------------------------------------------------------------- kaydetme */

async function saveEntry() {
	const button = $('#btn-save');
	const form = state.form;

	const title = $('#f-title').value.trim();
	const description = $('#f-description').value.trim();
	const slug = $('#f-slug').value.trim();

	// 1-4: kaydetmeden önce formu doğrula.
	if (!title) {
		notice('#editor-message', 'Başlık boş olamaz.', 'error');
		return $('#f-title').focus();
	}
	if (!description) {
		notice('#editor-message', 'Kısa açıklama zorunludur (içerik şeması bu alanı istiyor).', 'error');
		return $('#f-description').focus();
	}
	if (!slug) {
		notice('#editor-message', 'Dosya adı boş olamaz.', 'error');
		return $('#f-slug').focus();
	}
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
		notice(
			'#editor-message',
			'Dosya adı yalnızca küçük harf, rakam ve tire içerebilir. Örnek: <code>yapay-zeka-ve-oyun</code>',
			'error',
		);
		return $('#f-slug').focus();
	}

	let footnotes;
	try {
		footnotes = collectFootnotes();
	} catch (error) {
		notice('#editor-message', esc(error.message), 'error');
		return;
	}

	button.disabled = true;
	button.textContent = 'Kaydediliyor…';

	try {
		const result = await api('/api/save', {
			collection: form.collection,
			originalCollection: form.originalCollection,
			slug,
			originalSlug: form.originalSlug,
			title,
			description,
			updatedDate: $('#f-updated').value,
			tags: form.tags,
			draft: $('#f-draft').checked,
			featured: $('#f-featured').checked,
			image: form.image,
			imageAlt: $('#f-image-alt').value.trim(),
			imageUpload: form.imageUpload,
			body: state.cm.getValue(),
			footnotes,
		});

		// Kaydedilen görsel artık projede duruyor; bekleyen yükleme temizlenir.
		form.imageUpload = null;
		form.image = result.image ?? '';
		form.imagePreview = form.image;
		form.collection = result.collection;
		form.originalCollection = result.collection;
		form.originalSlug = result.slug;
		form.slugTouched = true;

		await refreshBoot();
		renderCover();

		const renamed = result.renamedFrom ? ` Dosya adı değişti (eski ad: <code>${esc(result.renamedFrom)}</code>).` : '';
		notice('#editor-message', `İçerik başarıyla kaydedildi.${renamed}`);
		toast('İçerik başarıyla kaydedildi.');

		$('#editor-title').textContent = title;
		$('#f-collection').value = result.collection;
		$('#f-date').value = result.publishedAt || (!result.draft && result.date) || '';
		$('#btn-site-preview').hidden = false;
		syncCollectionUi();
		syncFeaturedState();
	} catch (error) {
		notice('#editor-message', esc(error.message), 'error');
		toast(error.message, 'error');
	} finally {
		button.disabled = false;
		button.textContent = 'Kaydet';
	}
}

/* ------------------------------------------------------------ sitede önizle */

async function openOnSite(pathname) {
	const { running, url } = await api('/api/dev-server');
	if (running) {
		window.open(url + pathname, '_blank', 'noreferrer');
		return;
	}

	const start = await confirmDialog({
		title: 'Site sunucusu kapalı',
		confirmText: 'Siteyi Başlat',
		html: `<p>Önizleme için Astro geliştirme sunucusunun açık olması gerekiyor.</p>
			<p class="muted">Şimdi başlatılsın mı? (<code>npm run edit</code> ikisini birlikte başlatır.)</p>`,
	});
	if (!start) return;

	try {
		await api('/api/dev-server/start', {});
		toast('Site sunucusu başlatılıyor, birkaç saniye sürebilir…');
		// Sunucunun ayağa kalkmasını bekleyip sayfayı aç.
		for (let attempt = 0; attempt < 20; attempt += 1) {
			await new Promise((resolve) => setTimeout(resolve, 700));
			const check = await api('/api/dev-server');
			if (check.running) {
				window.open(check.url + pathname, '_blank', 'noreferrer');
				await refreshBoot();
				return;
			}
		}
		toast('Site sunucusu beklenen sürede açılmadı. Terminali kontrol et.', 'error');
	} catch (error) {
		toast(error.message, 'error');
	}
}

/* ------------------------------------------------------------------- medya */

function bindMedia() {
	$('#btn-media-upload').addEventListener('click', () => $('#media-file').click());
	$('#media-file').addEventListener('change', async (event) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		try {
			const data = await readFileAsBase64(file);
			const result = await api('/api/save-image', { name: file.name, data });
			notice('#media-message', `Görsel eklendi: <code>${esc(result.path)}</code>`);
			await refreshBoot();
			loadMedia();
		} catch (error) {
			notice('#media-message', esc(error.message), 'error');
		}
	});
}

function loadMedia() {
	const images = state.boot?.images ?? [];
	$('#media-grid').innerHTML = images.length
		? images
				.map(
					(image) => `<figure class="media-card">
						<img src="${esc(image.path)}" alt="" />
						<figcaption>
							<div class="media-card__name">${esc(image.name)}</div>
							<div class="media-card__meta">${esc(formatSize(image.size))}</div>
						</figcaption>
					</figure>`,
				)
				.join('')
		: '<p class="empty">Henüz görsel yok. “Görsel Yükle” ile ekleyebilirsin.</p>';
}

/* ------------------------------------------------------------------ github */

async function loadGit() {
	const box = $('#git-status');
	box.innerHTML = '<p class="hint">Durum okunuyor…</p>';
	notice('#git-message', '');
	$('#git-output').hidden = true;

	try {
		const info = await api('/api/git');
		if (!info.isRepo) {
			box.innerHTML = '<p>Bu klasör bir git deposu değil, gönderim yapılamaz.</p>';
			return;
		}

		const files = info.files.length
			? `<ul class="file-list">${info.files
					.map((file) => `<li><code>${esc(file.path)}</code><span>${esc(file.status)}</span></li>`)
					.join('')}</ul>`
			: '<p>Gönderilecek değişiklik yok. Her şey güncel.</p>';

		box.innerHTML = `<p class="hint">
				Dal: <code>${esc(info.branch)}</code>${info.remote ? ` · Uzak depo: <code>${esc(info.remote)}</code>` : ''}
				${info.ahead ? ` · ${info.ahead} commit gönderilmeyi bekliyor` : ''}
			</p>
			<h2>Gönderilecek dosyalar (${info.files.length})</h2>
			${files}`;

		$('#btn-git-push').disabled = info.files.length === 0;
	} catch (error) {
		box.innerHTML = `<p>${esc(error.message)}</p>`;
	}
}

function bindGit() {
	$('#btn-git-push').addEventListener('click', async () => {
		const message = $('#f-commit').value.trim();
		if (!message) {
			notice('#git-message', 'Commit mesajı boş olamaz.', 'error');
			return $('#f-commit').focus();
		}

		const info = await api('/api/git');
		const approved = await confirmDialog({
			title: 'GitHub’a gönderilsin mi?',
			confirmText: 'Evet, gönder',
			html: `<p><strong>${info.files.length}</strong> dosya <code>${esc(info.branch)}</code> dalına gönderilecek.</p>
				<p class="muted">Commit mesajı: ${esc(message)}</p>
				<p class="muted">Sırayla <code>git add</code>, <code>git commit</code>, <code>git push</code> çalışacak.</p>`,
		});
		if (!approved) return;

		const button = $('#btn-git-push');
		button.disabled = true;
		button.textContent = 'Gönderiliyor…';

		try {
			const result = await api('/api/git/push', { message, approved: true });
			const output = result.steps
				.map((step) => `$ ${step.command}\n${[step.stdout, step.stderr].filter(Boolean).join('\n')}`)
				.join('\n\n');
			$('#git-output').textContent = output;
			$('#git-output').hidden = false;

			if (result.ok) {
				notice('#git-message', 'Değişiklikler GitHub’a gönderildi.');
				$('#f-commit').value = '';
			} else {
				notice(
					'#git-message',
					'Gönderim tamamlanamadı. Aşağıdaki git çıktısına bak. Giriş sorunu varsa GitHub oturumunu açman gerekebilir.',
					'error',
				);
			}
			await loadGit();
		} catch (error) {
			notice('#git-message', esc(error.message), 'error');
		} finally {
			button.textContent = 'Gönder';
			button.disabled = false;
		}
	});
}

/* ----------------------------------------------------------------- hakkımda */

function emptyAbout() {
	return {
		loaded: false,
		author: '',
		authorBio: '',
		profileImage: '',
		links: [],
		linkSeq: 0,
		body: '',
		imageUpload: null,
		imagePreview: '',
		saved: '',
	};
}

function collectAboutLinks() {
	return (state.about?.links ?? []).map((link) => ({
		label: String(link.label ?? '').trim(),
		url: String(link.url ?? '').trim(),
	}));
}

function aboutSnapshot() {
	const about = state.about;
	if (!about) return '';
	return JSON.stringify({
		author: $('#f-about-author')?.value ?? '',
		authorBio: $('#f-about-bio')?.value ?? '',
		profileImage: about.profileImage,
		imageUpload: about.imageUpload?.name ?? '',
		links: collectAboutLinks(),
		body: state.aboutCm ? state.aboutCm.getValue() : $('#f-about-body')?.value ?? '',
	});
}

function isAboutDirty() {
	return Boolean(state.about && aboutSnapshot() !== state.about.saved);
}

async function confirmLeaveAbout(nextView) {
	if (nextView === 'about') return true;
	if (state.view !== 'about' || !isAboutDirty()) return true;
	return confirmDialog({
		title: 'Kaydedilmemiş değişiklikler',
		confirmText: 'Ayrıl',
		html: '<p>Kaydedilmemiş değişikliklerin var.</p>',
	});
}

function bindUnsavedGuard() {
	window.addEventListener('beforeunload', (event) => {
		if (state.view === 'about' && isAboutDirty()) {
			event.preventDefault();
			event.returnValue = '';
		}
	});

	document.addEventListener('keydown', (event) => {
		if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
		if (state.view !== 'about') return;
		event.preventDefault();
		saveAbout();
	});
}

function setAboutLoaded(loaded) {
	if (state.about) state.about.loaded = loaded;
	$('#about-form').hidden = !loaded;
	$('#btn-about-save').disabled = !loaded;
}

function bindAbout() {
	ensureAboutEditor();

	$('#btn-about-save').addEventListener('click', () => saveAbout());
	$('#btn-about-site').addEventListener('click', () => openOnSite('/hakkimda/'));
	$('#btn-about-add-link').addEventListener('click', () => {
		addAboutLink();
		const last = state.about.links.at(-1);
		$(`#about-link-${last.id}-label`)?.focus();
	});

	$('#about-links').addEventListener('click', (event) => {
		const button = event.target.closest('[data-about-link]');
		if (!button) return;
		const index = state.about.links.findIndex((link) => link.id === button.dataset.id);
		if (index < 0) return;
		if (button.dataset.aboutLink === 'remove') {
			state.about.links.splice(index, 1);
			renderAboutLinks();
		}
		if (button.dataset.aboutLink === 'up' && index > 0) {
			const [item] = state.about.links.splice(index, 1);
			state.about.links.splice(index - 1, 0, item);
			renderAboutLinks();
		}
		if (button.dataset.aboutLink === 'down' && index < state.about.links.length - 1) {
			const [item] = state.about.links.splice(index, 1);
			state.about.links.splice(index + 1, 0, item);
			renderAboutLinks();
		}
	});

	$('#about-links').addEventListener('input', (event) => {
		const field = event.target.closest('[data-about-field]');
		if (!field) return;
		const link = state.about.links.find((item) => item.id === field.dataset.id);
		if (link) link[field.dataset.aboutField] = field.value;
	});

	$('#about-message').addEventListener('click', (event) => {
		if (event.target.id === 'btn-about-retry') openAbout({ reload: true });
	});

	$$('#about-toolbar [data-about-pane]').forEach((button) => {
		button.addEventListener('click', () => setAboutPane(button.dataset.aboutPane));
	});

	$('#about-toolbar').addEventListener('click', (event) => {
		const button = event.target.closest('[data-about-md]');
		if (button) applyMarkdown(button.dataset.aboutMd);
	});

	$('#btn-about-photo').addEventListener('click', () => $('#about-file').click());
	$('#about-file').addEventListener('change', async (event) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		try {
			await attachAboutImage(file);
		} catch (error) {
			toast(error.message, 'error');
		}
	});

	$('#btn-about-media').addEventListener('click', () => {
		const picker = $('#about-media-picker');
		picker.hidden = !picker.hidden;
		if (!picker.hidden) renderAboutMediaPicker();
	});

	$('#about-media-picker').addEventListener('click', (event) => {
		const button = event.target.closest('button[data-path]');
		if (!button) return;
		state.about.imageUpload = null;
		state.about.profileImage = button.dataset.path;
		state.about.imagePreview = button.dataset.path;
		$('#about-media-picker').hidden = true;
		renderAboutPhoto();
	});
}

function ensureAboutEditor() {
	if (state.aboutCm) return;
	state.aboutCm = CodeMirror.fromTextArea($('#f-about-body'), {
		mode: 'markdown',
		lineWrapping: true,
		lineNumbers: false,
		viewportMargin: 30,
		extraKeys: {
			Enter: 'newlineAndIndentContinueMarkdownList',
			'Ctrl-S': () => saveAbout(),
			'Cmd-S': () => saveAbout(),
		},
	});
}

function setAboutPane(pane) {
	state.aboutPane = pane;
	$$('#about-toolbar [data-about-pane]').forEach((button) => {
		button.setAttribute('aria-selected', button.dataset.aboutPane === pane ? 'true' : 'false');
	});
	$('#about-pane-write').hidden = pane !== 'write';
	$('#about-pane-preview').hidden = pane !== 'preview';
	if (pane === 'write') state.aboutCm?.refresh();
	else renderAboutPreview();
}

async function openAbout({ reload = true } = {}) {
	ensureAboutEditor();
	if (!reload && state.about?.loaded) {
		state.aboutCm.refresh();
		return;
	}

	state.about = emptyAbout();
	notice('#about-message', '');
	$('#about-loading').hidden = false;
	setAboutLoaded(false);
	setAboutPane('write');

	try {
		const data = await api('/api/about');
		fillAbout(data);
		setAboutLoaded(true);
		$('#about-loading').hidden = true;
		state.aboutCm.refresh();
	} catch (error) {
		$('#about-loading').hidden = true;
		setAboutLoaded(false);
		notice(
			'#about-message',
			`Mevcut Hakkımda verileri yüklenemedi. Veri kaybını önlemek için kaydetme devre dışı bırakıldı.<br />${esc(error.message)}<br /><button type="button" class="btn btn--sm" id="btn-about-retry">Yeniden Dene</button>`,
			'error',
		);
		toast(error.message, 'error');
	}
}

function fillAbout(data) {
	if (!state.about) state.about = emptyAbout();
	const about = state.about;
	about.author = data.author ?? '';
	about.authorBio = data.authorBio ?? '';
	about.profileImage = data.profileImage ?? '';
	about.imagePreview = data.profileImage ?? '';
	about.imageUpload = null;
	about.linkSeq = 0;
	about.links = (Array.isArray(data.links) ? data.links : []).map((link) => ({
		id: `l${(about.linkSeq += 1)}`,
		label: link.label ?? '',
		url: link.url ?? '',
	}));
	about.body = data.body ?? '';
	about.loaded = true;

	$('#f-about-author').value = about.author;
	$('#f-about-bio').value = about.authorBio;
	state.aboutCm.setValue(about.body);
	state.aboutCm.clearHistory();
	renderAboutPhoto();
	renderAboutLinks();
	about.saved = aboutSnapshot();
}

function addAboutLink(label = '', url = '') {
	if (!state.about) return;
	state.about.links.push({
		id: `l${(state.about.linkSeq += 1)}`,
		label,
		url,
	});
	renderAboutLinks();
}

function renderAboutLinks() {
	const links = state.about?.links ?? [];
	$('#about-links').innerHTML = links.length
		? links
				.map(
					(link, index) => `<div class="about-link">
						<div class="field">
							<label for="about-link-${link.id}-label">Bağlantı adı</label>
							<input type="text" id="about-link-${link.id}-label" data-about-field="label" data-id="${link.id}" value="${esc(link.label)}" placeholder="Instagram, GitHub, E-posta…" autocomplete="off" />
						</div>
						<div class="field">
							<label for="about-link-${link.id}-url">URL</label>
							<input type="text" id="about-link-${link.id}-url" data-about-field="url" data-id="${link.id}" value="${esc(link.url)}" placeholder="https://… veya mailto:…" autocomplete="off" spellcheck="false" />
						</div>
						<div class="about-link__actions">
							<button type="button" class="btn btn--sm btn--ghost" data-about-link="up" data-id="${link.id}" ${index === 0 ? 'disabled' : ''}>↑</button>
							<button type="button" class="btn btn--sm btn--ghost" data-about-link="down" data-id="${link.id}" ${index === links.length - 1 ? 'disabled' : ''}>↓</button>
							<button type="button" class="btn btn--sm btn--ghost" data-about-link="remove" data-id="${link.id}">Sil</button>
						</div>
					</div>`,
				)
				.join('')
		: '<p class="hint">Henüz bağlantı yok. “+ Yeni Bağlantı Ekle” ile başla.</p>';
}

async function attachAboutImage(file) {
	const limit = state.boot.limits.imageMb;
	const allowed = state.boot.limits.imageExtensions;
	const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
	if (!allowed.includes(ext)) {
		throw new Error(`Bu biçim kabul edilmiyor. İzin verilenler: ${allowed.join(', ')}`);
	}
	if (file.size > limit * 1024 * 1024) {
		throw new Error(`Görsel çok büyük (${formatSize(file.size)}). Sınır ${limit} MB.`);
	}

	const data = await readFileAsBase64(file);
	state.about.imageUpload = { name: file.name, data };
	state.about.imagePreview = `data:${file.type};base64,${data}`;
	renderAboutPhoto();
}

function renderAboutPhoto() {
	const preview = state.about?.imagePreview;
	$('#about-photo').innerHTML = preview
		? `<img src="${esc(preview)}" alt="Profil fotoğrafı önizlemesi" />`
		: 'Fotoğraf yok';
}

function renderAboutMediaPicker() {
	const images = state.boot?.images ?? [];
	$('#about-media-picker').innerHTML = images.length
		? images
				.map(
					(image) =>
						`<button type="button" data-path="${esc(image.path)}" title="${esc(image.name)}">
							<img src="${esc(image.path)}" alt="" /><span>${esc(image.name)}</span>
						</button>`,
				)
				.join('')
		: '<p class="hint">public/images klasöründe henüz görsel yok.</p>';
}

function aboutLinkItems() {
	return collectAboutLinks()
		.filter((link) => link.label && link.url)
		.map((link) => ({ label: link.label, value: link.label, href: link.url }));
}

function validateAboutForm() {
	if (!state.about?.loaded) {
		notice(
			'#about-message',
			'Mevcut Hakkımda verileri yüklenemedi. Veri kaybını önlemek için kaydetme devre dışı bırakıldı.',
			'error',
		);
		return null;
	}

	const author = $('#f-about-author').value.trim();
	const authorBio = $('#f-about-bio').value.trim();
	const links = collectAboutLinks();

	if (!author) {
		notice('#about-message', 'Görünen isim boş olamaz.', 'error');
		$('#f-about-author').focus();
		return null;
	}
	if (!authorBio) {
		notice('#about-message', 'Kısa tanım / ünvan boş olamaz.', 'error');
		$('#f-about-bio').focus();
		return null;
	}

	const clean = [];
	for (const [index, link] of links.entries()) {
		if (!link.label && !link.url) continue;
		if (!link.label) {
			notice('#about-message', `Bağlantı ${index + 1} için bir ad yaz.`, 'error');
			return null;
		}
		if (!link.url) {
			notice('#about-message', `"${esc(link.label)}" için bir adres yaz.`, 'error');
			return null;
		}
		const normalized =
			/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(link.url) && !/^[a-z]+:/i.test(link.url)
				? `mailto:${link.url}`
				: link.url;
		try {
			const parsed = new URL(normalized);
			if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
				throw new Error();
			}
		} catch {
			notice(
				'#about-message',
				`"${esc(link.label)}" geçerli bir adres olmalıdır (https://, http:// veya mailto:).`,
				'error',
			);
			return null;
		}
		clean.push({ label: link.label, url: normalized });
	}

	return {
		author,
		authorBio,
		profileImage: state.about.profileImage,
		imageUpload: state.about.imageUpload,
		links: clean,
		body: state.aboutCm.getValue(),
	};
}

async function renderAboutPreview() {
	const frame = $('#about-preview-frame');
	const theme = document.documentElement.dataset.theme;
	const author = esc($('#f-about-author').value.trim() || 'İsim');
	const bio = esc($('#f-about-bio').value.trim());
	const photo = esc(state.about?.imagePreview || '');
	const links = aboutLinkItems();

	try {
		const { html } = await api('/api/preview', { markdown: state.aboutCm.getValue() });
		const contact = links.length
			? `<section class="about__links"><div class="section-head"><h2>İletişim</h2></div>
				<dl class="contact">${links
					.map(
						(link) =>
							`<div class="contact__row"><dt>${esc(link.label)}</dt><dd><a class="text-link" href="${esc(link.href)}">${esc(link.value)}</a></dd></div>`,
					)
					.join('')}</dl></section>`
			: '';

		frame.srcdoc = `<!doctype html><html lang="tr" data-theme="${theme}"><head><meta charset="utf-8" />
			<link rel="stylesheet" href="/site.css" />
			<style>
				body{margin:0}
				.about{max-width:42rem;margin:0 auto;padding:2.5rem 1.25rem}
				.about__header{display:flex;flex-wrap:wrap;align-items:center;gap:1.75rem 2.25rem;padding-bottom:2.5rem;border-bottom:1px solid var(--rule)}
				.about__photo{width:8rem;height:8rem;object-fit:cover;border:1px solid var(--rule-strong);background:var(--bg-subtle)}
				.about__bio{margin-top:2.5rem}
				.about__links{margin-top:4rem}
				.contact{margin:0}
				.contact__row{display:grid;grid-template-columns:8rem 1fr;gap:.5rem 1.5rem;padding:.8rem 0;border-bottom:1px solid var(--rule)}
				.contact dt{font-family:var(--font-sans);font-size:var(--step--1);color:var(--text-muted)}
				.contact dd{margin:0;overflow-wrap:anywhere}
			</style></head>
			<body><div class="wrap about">
				<header class="about__header">
					${photo ? `<img class="about__photo" src="${photo}" alt="${author} profil fotoğrafı" width="160" height="160" />` : ''}
					<div><h1 class="page-title">Hakkımda</h1><p class="page-intro">${bio}</p></div>
				</header>
				<div class="prose about__bio">${html}</div>
				${contact}
			</div></body></html>`;
	} catch (error) {
		frame.srcdoc = `<!doctype html><meta charset="utf-8" /><p style="font-family:sans-serif;color:#a3231a">Önizleme oluşturulamadı: ${esc(error.message)}</p>`;
	}
}

async function saveAbout() {
	const payload = validateAboutForm();
	if (!payload) return;

	const button = $('#btn-about-save');
	button.disabled = true;
	button.textContent = 'Kaydediliyor…';

	try {
		await api('/api/save-about', payload);
		const fresh = await api('/api/about');
		fillAbout(fresh);
		setAboutLoaded(true);
		await refreshBoot();
		notice('#about-message', 'Hakkımda sayfası başarıyla güncellendi.');
		toast('Hakkımda sayfası başarıyla güncellendi.');
	} catch (error) {
		notice('#about-message', esc(error.message), 'error');
		toast(error.message, 'error');
	} finally {
		button.disabled = false;
		button.textContent = 'Değişiklikleri Kaydet';
	}
}

/* -------------------------------------------------------------------------- */

state.form = emptyForm('yazilar');
state.about = emptyAbout();
boot();
