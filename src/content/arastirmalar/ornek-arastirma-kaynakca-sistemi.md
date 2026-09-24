---
title: "Örnek Araştırma: Kaynakça ve Dipnot Sisteminin Denenmesi"
description: "Demo araştırma yazısı. Dipnotlar, kaynakça, içindekiler, tablolar ve uzun metin düzeni bu örnekte test edilir."
date: 2026-09-24
updatedDate: 2026-09-25
category: "Araştırma"
tags:
  - yapay-zeka
  - yöntem
  - kaynakça
author: "Bahtep"
draft: false
featured: false
---

> **Bu bir örnek içeriktir.** Araştırma bölümünün teknik altyapısını test etmek için
> yazılmıştır. Aşağıdaki cümleler gerçek bir araştırmanın bulguları değildir ve
> kaynakçadaki kayıtlar gerçek yayınlar değil, yer tutucudur.

Bu sayfa, araştırma yazılarının sitede nasıl göründüğünü gösterir. Masaüstünde sağ
tarafta otomatik oluşturulmuş bir **İçindekiler** bölümü, yazının sonunda ise
otomatik numaralanan bir **Kaynakça** bulunur.

## Dipnotlar nasıl çalışır?

Metin içinde kaynak göstermek için cümlenin sonuna `[^1]` biçiminde bir işaret koyarsın.
Örnek bir cümle: yapay zekâ araçlarının kullanımının son yıllarda arttığı
belirtilmektedir.[^1] Aynı paragrafta ikinci bir kaynağa da yer verilebilir.[^2]

Dipnot numarasına tıkladığında sayfa, yazının sonundaki ilgili kaynağa gider. Kaynağın
yanındaki ↩ işaretine tıkladığında ise metinde kaldığın yere geri dönersin.

### Aynı kaynağa birden fazla kez atıf

Bir kaynağı yazının farklı yerlerinde tekrar kullanabilirsin; numara değişmez.[^1]
Böylece aynı çalışmaya yapılan bütün atıflar tek bir kaynakça kaydında toplanır.

### Dipnot yazımı

Kaynakların tanımı dosyanın en altında durur ve şu biçimde yazılır:

```markdown
Bir iddia veya bulgu.[^1]

[^1]: Yazar Adı, "Çalışmanın Adı", Kurum, 2025, https://example.com/kaynak
```

Tanımları dosyanın neresine yazdığın önemli değildir; sayfada her zaman en sonda ve
metindeki sıraya göre numaralanmış olarak görünürler.

## İçindekiler

Sayfanın yanındaki içindekiler listesi, yazıdaki `##` ve `###` başlıklarından otomatik
oluşur. Ayrı bir liste yazmana gerek yoktur. Okurken bulunduğun bölüm listede
belirginleşir. Küçük ekranlarda içindekiler kapalı başlar ve dokununca açılır.

## Uzun metinde diğer öğeler

### Tablolar

Tablolar Markdown ile yazılır ve geniş tablolar mobilde yatay olarak kaydırılabilir:

| Bölüm         | Klasör                      | Örnek adres                 |
| ------------- | --------------------------- | --------------------------- |
| Fikir yazıları | `src/content/yazilar/`      | `/yazilar/ornek-yazi/`      |
| Araştırmalar  | `src/content/arastirmalar/` | `/arastirmalar/ornek/`      |
| Notlar        | `src/content/notlar/`       | `/notlar/ornek-not/`        |

### Alıntılar ve vurgular

> Uzun bir araştırmada alıntılar, okurun gözünü dinlendiren doğal duraklar oluşturur.

Metin içinde **kalın**, *italik* ve `teknik terim` biçimleri birlikte kullanılabilir.
Bir dış kaynağa doğrudan bağlantı da verilebilir: [Astro belgeleri](https://docs.astro.build).

### Kod blokları

Araştırma yazılarında yöntem anlatırken kod veya veri parçası paylaşmak isteyebilirsin:

```js
const kaynaklar = ['rapor', 'makale', 'veri seti'];
const toplam = kaynaklar.length;
console.log(`Kullanılan kaynak türü: ${toplam}`);
```

## Yöntem üzerine kısa not

Araştırma yazılarında yöntemin açıkça yazılması, okurun bulguları
değerlendirebilmesini sağlar.[^3] Bu örnek yazıda yöntem bölümü yalnızca biçimsel
bir yer tutucudur.

## Sonuç

Bu örnek, araştırma altyapısının çalıştığını göstermek için yeterlidir: başlıklardan
içindekiler oluştu, metindeki işaretler kaynakçaya bağlandı ve kaynakçadan metne geri
dönüş mümkün oldu. Kendi araştırmanı yazarken bu dosyayı örnek alabilir veya silebilirsin.

[^1]: Yer tutucu kaynak — Yazar Adı, "Çalışmanın Adı", Kurum, 2025, <https://example.com/kaynak-1>
[^2]: Yer tutucu kaynak — Kurum Adı, "Rapor Başlığı", 2024, <https://example.com/kaynak-2>
[^3]: Yer tutucu kaynak — Yazar Adı, "Yöntem Üzerine", Dergi Adı, 2023, <https://example.com/kaynak-3>
