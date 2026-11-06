"use strict";

const { surahs } = require("../src/discovery/catalog.json");
const config = require("../src/discovery/quran-routes.json");
const site = "https://zad-alkhair.net";
const indexPath = "/quran-index/";
const supported = new Set(surahs.map(s => s.n));
const shareOrigin = config.previewOrigin || site;
if (supported.size !== 114 || surahs.some((s, i) => s.n !== i + 1)) {
  throw Error("Invalid Quran surah catalog");
}

const readerRoutes = ["read", "listen"].flatMap(mode =>
  [null, ...surahs].map(surah => ({
    mode,
    surah,
    path: `/quran-${mode}/${surah ? surah.n + "/" : ""}`
  }))
);

function readSurahPath(n) {
  return supported.has(n) ? `/quran-read/${n}/` : `/surah/${n}/`;
}

function listenSurahPath(n, id) {
  const qari = encodeURIComponent(id);
  return supported.has(n) ? `/quran-listen/${n}/?qari=${qari}`
    : `/reader.html?surah=${n}&amp;ayah=1&amp;qari=${qari}&amp;play=1`;
}

module.exports = { indexPath, readerRoutes, supported, shareOrigin, preview: !!config.previewOrigin, readSurahPath, listenSurahPath };
