/**
 * BAHTEP — merkezi ayar dosyası.
 *
 * Sitenin adı, açıklaması, adresi ve iletişim bağlantıları burada tutulur.
 * Başka dosyaları değiştirmeye gerek yoktur; bu dosyayı düzenlemek yeterlidir.
 */

export const siteConfig = {
	/** Sitenin adı. Header'da ve sekme başlığında görünür. */
	siteName: 'BAHTEP',

	/** Ana sayfadaki büyük başlığın altında görünen kısa cümle. */
	tagline: 'Fikirler, araştırmalar ve notlar.',

	/** Arama motorları ve paylaşım kartları için genel site açıklaması. */
	description:
		'BAHTEP — fikir yazıları, kaynakçalı araştırmalar ve kısa notlardan oluşan kişisel bir yayın.',

	/** Yazar adı. Yazıların altında ve structured data içinde kullanılır. */
	author: 'Bahtep',

	/** Yazar hakkında tek cümlelik tanım. */
	authorBio: 'Düşünürüm, hep düşünürüm çok düşünürüm bazen araştırırım. linçlenecek fikirlerim var o yüzden monolog bi site geliştirdim :D',

	/** İleride kullanılacak kendi alan adı. */
	domain: 'https://bahtep.com',

	/** Şu anki GitHub Pages adresi. */
	githubPagesUrl: 'https://bahtepp.github.io',

	/**
	 * bahtep.com alan adı siteye bağlandığında bunu `true` yap.
	 * `true` olduğunda canonical adresler, sitemap ve RSS `domain` değerini kullanır.
	 */
	useCustomDomain: false,

	/** Sayfa dili. */
	lang: 'tr',
	locale: 'tr_TR',

	/** Hakkımda sayfasındaki profil fotoğrafı. Dosyayı public/images/ içine koy. */
	profileImage: '/images/bahtep-pp.jpeg',

	/** Paylaşım kartlarında kullanılacak varsayılan görsel. Boş bırakılabilir. */
	defaultImage: '',

	/**
	 * İletişim ve sosyal medya bağlantıları.
	 * Kullanmak istemediğin bir alanı boş string ('') bırak; o zaman sitede görünmez.
	 */
	links: {
		email: 'babbaturalp@gmail.com',
		github: 'https://github.com/Bahtepp',
		x: '',
		linkedin: '',
	},

	/** Dakikada okunan ortalama kelime sayısı. Okuma süresi bundan hesaplanır. */
	wordsPerMinute: 200,
} as const;

/** Sitenin canonical kök adresi. Astro config, sitemap ve RSS bunu kullanır. */
export const SITE_URL = siteConfig.useCustomDomain
	? siteConfig.domain
	: siteConfig.githubPagesUrl;

/** Header ve mobil menüdeki gezinme bağlantıları. */
export const navigation = [
	{ label: 'Yazılar', href: '/yazilar/' },
	{ label: 'Araştırmalar', href: '/arastirmalar/' },
	{ label: 'Notlar', href: '/notlar/' },
	{ label: 'Hakkımda', href: '/hakkimda/' },
	{ label: 'Arama', href: '/arama/' },
] as const;
