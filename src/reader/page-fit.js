/* حبر QCF4 يتجاوز صندوق سطره صعودًا ونزولًا: الشدّة والمدّة تعلوان الصندوق،
   وأرقام الآيات وعلامات الوقف تنزل تحته. وقياس الصناديق لا يرى هذا الحبر،
   فتُحجز له حاشيةٌ في طرفَي الصفحة، مقدارها جزء من ارتفاع السطر الواحد.
   ولمّا كانت الحاشية تُضاف إلى قيد الارتفاع وحده، فهي لا تمسّ صفحةً يحكمها
   العرض — وهي عامّة الصفحات. أثرها محصور في الصفحات المزدحمة بالعناوين. */
const INK_GUARD=.45;

/* أدنى حجم يُقبل به للسطر القرآني، بالبكسل المنطقي، قبل أن تُفتح الصفحة
   للتمرير. اجعله 0 لتعطيل الأرضية والعودة إلى الملاءمة الهندسية المحضة،
   وارفعه إن آثرتَ خطًّا أكبر مع تمرير على صفحةٍ كاملة بخطٍّ أصغر. */
const MIN_LINE_PX=24;

/* الصفحة لا تُكسر من أجل الأرضية إلا إذا كان المكسب معتبرًا. كسرُها لتربح
   جزءًا من بكسل صفقةٌ خاسرة: تخسر الصفحةَ كاملةً وتكسب ما لا يكاد يُرى. */
const FLOOR_TOLERANCE=.90;

const pageFitJobs=new WeakMap();
function fitPage(p){
  const root=document.querySelector(`.page[data-page="${p}"]`);
  if(!root)return;
  const stage=root.querySelector(".page-stage"),host=root.querySelector(".mushaf");
  if(!stage||!host)return;
  const normal=[...host.querySelectorAll(".line-inner:not(.surah-line):not(.bismillah-line)")];
  if(!normal.length)return;

  // Preserve the stable QCF4 composition first. Surah banners are overlays and
  // are deliberately excluded from the Quran text fit; they can never shrink ayat.
  const base=p<=2?112:104;
  const surahBase=p<=2?116:108;
  const basBase=p<=2?102:96;

  const surahs=[...host.querySelectorAll(".surah-line")];
  const bases=[...host.querySelectorAll(".bismillah-line")];
  const job={};
  pageFitJobs.set(root,job);
  const isCurrent=()=>pageFitJobs.get(root)===job&&root.isConnected&&root.querySelector(".mushaf")===host;

  requestAnimationFrame(()=>{
    if(!isCurrent()||stage.clientWidth<=0||stage.clientHeight<=0)return;
    // Reset and measure in the same frame. Superseded fits must never measure
    // a previous fit's scaled text as though it still had the base font size.
    normal.forEach(x=>x.style.fontSize=base+"px");
    surahs.forEach(x=>x.style.fontSize=surahBase+"px");
    bases.forEach(x=>x.style.fontSize=basBase+"px");
    // Always measure from a neutral layout: no scrollbar stealing width, no
    // gap calculated by a previous fit, and no reserved banner height left
    // over from one. Otherwise an earlier result pollutes rawH and the Quran
    // text shrinks a little after repeated resizes.
    stage.classList.remove("scrolls");
    host.style.justifyContent="center";
    host.style.gap="0px";
    surahs.forEach(x=>x.style.minHeight="");

    const targetW=Math.min(stage.clientWidth*.985,775);
    const targetH=stage.clientHeight*.955;
    const maxW=Math.max(...normal.map(x=>x.getBoundingClientRect().width),1);

    // Measure the actual Quran rows, not mushaf.scrollHeight. The Mushaf host is
    // deliberately height:100%, so scrollHeight mostly mirrors the viewport and
    // cannot detect when a window is wide but too short.
    const rows=[...host.children];
    const rawH=Math.max(rows.reduce((sum,row)=>{
      const inner=row.querySelector(".line-inner");
      if(!inner)return sum;
      const box=inner.getBoundingClientRect(),cs=getComputedStyle(inner);
      return sum+box.height+(parseFloat(cs.marginTop)||0)+(parseFloat(cs.marginBottom)||0);
    },0),1);

    // عنوان السورة طبقة عائمة فوق سطره، فارتفاعه الحقيقي لا يدخل في صندوق
    // ذلك السطر ولا في rawH. وهو أطول من الصندوق، لأن نسبة الإطار الجاهز
    // ليست نسبة صندوق QCF4. فإن تُرك بلا حساب وقع أمران معًا: غطّى العنوانُ
    // السطر الذي قبله، وجاءت الصفحة أطول ممّا قيس فطلبت تمريرًا لا موجب له.
    // ولمّا كان عرض الإطار متناسبًا مع المقياس، كان فائضه متناسبًا معه أيضًا،
    // فيُحسب مرة واحدة عند المقياس ١ ويُضاف إلى الارتفاع قبل حلّ المعادلة.
    const banners=[];
    let bannerExtra=0;
    surahs.forEach(line=>{
      const banner=line.querySelector("canvas.surah-banner");
      if(!banner)return;
      const aspect=surahGlyphAspect(banner.dataset.glyph);
      if(!(aspect>0))return;
      const widthAtBase=maxW*.965;
      banners.push({line,banner,aspect});
      bannerExtra+=Math.max(0,widthAtBase/aspect-line.getBoundingClientRect().height);
    });
    const pageH=rawH+bannerExtra+INK_GUARD*(normal[0].getBoundingClientRect().height||base*1.33);

    // قيد العرض لا يُخرق أبدًا: تجاوزه يقصّ السطر القرآني، وهو ما لا يُحتمل.
    // وقيد الارتفاع يُخرق عند الضرورة وحدها، فيتحوّل الأمر إلى تمرير رأسي بدل
    // خطٍّ لا يُقرأ. ولذلك تُقيَّد الأرضية بقيد العرض نفسه، ولا يُعمل بها إلا
    // حين ينزل المقاس عنها نزولًا معتبرًا.
    const wScale=Math.min(1,targetW/maxW);
    const hScale=targetH/pageH;
    const floorScale=Math.min(MIN_LINE_PX/base,wScale);
    const scale=hScale<floorScale*FLOOR_TOLERANCE?floorScale:Math.min(wScale,hScale);
    const overflows=scale>hScale+1e-4;

    // Exactly the same page scale is applied to Quran lines, QCF title metrics,
    // and basmala. The decorative banner itself is fitted only afterwards.
    normal.forEach(x=>x.style.fontSize=(base*scale)+"px");
    surahs.forEach(x=>x.style.fontSize=(surahBase*scale)+"px");
    bases.forEach(x=>x.style.fontSize=(basBase*scale)+"px");

    // كل عنوان يحجز ارتفاعه على سطره، فلا يبقى تراكبٌ ممكنًا بحال.
    banners.forEach(({line,banner,aspect})=>{
      const w=Math.min(maxW*scale*.965,host.clientWidth*.96);
      banner.style.width=w+"px";
      line.style.minHeight=(w/aspect)+"px";
    });

    // مركزةُ محتوًى فائضٍ تجعل أعلاه غير قابل للوصول، فيبدأ من الأعلى حينئذٍ.
    // وعند الخروج من التمرير الطارئ يُصفَّر الموضع صراحةً: المسرح يعود إلى
    // overflow:hidden وهو لا يزال حاوية تمرير برمجيًّا، فقد يبقى فيه إزاحةٌ
    // لا سبيل للقارئ إلى ردّها. ولا يُمسّ الموضع ما دامت الصفحة في التمرير،
    // فلا يُقذف القارئ إلى أوّلها كلّما غُيّر حجم النافذة.
    stage.classList.toggle("scrolls",overflows);
    if(!overflows)stage.scrollTop=0;
    host.style.justifyContent=overflows?"flex-start":"center";

    requestAnimationFrame(()=>{
      if(!isCurrent())return;
      // Render the *visible ink* of the ready-made QUL glyph, then crop the
      // canvas to that ink. This avoids the large internal font metrics that
      // can make the decorative header look tiny. Its CSS width is
      // independent of the QCF4 line box and therefore never shrinks ayat.
      banners.forEach(({banner})=>renderSurahHeaderCanvas(banner,banner.dataset.glyph));

      if(p>=3&&!overflows&&rows.length>1){
        const rowHeight=rows.reduce((sum,row)=>sum+row.getBoundingClientRect().height,0);
        const usable=stage.clientHeight*.955;
        const spare=Math.max(0,usable-rowHeight);
        const gap=Math.max(0,Math.min(18,spare/(rows.length-1)));
        host.style.gap=gap.toFixed(2)+"px";
      }
    });
  });
}
