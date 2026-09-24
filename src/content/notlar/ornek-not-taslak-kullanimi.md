---
title: "Örnek Not: Taslak Olarak Saklamak"
description: "İkinci demo not. Taslak sisteminin nasıl çalıştığını kısaca anlatır."
date: 2026-09-24
category: "Not"
tags:
  - not-defteri
  - yöntem
author: "Bahtep"
draft: false
---

**Bu bir örnek nottur.** Bir yazıyı henüz yayınlamak istemiyorsan frontmatter bölümüne
şunu yazman yeterli:

```yaml
draft: true
```

Taslak yazılar `npm run dev` ile açılan yerel sitede **Taslak** etiketiyle görünür, ama
`npm run build` ile alınan yayın sürümünde hiç oluşturulmaz. Yani GitHub'a gönderdiğinde
kimse göremez.

Yayınlamaya hazır olduğunda `draft: true` satırını `draft: false` yapman ya da satırı
tamamen silmen yeterli.
