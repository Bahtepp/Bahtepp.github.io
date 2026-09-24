# BAHTEP

Bu klasör, **bahtep.com** kişisel yayın sitesinin bütün dosyalarını içerir.
Site üç tür içerik yayınlar: **fikir yazıları**, **araştırmalar** ve **notlar**.

Bu README teknik bilgi gerektirmeyecek şekilde yazıldı. Sırayla okuyabilir veya
aşağıdaki başlıklardan ihtiyacın olana atlayabilirsin.

---

## İçindekiler

1. [Site nasıl çalışıyor?](#1-site-nasıl-çalışıyor)
2. [Günlük kullanacağın komutlar](#2-günlük-kullanacağın-komutlar)
3. [Yerel İçerik Yönetim Paneli](#3-yerel-içerik-yönetim-paneli)
4. [Yeni yazı nasıl eklenir?](#4-yeni-yazı-nasıl-eklenir)
5. [Frontmatter alanları](#5-frontmatter-alanları)
6. [Markdown nasıl kullanılır?](#6-markdown-nasıl-kullanılır)
7. [Kaynak ve dipnot nasıl eklenir?](#7-kaynak-ve-dipnot-nasıl-eklenir)
8. [Görsel nasıl eklenir?](#8-görsel-nasıl-eklenir)
9. [Etiketler](#9-etiketler)
10. [Taslak saklamak ve yayınlamak](#10-taslak-saklamak-ve-yayınlamak)
11. [Site bilgilerini değiştirmek](#11-site-bilgilerini-değiştirmek)
12. [Hakkımda sayfası ve profil fotoğrafı](#12-hakkımda-sayfası-ve-profil-fotoğrafı)
13. [Siteyi GitHub'a göndermek](#13-siteyi-githuba-göndermek)
14. [GitHub Pages nasıl çalışıyor?](#14-github-pages-nasıl-çalışıyor)
15. [bahtep.com alan adını bağlamak](#15-bahtepcom-alan-adını-bağlamak)
16. [Klasör yapısı](#16-klasör-yapısı)
17. [Sorun giderme](#17-sorun-giderme)

---

## 1. Site nasıl çalışıyor?

Site **statik**tir. Yani veritabanı, PHP veya sunucu tarafında çalışan bir program yoktur.

Çalışma mantığı şöyle:

1. Yazılarını bilgisayarında **Markdown** dosyaları (`.md`) olarak yazarsın.
2. Bilgisayarında bir komut çalıştırırsın, **Astro** bu yazıları hazır HTML sayfalarına
   dönüştürür.
3. Dosyaları GitHub'a gönderirsin.
4. GitHub, siteyi otomatik olarak derleyip yayınlar.

Bu yüzden site çok hızlıdır ve barındırma ücreti yoktur.

Kullanılan araçlar:

| Araç | Ne işe yarıyor? |
| --- | --- |
| Astro | Markdown dosyalarını web sayfasına çeviren sistem |
| Markdown | Yazıları yazdığın basit metin biçimi |
| Pagefind | Site içi arama (sunucu gerektirmez) |
| GitHub Pages | Sitenin yayınlandığı yer |
| GitHub Actions | Her gönderimde siteyi otomatik derleyip yayınlayan otomasyon |

---

## 2. Günlük kullanacağın komutlar

Komutları bu klasörün içinde bir terminalde çalıştır.

**En başta bir kez** (veya `node_modules` klasörünü sildiysen):

```bash
npm install
```

**Siteyi bilgisayarında açmak (yazı yazarken bunu kullan):**

```bash
npm run dev
```

Sonra tarayıcıda şu adresi aç: **http://localhost:4321**

Bu ekran açıkken bir Markdown dosyasını kaydettiğinde tarayıcı kendiliğinden yenilenir.
Durdurmak için terminalde `Ctrl + C` tuşlarına bas.

**Yayın sürümünü hazırlamak (hata var mı diye kontrol etmek için):**

```bash
npm run build
```

**Yayın sürümünü bilgisayarında önizlemek:**

```bash
npm run preview
```

> **Not:** Site içi arama yalnızca `npm run build` sonrasında çalışır, çünkü arama dizini
> derleme sırasında oluşturulur. Aramayı denemek istersen önce `npm run build`, sonra
> `npm run preview` çalıştır.

**Yazı yazmak için yerel yönetim panelini açmak:**

```bash
npm run admin
```

Panel: **http://localhost:3000** — yalnızca senin bilgisayarında açılır, sitede yayınlanmaz.

**Siteyi ve paneli birlikte açmak:**

```bash
npm run edit
```

- Blog: **http://localhost:4321**
- Yönetim: **http://localhost:3000**

---

## 3. Yerel İçerik Yönetim Paneli

Markdown dosyalarını elle düzenlemek zorunda değilsin. Paneli kendi
bilgisayarında açıp yazılarını oradan oluşturabilir, düzenleyebilir ve
GitHub'a gönderebilirsin.

**Bu panel sitede yayınlanmaz.** GitHub Pages'te `/admin` adresi yoktur.
Yalnızca `127.0.0.1` üzerinde, kendi makinenizde çalışır.

### Paneli açmak

```bash
npm run admin
```

Tarayıcıda **http://localhost:3000** adresini aç. 3000 meşgulse panel sıradaki
boş portu dener ve adresi terminale yazar.

Siteyi de aynı anda görmek istersen:

```bash
npm run edit
```

### Yeni yazı oluşturma

1. Ana ekranda **+ Yeni Fikir Yazısı**, **+ Yeni Araştırma** veya **+ Yeni Not**
   seç.
2. Başlık ve kısa açıklamayı yaz. Dosya adı başlıktan otomatik oluşur; istersen
   değiştir.
3. Yayın tarihini, etiketleri, taslak ve öne çıkan kutularını doldur.
4. Metni alttaki editöre yaz. Üstteki düğmelerle başlık, kalın, alıntı, liste,
   link, tablo ve dipnot ekleyebilirsin.
5. **Yaz / Önizle** sekmeleriyle metnin sitede nasıl görüneceğini kontrol et.
6. **Kaydet**. Dosya doğru klasöre yazılır:
   - Fikir → `src/content/yazilar/`
   - Araştırma → `src/content/arastirmalar/`
   - Not → `src/content/notlar/`

### Araştırmaya kaynak ekleme

Araştırma oluştururken **Kaynaklar** bölümü açık gelir.

1. **+ Kaynak Ekle**
2. Anahtar yaz (örnek: `tuik2026`)
3. Yazar, çalışma adı, yıl, URL gibi alanları doldur
4. İmleci metinde istediğin yere koy, **Dipnot Ekle**ye bas

Metne `[^tuik2026]` eklenir. Kaydederken dipnot tanımı dosyanın **sonuna**
otomatik yazılır. Aynı anahtarı birden fazla yerde kullanırsan kaynakçada
tek satır görünür — sitenin mevcut dipnot sistemiyle aynıdır.

### Görsel ekleme

**Kapak görseli:**

1. **Kapak Görseli Seç** ile bilgisayarından `.jpg`, `.jpeg`, `.png` veya
   `.webp` seç, veya **Mevcut görseller** ile `public/images/` içinden seç
2. ALT metnini yaz
3. Kaydettiğinde görsel `public/images/` altına güvenli bir adla kopyalanır
   ve frontmatter'a `image: "/images/..."` yazılır

**Metin içi görsel:** editördeki **Görsel** düğmesi, mevcut görsellerden birini
`![](/images/...)` olarak ekler. Yeni görsel yüklemek için soldaki **Medya**
sayfasını kullan.

### Taslak ve yayın

Yeni içerik varsayılan olarak **taslak** kaydedilir. Taslaklar yerelde
görünür, yayınlanan sitede görünmez.

- Listede **Yayınla** → `draft: false`
- **Taslağa Al** → `draft: true`

Aynı kutular düzenleme formunda da vardır.

### Mevcut yazıyı düzenleme

Listeden **Düzenle**. Frontmatter ve metin forma dolar. Kaydettiğinde aynı
dosya güncellenir. Dosya adını değiştirirsen dosya yeniden adlandırılır;
başka bir dosyanın üzerine yazılmaz.

**Önizle** veya düzenleyicide **Sitede Önizle**, Astro sunucusu açıksa
`http://localhost:4321/...` adresini açar. Kapalıysa **Siteyi Başlat**
diyebilirsin.

### GitHub'a gönderme

Soldaki **GitHub** sayfasında:

1. Gönderilecek dosyalar listelenir
2. Commit mesajını yaz
3. **Gönder** ve onay penceresini kabul et

Sırayla `git add`, `git commit`, `git push` çalışır. Panel force push yapmaz
ve şifre saklamaz. GitHub girişi yoksa hatayı anlaşılır şekilde gösterir.

---

## 4. Yeni yazı nasıl eklenir?

Her içerik türünün kendi klasörü var. Yeni bir yazı eklemek için **ilgili klasöre yeni bir
`.md` dosyası** koyman yeterli. Başka hiçbir yeri düzenlemene gerek yoktur; listeler,
etiketler, RSS ve arama kendiliğinden güncellenir.

| Ne yazıyorsun? | Dosyayı buraya koy | Adresi böyle olur |
| --- | --- | --- |
| Fikir yazısı | `src/content/yazilar/` | `/yazilar/dosya-adi/` |
| Araştırma | `src/content/arastirmalar/` | `/arastirmalar/dosya-adi/` |
| Not | `src/content/notlar/` | `/notlar/dosya-adi/` |

**Dosya adı, yazının internet adresi olur.** Bu yüzden dosya adında:

- Türkçe harf kullanma (`ş, ç, ğ, ı, ö, ü` yerine `s, c, g, i, o, u`)
- Boşluk yerine tire kullan
- Sadece küçük harf kullan

İyi örnek: `yapay-zeka-ve-oyun-sektoru.md`
Kötü örnek: `Yapay Zekâ Üzerine.md`

### Yeni bir fikir yazısı

`src/content/yazilar/` klasöründe `ilk-yazim.md` adında bir dosya oluştur ve içine şunu yaz:

```markdown
---
title: "İlk Yazım"
description: "Bu yazıda neyi anlattığımın bir cümlelik özeti."
date: 2026-09-24
tags:
  - teknoloji
---

Yazının ilk paragrafı buraya gelir.

## Bir başlık

Devam eden metin.
```

Kaydettiğinde yazı otomatik olarak `/yazilar/ilk-yazim/` adresinde ve **Yazılar**
sayfasının en üstünde görünür.

### Yeni bir araştırma

Aynı şekilde, ama dosyayı `src/content/arastirmalar/` klasörüne koy. Araştırmalarda
ek olarak şunlar otomatik çalışır:

- Sayfanın yanında **İçindekiler** listesi (yazıdaki `##` ve `###` başlıklarından oluşur)
- Yazının sonunda **Kaynakça** bölümü (dipnot kullandıysan)

### Yeni bir not

Dosyayı `src/content/notlar/` klasörüne koy. Notlar daha sade, tarih sıralı bir listede
görünür. Kısa yazılar için uygundur.

---

## 5. Frontmatter alanları

Her Markdown dosyasının en üstündeki iki `---` satırı arasındaki bölüme
**frontmatter** denir. Yazının bilgilerini burada tutarsın.

```markdown
---
title: "Yazının Başlığı"
description: "Listelerde ve Google'da görünecek kısa açıklama."
date: 2026-09-24
updatedDate: 2026-10-01
tags:
  - teknoloji
  - internet
draft: false
featured: false
image: "/images/ornek.jpg"
imageAlt: "Görselin kısa açıklaması"
---
```

| Alan | Zorunlu mu? | Ne işe yarar? |
| --- | --- | --- |
| `title` | **Zorunlu** | Yazının başlığı |
| `description` | **Zorunlu** | Listelerde ve arama motorlarında görünen özet |
| `date` | **Zorunlu** | Yayın tarihi. `YIL-AY-GÜN` biçiminde yazılır |
| `updatedDate` | İsteğe bağlı | Sonradan düzelttiysen güncelleme tarihi |
| `tags` | İsteğe bağlı | Etiketler |
| `category` | İsteğe bağlı | Yazılmazsa klasöre göre otomatik atanır (Fikir / Araştırma / Not) |
| `author` | İsteğe bağlı | Yazılmazsa merkezi ayardaki isim kullanılır |
| `draft` | İsteğe bağlı | `true` ise yazı yayınlanmaz |
| `featured` | İsteğe bağlı | `true` ise ana sayfada öne çıkan yazı olabilir |
| `image` | İsteğe bağlı | Kapak görseli |
| `imageAlt` | İsteğe bağlı | Kapak görselinin açıklaması |

**Yazmana gerek olmayan şeyler:** okuma süresi otomatik hesaplanır, adres dosya adından
üretilir, etiket sayfaları kendiliğinden oluşur.

> **Dikkat:** Başlıkta iki nokta (`:`) veya tırnak kullanacaksan başlığı çift tırnak
> içine almayı unutma: `title: "Örnek: Bir Başlık"`

---

## 6. Markdown nasıl kullanılır?

Markdown, biçimlendirmeyi basit işaretlerle yapmanı sağlar.

### Başlıklar

Yazının ana başlığını frontmatter'daki `title` alanı verir. **Metin içinde `#` kullanma**,
`##` ile başla:

```markdown
## Ana bölüm başlığı
### Alt başlık
#### Daha alt başlık
```

`##` ve `###` başlıkları araştırma yazılarında **İçindekiler** listesine otomatik girer.

### Kalın, italik, üstü çizili

```markdown
**kalın yazı**
*italik yazı*
~~üstü çizili~~
`teknik terim`
```

### Paragraflar

Yeni paragraf için **aralarında bir boş satır bırak**. Boş satır bırakmazsan iki satır
birleşir.

### Bağlantı (link)

```markdown
[Bağlantının görünen metni](https://ornek.com)
```

Site içindeki bir sayfaya bağlanmak için:

```markdown
[Araştırmalar sayfası](/arastirmalar/)
```

Dış bağlantılar otomatik olarak yeni sekmede ve güvenli biçimde açılır; ek bir şey
yapmana gerek yok.

### Alıntı

```markdown
> Alıntılanan metin buraya yazılır.
```

### Listeler

```markdown
- birinci madde
- ikinci madde
  - iç içe madde

1. birinci adım
2. ikinci adım
```

### Tablo

```markdown
| Başlık | Başlık |
| --- | --- |
| Hücre | Hücre |
| Hücre | Hücre |
```

Geniş tablolar telefonda yatay kaydırılabilir; sayfayı bozmaz.

### Kod bloğu

Üç ters tırnak (`` ` ``) arasına yaz:

````markdown
```js
console.log('merhaba');
```
````

### Yatay çizgi

```markdown
---
```

---

## 7. Kaynak ve dipnot nasıl eklenir?

Bu, özellikle araştırma yazıları için hazırlandı.

**İki adımda çalışır.**

**1. Adım —** Kaynak göstermek istediğin cümlenin sonuna bir işaret koy:

```markdown
Yapay zekâ kullanımının son yıllarda arttığı görülmektedir.[^1]
```

**2. Adım —** Dosyanın **en altına** o işaretin karşılığını yaz:

```markdown
[^1]: Yazar Adı, "Çalışmanın Adı", Kurum, 2025, <https://ornek.com/kaynak>
```

Bu kadar. Site geri kalanını kendisi yapar:

- Yazının sonunda **KAYNAKÇA** başlıklı bir bölüm oluşturur
- Kaynakları metinde geçtikleri sıraya göre `1, 2, 3...` diye numaralandırır
- Metindeki numaraya tıklayınca ilgili kaynağa götürür
- Kaynağın yanındaki ↩ işaretine tıklayınca metinde kaldığın yere geri döndürür

### Önemli noktalar

**Numaraları sen saymak zorunda değilsin.** İstediğin ismi kullanabilirsin; numaralar
otomatik verilir:

```markdown
Bir bulgu.[^tuik-2025]

[^tuik-2025]: Kurum Adı, "Rapor Adı", 2025, <https://ornek.com>
```

**Aynı kaynağı birden fazla yerde kullanabilirsin.** Aynı işareti tekrar yazman yeterli,
numara değişmez ve kaynakça tek kayıt gösterir.

**Sıra önemli değil.** Dipnot tanımlarını dosyanın neresine yazarsan yaz, sayfada her
zaman en sonda görünürler. Hepsini dosyanın en altında toplu tutmak en kolayıdır.

**Bağlantıları `< >` içine alırsan** tıklanabilir olur: `<https://ornek.com>`

Çalışan bir örneği `src/content/arastirmalar/ornek-arastirma-kaynakca-sistemi.md`
dosyasında görebilirsin.

---

## 8. Görsel nasıl eklenir?

**1. Adım —** Görsel dosyasını `public/images/` klasörüne kopyala.
Örnek: `public/images/deniz.jpg`

**2. Adım —** Kullanmak istediğin yere göre:

**Yazının kapak görseli olarak** (yazının en üstünde çıkar) — frontmatter'a ekle:

```markdown
image: "/images/deniz.jpg"
imageAlt: "Gün batımında sakin bir deniz"
```

**Yazının içinde bir yerde** — metnin arasına yaz:

```markdown
![Gün batımında sakin bir deniz](/images/deniz.jpg)
```

Köşeli parantez içindeki metin, görseli göremeyen okurlar ve ekran okuyucular için
kullanılır. **Boş bırakma.**

### Dikkat edilecekler

- Adres **`/images/` ile başlar**, `public` yazmazsın.
- Dosya adında Türkçe harf ve boşluk kullanma: `deniz-manzarasi.jpg` gibi.
- Görselleri yüklemeden önce boyutunu küçült (genişlik 1600 piksel civarı yeterlidir).
  Büyük dosyalar siteyi yavaşlatır.
- Kapak görselleri sabit orana yerleştirilir, bu yüzden sayfa yüklenirken içerik
  zıplamaz.
- Örnek görseller `.svg` biçimindedir. Kendi yazıların için **`.jpg` veya `.png`**
  kullan: sosyal medya paylaşım önizlemeleri `.svg` desteklemez.

---

## 9. Etiketler

Etiket eklemek için ayrı bir yer tanımlamana gerek yok. Frontmatter'a yazdığın anda
etiket sayfası kendiliğinden oluşur:

```markdown
tags:
  - yapay-zeka
  - toplum
```

`yapay-zeka` etiketi `/etiket/yapay-zeka/` adresinde listelenir. Bütün etiketlerin
listesi `/etiketler/` adresindedir.

**Öneriler:**

- Küçük harf kullan.
- Boşluk yerine tire kullan: `yapay-zeka`
- Türkçe harf kullanırsan adres otomatik sadeleştirilir (`Yapay Zekâ` → `yapay-zeka`),
  ama tutarlı olmak için baştan sade yazmak daha iyidir.
- Bir yazıya 2–5 etiket yeterlidir.

---

## 10. Taslak saklamak ve yayınlamak

**Bir yazıyı taslak olarak saklamak** için frontmatter'a şunu ekle:

```markdown
draft: true
```

Bu durumda yazı:

- `npm run dev` ile açtığın **kendi bilgisayarında** görünür (yanında **TASLAK** etiketi olur)
- Yayınlanan sitede **hiç oluşturulmaz**; kimse göremez, arama ve RSS'e de girmez

**Yayınlamak** için `draft: true` satırını şu hale getir:

```markdown
draft: false
```

veya satırı tamamen sil (varsayılan olarak yayınlanır sayılır).

Sonra değişikliği GitHub'a gönder:

```bash
git add .
git commit -m "Yeni yazı: İlk Yazım"
git push
```

Birkaç dakika içinde site kendiliğinden güncellenir.

---

## 11. Site bilgilerini değiştirmek

Sitenin adı, açıklaması, yazar adı ve bağlantıları **tek bir dosyadan** yönetilir:

### `src/site.config.ts`

```ts
siteName: 'BAHTEP',                        // Header'da ve sekme başlığında görünen ad
tagline: 'Fikirler, araştırmalar ve notlar.',  // Ana sayfadaki büyük yazının altı
description: '...',                        // Google ve paylaşım kartları için açıklama
author: 'Bahtep',                          // Yazar adı
domain: 'https://bahtep.com',              // İleride kullanılacak alan adı
githubPagesUrl: 'https://bahtepp.github.io',   // Şimdiki adres
useCustomDomain: false,                    // bahtep.com bağlanınca true yapılır

links: {
  email: '',                               // örn: 'merhaba@bahtep.com'
  github: 'https://github.com/Bahtepp',
  x: '',                                   // örn: 'https://x.com/kullanici'
  linkedin: '',
},
```

**Bağlantılar boş (`''`) bırakıldığında sitede hiç görünmez.** Doldurduğunda hem
Hakkımda sayfasında hem sayfa altında kendiliğinden çıkar.

Üst menüdeki bağlantıları değiştirmek istersen aynı dosyanın en altındaki `navigation`
listesini düzenle.

### Renk ve yazı tipi

Görsel ayarlar `src/styles/global.css` dosyasının en üstündeki bölümdedir. Renkler
açık tema için `[data-theme='light']`, koyu tema için `[data-theme='dark']` altında
tanımlanır.

---

## 12. Hakkımda sayfası ve profil fotoğrafı

**Biyografi metnini değiştirmek için:** `src/pages/hakkimda.astro` dosyasını aç.
`<p>` ile `</p>` arasındaki yazıları kendi metninle değiştir. Yeni paragraf eklemek
için `<p>Metnin buraya</p>` satırı ekle.

**Profil fotoğrafını değiştirmek için:**

1. Fotoğrafını `public/images/` klasörüne kopyala, örnek: `public/images/profil.jpg`
   (kare bir fotoğraf en iyi görünür)
2. `src/site.config.ts` dosyasında şu satırı güncelle:

```ts
profileImage: '/images/profil.jpg',
```

Şu anda `profile-placeholder.svg` adlı geçici bir görsel kullanılıyor.

**İletişim bağlantılarını değiştirmek için:** yukarıdaki `links` bölümünü düzenle.

---

## 13. Siteyi GitHub'a göndermek

Bu klasör zaten şu depoya bağlı: **https://github.com/Bahtepp/bahtepp.github.io**

Değişiklik yaptıktan sonra sırayla üç komut:

```bash
git add .
git commit -m "Neyi değiştirdiğini kısaca yaz"
git push
```

- `git add .` → değişen bütün dosyaları gönderime hazırlar
- `git commit -m "..."` → değişikliği not düşerek kaydeder
- `git push` → GitHub'a yükler

`git push` sonrası GitHub siteyi otomatik derler ve yayınlar. Bu genelde 1–2 dakika sürer.

**İlk `git push` sırasında GitHub kullanıcı adı ve şifre isterse:** normal şifren
çalışmaz. GitHub'da bir *Personal Access Token* oluşturman veya GitHub Desktop
uygulamasını kullanman gerekir.

**Durumu kontrol etmek için yararlı komutlar:**

```bash
git status     # hangi dosyalar değişmiş?
git log --oneline   # geçmiş kayıtlar
```

---

## 14. GitHub Pages nasıl çalışıyor?

Depoya her gönderim yaptığında `.github/workflows/deploy.yml` dosyasındaki otomasyon
çalışır ve şunları yapar:

1. Depoyu GitHub'ın sunucusuna indirir
2. `npm install` ile gerekli paketleri kurar
3. `npm run build` ile siteyi derler (arama dizini de burada oluşur)
4. Sonucu GitHub Pages'e yayınlar

Site şu adreste yayınlanır: **https://bahtepp.github.io**

**İşlemin durumunu görmek için:** GitHub'daki deponun **Actions** sekmesine bak.
Yeşil tik başarılı, kırmızı çarpı hatalı anlamına gelir. Kırmızıysa üzerine tıklayıp
hata mesajını okuyabilirsin.

**Bir kez yapman gereken ayar:** GitHub'da deponun **Settings → Pages** bölümünde,
**Source** seçeneğinin **GitHub Actions** olarak seçili olması gerekir.

---

## 15. bahtep.com alan adını bağlamak

Alan adını satın aldığında üç adım var.

**1. Alan adı sağlayıcında DNS kayıtlarını ayarla.**

`bahtep.com` için dört adet `A` kaydı:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

`www.bahtep.com` için bir `CNAME` kaydı: `bahtepp.github.io`

**2. Projede iki değişiklik yap.**

`public/CNAME` adında bir dosya oluştur ve içine sadece şunu yaz:

```
bahtep.com
```

Sonra `src/site.config.ts` dosyasında şu satırı değiştir:

```ts
useCustomDomain: true,
```

Bu satır sayesinde canonical adresler, sitemap ve RSS otomatik olarak `bahtep.com`
adresini kullanmaya başlar. Başka hiçbir dosyayı düzenlemene gerek yoktur.

**3. Değişikliği gönder ve GitHub'da onayla.**

```bash
git add .
git commit -m "bahtep.com alan adını bağla"
git push
```

Ardından GitHub'da **Settings → Pages → Custom domain** alanına `bahtep.com` yaz ve
kaydet. DNS kontrolü tamamlandıktan sonra **Enforce HTTPS** seçeneğini işaretle.

DNS değişikliklerinin yayılması bazen birkaç saat sürebilir.

---

## 16. Klasör yapısı

```
bahtep.com/
├── public/                  ← olduğu gibi yayınlanan dosyalar
│   ├── images/              ← GÖRSELLERİ BURAYA KOY
│   └── favicon.svg
├── src/
│   ├── site.config.ts       ← SİTE BİLGİLERİ BURADA
│   ├── content.config.ts    ← frontmatter alanlarının tanımı
│   ├── content/             ← BÜTÜN YAZILAR BURADA
│   │   ├── yazilar/         ← fikir yazıları
│   │   ├── arastirmalar/    ← araştırmalar
│   │   └── notlar/          ← notlar
│   ├── pages/               ← sayfalar ve adresler
│   │   ├── index.astro      ← ana sayfa
│   │   └── hakkimda.astro   ← HAKKIMDA METNİ BURADA
│   ├── layouts/             ← sayfa iskeletleri
│   ├── components/          ← header, footer, içindekiler vb.
│   ├── lib/                 ← okuma süresi, tarih, etiket hesaplamaları
│   └── styles/
│       └── global.css       ← RENKLER VE YAZI TİPLERİ BURADA
├── tools/admin/             ← YEREL YÖNETİM PANELİ (sitede yayınlanmaz)
├── .github/workflows/
│   └── deploy.yml           ← otomatik yayınlama
├── astro.config.mjs         ← Astro ayarları
└── package.json             ← komutlar ve paketler
```

Elle düzenlememen gereken klasörler: `node_modules/`, `dist/`, `.astro/`.
Bunlar otomatik oluşur ve GitHub'a gönderilmez.

---

## 17. Sorun giderme

**`npm run dev` çalışmıyor / "command not found" diyor**
Node.js kurulu değil olabilir. [nodejs.org](https://nodejs.org) adresinden LTS sürümünü
kur, terminali kapat aç ve tekrar dene.

**Bir paket eksik hatası alıyorum**
Bu klasörde `npm install` çalıştır.

**Yeni yazım sitede görünmüyor**
Sırayla kontrol et:
1. Dosya doğru klasörde mi? (`src/content/yazilar/` gibi)
2. Dosya adı `.md` ile bitiyor mu?
3. Frontmatter'da `draft: true` kalmış olabilir mi?
4. `title`, `description` ve `date` alanlarının üçü de yazılmış mı?

**`npm run build` hata veriyor ve bir dosya adı gösteriyor**
Genelde frontmatter hatasıdır. Çoğu zaman sebebi şunlardan biridir:
- Zorunlu alanlardan biri eksik
- Tarih yanlış yazılmış (doğrusu `2026-09-24`)
- Başlıkta iki nokta var ama tırnak yok (doğrusu `title: "Örnek: Başlık"`)

**Arama çalışmıyor**
Arama dizini derleme sırasında oluşur. `npm run dev` sırasında çalışmaz; bu normaldir.
Denemek için `npm run build` sonra `npm run preview` çalıştır.

**Yönetim paneli açılmıyor / port meşgul**
`3000` meşgulse panel sıradaki portu dener ve adresi terminale yazar. İstersen
kendin seçebilirsin:

```powershell
$env:BAHTEP_ADMIN_PORT=3100; npm run admin
```

**Sitede Türkçe harfler bozuk görünüyor**
Markdown dosyalarını UTF-8 kodlamasıyla kaydettiğinden emin ol (çoğu düzenleyici
varsayılan olarak böyle kaydeder).
