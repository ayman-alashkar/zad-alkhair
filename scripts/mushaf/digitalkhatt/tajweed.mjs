/* Copied from DigitalKhatt (https://github.com/DigitalKhatt/digitalkhatt-js,
   apps/site-angular/src/app/services/tajweed.service.ts), MIT License — see LICENSE here.
   Transpiled from TypeScript with esbuild. زاد: removed the Angular decorator and
   applyTajweedByPage (the build applies the rules to each page itself). */
const rightNoJoinLetters = "\u0627\u062F\u0630\u0631\u0632\u0648\u0624\u0623\u0671\u0625\u0621\u0629";
const dualJoinLetters = "\u0628\u062A\u062B\u062C\u062D\u062E\u0633\u0634\u0635\u0636\u0637\u0638\u0639\u063A\u0641\u0642\u0643\u0644\u0645\u0646\u0647\u064A\u0626\u0649";
const bases = rightNoJoinLetters + dualJoinLetters;
const IkfaaLetters = "\u0635\u0630\u062B\u0643\u062C\u0634\u0642\u0633\u062F\u0637\u0632\u0641\u062A\u0636\u0638";
const fathatan = "\u064B";
const dammatan = "\u064C";
const kasratan = "\u064D";
const fatha = "\u064E";
const damma = "\u064F";
const kasra = "\u0650";
const shadda = "\u0651";
const sukuns = "\u0652\u06E1";
const openfathatan = "\u08F0";
const opendammatan = "\u08F1";
const openkasratan = "\u08F2";
const tanween = fathatan + dammatan + kasratan;
const opentanween = openfathatan + opendammatan + openkasratan;
const alltanween = tanween + opentanween;
const fdk = fatha + damma + kasra;
const fdkt = fdk + alltanween;
const harakat = fdkt + sukuns + shadda;
const prefereWaslIndoPak = "\u08D5\u0617\u08D7";
const mandatoryWaqfIndoPak = "\u08DE\u08DF\u08DD\u08DB";
const prefereWaqfIndoPak = "\u0615\u08D6";
const takhallus = "\u0614";
const disputedEndofAyah = "\u08E2";
const prefereWasl = "\u06D6" + prefereWaslIndoPak;
const prefereWaqf = "\u06D7" + prefereWaqfIndoPak;
const mandatoryWaqf = "\u06D8" + mandatoryWaqfIndoPak;
const forbiddenWaqf = "\u06D9";
const permissibleWaqf = "\u06DA";
const waqfInOneOfTwo = "\u06DB";
const waqfMarks = prefereWasl + prefereWaqf + mandatoryWaqf + forbiddenWaqf + permissibleWaqf + waqfInOneOfTwo + disputedEndofAyah;
const maddah = "\u0653";
const maddawaajib = "\u089C";
const maddClass = `[${maddah}${maddawaajib}]`;
const ziaditHarf = "\u06DF";
const ziaditHarfWasl = "\u06E0";
const meemiqlab = "\u06E2";
const lowmeemiqlab = "\u06ED";
const daggerAlef = "\u0670";
const smallWaw = "\u06E5";
const smallYeh = "\u06E6";
const invertedDamma = "\u0657";
const subAlef = "\u0656";
const smallMadd = daggerAlef + smallWaw + smallYeh + invertedDamma + subAlef;
const smallHighYeh = "\u06E7";
const smallHighWaw = "\u08F3";
const highCircle = "\u06EC";
const lowCircle = "\u065C";
const hamzaabove = "\u0654";
const hamzabelow = "\u0655";
const smallHighSeen = "\u06DC";
const smallLowSeen = "\u06E3";
const smallHighNoon = "\u06E8";
const cgi = "\u034F";
const marks = harakat + waqfMarks + maddah + maddawaajib + ziaditHarf + ziaditHarfWasl + meemiqlab + lowmeemiqlab + smallMadd + smallHighYeh + smallHighWaw + highCircle + lowCircle + hamzaabove + hamzabelow + smallHighSeen + smallLowSeen + smallHighNoon + cgi + takhallus;
const ayaCond = "\\s?[\u06E9]?\\s?\u06DD";
const waqfCond = `(?:${ayaCond}|[${prefereWasl + prefereWaqf + mandatoryWaqf + permissibleWaqf}]|$)`;
const endWordCond = "(?:\\s|$)";
const endMarksCondOpt = `(?:[${waqfMarks + takhallus + disputedEndofAyah}]*)`;
const elevationChars = "\u0637\u0642\u0635\u062E\u063A\u0636\u0638";
let loweringChars = "";
let digits = "";
function initBases() {
  for (let i = 0; i < bases.length; i++) {
    if (elevationChars.indexOf(bases[i]) === -1) {
      loweringChars += bases[i];
    }
  }
  for (let digit = 1632; digit <= 1641; digit++) {
    digits += String.fromCharCode(digit);
  }
}
initBases();
const beforeAyaCond = `[${digits}\u06DE][${waqfMarks}]?\\s`;
class TajweedService {
  TafkhimRE;
  OthersREMadinah;
  OthersREIndoPak;
  constructor() {
    let pattern = `(?<kalkala1>[\u0637\u0642\u062F\u062C\u0628][${sukuns}])`;
    pattern += `|(?<kalkala2>[\u0637\u0642\u062F\u062C\u0628]${shadda}?)(?=[${marks}]*${waqfCond})`;
    pattern += `|(?<tafkhim1>[${elevationChars}]${shadda}?[${fdk + sukuns}]?)`;
    pattern += `|(?<=\\s\u0627${kasra})(?<tafkhim_reh1>\u0631[${sukuns}])`;
    const kasras = kasra + kasratan + openkasratan;
    pattern += `|(?<=${kasra}|${kasra}[${loweringChars}][${sukuns}]|[\u064A][${sukuns}]?|\u0650\u0637\u0652)\u0631(?<tafkhim2>[${marks}]*)(?<tafkhim2_1>${waqfCond})`;
    pattern += `|(?<tafkhim3>\u0631)(?<tafkhim4>[${marks}]*)(?<tafkhim4_1>${waqfCond})`;
    pattern += `|\u0631(?=${shadda}?[${kasras}])`;
    pattern += `|(?<=${kasra})\u0631[${sukuns}](?![${elevationChars}]${fatha})`;
    pattern += `|(?<tafkhim5>\u0631[${fdk + sukuns + shadda}]*)`;
    pattern += `|(?<=^|[${fatha + damma + mandatoryWaqf + prefereWaqf + permissibleWaqf + prefereWasl}](?:[${forbiddenWaqf}]|\u0627${ziaditHarf})?[\u064A\u0627\u0649]?\\s?|${beforeAyaCond}|\u0648\u0627[${ziaditHarf}]?\\s|${takhallus}\\s|\u0670\u089C)(?:[\u0671]|\u0627\u034F?\u0653|\u0627\u064E?)\u0644(?<tafkhim6>\u0644[${marks}]*)\u0647[${marks}]*\u0645?[${marks}]*${endWordCond}`;
    pattern += `|\u0627\u0670\u089C\u0644(?<tafkhim6_2>\u0644[${marks}]*)\u0647[${marks}]*\u0645?[${marks}]*${endWordCond}`;
    const lamlamhehOfAllahSWTSeq = `\u0644[${marks}]*\u0644[${marks}]*\u0647[${marks}]*${endWordCond}`;
    pattern += `|(?<gray3>[${bases}][${ziaditHarf}])`;
    pattern += `|(?<=[\u0648][${sukuns}]?${maddClass}?|[\u0648]${cgi}?\u0654${cgi}?[${damma}${dammatan}]|[\u0648][${damma}]|[${damma}${sukuns}][\u0648][${fatha}])(?<gray3_indopak_1>[\u0627])(?=${endMarksCondOpt}(?:${endWordCond}|(?:${ayaCond})))`;
    pattern += `|(?<=[${kasra}])(?<gray3_indopak_2>[\u0627])(?=[${bases}])(?!${lamlamhehOfAllahSWTSeq})`;
    this.TafkhimRE = new RegExp(pattern, "gdu");
    const greyHamzatWaslInsideWordMadinah = `(?<=[${bases}][${marks}]*)(?<gray1>\u0671)(?!${lamlamhehOfAllahSWTSeq})`;
    pattern = greyHamzatWaslInsideWordMadinah;
    pattern += `|(?<=[\u0627\u0671])(?<gray2>\u0644(?![${marks}]*\u0644[${marks}]*\u0647[${marks}]*${endWordCond}))(?=[${bases}])`;
    const greyWawYehMadinah = `|(?<gray4>[\u0648])(?=${daggerAlef})|(?<gray4_1>[\u0649])(?=${daggerAlef}[${bases}])`;
    pattern += greyWawYehMadinah;
    pattern += `|(?<=${maddClass})(?<gray7>[\u0648\u064A])(?=${cgi}?${hamzaabove}${cgi}?[${marks}]*(?:\u0627[${ziaditHarf}]?)?${endWordCond})`;
    pattern += `|(?<=${maddClass})(?<gray8>\u0644)(?=\u0630\u0651)`;
    pattern += `|(?<tanween1>\u0646${meemiqlab}${cgi}?[${sukuns}]?)`;
    pattern += `|(?<!${beforeAyaCond}|^)(?<tanween2>[\u0645\u0646]${shadda}(?:[${fdkt}]|(?=${daggerAlef})))(?!${maddawaajib})`;
    pattern += `|(?<tanween3>[${meemiqlab + lowmeemiqlab}])(?=(?:\u0627[${ziaditHarf}]?)?(?<tanween3_a>${ayaCond})?)`;
    pattern += `|(?<tanween4>\u0645[${sukuns}]?)(?=\\s\u0628)`;
    pattern += `|(?<tanween5>\u0646[${bases}])`;
    pattern += `|(?<tanween6>[\u0646${opentanween}${tanween}][${sukuns}]?)[${bases}]?\u06DF?${endMarksCondOpt}\\s(?<tanween7>[\u064A\u0646\u0645\u0648](?:[${shadda}]?[${fdkt}]|[${shadda}](?=${daggerAlef})))`;
    pattern += `|(?<tanween8>[\u0646${opentanween}${tanween}][${sukuns}]?)[${bases}]?${endMarksCondOpt}\\s?[\u0644\u0631][${shadda}]`;
    pattern += `|(?<tanween9>[${opentanween}${tanween}][${sukuns}]?)[${bases}]?${endMarksCondOpt}\\s?[${IkfaaLetters}]`;
    pattern += `|(?<tanween9_noon>[\u0646][${sukuns}]?)[${bases}]?\\s?[${IkfaaLetters}]`;
    pattern += `|(?<=[${fdk}])(?<gray6>[${bases}])(?<gray6_sukuns>[${sukuns}]?)(?=\\s?(?<gray6_1>[${bases}]${shadda}))`;
    pattern += `|(?<tanween10>\u0640\u06E8[${sukuns}]?)`;
    const madJaizAssert = `(?=[\u0648\u0649]?[${bases}][${harakat}][${marks}]?${waqfCond}|\u0647\u0650\u06DB)(?!\u0627[${ziaditHarf}])`;
    pattern += `|(?<!\\s|^)(?<madd5>(?:[\u064A\u0648${daggerAlef}${subAlef}][${sukuns}]?|[\u0627]))${madJaizAssert}`;
    pattern += `|(?<madd4_1>[\u0649]${daggerAlef}${maddClass})${endWordCond}(?=(?<madd4_1_aya>${ayaCond})?)`;
    pattern += `|(?<madd4_4>${daggerAlef}${maddClass})[\u064A][\u06D9]?${endWordCond}(?=(?<madd4_4_aya>${ayaCond})?)`;
    pattern += `|(?<=[\u0649])${daggerAlef}[${waqfMarks}]?${endWordCond}`;
    pattern += `|(?<madd1>[\u0627\u0648${smallMadd}]${cgi}?[${sukuns}]?${maddClass})(?=[${bases}][${shadda}${sukuns}]|[${bases}][${bases}])(?!\u0648\u0627)`;
    pattern += `|(?<madd4_2>[\u0627\u0648\u064A\u0649${smallMadd}]${cgi}?[${sukuns}]?${maddClass})(?=(?:\u0627[${ziaditHarf}])?(?<madd4_2_a>${waqfCond})?)`;
    pattern += `|(?<madd5_1>\u0640[${smallHighYeh}])${madJaizAssert}`;
    pattern += `|(?<madd2_1>\u0640[${smallHighYeh}])(?![${harakat}])`;
    pattern += `|(?<madd2>[${smallMadd}])(?!${cgi}?${hamzaabove}|[${fdkt}]|${ayaCond})`;
    pattern += `|[\u0627\u0648${smallMadd}]${cgi}?[${sukuns}]?${maddClass}${ayaCond}`;
    pattern += `|(?<madd3>[\u0646\u0643\u0639\u0635\u0644\u0645\u0633\u0642][${shadda}]?[${fatha}]?${maddClass})`;
    pattern += `|(?<madd4_3>\u08F3\u0653)`;
    const greyWawYehIndopak = `|(?<=${daggerAlef}${maddah}?)(?<gray4>[\u0648])(?=[${bases}])|(?<gray4_1>[\u0649])(?=[${bases}])|(?<gray4_2>[\u0648](?=[${bases.replace(
      "\u0627",
      ""
    )}]))`;
    const greyHamzatWaslInsideWordIndoPak = `(?<=[${bases}][${marks}]*)(?<gray1>\u0627)(?!${lamlamhehOfAllahSWTSeq})(?=[${bases}][${sukuns}${shadda}]|\u0644[${bases}])`;
    let patternIndopak = pattern.replace(greyWawYehMadinah, greyWawYehIndopak);
    patternIndopak = patternIndopak.replace(
      greyHamzatWaslInsideWordMadinah,
      greyHamzatWaslInsideWordIndoPak
    );
    this.OthersREMadinah = new RegExp(pattern, "gdu");
    this.OthersREIndoPak = new RegExp(patternIndopak, "gdu");
  }
  applyTajweedForText(text, setTajweed, resetIndex, isIndopak) {
    let match;
    let group;
    const OthersRE = isIndopak ? this.OthersREIndoPak : this.OthersREMadinah;
    while (match = this.TafkhimRE.exec(text)) {
      const groups = match.indices.groups;
      if (group = groups.tafkhim_reh1) {
        const firstPos = group[0];
        setTajweed(firstPos, "tafkim");
        setTajweed(firstPos + 1, "tafkim");
      } else if (group = groups.tafkhim1 || groups.tafkhim5 || groups.tafkhim6 || groups.tafkhim6_2) {
        for (let pos = group[0]; pos < group[1]; pos++) {
          setTajweed(pos, "tafkim");
        }
      } else if (group = groups.tafkhim2) {
        const firstPos = group[0];
        const char = text[firstPos];
        const endchar = text[groups.tafkhim2_1[0]];
        if (endchar !== " ") {
          if (char === fatha || char === damma) {
            setTajweed(firstPos, "tafkim");
          }
        }
      } else if (group = groups.tafkhim3) {
        setTajweed(group[0], "tafkim");
        if (group = groups.tafkhim4) {
          const char = text[group[0]];
          const endchar = text[groups.tafkhim4_1[0]];
          if (endchar !== " ") {
            if (char === fatha || char === damma || sukuns.includes(char)) {
              setTajweed(group[0], "tafkim");
            } else if (char === shadda) {
              setTajweed(group[0], "tafkim");
              const nextIndex = group[0] + 1;
              if (nextIndex < group[1]) {
                const nextchar = text[nextIndex];
                if (nextchar === fatha || nextchar === damma) {
                  setTajweed(nextIndex, "tafkim");
                }
              }
            }
          } else {
            if (sukuns.includes(char) || char === shadda) {
              setTajweed(group[0], "tafkim");
            }
          }
        }
      } else if (group = groups.kalkala1) {
        const firstPos = group[0];
        setTajweed(firstPos, "lkalkala");
        setTajweed(firstPos + 1, "lkalkala");
      } else if (group = groups.kalkala2) {
        const firstPos = group[0];
        setTajweed(firstPos, "lkalkala");
        if (firstPos + 1 < group[1]) {
          setTajweed(firstPos + 1, "lkalkala");
        }
      } else if (group = groups.gray3) {
        const firstPos = group[0];
        setTajweed(firstPos, "lgray");
        setTajweed(firstPos + 1, "lgray");
      } else if (group = groups.gray3_indopak_1 || groups.gray3_indopak_2) {
        const firstPos = group[0];
        setTajweed(firstPos, "lgray");
      }
    }
    resetIndex();
    while (match = OthersRE.exec(text)) {
      const groups = match.indices.groups;
      if (group = groups.tanween1) {
        let pos = group[0];
        setTajweed(pos++, "lgray");
        while (pos < group[1]) {
          setTajweed(pos++, "green");
        }
      } else if (group = groups.tanween2) {
        const firstPos = group[0];
        setTajweed(firstPos, "green");
        setTajweed(firstPos + 1, "green");
        if (alltanween.includes(match.groups.tanween2[2])) {
          OthersRE.lastIndex--;
        } else {
          setTajweed(firstPos + 2, "green");
        }
      } else if (group = groups.tanween3) {
        if (!groups.tanween3_a) {
          setTajweed(group[0], "green");
        }
      } else if (group = groups.tanween4) {
        const firstPos = group[0];
        setTajweed(firstPos, "green");
        if (firstPos + 1 < group[1]) {
          setTajweed(firstPos + 1, "green");
        }
      } else if (group = groups.tanween5) {
        const firstPos = group[0];
        setTajweed(firstPos, "green");
      } else if (group = groups.tanween6) {
        if (match.groups.tanween6[0] !== "\u0646" || match.groups.tanween7[0] !== "\u0646") {
          const firstPos = group[0];
          setTajweed(firstPos, "lgray");
          if (firstPos + 1 < group[1]) {
            setTajweed(firstPos + 1, "lgray");
          }
        }
        const tanween7Group = groups.tanween7;
        const greenPos = tanween7Group[0];
        setTajweed(greenPos, "green");
        setTajweed(greenPos + 1, "green");
        if (tanween7Group[0] + 2 < tanween7Group[1]) {
          setTajweed(greenPos + 2, "green");
        }
      } else if (group = groups.tanween8) {
        const firstPos = group[0];
        setTajweed(firstPos, "lgray");
        if (firstPos + 1 < group[1]) {
          setTajweed(firstPos + 1, "lgray");
        }
      } else if (group = groups.tanween9 || groups.tanween9_noon) {
        const firstPos = group[0];
        setTajweed(firstPos, "green");
        if (firstPos + 1 < group[1]) {
          setTajweed(firstPos + 1, "green");
        }
      } else if (group = groups.tanween10) {
        const firstPos = group[0];
        setTajweed(firstPos, "green");
        setTajweed(firstPos + 1, "green");
        if (firstPos + 2 < group[1]) {
          setTajweed(firstPos + 2, "green");
        }
      } else if (group = groups.gray1) {
        const firstPos = group[0];
        setTajweed(firstPos, "lgray");
      } else if (group = groups.gray2) {
        const firstPos = group[0];
        setTajweed(firstPos, "lgray");
      } else if (group = groups.gray4 || groups.gray4_1 || groups.gray4_2) {
        const firstPos = group[0];
        setTajweed(firstPos, "lgray");
      } else if (group = groups.gray5) {
        const firstPos = group[0];
        setTajweed(firstPos, "lgray");
      } else if (group = groups.gray6) {
        if (match.groups.gray6_sukuns !== "") {
          const firstPos = group[0];
          const firstChar = match.groups.gray6[0];
          const secondChar = match.groups.gray6_1[0];
          if (firstChar !== secondChar) {
            if (firstChar !== "\u0637") {
              setTajweed(firstPos, "lgray");
              setTajweed(firstPos + 1, "lgray");
            } else {
              setTajweed(firstPos, "tafkim");
              setTajweed(firstPos + 1, "tafkim");
            }
          } else {
            setTajweed(firstPos, void 0);
            setTajweed(firstPos + 1, void 0);
          }
        } else {
          if (match.groups.gray6[0] !== match.groups.gray6_1[0] || match.groups.gray6[0] === "\u064A" && match.groups.gray6_1[0] === "\u064A") {
            const firstPos = group[0];
            setTajweed(firstPos, "lgray");
          }
        }
      } else if (group = groups.gray7 || groups.gray8) {
        setTajweed(group[0], "lgray");
      } else if (group = groups.madd1) {
        const firstPos = group[0];
        setTajweed(firstPos, "red4");
        setTajweed(firstPos + 1, "red4");
        if (group[0] + 2 < group[1]) {
          setTajweed(firstPos + 2, "red4");
        }
      } else if (group = groups.madd2) {
        const firstPos = group[0];
        setTajweed(firstPos, "red1");
      } else if (group = groups.madd2_1) {
        const firstPos = group[0];
        setTajweed(firstPos, "red1");
        setTajweed(firstPos + 1, "red1");
      } else if (group = groups.madd5_1) {
        const firstPos = group[0];
        setTajweed(firstPos, "red2");
        setTajweed(firstPos + 1, "red2");
      } else if (group = groups.madd3) {
        for (let pos = group[0]; pos < group[1]; pos++) {
          setTajweed(pos, "red4");
        }
      } else if (group = groups.madd4_1) {
        if (!groups.madd4_1_aya) {
          const firstPos = group[0];
          setTajweed(firstPos, "red3");
          setTajweed(firstPos + 1, "red3");
          if (group[0] + 2 < group[1]) {
            setTajweed(firstPos + 2, "red3");
          }
        }
      } else if (group = groups.madd4_4) {
        if (!groups.madd4_4_aya) {
          const firstPos = group[0];
          setTajweed(firstPos, "red3");
          setTajweed(firstPos + 1, "red3");
          setTajweed(firstPos + 2, "red3");
        }
      } else if (group = groups.madd4_2) {
        const firstPos = group[0];
        if (groups.madd4_2_a && match.groups.madd4_2_a.at(-1) === "\u06DD") continue;
        if (!groups.madd4_2_a || match.groups.madd4_2[0] === smallYeh || match.groups.madd4_2[0] === smallWaw || match.groups.madd4_2[0] === invertedDamma || match.groups.madd4_2[0] === subAlef) {
          setTajweed(firstPos, "red3");
        }
        setTajweed(firstPos + 1, "red3");
        if (group[0] + 2 < group[1]) {
          setTajweed(firstPos + 2, "red3");
        }
      } else if (group = groups.madd5) {
        const firstPos = group[0];
        setTajweed(firstPos, "red2");
        if (group[0] + 1 < group[1]) {
          setTajweed(firstPos + 1, "red2");
        }
      } else if (group = groups.madd4_3) {
        const firstPos = group[0];
        setTajweed(firstPos, "red3");
        setTajweed(firstPos + 1, "red3");
      }
    }
  }
}
export {
  TajweedService
};
