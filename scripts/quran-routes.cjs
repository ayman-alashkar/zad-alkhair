"use strict";

const { surahs } = require("../src/discovery/catalog.json");
const config = require("../src/discovery/quran-routes.json");
const site = "https://zad-alkhair.net";
const indexPath = "/quran-index/";
const supported = new Set(config.surahs);
const shareOrigin = config.previewOrigin || site;
if (supported.size !== config.surahs.length || config.surahs.some(n => !surahs.some(s => s.n === n))) {
  throw Error("Invalid direct Quran surah list");
}

const readerRoutes = ["read", "listen"].flatMap(mode =>
  [null, ...surahs.filter(s => supported.has(s.n))].map(surah => ({
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
