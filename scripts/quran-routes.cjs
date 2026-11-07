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
  return `/quran-read/${n}/`;
}

function listenSurahPath(n, id) {
  return `/quran-listen/${n}/?qari=${encodeURIComponent(id)}`;
}

module.exports = { indexPath, readerRoutes, supported, shareOrigin, preview: !!config.previewOrigin, readSurahPath, listenSurahPath };
