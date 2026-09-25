/**
 * Panelin paylaşılan yardımcıları: sunucu çağrıları, bildirimler, onay
 * pencereleri ve slug üretimi.
 */

export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => [...document.querySelectorAll(selector)];

/** HTML içine metin gömerken kullanılır. */
export function esc(value) {
	return String(value ?? '').replace(
		/[&<>"']/g,
		(ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
	);
}

/**
 * Sunucuya istek atar. Gövde verilirse POST olur ve panelin kendi başlığı
 * eklenir; sunucu bu başlık olmadan yazma isteklerini kabul etmez.
 */
export async function api(path, body) {
	const isPost = body !== undefined;
	const response = await fetch(path, {
		method: isPost ? 'POST' : 'GET',
		headers: isPost ? { 'content-type': 'application/json', 'x-bahtep-admin': '1' } : {},
		body: isPost ? JSON.stringify(body) : undefined,
	});

	let payload;
	try {
		payload = await response.json();
	} catch {
		throw new Error('Sunucudan beklenen yanıt gelmedi. Panel hâlâ çalışıyor mu?');
	}
	if (!payload.ok) throw new Error(payload.error || 'Bilinmeyen bir hata oluştu.');
	return payload.data;
}

let toastTimer;

export function toast(message, kind = 'info') {
	const el = $('#toast');
	el.textContent = message;
	el.dataset.kind = kind;
	el.hidden = false;
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => {
		el.hidden = true;
	}, kind === 'error' ? 6000 : 3000);
}

export function notice(selector, message, kind = 'info') {
	const el = $(selector);
	if (!message) {
		el.hidden = true;
		el.innerHTML = '';
		return;
	}
	el.className = `notice${kind === 'info' ? '' : ` notice--${kind}`}`;
	el.innerHTML = message;
	el.hidden = false;
}

/**
 * Onay penceresi. `render` ile içerik yerleştirilir, `validate` doğru
 * dönmedikçe onay düğmesi kapalı kalır. Söz (promise) true/false döner.
 */
export function confirmDialog({ title, html = '', confirmText = 'Onayla', danger = false, onRender, validate }) {
	return new Promise((resolve) => {
		const dialog = $('#dialog');
		const confirmBtn = $('#dialog-confirm');
		const cancelBtn = $('#dialog-cancel');
		const body = $('#dialog-body');

		$('#dialog-title').textContent = title;
		body.innerHTML = html;
		confirmBtn.textContent = confirmText;
		confirmBtn.className = `btn ${danger ? 'btn--danger' : 'btn--primary'}`;
		dialog.hidden = false;

		const revalidate = () => {
			confirmBtn.disabled = typeof validate === 'function' ? !validate(body) : false;
		};

		const close = (result) => {
			dialog.hidden = true;
			body.innerHTML = '';
			confirmBtn.disabled = false;
			confirmBtn.removeEventListener('click', onConfirm);
			cancelBtn.removeEventListener('click', onCancel);
			dialog.removeEventListener('click', onBackdrop);
			document.removeEventListener('keydown', onKey);
			body.removeEventListener('input', revalidate);
			resolve(result);
		};

		const onConfirm = () => close(true);
		const onCancel = () => close(false);
		const onKey = (event) => {
			if (event.key === 'Escape') close(false);
		};

		const onBackdrop = (event) => {
			if (event.target === dialog) close(false);
		};

		confirmBtn.addEventListener('click', onConfirm);
		cancelBtn.addEventListener('click', onCancel);
		dialog.addEventListener('click', onBackdrop);
		document.addEventListener('keydown', onKey);
		body.addEventListener('input', revalidate);

		if (typeof onRender === 'function') onRender(body, close);
		revalidate();
		(body.querySelector('input, textarea') ?? confirmBtn).focus();
	});
}

/**
 * Başlıktan dosya adı üretir.
 * src/lib/format.ts içindeki slugifyTag ile aynı kuralları uygular; sunucu
 * kaydetmeden önce sonucu ayrıca doğrular.
 */
export function slugify(text) {
	const map = { ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
	return String(text ?? '')
		.trim()
		.toLocaleLowerCase('tr')
		.replace(/[çğıİöşüâîû]/g, (ch) => map[ch] ?? ch)
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/** 2026-09-24 -> 24 Eylül 2026 */
const trDate = new Intl.DateTimeFormat('tr-TR', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: 'Europe/Istanbul',
});

export function formatDate(value) {
	if (!value) return '—';
	const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
	if (Number.isNaN(date.getTime())) return '—';
	return trDate.format(date);
}

export function formatSize(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Dosyayı base64 olarak okur (görsel yüklemesi için). */
export function readFileAsBase64(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result).replace(/^data:[^;]+;base64,/, ''));
		reader.onerror = () => reject(new Error('Dosya okunamadı.'));
		reader.readAsDataURL(file);
	});
}
