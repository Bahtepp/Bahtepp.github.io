---
title: "Örnek Fikir Yazısı: Uzun Metin Okumak Üzerine"
description: "Bu bir demo yazıdır. Sitenin fikir yazısı düzenini ve Markdown biçimlendirmesini göstermek için hazırlanmıştır."
date: 2026-09-20
category: "Fikir"
tags:
  - internet
  - okuma
author: "Bahtep"
draft: false
featured: false
---

> **Bu bir örnek içeriktir.** Sitenin nasıl çalıştığını göstermek için yazılmıştır ve
> sitenin sahibinin görüşlerini yansıtmaz. Kendi yazını eklerken bu dosyayı silebilirsin.

Fikir yazıları, bu sitede kişisel düşüncelerin ve denemelerin yayınlandığı bölümdür.
Bu örnek yazı, bir fikir yazısının sayfada nasıl göründüğünü ve Markdown ile hangi
biçimlendirmeleri kullanabileceğini göstermek için hazırlandı.

## İkinci düzey başlık

Yazıyı bölümlere ayırmak için `##` ile başlayan başlıklar kullanılır. Başlıkların
kenarında ince bir çizgi görünür ve uzun yazılarda okuma ritmini korur.

### Üçüncü düzey başlık

Daha ayrıntılı alt bölümler için `###` kullanılır. Bir yazıda üçten fazla başlık düzeyine
genelde ihtiyaç duyulmaz.

## Metin biçimlendirme

Metin içinde **kalın yazı**, *italik yazı* ve `kod parçası` kullanabilirsin.
Bağlantılar da doğal biçimde yazılır: [Astro belgeleri](https://docs.astro.build).
Dış bağlantılar otomatik olarak yeni sekmede açılır.

Alıntı yapmak istersen satırın başına `>` koyman yeterli:

> Sade bir sayfa, okurun dikkatini metnin kendisine bırakır.

## Listeler

Sırasız liste:

- Birinci madde
- İkinci madde
  - İç içe madde
- Üçüncü madde

Sıralı liste:

1. Önce konuyu belirle
2. Sonra taslağı yaz
3. En sonunda kaynakları ekle

## Sonuç

Bu kadarı bir fikir yazısının temel yapısını göstermeye yeter. Kendi yazını eklemek için
`src/content/yazilar/` klasörüne yeni bir `.md` dosyası koyman yeterli; liste sayfaları
kendiliğinden güncellenir.
