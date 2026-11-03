/* ---------- init ---------- */
(async()=>{
  try{
    validateStaticData();
    buildPageShells();
    /* فتح الفهرس (تبويب «القرآن العظيم») لا يحتاج خطوط صفحات المصحف: أسماء السور
       بخط الرقعة، والبيانات محفوظة على الجهاز. فيظهر فورًا، ويكمل الإقلاع خلفه. */
    let earlyIndexOpened=false;
    {
      const early=readerEntryParams(),stored=storageJsonGet(STORAGE_KEYS.lastSurface,null);
      const plainHome=!ayahFromHash()&&!early.page&&!early.juz&&!early.surah&&(early.home||stored?.surface!=="reader");
      if(plainHome){
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
    archivePreviousVisit(previousVisit);

    /* Integration deep links. Specific ayah wins, then page, then juz, then saved position. */
    const entry=readerEntryParams();
    if(entry.qari){
      reciter=RECITERS.find(r=>r.id===entry.qari)||defaultReciter();
      storageJsonSet(STORAGE_KEYS.qari,reciter);
    }
    let deepLinkedAyah=ayahFromHash();
    if(!deepLinkedAyah&&entry.surah&&entry.ayah){
      const max=Number(chapterMap.get(entry.surah)?.verses_count||0);
      if(entry.ayah<=max)deepLinkedAyah=`${entry.surah}:${entry.ayah}`;
    }
    const noDeepTarget=!deepLinkedAyah&&!entry.page&&!entry.juz&&!entry.surah;
    const storedSurface=storageJsonGet(STORAGE_KEYS.lastSurface,null);
    const wantsHome=entry.home||(noDeepTarget&&storedSurface?.surface!=="reader");
    if(!noDeepTarget&&!entry.home){readerReturnToQuranHome=false;storageSet(STORAGE_KEYS.readerParent,"")}
    else if(noDeepTarget&&storedSurface?.surface==="reader"&&storageGet(STORAGE_KEYS.readerParent,"")==="quran-home")readerReturnToQuranHome=true;
    if(deepLinkedAyah){
      const p=await getVersePage(deepLinkedAyah);
      if(p)currentPage=p;
    }else if(entry.page){
      currentPage=entry.page;
    }else if(entry.juz){
      currentPage=juzStartPage(entry.juz);
    }
    await ensurePage(currentPage);
    updatePage(false,false);
    saveLastPosition();
    if(!wantsHome)saveReaderSurface("reader");
    if(!readerGoPending)loading.classList.add("hide");
    if(deepLinkedAyah){
      const anchor=document.querySelector(`.page[data-page="${currentPage}"] .verse-segment[data-key="${deepLinkedAyah}"]`);
      if(anchor)selectVerse(deepLinkedAyah,anchor,true);
    }
    if(entry.autoplay&&entry.surah)prepareSurahFromDeepLink(entry.surah);
    prefetchAround(currentPage).then(()=>trimPageDom(currentPage));
    loadTafsirIndex().catch(err=>console.warn("tafsir index unavailable",err));
    readerBootDone();
    if(wantsHome&&!earlyIndexOpened){
      const restoredTab=storedSurface?.surface==="quran-home"&&["s","j","m"].includes(storedSurface?.tab)?storedSurface.tab:"s";
      requestAnimationFrame(()=>openQuranIndex(restoredTab,{home:true}));
    }else setTimeout(()=>showToast("QCF4 · مصحف المدينة ١٤٤١هـ · ٦٠٤ صفحات"),350);
  }catch(e){
    console.error(e);
    readerBootDone();
    document.querySelector(".quran-index")?.remove();
    loading.classList.remove("hide");
    loading.innerHTML=`<div class="loading-error"><div>تعذّر تحميل بيانات المصحف. تحقق من الاتصال ثم أعد المحاولة.</div><button class="loading-retry" type="button">إعادة المحاولة</button></div>`;
    loading.querySelector(".loading-retry")?.addEventListener("click",()=>location.reload());
  }
})();