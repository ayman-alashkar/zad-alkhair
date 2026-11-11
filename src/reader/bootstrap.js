/* ---------- init ---------- */
(async()=>{
  try{
    validateStaticData();
    buildPageShells();
    const early=readerEntryParams();
    const passiveDirectEntry=early.direct&&(early.listen||early.home);
    /* فتح الفهرس (تبويب «القرآن العظيم») لا يحتاج خطوط صفحات المصحف: أسماء السور
       بخط الرقعة، والبيانات محفوظة على الجهاز. فيظهر فورًا، ويكمل الإقلاع خلفه. */
    let earlyIndexOpened=false;
    {
      const stored=storageJsonGet(STORAGE_KEYS.lastSurface,null);
      const plainHome=!ayahFromHash()&&!early.page&&!early.juz&&!early.surah&&(early.home||!early.direct&&(early.listen||stored?.surface!=="reader"));
      if(early.listen&&(early.direct||plainHome)){
        await loadQcfMeta();
        validateMetadataConsistency();
        const saved=Number(storageJsonGet(STORAGE_KEYS.lastPosition,null)?.page);
        if(saved>=1&&saved<=TOTAL_PAGES)currentPage=saved;
        loading.classList.add("hide");
        if(early.surah)listenTarget={surah:early.surah,reciter:RECITERS.find(r=>r.id===early.qari)||reciter};
        openListenPage();
        earlyIndexOpened=true;
      }else if(plainHome){
        await loadQcfMeta();
        validateMetadataConsistency();
        const saved=Number(storageJsonGet(STORAGE_KEYS.lastPosition,null)?.page);
        if(saved>=1&&saved<=TOTAL_PAGES)currentPage=saved;
        const tab=stored?.surface==="quran-home"&&["s","j","m"].includes(stored?.tab)?stored.tab:"s";
        loading.classList.add("hide");
        openQuranIndex(tab,{home:true});
        earlyIndexOpened=true;
      }
    }
    await Promise.all([
      document.fonts.load('48px "QCF4_QBSML"'),
      document.fonts.load('48px "QCF4_Hafs_01"')
    ]);
    try{
      await document.fonts.load('64px "QUL_SurahHeader"',SURAH_HEADER_GLYPHS[1]);
      surahHeaderReady=true;
    }catch(_){surahHeaderReady=false}
    await loadQcfMeta();
    validateMetadataConsistency();
    currentPage=1;let previousVisit=null;
    const m=storageJsonGet(STORAGE_KEYS.lastPosition,null),savedPage=Number(m?.page);
    if(savedPage>=1&&savedPage<=TOTAL_PAGES){currentPage=savedPage;previousVisit={...m,page:savedPage}}
    if(!passiveDirectEntry)archivePreviousVisit(previousVisit);

    /* Integration deep links. Specific ayah wins, then page, then juz, then saved position. */
    const entry=early;
    if(entry.qari&&!entry.direct){
      reciter=RECITERS.find(r=>r.id===entry.qari)||defaultReciter();
      storageJsonSet(STORAGE_KEYS.qari,reciter);
    }
    let deepLinkedAyah=entry.direct?null:ayahFromHash();
    if(entry.direct==="read"&&entry.surah){
      const max=Number(chapterMap.get(entry.surah)?.verses_count||0);
      deepLinkedAyah=`${entry.surah}:${entry.ayah&&entry.ayah<=max?entry.ayah:1}`;
    }else if(!entry.direct&&!deepLinkedAyah&&entry.surah&&entry.ayah){
      const max=Number(chapterMap.get(entry.surah)?.verses_count||0);
      if(entry.ayah<=max)deepLinkedAyah=`${entry.surah}:${entry.ayah}`;
    }
    const noDeepTarget=!deepLinkedAyah&&!entry.page&&!entry.juz&&!entry.surah;
    const storedSurface=storageJsonGet(STORAGE_KEYS.lastSurface,null);
    const wantsHome=entry.home||entry.listen||(!entry.direct&&noDeepTarget&&storedSurface?.surface!=="reader");
    if(!noDeepTarget&&!entry.home){readerReturnToQuranHome=false;storageSet(STORAGE_KEYS.readerParent,"")}
    else if(noDeepTarget&&storedSurface?.surface==="reader"&&storageGet(STORAGE_KEYS.readerParent,"")==="quran-home")readerReturnToQuranHome=true;
    if(deepLinkedAyah){
      let p=await getVersePage(deepLinkedAyah);
      if(!p&&entry.direct==="read"){
        if(deepLinkedAyah.endsWith(":1"))p=Number(chapterMap.get(entry.surah)?.pages?.[0]);
        if(!p)throw Error("Reading target unavailable");
      }
      if(p)currentPage=p;
    }else if(entry.page){
      currentPage=entry.page;
    }else if(entry.juz){
      currentPage=juzStartPage(entry.juz);
    }
    await ensurePage(currentPage);
    updatePage(false,false);
    if(!passiveDirectEntry)saveLastPosition();
    if(!wantsHome)saveReaderSurface("reader");
    if(!readerGoPending)loading.classList.add("hide");
    if(deepLinkedAyah){
      const anchor=document.querySelector(`.page[data-page="${currentPage}"] .verse-segment[data-key="${deepLinkedAyah}"]`);
      if(anchor)selectVerse(deepLinkedAyah,anchor,true);
    }
    if(!entry.direct&&entry.autoplay&&entry.surah)prepareSurahFromDeepLink(entry.surah);
    prefetchAround(currentPage).then(()=>trimPageDom(currentPage));
    loadTafsirIndex().catch(err=>console.warn("tafsir index unavailable",err));
    readerBootDone();
    if(wantsHome&&!earlyIndexOpened){
      const restoredTab=storedSurface?.surface==="quran-home"&&["s","j","m"].includes(storedSurface?.tab)?storedSurface.tab:"s";
      requestAnimationFrame(()=>entry.listen?openListenPage():openQuranIndex(restoredTab,{home:true}));
    }
  }catch(e){
    console.error(e);
    readerBootDone();
    document.querySelector(".quran-index")?.remove();
    loading.classList.remove("hide");
    loading.innerHTML=`<div class="loading-error"><div>تعذّر تحميل بيانات المصحف. تحقق من الاتصال ثم أعد المحاولة.</div><button class="loading-retry" type="button">إعادة المحاولة</button></div>`;
    loading.querySelector(".loading-retry")?.addEventListener("click",()=>location.reload());
  }
})();

/* إحصاءات الاستعمال (src/shared/usage.js): الظاهر من الفهرس أو المشغّل أو المصحف،
   فكلاهما يُضاف إلى body ويُزال منه، وثواني الاستماع ومنها ثواني «ما تيسّر». */
function readerUsageSurface(){
  return document.querySelector(".zad-listen")?"listen":document.querySelector(".quran-index")?"quran":"reader";
}
new MutationObserver(()=>zuSurface(readerUsageSurface())).observe(document.body,{childList:true});
zuSurface(readerUsageSurface());
/* فحص بلا أثر: tayassurActive() تُنهي الوضع حين تراه منتهيًا، والإحصاء لا يغيّر شيئًا. */
zuTrackAudio(audio,()=>!!tayassur&&continuousStopRef===tayassur.stop&&!isSurahOnly());
