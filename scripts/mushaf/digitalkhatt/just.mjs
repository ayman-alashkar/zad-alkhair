/* Copied from DigitalKhatt (https://github.com/DigitalKhatt/digitalkhatt-js,
   apps/site-angular/src/app/components/hbmedina/just.service.ts), MIT License — see LICENSE here.
   Transpiled from TypeScript with esbuild; changes for Zad Al-Khair's build are marked «زاد». */
/* زاد: the enum from DigitalKhatt's QuranTextService, inlined. */
const MushafLayoutType = { NewMadinah: 1, OldMadinah: 2, IndoPak15Lines: 3 };
import { HarfBuzzBuffer, hb as HarfBuzz, getWidth } from "./harfbuzz.mjs";
/* زاد: the layout cache in localStorage is not used at build time. */
const compress = s => s, decompress = s => s;
const PAGE_WIDTH = 17e3;
const INTERLINE = 1800;
const TOP = 200;
const MARGIN = 400;
const FONTSIZE = 1e3;
var SpaceType = /* @__PURE__ */ ((SpaceType2) => {
  SpaceType2[SpaceType2["Simple"] = 1] = "Simple";
  SpaceType2[SpaceType2["Aya"] = 2] = "Aya";
  return SpaceType2;
})(SpaceType || {});
var AppliedResult = /* @__PURE__ */ ((AppliedResult2) => {
  AppliedResult2[AppliedResult2["NoChange"] = 0] = "NoChange";
  AppliedResult2[AppliedResult2["Positive"] = 1] = "Positive";
  AppliedResult2[AppliedResult2["Overflow"] = 2] = "Overflow";
  AppliedResult2[AppliedResult2["Forbiden"] = 3] = "Forbiden";
  return AppliedResult2;
})(AppliedResult || {});
var JustStyle = /* @__PURE__ */ ((JustStyle2) => {
  JustStyle2[JustStyle2["SameSizeByPage"] = 1] = "SameSizeByPage";
  JustStyle2[JustStyle2["XScale"] = 2] = "XScale";
  JustStyle2[JustStyle2["XScaleOnly"] = 3] = "XScaleOnly";
  JustStyle2[JustStyle2["SCLXAxis"] = 4] = "SCLXAxis";
  return JustStyle2;
})(JustStyle || {});
var StretchType = /* @__PURE__ */ ((StretchType2) => {
  StretchType2[StretchType2["None"] = 0] = "None";
  StretchType2[StretchType2["Beh"] = 1] = "Beh";
  StretchType2[StretchType2["FinaAscendant"] = 2] = "FinaAscendant";
  StretchType2[StretchType2["OtherKashidas"] = 3] = "OtherKashidas";
  StretchType2[StretchType2["Kaf"] = 4] = "Kaf";
  StretchType2[StretchType2["SecondKashidaNotSameSubWord"] = 5] = "SecondKashidaNotSameSubWord";
  StretchType2[StretchType2["SecondKashidaSameSubWord"] = 6] = "SecondKashidaSameSubWord";
  return StretchType2;
})(StretchType || {});
const expaRegExp = new RegExp("^.*(?<expa>[\u0635\u0636\u0633\u0634\u0641\u0642\u0628\u062A\u062B\u0646\u0643\u064A\u0626])\\p{Mn}*$", "gdu");
const finalIsolAlternates = "\u0649\u0635\u0636\u0633\u0634\u0641\u0642\u0628\u062A\u062B\u0646\u0643\u064A\u0626";
const other = "[\\p{Mn}\u06E5]*";
const rightNoJoinLetters = "\u0622\u0627\u0671\u0623\u0625\u062F\u0630\u0631\u0632\u0648\u0624\u0621\u0629";
const dualJoinLetters = "\u0628\u062A\u062B\u062C\u062D\u062E\u0633\u0634\u0635\u0636\u0637\u0638\u0639\u063A\u0641\u0642\u0643\u0644\u0645\u0646\u0647\u064A\u0626\u0649";
const bases = /* @__PURE__ */ new Set();
function initBases() {
  for (let i = 0; i < dualJoinLetters.length; i++) {
    bases.add(dualJoinLetters.charCodeAt(i));
  }
  for (let i = 0; i < rightNoJoinLetters.length; i++) {
    bases.add(rightNoJoinLetters.charCodeAt(i));
  }
}
initBases();
function isLastBase(text, index) {
  for (let charIndex = index + 1; charIndex < text.length; charIndex++) {
    if (bases.has(text.charCodeAt(charIndex))) {
      return false;
    }
  }
  return true;
}
function nbBases(text) {
  let nb = 0;
  for (let charIndex = 0; charIndex < text.length; charIndex++) {
    if (bases.has(text.charCodeAt(charIndex))) {
      nb++;
    }
  }
  return nb;
}
function isInitBase(wordInfo, index) {
  if (index === wordInfo.baseIndexes[0]) return true;
  for (let i = 1; i < wordInfo.baseIndexes.length; i++) {
    if (index === wordInfo.baseIndexes[i]) {
      return rightNoJoinLetters.includes(wordInfo.text[wordInfo.baseIndexes[i - 1]]);
    }
  }
  return false;
}
function getWordWidth(wordInfo, justResults, font, pfeatures) {
  const buffer = new HarfBuzzBuffer();
  buffer.setDirection("rtl");
  buffer.setLanguage(HarfBuzz.arabLanguage);
  buffer.setScript(HarfBuzz.arabScript);
  buffer.setClusterLevel(1);
  const features = pfeatures ? [...pfeatures] : [];
  for (let i = wordInfo.startIndex; i <= wordInfo.endIndex; i++) {
    const justInfo = justResults.get(i);
    if (justInfo) {
      for (let feat of justInfo) {
        features.push({
          tag: feat.name,
          value: feat.value,
          start: i - wordInfo.startIndex,
          end: i - wordInfo.startIndex + 1
        });
      }
    }
  }
  buffer.addText(wordInfo.text);
  let shapeResult = buffer.shape(font, features);
  let totalWidth = 0;
  for (let glyphInformation of shapeResult) {
    totalWidth += glyphInformation.XAdvance;
  }
  buffer.destroy();
  return totalWidth;
}
function tryApplyFeatures(wordIndex, lineTextInfo, justInfo, newFeatures) {
  const layout = justInfo.layoutResults[wordIndex];
  const wordInfo = lineTextInfo.wordInfos[wordIndex];
  const wordNewWidth = getWordWidth(wordInfo, newFeatures, justInfo.font, lineTextInfo.features);
  const diff = wordNewWidth - layout.parWidth;
  if (wordNewWidth !== layout.parWidth && justInfo.textLineWidth + diff < justInfo.desiredWidth) {
    justInfo.textLineWidth += diff;
    layout.parWidth = wordNewWidth;
    justInfo.fontFeatures = newFeatures;
    return 1 /* Positive */;
  } else if (diff === 0) {
    return 0 /* NoChange */;
  } else {
    return 2 /* Overflow */;
  }
}
function mergeFeatures(prevFeatures, newFeatures) {
  let mergedFeatures;
  if (prevFeatures) {
    mergedFeatures = prevFeatures.map((x) => Object.assign({}, x));
  } else {
    mergedFeatures = [];
  }
  if (newFeatures) {
    for (const newFeature of newFeatures) {
      const exist = mergedFeatures.find((prevFeature) => prevFeature.name == newFeature.feature.name);
      if (exist) {
        exist.value = newFeature.calcNewValue ? newFeature.calcNewValue(exist.value, newFeature.feature.value) : newFeature.feature.value;
      } else {
        const cloneNewFeature = { name: newFeature.feature.name, value: newFeature.calcNewValue ? newFeature.calcNewValue(void 0, newFeature.feature.value) : newFeature.feature.value };
        mergedFeatures.push(cloneNewFeature);
      }
    }
  }
  return mergedFeatures;
}
function matchSubWords(wordInfo, expr) {
  const result = { subWordIndexes: [], matches: [] };
  let regExprs = [];
  if (expr instanceof Array) {
    regExprs = [...expr];
  } else {
    regExprs.push(new RegExp(expr, "gdu"));
  }
  for (let subIndex = 0; subIndex < wordInfo.subwords.length; subIndex++) {
    const subWord = wordInfo.subwords[subIndex];
    const subWordMatches = [];
    result.matches.push(subWordMatches);
    for (let regExpr of regExprs) {
      let matches = subWord.baseText.matchAll(regExpr);
      for (let match of matches) {
        subWordMatches.push(match);
      }
    }
    if (subWordMatches.length > 0) {
      result.subWordIndexes.push(subIndex);
    }
  }
  return result;
}
function applyExperimentalJust(lineTextInfo, justInfo) {
  applyKashidasSubWords(lineTextInfo, justInfo, 1 /* Beh */, 2) || applyAlternatesSubWords(lineTextInfo, justInfo, "\u0628\u062A\u062B\u0643\u0646", 2) || applyKashidasSubWords(
    lineTextInfo,
    justInfo,
    2 /* FinaAscendant */,
    3
  ) || applyKashidasSubWords(
    lineTextInfo,
    justInfo,
    3 /* OtherKashidas */,
    2
  ) || applyAlternatesSubWords(lineTextInfo, justInfo, "\u0649\u0635\u0636\u0633\u0634\u0641\u0642\u064A\u0626", 2) || applyKashidasSubWords(lineTextInfo, justInfo, 4 /* Kaf */, 1) || applyKashidasSubWords(lineTextInfo, justInfo, 1 /* Beh */, 1) || applyAlternatesSubWords(lineTextInfo, justInfo, "\u0628\u062A\u062B\u0643\u0646", 1) || applyKashidasSubWords(
    lineTextInfo,
    justInfo,
    2 /* FinaAscendant */,
    1
  ) || applyKashidasSubWords(
    lineTextInfo,
    justInfo,
    3 /* OtherKashidas */,
    1
  ) || applyAlternatesSubWords(lineTextInfo, justInfo, "\u0649\u0635\u0636\u0633\u0634\u0641\u0642\u064A\u0626", 1) || applyAlternatesSubWords(lineTextInfo, justInfo, "\u0628\u062A\u062B\u0643\u0646", 2) || applyAlternatesSubWords(lineTextInfo, justInfo, "\u0649\u0635\u0636\u0633\u0634\u0641\u0642\u064A\u0626\u0628\u062A\u062B\u0643\u0646", 2) || applyKashidasSubWords(lineTextInfo, justInfo, 1 /* Beh */, 1) || applyKashidasSubWords(
    lineTextInfo,
    justInfo,
    2 /* FinaAscendant */,
    1
  ) || applyKashidasSubWords(
    lineTextInfo,
    justInfo,
    3 /* OtherKashidas */,
    1
  ) || applyAlternatesSubWords(lineTextInfo, justInfo, "\u0649\u0635\u0636\u0633\u0634\u0641\u0642\u064A\u0626\u0628\u062A\u062B\u0643\u0646", 2) || applyKashidasSubWords(
    lineTextInfo,
    justInfo,
    5 /* SecondKashidaNotSameSubWord */,
    2
  ) || applyKashidasSubWords(
    lineTextInfo,
    justInfo,
    6 /* SecondKashidaSameSubWord */,
    2
  );
}
function applyKashida(lineTextInfo, justInfo, wordIndex, subWordIndex, firstSubWordMatchIndex, secondSubWordMacthIndex) {
  const wordInfos = lineTextInfo.wordInfos;
  const lineText = lineTextInfo.lineText;
  const wordInfo = wordInfos[wordIndex];
  const subWordInfo = wordInfo.subwords[subWordIndex];
  const firstMatchIndex = subWordInfo.baseIndexes[firstSubWordMatchIndex];
  const secondMatchIndex = subWordInfo.baseIndexes[secondSubWordMacthIndex];
  const firstIndexInLine = wordInfo.startIndex + firstMatchIndex;
  const secondIndexInLine = wordInfo.startIndex + secondMatchIndex;
  let tempResult = new Map(justInfo.fontFeatures);
  const firstPrevFeatures = tempResult.get(firstIndexInLine);
  const secondPrevFeatures = tempResult.get(secondIndexInLine);
  let appliedResult = 3 /* Forbiden */;
  if (secondPrevFeatures?.find((a) => a.name === "cv01")) return appliedResult;
  const chark3 = lineText[firstIndexInLine];
  const chark4 = lineText[secondIndexInLine];
  if (chark4 === "\u0642" && subWordInfo.baseIndexes.at(-1) === secondMatchIndex) {
    return appliedResult;
  } else if (chark3 === "\u0644" && (chark4 === "\u0643" || chark4 === "\u062F" || chark4 === "\u0630" || chark4 === "\u0629" || chark4 === "\u0647" && subWordInfo.baseIndexes.at(-1) === secondMatchIndex)) {
    return appliedResult;
  } else if ("\u0626\u0628\u062A\u062B\u0646\u064A\u0649".includes(chark3) && subWordInfo.baseIndexes[0] !== firstMatchIndex && "\u0631\u0632".includes(chark4)) {
    return appliedResult;
  }
  const secondNewFeatures = [];
  let cv01Value = 0;
  let firstAppliedFeatures = [{
    feature: { name: "cv01", value: 1 },
    calcNewValue: (prev, curr) => {
      cv01Value = Math.min((prev || 0) + curr, 6);
      return cv01Value;
    }
  }];
  if ("\u0628\u062A\u062B\u0646\u064A\u0626".includes(chark3)) {
    firstAppliedFeatures.push({ feature: { name: "cv10", value: 1 } });
  }
  const finalSubWordMatch = subWordInfo.baseIndexes.at(-1) === secondMatchIndex;
  if ("\u0647".includes(chark3) && "\u0645".includes(chark4) && finalSubWordMatch) {
    firstAppliedFeatures.push({ feature: { name: "cv11", value: 1 } });
    secondNewFeatures.push({ name: "cv11", value: 1 });
  } else if ("\u0628\u062A\u062B\u0646\u064A\u0626".includes(chark3) && subWordInfo.baseIndexes[0] === firstMatchIndex && "\u062C\u062D\u062E".includes(chark4)) {
    firstAppliedFeatures.push({ feature: { name: "cv12", value: 1 } });
    secondNewFeatures.push({ name: "cv12", value: 1 });
  } else if ("\u0645".includes(chark3) && subWordInfo.baseIndexes[0] === firstMatchIndex && "\u062C\u062D\u062E".includes(chark4)) {
    firstAppliedFeatures.push({ feature: { name: "cv13", value: 1 } });
    secondNewFeatures.push({ name: "cv13", value: 1 });
  } else if ("\u0641\u0642".includes(chark3) && subWordInfo.baseIndexes[0] === firstMatchIndex && "\u062C\u062D\u062E".includes(chark4)) {
    firstAppliedFeatures.push({ feature: { name: "cv14", value: 1 } });
    secondNewFeatures.push({ name: "cv14", value: 1 });
  } else if ("\u0644".includes(chark3) && subWordInfo.baseIndexes[0] === firstMatchIndex && "\u062C\u062D\u062E".includes(chark4)) {
    firstAppliedFeatures.push({ feature: { name: "cv15", value: 1 } });
    secondNewFeatures.push({ name: "cv15", value: 1 });
  } else if ("\u0639\u063A".includes(chark3) && subWordInfo.baseIndexes[0] === firstMatchIndex && ("\u0622\u0627\u062F\u0630\u0671\u0623\u0625\u0644".includes(chark4) || "\u0628\u062A\u062B\u0646\u064A\u0626".includes(chark4) && "\u0633\u0634".includes(subWordInfo.baseText?.[2]))) {
    firstAppliedFeatures.push({ feature: { name: "cv16", value: 1 } });
    secondNewFeatures.push({ name: "cv16", value: 1 });
  } else if ("\u062C\u062D\u062E".includes(chark3)) {
    if ("\u0622\u0627\u062F\u0630\u0671\u0623\u0625\u0644".includes(chark4) || "\u0647\u0629".includes(chark4) && finalSubWordMatch || "\u0628\u062A\u062B\u0646\u064A\u0626".includes(chark4) && subWordInfo.baseIndexes.at(-2) === secondMatchIndex && "\u0631\u0632\u0646".includes(subWordInfo.baseText.at(-1))) {
      firstAppliedFeatures.push({ feature: { name: "cv16", value: 1 } });
      secondNewFeatures.push({ name: "cv16", value: 1 });
    } else if (subWordInfo.baseIndexes[0] === firstMatchIndex && "\u0645".includes(chark4)) {
      firstAppliedFeatures.push({ feature: { name: "cv18", value: 1 } });
      secondNewFeatures.push({ name: "cv18", value: 1 });
    }
  } else if ("\u0633\u0634\u0635\u0636".includes(chark3) && "\u0631\u0632".includes(chark4)) {
    firstAppliedFeatures.push({ feature: { name: "cv17", value: 1 } });
    secondNewFeatures.push({ name: "cv17", value: 1 });
  }
  const firstNewFeatures = mergeFeatures(firstPrevFeatures, firstAppliedFeatures);
  let cv02Value;
  if (finalAscendant.includes(chark4) && finalSubWordMatch) {
    cv02Value = cv01Value;
  } else {
    cv02Value = 2 * cv01Value;
  }
  secondNewFeatures.push({ name: "cv02", value: cv02Value });
  tempResult.set(firstIndexInLine, firstNewFeatures);
  tempResult.set(secondIndexInLine, secondNewFeatures);
  appliedResult = tryApplyFeatures(wordIndex, lineTextInfo, justInfo, tempResult);
  return appliedResult;
}
function applyKaf(lineTextInfo, justInfo, wordIndex, subWordIndex, firstSubWordMatchIndex, secondSubWordMacthIndex) {
  const wordInfos = lineTextInfo.wordInfos;
  const lineText = lineTextInfo.lineText;
  const wordInfo = wordInfos[wordIndex];
  const subWordInfo = wordInfo.subwords[subWordIndex];
  const firstMatchIndex = subWordInfo.baseIndexes[firstSubWordMatchIndex];
  const secondMatchIndex = subWordInfo.baseIndexes[secondSubWordMacthIndex];
  const firstIndexInLine = wordInfo.startIndex + firstMatchIndex;
  const secondIndexInLine = wordInfo.startIndex + secondMatchIndex;
  let tempResult = new Map(justInfo.fontFeatures);
  const firstPrevFeatures = tempResult.get(firstIndexInLine);
  const secondPrevFeatures = tempResult.get(secondIndexInLine);
  let firstAppliedFeatures = [
    { feature: { name: "cv03", value: 1 }, calcNewValue: () => 1 }
  ];
  tempResult.set(firstIndexInLine, mergeFeatures(firstPrevFeatures, firstAppliedFeatures));
  let secondAppliedFeatures = [{ feature: { name: "cv03", value: 1 }, calcNewValue: () => 1 }];
  const firstNewFeatures = mergeFeatures(secondPrevFeatures, secondAppliedFeatures);
  tempResult.set(secondIndexInLine, firstNewFeatures);
  let fathaIndex;
  if (lineText[firstIndexInLine + 1] === "\u064E") {
    fathaIndex = firstIndexInLine + 1;
  } else if (lineText[firstIndexInLine + 1] === "\u0651" && lineText[firstIndexInLine + 2] === "\u064E") {
    fathaIndex = firstIndexInLine + 2;
  }
  if (fathaIndex !== void 0) {
    const cv01Value = firstNewFeatures.find((a) => a.name === "cv01")?.value || 0;
    tempResult.set(fathaIndex, [{ name: "cv01", value: 1 + Math.floor(cv01Value / 3) }]);
  }
  const appliedResult = tryApplyFeatures(
    wordIndex,
    lineTextInfo,
    justInfo,
    tempResult
  );
  return appliedResult;
}
function applyKashidasSubWords(lineTextInfo, justInfo, type, nbLevels) {
  const right = "\u0628\u062A\u062B\u0646\u064A\u0626\u062C\u062D\u062E\u0633\u0634\u0635\u0636\u0637\u0638\u0639\u063A\u0641\u0642\u0645\u0647";
  const left = "\u0626\u0628\u062A\u062B\u0646\u064A\u062C\u062D\u062E\u0637\u0638\u0639\u063A\u0641\u0642\u0629\u0644\u0645\u0631\u0632";
  const mediLeftAsendant = "\u0644";
  const wordInfos = lineTextInfo.wordInfos;
  const matchresult = [];
  const regExprs = [];
  if (type === 1 /* Beh */) {
    regExprs.push(new RegExp(`^.+(?<k1>[\u0628\u062A\u062B\u0646\u064A\u0633\u0634\u0635\u0636][\u0628\u062A\u062B\u0646\u064A\u0645]).+$`, "gdu"));
  } else if (type === 2 /* FinaAscendant */) {
    regExprs.push(new RegExp(`^.*(?<k1>[${right}][\u0622\u0627\u062F\u0630\u0671\u0623\u0625\u0643\u0644\u0647\u0629])$`, "gdu"));
  } else if (type === 3 /* OtherKashidas */) {
    regExprs.push(new RegExp(`.*(?<k1>[${right}][\u0631\u0632])`, "gdu"));
    regExprs.push(new RegExp(`.*(?<k1>[${right}](?:[${mediLeftAsendant}]|[${left.replace("\u0631\u0632", "")}]))`, "gdu"));
  } else if (type === 4 /* Kaf */) {
    regExprs.push(new RegExp(`^.*(?<k1>[\u0643].).*$`, "gdu"));
  } else if (type === 5 /* SecondKashidaNotSameSubWord */) {
    regExprs.push(new RegExp(`^.+(?<k1>[\u0628\u062A\u062B\u0646\u064A\u0633\u0634\u0635\u0636][\u0628\u062A\u062B\u0646\u064A\u0645]).+$`, "gdu"));
    regExprs.push(new RegExp(`^.*(?<k1>[${right}][\u0622\u0627\u062F\u0630\u0671\u0623\u0625\u0643\u0644\u0647\u0629])$`, "gdu"));
    regExprs.push(new RegExp(`.*(?<k1>[${right}][\u0631\u0632])`, "gdu"));
    regExprs.push(new RegExp(`.*(?<k1>[${right}](?:[${mediLeftAsendant}]|[${left.replace("\u0631\u0632", "")}]))`, "gdu"));
  } else if (type === 6 /* SecondKashidaSameSubWord */) {
    regExprs.push(new RegExp(`^.+(?<k1>[\u0628\u062A\u062B\u0646\u064A\u0633\u0634\u0635\u0636][\u0628\u062A\u062B\u0646\u064A\u0645]).+$`, "gdu"));
    regExprs.push(new RegExp(`(?<k1>[${right}][\u0622\u0627\u062F\u0630\u0671\u0623\u0625\u0643\u0644\u0647\u0629])$`, "gdu"));
    regExprs.push(new RegExp(`(?<k1>[${right}][\u0631\u0632])`, "gdu"));
    regExprs.push(new RegExp(`(?<k1>[${right}](?:[${mediLeftAsendant}]|[${left.replace("\u0631\u0632", "")}]))`, "gdu"));
  }
  for (let wordIndex = 0; wordIndex < wordInfos.length; wordIndex++) {
    matchresult.push(matchSubWords(wordInfos[wordIndex], regExprs));
  }
  for (let level = 1; level <= nbLevels; level++) {
    for (let wordIndex = 0; wordIndex < wordInfos.length; wordIndex++) {
      const subWordsMatch = matchresult[wordIndex];
      const wordLayout = justInfo.layoutResults[wordIndex];
      const type1Applied = wordLayout.appliedKashidas.get(1 /* Beh */);
      const type2Applied = wordLayout.appliedKashidas.get(2 /* FinaAscendant */);
      const type3Applied = wordLayout.appliedKashidas.get(3 /* OtherKashidas */);
      const type5Applied = wordLayout.appliedKashidas.get(5 /* SecondKashidaNotSameSubWord */);
      if (type === 1 /* Beh */ && (type2Applied || type3Applied)) continue;
      if (type === 2 /* FinaAscendant */ && (type1Applied || type3Applied)) continue;
      if (type === 3 /* OtherKashidas */ && (type1Applied || type2Applied)) continue;
      let done = false;
      for (let i = subWordsMatch.subWordIndexes.length - 1; i >= 0 && !done; i--) {
        const subWordIndex = subWordsMatch.subWordIndexes[i];
        for (let match of subWordsMatch.matches[subWordIndex]) {
          const kashidaGroup = match?.indices?.[1];
          if (!kashidaGroup) continue;
          const firstSubWordMatchIndex = kashidaGroup[0];
          const secondSubWordMacthIndex = firstSubWordMatchIndex + 1;
          if (type === 5 /* SecondKashidaNotSameSubWord */) {
            const type123 = type1Applied || type2Applied || type3Applied;
            if (type123 && type123[0] === subWordIndex) continue;
          } else if (type === 6 /* SecondKashidaSameSubWord */) {
            const type123 = type1Applied || type2Applied || type3Applied;
            if (type123 && type123[0] === subWordIndex && type123[1] === firstSubWordMatchIndex) continue;
            if (type5Applied && type5Applied[0] === subWordIndex && type5Applied[1] === firstSubWordMatchIndex) continue;
          }
          let appliedResult = 3 /* Forbiden */;
          if (type === 4 /* Kaf */) {
            appliedResult = applyKaf(lineTextInfo, justInfo, wordIndex, subWordIndex, firstSubWordMatchIndex, secondSubWordMacthIndex);
          } else {
            appliedResult = applyKashida(lineTextInfo, justInfo, wordIndex, subWordIndex, firstSubWordMatchIndex, secondSubWordMacthIndex);
          }
          if (appliedResult === 1 /* Positive */) {
            wordLayout.appliedKashidas.set(type, [subWordIndex, firstSubWordMatchIndex]);
          } else if (appliedResult === 2 /* Overflow */) {
            return true;
          } else if (appliedResult === 3 /* Forbiden */) {
            continue;
          }
          done = true;
          break;
        }
      }
    }
  }
  return false;
}
function applyAlternate(lineTextInfo, justInfo, wordIndex, indexInLine) {
  const lineText = lineTextInfo.lineText;
  let appliedResult = 3 /* Forbiden */;
  let tempResult = new Map(justInfo.fontFeatures);
  const prevFeatures = tempResult.get(indexInLine);
  const cv01Value = prevFeatures?.find((a) => a.name === "cv02")?.value || 0;
  if (cv01Value > 0) return appliedResult;
  const newFeatures = mergeFeatures(prevFeatures, [{ feature: { name: "cv01", value: 1 }, calcNewValue: (prev, curr) => Math.min((prev || 0) + curr, 12) }]);
  tempResult.set(indexInLine, newFeatures);
  let fathaIndex;
  if (lineText[indexInLine + 1] === "\u064E") {
    fathaIndex = indexInLine + 1;
  } else if (lineText[indexInLine + 1] === "\u0651" && lineText[indexInLine + 2] === "\u064E") {
    fathaIndex = indexInLine + 2;
  }
  if (fathaIndex !== void 0) {
    const cv01FathaValue = newFeatures.find((a) => a.name === "cv01")?.value || 0;
    tempResult.set(fathaIndex, [{ name: "cv01", value: 1 + Math.floor(cv01FathaValue / 3) }]);
  }
  appliedResult = tryApplyFeatures(wordIndex, lineTextInfo, justInfo, tempResult);
  return appliedResult;
}
function applyAlternatesSubWords(lineTextInfo, justInfo, chars, nbLevels) {
  const wordInfos = lineTextInfo.wordInfos;
  const matchresult = [];
  let patternAlt = `^.*(?<alt>[${chars}])$`;
  const regExprAlt = [new RegExp(patternAlt, "gdu")];
  for (let wordIndex = 0; wordIndex < wordInfos.length; wordIndex++) {
    matchresult.push(matchSubWords(wordInfos[wordIndex], regExprAlt));
  }
  for (let level = 1; level <= nbLevels; level++) {
    for (let wordIndex = 0; wordIndex < wordInfos.length; wordIndex++) {
      const wordInfo = wordInfos[wordIndex];
      const subWordsMatch = matchresult[wordIndex];
      for (let i = subWordsMatch.subWordIndexes.length - 1; i >= 0; i--) {
        const subWordIndex = subWordsMatch.subWordIndexes[i];
        const alt = subWordsMatch.matches[subWordIndex][0]?.indices?.[1];
        if (!alt) continue;
        const matchIndex = alt[0];
        const indexInLine = wordInfo.startIndex + wordInfo.subwords[subWordIndex].baseIndexes[matchIndex];
        const appliedResult = applyAlternate(lineTextInfo, justInfo, wordIndex, indexInLine);
        if (appliedResult === 2 /* Overflow */) {
          return true;
        } else if (appliedResult === 3 /* Forbiden */) {
          continue;
        } else {
          break;
        }
      }
    }
  }
  return false;
}
const rightChars = dualJoinLetters;
const leftChars = dualJoinLetters + rightNoJoinLetters.replace("\u0621", "");
const rightKash = rightChars.replace(/[لك]/gu, "");
const leftKashidaFina = leftChars.replace(/[وهصضطظ]/gu, "");
const leftKashidaMedi = leftKashidaFina.replace("\u0647", "");
const finalAscendant = "\u0622\u0627\u062F\u0630\u0671\u0623\u0625\u0643\u0644\u0647\u0629";
const jhk = "\u062C\u062D\u062E";
const altFinPat = `^.*([\u0628\u062A\u062B\u0641\u0643\u0646\u0635\u0636\u0633\u0634\u0642\u064A\u0626\u0649])$`;
const altFinaPrio1Reg = new RegExp(altFinPat, "gdu");
const finalKashidaEndWord = `^.*([${rightKash}][\u0622\u0627\u0671\u0623\u0625\u0645\u0644\u0647\u0629])$`;
const finalKashida = `^.*([${rightKash}][\u062F\u0630\u0622\u0627\u0671\u0623\u0625\u0645\u0644\u0647\u0629])$`;
const hahKashida = `^.*([${jhk}][${leftKashidaMedi}]).*$|^.*([${jhk}][\u0647\u0629])$`;
const regHahFinaAscenKashida = new RegExp(hahKashida + "|" + finalKashidaEndWord, "gdu");
const behBehPat = `^.+([\u0628\u062A\u062B\u0646\u064A\u0633\u0634\u0635\u0636][\u0628\u062A\u062B\u0646\u064A\u0645]).+$`;
const rehPat = `.*([${rightKash}][\u0631\u0632])`;
const otherPat = `.*([${rightKash}](?:[\u0644]|[${leftKashidaMedi}]))`;
const kafPat = `^.*([\u0643].).*$`;
const patternSimple = altFinPat + "|" + hahKashida + "|" + finalKashida + "|" + behBehPat + "|" + rehPat + "|" + otherPat + "|" + kafPat;
const regExprSimple = new RegExp(patternSimple, "gdu");
function applySimpleJust(lineTextInfo, justInfo, firstWordIncluded, wordByWord, nbLevelAlt, nbLevelKashida) {
  const wordInfos = lineTextInfo.wordInfos;
  const matchresult = [];
  const firstWordIndex = firstWordIncluded ? 0 : 1;
  for (let wordIndex = 0; wordIndex < wordInfos.length; wordIndex++) {
    const wordInfo = wordInfos[wordIndex];
    const result = { subWordIndex: -1, match: null, type: 0 };
    if (!wordInfo.baseText.length || wordIndex < firstWordIndex) {
      matchresult[wordIndex] = result;
      continue;
    }
    const lastIndex = wordInfo.subwords.length - 1;
    let subWord = wordInfo.subwords[lastIndex];
    altFinaPrio1Reg.lastIndex = 0;
    let match = altFinaPrio1Reg.exec(subWord.baseText);
    if (match) {
      result.subWordIndex = lastIndex;
      result.match = match;
      result.type = 1;
    } else if (!"\u064A\u0626\u0649".includes(wordInfo.baseText.at(-1))) {
      regHahFinaAscenKashida.lastIndex = 0;
      match = regHahFinaAscenKashida.exec(subWord.baseText);
      if (match) {
        result.subWordIndex = lastIndex;
        result.match = match;
        result.type = 2;
      } else {
        for (let subIndex = lastIndex; subIndex >= 0; subIndex--) {
          subWord = wordInfo.subwords[subIndex];
          regExprSimple.lastIndex = 0;
          match = regExprSimple.exec(subWord.baseText);
          if (match) {
            result.subWordIndex = subIndex;
            result.match = match;
            result.type = 3;
            break;
          }
        }
      }
    }
    matchresult[wordIndex] = result;
  }
  let stretchedWords = /* @__PURE__ */ new Map();
  for (let level = 1; level <= Math.max(nbLevelAlt, nbLevelKashida); level++) {
    for (let wordIndex = wordInfos.length - 1; wordIndex >= firstWordIndex; wordIndex--) {
      if (stretchedWords.get(wordIndex + 1)) continue;
      let appliedResult = null;
      const wordInfo = wordInfos[wordIndex];
      const subWordsMatch = matchresult[wordIndex];
      if (!subWordsMatch?.match) continue;
      const subWordIndex = subWordsMatch.subWordIndex;
      const matchIndices = subWordsMatch.match.indices;
      let matchIndex;
      for (let index = 1; index < matchIndices.length; index++) {
        if (matchIndices[index]) {
          matchIndex = index;
        }
      }
      const match = matchIndices[matchIndex];
      if (subWordsMatch.type === 1 || subWordsMatch.type === 3 && matchIndex === 1) {
        if (level <= nbLevelAlt) {
          const baseIndex = match[0];
          const indexInLine = wordInfo.startIndex + wordInfo.subwords[subWordIndex].baseIndexes[baseIndex];
          appliedResult = applyAlternate(lineTextInfo, justInfo, wordIndex, indexInLine);
        }
      } else if (level <= nbLevelKashida) {
        const firstSubWordMatchIndex = match[0];
        const secondSubWordMacthIndex = firstSubWordMatchIndex + 1;
        if (matchIndex === 8 && subWordsMatch.type === 3) {
          appliedResult = applyKaf(lineTextInfo, justInfo, wordIndex, subWordIndex, firstSubWordMatchIndex, secondSubWordMacthIndex);
        } else {
          appliedResult = applyKashida(lineTextInfo, justInfo, wordIndex, subWordIndex, firstSubWordMatchIndex, secondSubWordMacthIndex);
        }
      }
      if (appliedResult === 2 /* Overflow */) {
        return true;
      } else if (appliedResult === 1 /* Positive */) {
        if (wordByWord) {
          stretchedWords.set(wordIndex, true);
        }
      }
    }
  }
  return false;
}
function stretchLine(lineTextInfo, justInfo, mushafType) {
  if (mushafType === MushafLayoutType.NewMadinah || mushafType === MushafLayoutType.OldMadinah) {
    applyExperimentalJust(lineTextInfo, justInfo);
  } else {
    applySimpleJust(lineTextInfo, justInfo, true, false, 2, 2);
  }
  return justInfo;
}
async function saveLayout(quranTextService, fontSizeLineWidthRatio, font, spaceWidth) {
  const result = [];
  for (let pageIndex = 0; pageIndex < quranTextService.quranText.length; pageIndex++) {
    result.push(await getPageLayout(quranTextService, pageIndex, fontSizeLineWidthRatio, font, spaceWidth));
    console.log(`pageIndex=${pageIndex} saved`);
  }
  saveLayoutToStorage(fontSizeLineWidthRatio, result);
}
async function getPageLayout(quranTextService, pageIndex, fontSizeLineWidthRatio, font, spaceWidth) {
  const result = [];
  for (let lineIndex = 0; lineIndex < quranTextService.quranText[pageIndex].length; lineIndex++) {
    const lineInfo = quranTextService.getLineInfo(pageIndex, lineIndex);
    const lineTextInfo = analyzeLineForJust(quranTextService, pageIndex, lineIndex);
    let justResult;
    if (lineInfo.lineType === 1 || lineInfo.lineType === 2 && pageIndex != 0 && pageIndex != 1) {
      justResult = { fontFeatures: /* @__PURE__ */ new Map(), simpleSpacing: spaceWidth, ayaSpacing: spaceWidth, xScale: 1 };
      result.push(justResult);
    } else {
      let lineWidthRatio = 1;
      if (lineInfo.lineWidthRatio !== 1) {
        lineWidthRatio = lineInfo.lineWidthRatio;
      }
      justResult = justifyLine(lineTextInfo, font, fontSizeLineWidthRatio / lineWidthRatio, spaceWidth);
      result.push(justResult);
    }
  }
  return result;
}
function saveLayoutToStorage(fontSizeLineWidthRatio, result) {
  localStorage.setItem("layout" + fontSizeLineWidthRatio, compress(JSON.stringify(result, replacer)));
  cachedLayouts.set(fontSizeLineWidthRatio, result);
}
function removeLayouts(fontSizeLineWidthRatio) {
  Object.keys(localStorage).filter((x) => fontSizeLineWidthRatio ? "layout" + fontSizeLineWidthRatio : x.startsWith("layout")).forEach((x) => localStorage.removeItem(x));
}
function getLayoutFromStorage(fontSizeLineWidthRatio) {
  let layout = cachedLayouts.get(fontSizeLineWidthRatio);
  if (layout) {
    return layout;
  } else {
    const json = localStorage.getItem("layout" + fontSizeLineWidthRatio);
    if (json) {
      layout = JSON.parse(decompress(json), reviver);
      if (layout) {
        cachedLayouts.set(fontSizeLineWidthRatio, layout);
      }
    }
    return layout;
  }
}
function replacer(key, value) {
  if (value instanceof Map) {
    return {
      dataType: "Map",
      value: Array.from(value.entries())
      // or with spread: value: [...value]
    };
  } else {
    return value;
  }
}
function reviver(key, value) {
  if (typeof value === "object" && value !== null) {
    if (value.dataType === "Map") {
      return new Map(value.value);
    }
  }
  return value;
}
function justifyLine(lineTextInfo, font, fontSizeLineWidthRatio, spaceWidth, mushafType = MushafLayoutType.NewMadinah, justStyle = 2 /* XScale */) {
  const desiredWidth = FONTSIZE / fontSizeLineWidthRatio;
  const lineText = lineTextInfo.lineText;
  let layOutResult = [];
  let justResults;
  let simpleSpaceWidth;
  let ayaSpaceWidth;
  for (let wordIndex = 0; wordIndex < lineTextInfo.wordInfos.length; wordIndex++) {
    const wordInfo = lineTextInfo.wordInfos[wordIndex];
    const parWidth = getWidth(wordInfo.text, font, FONTSIZE, lineTextInfo.features);
    layOutResult.push({
      parWidth,
      appliedKashidas: /* @__PURE__ */ new Map()
    });
  }
  let currentLineWidth = getWidth(lineText, font, FONTSIZE, lineTextInfo.features);
  let diff = desiredWidth - currentLineWidth;
  let xScale = 1;
  let simpleSpacing = spaceWidth;
  let ayaSpacing = spaceWidth;
  if (diff > 0) {
    if (justStyle === 3 /* XScaleOnly */) {
      xScale = desiredWidth / currentLineWidth;
    } else {
      let maxStretchBySpace = Math.min(100, spaceWidth * 1);
      let maxStretchByAyaSpace = Math.min(200, spaceWidth * 2);
      let maxStretch = maxStretchBySpace * lineTextInfo.simpleSpaceIndexes.length + maxStretchByAyaSpace * lineTextInfo.ayaSpaceIndexes.length;
      let stretch = Math.min(desiredWidth - currentLineWidth, maxStretch);
      let spaceRatio = maxStretch != 0 ? stretch / maxStretch : 0;
      let stretchBySpace = spaceRatio * maxStretchBySpace;
      let stretchByByAyaSpace = spaceRatio * maxStretchByAyaSpace;
      simpleSpaceWidth = spaceWidth + stretchBySpace;
      ayaSpaceWidth = spaceWidth + stretchByByAyaSpace;
      currentLineWidth += stretch;
      if (desiredWidth > currentLineWidth) {
        const justInfo = { textLineWidth: currentLineWidth, fontFeatures: /* @__PURE__ */ new Map(), layoutResults: layOutResult, desiredWidth, font };
        justResults = stretchLine(lineTextInfo, justInfo, mushafType);
        currentLineWidth = justResults.textLineWidth;
      }
      if (desiredWidth > currentLineWidth) {
        let addToSpace = (desiredWidth - currentLineWidth) / lineTextInfo.spaces.size;
        simpleSpaceWidth += addToSpace;
        ayaSpaceWidth += addToSpace;
      }
      simpleSpacing = simpleSpaceWidth;
      ayaSpacing = ayaSpaceWidth;
    }
  } else {
    xScale = desiredWidth / currentLineWidth;
  }
  return { fontFeatures: justResults?.fontFeatures || /* @__PURE__ */ new Map(), simpleSpacing, ayaSpacing, xScale };
}
const lineTextInfoCache = /* @__PURE__ */ new Map();
function analyzeLineForJust(quranTextService, pageIndex, plineIndex) {
  const key = pageIndex * 15 + plineIndex;
  let lineTextInfo = lineTextInfoCache.get(key);
  if (lineTextInfo) return lineTextInfo;
  const bism = (pageIndex === 0 || pageIndex === 1) && plineIndex == 1;
  const lineText = quranTextService.quranText[pageIndex][plineIndex];
  lineTextInfo = {
    lineText,
    ayaSpaceIndexes: [],
    simpleSpaceIndexes: [],
    wordInfos: [],
    spaces: /* @__PURE__ */ new Map(),
    features: bism ? [{ tag: "bism", value: 1, start: 0, end: -1 }] : null
  };
  lineTextInfoCache.set(key, lineTextInfo);
  let currentWord = { text: "", startIndex: 0, endIndex: -1, baseText: "", baseIndexes: [], subwords: [{ baseText: "", baseIndexes: [] }] };
  lineTextInfo.wordInfos.push(currentWord);
  for (let i = 0; i < lineText.length; i++) {
    const char = lineText.charAt(i);
    if (char === " ") {
      if (lineText.charCodeAt(i - 1) >= 1632 && lineText.charCodeAt(i - 1) <= 1641 || lineText.charCodeAt(i + 1) === 1757) {
        lineTextInfo.ayaSpaceIndexes.push(i);
        lineTextInfo.spaces.set(i, 2 /* Aya */);
      } else {
        lineTextInfo.simpleSpaceIndexes.push(i);
        lineTextInfo.spaces.set(i, 1 /* Simple */);
      }
      currentWord = { text: "", startIndex: i + 1, endIndex: i, baseText: "", baseIndexes: [], subwords: [{ baseText: "", baseIndexes: [] }] };
      lineTextInfo.wordInfos.push(currentWord);
    } else {
      currentWord.text += char;
      if (bases.has(char.charCodeAt(0))) {
        currentWord.baseText += char;
        currentWord.baseIndexes.push(i - currentWord.startIndex);
        let isHamza = false;
        if (char === "\u0621") {
          currentWord.subwords.push({ baseText: "", baseIndexes: [] });
          isHamza = true;
        }
        const subWord = currentWord.subwords.at(-1);
        subWord.baseText += char;
        subWord.baseIndexes.push(i - currentWord.startIndex);
        if (i < lineText.length - 1 && rightNoJoinLetters.includes(char) && !isHamza) {
          currentWord.subwords.push({ baseText: "", baseIndexes: [] });
        }
      }
      currentWord.endIndex++;
    }
  }
  return lineTextInfo;
}
let cachedLayouts = /* @__PURE__ */ new Map();
export {
  FONTSIZE,
  INTERLINE,
  JustStyle,
  MARGIN,
  PAGE_WIDTH,
  SpaceType,
  TOP,
  analyzeLineForJust,
  justifyLine
};
