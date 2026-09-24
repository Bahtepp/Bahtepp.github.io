---
title: "Örnek Fikir Yazısı: Sadeliğin Bir Tercih Olması"
description: "İkinci demo fikir yazısı. Kapak görseli, öne çıkan yazı özelliği ve etiket sistemini göstermek için hazırlanmıştır."
date: 2026-09-22
category: "Fikir"
tags:
  - tasarım
  - internet
author: "Bahtep"
draft: false
featured: true
image: "/images/ornek-kapak.svg"
imageAlt: "Örnek kapak görseli: ince çizgilerden oluşan soyut bir desen."
---

> **Bu bir örnek içeriktir.** Sitenin öne çıkan yazı ve kapak görseli özelliklerini
> göstermek için yazılmıştır; sitenin sahibinin görüşlerini yansıtmaz.

Bu yazının frontmatter bölümünde `featured: true` yazdığı için ana sayfada **öne çıkan
yazı** olarak görünür. Ayrıca bir `image` alanı tanımlandığı için yazının üstünde bir
kapak görseli yer alır.

## Öne çıkan yazı nasıl değişir?

Ana sayfada hangi yazının öne çıkacağını seçmek için yalnızca frontmatter'ı düzenlersin:

```yaml
featured: true
```

Birden fazla yazıda `featured: true` varsa en yeni tarihli olan seçilir. Hiçbirinde
yoksa sitedeki en yeni içerik gösterilir.

## Kapak görseli

Kapak görselleri `public/images/` klasöründen gelir ve frontmatter'da şöyle yazılır:

```yaml
image: "/images/ornek.jpg"
imageAlt: "Görselin kısa açıklaması"
```

`imageAlt` alanı, görseli göremeyen okurlar ve ekran okuyucular için önemlidir.
Görsellerin oranı sabit tutulduğu için sayfa yüklenirken içerik kaymaz.

## Etiketler

Bu yazı `tasarım` ve `internet` etiketlerini taşıyor. Etiketlere tıklayarak aynı konudaki
diğer içeriklere ulaşılabilir. Yeni bir etiket eklemek için ayrıca bir yer tanımlamana
gerek yok; frontmatter'a yazdığın anda etiket sayfası kendiliğinden oluşur.
