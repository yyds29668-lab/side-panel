(function(){
  'use strict';
  var CAL = window.CAL || {};
  var params = new URLSearchParams(location.search);
  var isApp = params.get('app') === '1' || location.hash === '#app';
  var NOW = isApp ? new Date() : new Date(2026, 10, 22, 2, 27, 16);
  var $ = function(id){ return document.getElementById(id); };
  var pad = function(n){ return (n < 10 ? '0' : '') + n; };
  var keyOf = function(y, m, d){ return y + '-' + pad(m) + '-' + pad(d); };
  var WEEK = ['周日','周一','周二','周三','周四','周五','周六'];
  var CN_M = ['','一','二','三','四','五','六','七','八','九','十','十一','十二'];
  var TODAY = dateKey(NOW);
  var TODAY_DATA = null;
  var GITHUB = null;
  var FALLBACK_TODAY = {
    date:'2026-11-22', weekday:'周日', grade:'平', score:5.0,
    hexagram:{primary:'地天泰', changed:'地泽临', moving:'九三'},
    summary:'这是示例指南，只用于设计预览。真正使用时，可以由任意 harness 生成当天数据，或让面板显示「未推算」。',
    one_thing:'小往大来，吉亨。', one_source:'《周易·泰卦》', one_note:'舍小得大；今天适合把要紧事往前推。',
    yi:['整理','推进','沟通'], ji:['拖延','熬夜'],
    five:[
      {key:'钱',state:0,note:'按预算，先定框架'},
      {key:'事业',state:1,note:'推进一件要紧的小事'},
      {key:'感情',state:0,note:'把话说清楚'},
      {key:'家庭',state:0,note:'问一句近况'},
      {key:'身体',state:0,note:'走 6000 步，早点睡'}
    ],
    hours:[
      {branch:'巳',time:'09–11',note:'示例窗口，适合谈事'},
      {branch:'午',time:'11–13',note:'吃饭休整'},
      {branch:'未',time:'13–15',note:'处理杂事'},
      {branch:'申',time:'15–17',note:'第二窗口，收尾'},
      {branch:'酉',time:'17–19',note:'常规事务'},
      {branch:'戌',time:'19–21',note:'收工'}
    ],
    warnings:['示例数据，不是命理判断。'],
    windows:[{branch:'巳', time:'09:00–10:59', note:'示例窗口'}],
    source:'示例数据'
  };

  var ACTIVE = [
    { t:'整理桌面', tag:'今天' },
    { t:'读完手边一章', tag:'本周' },
    { t:'把本周要交的东西列出来', tag:'清单' },
    { t:'给家人打个电话', tag:'今天' },
    { t:'散步 20 分钟', tag:'今天' },
    { t:'整理一张灵感图', tag:'清单' },
    { t:'把一件拖了很久的小事做完', tag:'本周' },
    { t:'留半小时不看手机', tag:'习惯' }
  ];
  var DONE = [
    { t:'整理桌面', date:'11-21', time:'22:10' },
    { t:'给家人打个电话', date:'11-21', time:'20:05' },
    { t:'散步 20 分钟', date:'11-20', time:'21:40' },
    { t:'读完手边一章', date:'11-20', time:'07:20' },
    { t:'整理一张灵感图', date:'11-19', time:'23:10' },
    { t:'留半小时不看手机', date:'11-19', time:'18:30' }
  ];

  var TODO_ROWS = [
    {k:'穿', v:'舒适、保暖，按天气增减'},
    {k:'办事', v:'先做今天最重要的一件'},
    {k:'说话', v:'直接说，不绕'},
    {k:'吃', v:'温热，七分饱'},
    {k:'动', v:'走 6000 步，量力而行'},
    {k:'买', v:'按预算，不冲动'},
    {k:'理发', v:'按自己的安排'},
    {k:'敬拜', v:'按自己的习惯'}
  ];

  function dateKey(d){ return keyOf(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
  function offsetDay(d, offset){ return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset); }
  function dateLabel(d){ return (d.getMonth() + 1) + '月' + d.getDate() + '日'; }
  function dateFromKey(key){
    var p = key.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c];
    });
  }

  var QUOTES = [
    {text:"反者道之动，弱者道之用。", src:"《道德经》", ref:"第四十章", a:"事物发展到极端会转向反面；柔弱不是软弱，而是不硬碰硬的力量。", u:"今天遇到顶牛的事，先退半步，换一种方式再试。"},
    {text:"食其时，百骸理；动其机，万化安。", src:"《阴符经》", ref:"中篇", a:"做事要合时机；时机不对，力气再大也落不到点上。", u:"今天先等一个明确信号，再决定要不要动手。"},
    {text:"先为不可胜，以待敌之可胜。", src:"《孙子兵法》", ref:"军形", a:"先把自己放在不会输的位置，再等对方露出破绽。", u:"今天先补最容易被忽略的短板，再谈进攻。"},
    {text:"井泥不食，旧井无禽。", src:"《周易》", ref:"井卦初六", a:"井里是泥，打上来的水不能喝；旧井没有鸟来，说明环境还没修好。", u:"今天先修一个卡了很久的旧问题，不急着开新局。"},
    {text:"君子欲讷于言而敏于行。", src:"《论语》", ref:"里仁", a:"说话慢一点，做事快一点；少解释，多交付。", u:"今天把一件小事直接做完，不用先说明。"},
    {text:"水之积也不厚，则其负大舟也无力。", src:"《庄子》", ref:"逍遥游", a:"水积得不厚，就托不起大船；底子不够，先别急着做大事。", u:"今天补一块基础：整理资料、练基本功，或把欠的功课补上。"},
    {text:"知人者智，自知者明。", src:"《道德经》", ref:"第三十三章", a:"看懂别人是聪明，看懂自己才是真正的明白。", u:"今天做决定前，先问自己真正想要什么。"},
    {text:"胜人者有力，自胜者强。", src:"《道德经》", ref:"第三十三章", a:"赢别人靠力气，赢自己才是真正的强。", u:"今天管住一个明知道不该做的小习惯。"},
    {text:"上善若水，水善利万物而不争。", src:"《道德经》", ref:"第八章", a:"最好的品性像水，滋养万物却不争高低。", u:"今天在一件小事上让别人先一步，看看事情会不会更顺。"},
    {text:"飘风不终朝，骤雨不终日。", src:"《道德经》", ref:"第二十三章", a:"再大的风也刮不了一整天，再急的雨也下不了一整日。", u:"今天遇到难受的事，先告诉自己：熬过这一阵再说。"},
    {text:"企者不立，跨者不行。", src:"《道德经》", ref:"第二十四章", a:"踮着脚站不久，跨大步走不远。", u:"今天按正常节奏做事，不为了快而硬撑。"},
    {text:"天下难事，必作于易；天下大事，必作于细。", src:"《道德经》", ref:"第六十三章", a:"难事从容易的地方开始，大事从细小的部分做起。", u:"今天把一件大任务拆成十分钟能做的第一步。"},
    {text:"慎终如始，则无败事。", src:"《道德经》", ref:"第六十四章", a:"收尾时像开头一样认真，事情就不容易失败。", u:"今天把一件快结束的事，认真检查最后一遍。"},
    {text:"知足不辱，知止不殆。", src:"《道德经》", ref:"第四十四章", a:"知道满足，才不会招来羞辱；知道适可而止，才不会陷入危险。", u:"今天做完一件就停，不贪多。"},
    {text:"大直若屈，大巧若拙，大辩若讷。", src:"《道德经》", ref:"第四十五章", a:"真正正直的人不张扬，真正灵巧的人不卖弄，真正会说话的人不抢话。", u:"今天少争一句，把话留给结果。"},
    {text:"祸兮福之所倚，福兮祸之所伏。", src:"《道德经》", ref:"第五十八章", a:"祸里可能靠着福，福里也可能藏着祸，好坏不是一眼能看完的。", u:"今天顺的时候留一步，别把话说满。"},
    {text:"治大国若烹小鲜。", src:"《道德经》", ref:"第六十章", a:"小鱼不能反复翻，事情也不能反复折腾。", u:"今天定下的方案，不要来回改。"},
    {text:"图难于其易，为大于其细。", src:"《道德经》", ref:"第六十三章", a:"解决难事从容易处入手，做大事从细处开始。", u:"今天先做十分钟，不要求一次做完。"},
    {text:"不患人之不己知，患不知人也。", src:"《论语》", ref:"学而", a:"不怕别人不了解你，怕的是你不了解别人。", u:"今天先听完对方的话，再表达自己。"},
    {text:"三人行，必有我师焉。", src:"《论语》", ref:"述而", a:"几个人一起走，里面一定有可以当你老师的人。", u:"今天向一个人请教一个具体问题。"},
    {text:"欲速则不达，见小利则大事不成。", src:"《论语》", ref:"子路", a:"越急着求快越到不了，只盯着小利大事就做不成。", u:"今天不抢进度，先把一步做稳。"},
    {text:"工欲善其事，必先利其器。", src:"《论语》", ref:"卫灵公", a:"想把活干好，先把工具准备好。", u:"今天先花十分钟整理工具和环境。"},
    {text:"人无远虑，必有近忧。", src:"《论语》", ref:"卫灵公", a:"如果不提前想清楚以后可能发生什么，眼前的麻烦就会一个接一个地冒出来。远虑不是瞎担心，而是把下一步的代价先看清楚。", u:"今天花十分钟，把一件正在拖的事往后推演一步，先做那个能避免麻烦的动作。"},
    {text:"君子和而不同，小人同而不和。", src:"《论语》", ref:"子路", a:"君子能和人相处，但不盲目附和；小人表面一致，心里并不和。", u:"今天允许别人有不同意见，不急着说服。"},
    {text:"知之为知之，不知为不知，是知也。", src:"《论语》", ref:"为政", a:"知道就说知道，不知道就承认不知道，这才是真正的明白。", u:"今天遇到不懂的，直接问，不装懂。"},
    {text:"学而不思则罔，思而不学则殆。", src:"《论语》", ref:"为政", a:"只学不想会迷惑，只想不学会危险。", u:"今天学完一个东西，写三行自己的理解。"},
    {text:"天行健，君子以自强不息。", src:"《周易》", ref:"乾卦", a:"天一直在运转，君子也要不断让自己往前走。", u:"今天先动一下，不等有状态。"},
    {text:"地势坤，君子以厚德载物。", src:"《周易》", ref:"坤卦", a:"大地能承载万物，是因为厚实。", u:"今天对一个人多一分耐心。"},
    {text:"穷则变，变则通，通则久。", src:"《周易》", ref:"系辞下", a:"走不通就要变，变了才会通，通了才能久。", u:"今天给卡住的事换一个做法。"},
    {text:"君子藏器于身，待时而动。", src:"《周易》", ref:"系辞下", a:"把本事藏在身上，等合适的时机再出手。", u:"今天先练本事，不急着表现。"},
    {text:"静以修身，俭以养德。", src:"《诫子书》", ref:"诸葛亮", a:"安静下来修养自己，节俭下来培养品德。", u:"今天留半小时不看手机。"},
    {text:"非淡泊无以明志，非宁静无以致远。", src:"《诫子书》", ref:"诸葛亮", a:"心不清净，志向就不明确；心不安静，就走不远。", u:"今天关掉一个噪音源，专心做一件事。"},
    {text:"宠辱不惊，闲看庭前花开花落。", src:"《菜根谭》", ref:"概论", a:"不因表扬或批评就大起大落，才能安静看花开花落。", u:"今天不因为一句话高兴或难受太久。"},
    {text:"径路窄处，留一步与人行。", src:"《菜根谭》", ref:"概论", a:"路窄的地方，留一步给别人走。", u:"今天在争执里让一次。"},
    {text:"攻人之恶毋太严，要思其堪受。", src:"《菜根谭》", ref:"概论", a:"批评别人别太狠，要先想他受不受得住。", u:"今天批评前，先缓一缓，换一种说法。"},
    {text:"处世让一步为高，退步即进步的张本。", src:"《菜根谭》", ref:"概论", a:"让一步不是输，是给下一步留出空间。", u:"今天退一步，先把事情做成。"},
  ];

  var NEWS = [
    { cat:'tech', t:'曝黎曼猜想被证明，Claude 立大功', s:'爱范儿', u:'https://www.ifanr.com/1690750', p:'2026-11-21T01:29:09Z', read:true, why:'你最近点过 3 次 AI' },
    { cat:'tech', t:'比亚迪腾势 B5「致敬」大众途锐经典广告，两轮成功拉动 180 吨客机', s:'IT之家', u:'https://www.ithome.com/1/030/509.htm', p:'2026-11-21T15:25:36Z', read:false },
    { cat:'tech', t:'育碧确认：《刺客信条》中国背景手游「代号 JADE」仍在开发', s:'IT之家', u:'https://www.ithome.com/1/030/507.htm', p:'2026-11-21T14:47:34Z', read:false },
    { cat:'tech', t:'韩国总统李在明：速度在 AI 竞赛中至关重要', s:'IT之家', u:'https://www.ithome.com/1/030/506.htm', p:'2026-11-21T14:26:35Z', read:false },
    { cat:'tech', t:'全球唯一实现非晶合金车用电驱规模化量产，广汽第 10 万套下线', s:'IT之家', u:'https://www.ithome.com/1/030/504.htm', p:'2026-11-21T13:53:01Z', read:false },
    { cat:'tech', t:'亚马逊硬刚纽约《配送保护法》：喊话消费者当心配送费涨价', s:'IT之家', u:'https://www.ithome.com/1/030/505.htm', p:'2026-11-21T14:18:45Z', read:false },
    { cat:'design', t:'AI Sped Up The Build: How Can Accessibility Testing Keep Up?', s:'Smashing', u:'https://smashingmagazine.com/2026/11/ai-sped-up-build-how-can-accessibility-testing-keep-up/', p:'2026-11-17T08:00:00Z', read:true },
    { cat:'design', t:'Should You Actually Add AI To That? A Four-Question Audit For Product Teams', s:'Smashing', u:'https://smashingmagazine.com/2026/11/should-you-add-ai-audit-product-teams/', p:'2026-11-12T10:00:00Z', read:false },
    { cat:'design', t:'The Best Coffee Table Books for Design Enthusiasts', s:'Design Milk', u:'https://design-milk.com/best-coffee-table-books/', p:'2026-11-20T23:23:15Z', read:false },
    { cat:'design', t:'A Brooklyn Exhibition Rethinks the Art of the Candleholder', s:'Design Milk', u:'https://design-milk.com/candelabra-palaver-piscina/', p:'2026-11-20T20:42:13Z', read:false },
    { cat:'finance', t:'美股一夜崩盘，AI 泡沫真要破了？', s:'爱范儿', u:'https://www.ifanr.com/1690789', p:'2026-11-21T03:30:42Z', read:false },
    { cat:'finance', t:'英伟达董事会不考虑恢复黄仁勋的 CEO 职位', s:'FT中文网', u:'https://www.ftchinese.com/story/001111390', p:'2026-11-16T16:00:00Z', read:false },
    { cat:'finance', t:'科技投资者：「成功和名望」损害硅谷企业领导水平', s:'FT中文网', u:'https://www.ftchinese.com/story/001111388', p:'2026-11-16T16:00:00Z', read:false },
    { cat:'finance', t:'欧盟再度推动 AI 治理全球协议', s:'FT中文网', u:'https://www.ftchinese.com/story/001111386', p:'2026-11-16T16:00:00Z', read:false }
  ];

  function ago(iso){
    var d = (NOW - new Date(iso)) / 1000;
    if (d < 60) return '刚刚';
    if (d < 3600) return Math.round(d/60) + ' 分钟前';
    if (d < 86400) return Math.round(d/3600) + ' 小时前';
    return Math.round(d/86400) + ' 天前';
  }

  /* ---------- week strip ---------- */
  function calendarDots(k){
    var v = CAL[k];
    if (!v || v.mw || v.aw || !v.s || !v.s.length) return '';
    var h = '';
    for (var i = 0; i < v.s.length && i < 4; i++) h += '<i class="pdot' + (v.s[i].p ? ' p' : '') + '"></i>';
    return h;
  }
  function morningDots(v){
    if (!v || v.mw || v.aw || !v.s) return '';
    var h = '';
    for (var i = 0; i < v.s.length && h.split('dot').length <= 5; i++){
      var b = v.s[i].b || '';
      if ('卯辰巳午'.indexOf(b) < 0) continue;
      h += '<i class="dot' + (v.s[i].p ? ' p' : '') + '"></i>';
    }
    return h;
  }
  function renderThreeDays(){
    var html = '', labels = ['昨天', '今天', '明天'], today = dateKey(NOW);
    for (var i = 0; i < 3; i++){
      var d = offsetDay(NOW, i - 1), k = dateKey(d), lunar = CAL[k];
      var pen = lunar && (lunar.aw ? '暗戊' : (lunar.mw ? '明戊' : ''));
      html += '<button class="wd' + (k === today ? ' today' : '') + '" data-k="' + k + '">' +
        '<span class="w">' + labels[i] + ' · ' + WEEK[d.getDay()] + '</span>' +
        '<span class="d">' + dateLabel(d) + '</span>' +
        '<span class="ld">' + (lunar ? esc(lunar.l) : '—') + '</span>' +
        (pen ? '<span class="pen">' + pen + '</span>' : '') +
        '<span class="dots">' + morningDots(lunar) + '</span></button>';
    }
    $('threeDays').innerHTML = html;
  }

  /* ---------- memo ---------- */
  var memoMode = 'all';
  function renderMemo(){
    var html = '';
    for (var i = 0; i < Math.min(ACTIVE.length, 8); i++){
      html += '<div class="mi" data-i="' + i + '">' +
        '<button class="check-target" aria-label="完成：' + esc(ACTIVE[i].t) + '"><span class="cb"></span></button>' +
        '<span class="t" title="' + esc(ACTIVE[i].t) + '">' + esc(ACTIVE[i].t) + '</span>' +
        (ACTIVE[i].tag ? '<span class="tag">' + esc(ACTIVE[i].tag) + '</span>' : '') + '</div>';
    }
    $('memoList').innerHTML = html;
    $('memoCount').textContent = ACTIVE.length + ' 条待办';
    $('doneN').textContent = DONE.length;
    $('memoExpand').hidden = ACTIVE.length <= 8;
  }
  function markDone(i){
    var it = ACTIVE[i];
    if (!it) return;
    if (it.id){
      panelCall('PANEL:memo-done:' + encodeURIComponent(it.id));
      toast('已记下完成时间');
    } else {
      ACTIVE.splice(i, 1);
      DONE.unshift({ t: it.t, date: TODAY.slice(5), time: pad(NOW.getHours()) + ':' + pad(NOW.getMinutes()), done_at: TODAY });
      renderMemo();
      renderMemoSheet(memoMode);
    }
  }
  function renderRecent(){
    var el = document.querySelector('.recent');
    if (!el) return;
    var a = DONE[0], b = DONE[1];
    if (!a){ el.innerHTML = '最近完成'; return; }
    el.innerHTML = '最近完成<br><b>' + esc(a.t) + '</b> · ' + esc(a.date) + ' ' + esc(a.time) +
      (b ? '<br><b>' + esc(b.t) + '</b> · ' + esc(b.date) + ' ' + esc(b.time) : '');
  }
  function renderMemoSheet(mode){
    if (mode) memoMode = mode;
    var html = '';
    if (memoMode === 'all'){
      html += '<div class="ms-group">待 办</div>';
      for (var i = 0; i < ACTIVE.length; i++){
        html += '<div class="ms-item" data-i="' + i + '"><button class="cb" aria-label="完成：' + esc(ACTIVE[i].t) + '"></button><span class="t">' +
          esc(ACTIVE[i].t) + '</span><span class="time">' + esc(ACTIVE[i].tag) + '</span></div>';
      }
    }
    var groups = {};
    for (var j = 0; j < DONE.length; j++){
      var day = doneDay(DONE[j]) || '日期未记录';
      (groups[day] = groups[day] || []).push(DONE[j]);
    }
    var keys = Object.keys(groups);
    for (var g = 0; g < keys.length; g++){
      html += '<div class="ms-group">已完成 · ' + esc(keys[g]) + '</div>';
      for (var k = 0; k < groups[keys[g]].length; k++){
        var x = groups[keys[g]][k];
        html += '<div class="ms-item done" data-id="' + esc(x.id) + '"><button class="cb" aria-label="撤回完成：' + esc(x.t) + '">✓</button><span class="t">' + esc(x.t) + '</span><span class="time">' + esc(x.time) + '</span></div>';
      }
    }
    $('memoAll').innerHTML = html;
    $('memoSub').textContent = memoMode === 'done' ? '共 ' + DONE.length + ' 件 · 按天' : '待办 ' + ACTIVE.length + ' · 已完成 ' + DONE.length;
    $('memoTitle').textContent = memoMode === 'done' ? '已完成 · 全部' : '备忘 · 全部';
    $('memoHistory').hidden = memoMode !== 'done' || !DONE.length;
    if (!$('memoHistory').hidden){ renderBars(); renderHeat(); renderRecent(); }
  }

  /* ---------- guide sheet ---------- */
  function guideTodos(g){
    if (Array.isArray(g.todo)) return g.todo;
    return TODO_ROWS;
  }

  function renderGuideSheet(){
    var g = TODAY_DATA, hd = document.querySelector('#wrapGuide .sheet-hd');
    var ft = document.querySelector('#wrapGuide .sheet-ft span');
    if (!g || g.date !== TODAY){
      var y = lunarYiji();
      hd.querySelector('.big').textContent = '今日指南 · ' + TODAY.slice(5);
      hd.querySelector('.sub').textContent = '未推算 · 仅农历宜忌';
      var html = '<p class="gd-brief">未推算。今日只显示农历宜忌，指南出稿后自动更新。</p>';
      html += '<div class="gd-sub">农 历 宜 忌</div><div class="gd-todo pending-yiji">';
      html += '<div><b>宜</b><span>' + (y.yi.length ? esc(y.yi.join(' · ')) : '今日不朝') + '</span></div>';
      html += '<div><b>忌</b><span>' + (y.ji.length ? esc(y.ji.join(' · ')) : '—') + '</span></div>';
      html += '</div><div class="gd-src">' + (y.lunar ? '农历' + esc(y.lunar) + (y.day ? ' · ' + esc(y.day) + '日' : '') : '') + ' · 未推算</div>';
      $('gdBody').innerHTML = html;
      ft.textContent = '未推算 · 等待今日指南';
      return;
    }
    var stale = g.date !== TODAY;
    var html = '<div class="gd-hex">' +
      '<div><span>本 卦</span><b>' + esc(g.hexagram.primary) + '</b></div>' +
      '<div><span>之 卦</span><b>' + esc(g.hexagram.changed) + '</b></div>' +
      '<div><span>判 · 动 爻</span><b>' + esc(g.grade) + ' ' + esc(g.score) + ' · ' + esc(g.hexagram.moving) + '</b></div></div>';
    html += '<p class="gd-brief">' + esc(g.summary) + '</p>';

    if (g.almanac){
      var am = g.almanac;
      html += '<div class="gd-sub">农 历 宜 忌</div><div class="gd-am-yiji">';
      html += '<div><span class="b-yi">宜</span><span>' + (am.yi && am.yi.length ? esc(am.yi.join(' · ')) : '—') + '</span></div>';
      html += '<div><span class="b-ji">忌</span><span>' + (am.ji && am.ji.length ? esc(am.ji.join(' · ')) : '—') + '</span></div></div>';
      var top = [['五行', am.wuxing], ['冲煞', am.chong], ['值神', am.zhishen]];
      var rest = [['建除十二神', am.jianchu], ['吉神宜趋', (am.jishen || []).join(' · ')], ['胎神', am.taishen], ['凶神宜忌', (am.xiongsha || []).join(' · ')], ['二十八星宿', am.ershiba], ['彭祖百忌', am.pengzu]];
      function amItem(x){ return x[1] ? '<div class="gd-am-item"><div class="k">' + esc(x[0]) + '</div><div class="v">' + esc(x[1]) + '</div></div>' : ''; }
      html += '<div class="gd-am-top">' + top.map(amItem).join('') + '</div>';
      html += '<div class="gd-am-grid">' + rest.map(amItem).join('') + '</div>';
      if (am.hours && am.hours.length){
        html += '<div class="gd-sub">十 二 时 辰</div><div class="gd-am-hours">';
        am.hours.forEach(function(h){
          html += '<div class="gd-am-hour"><b>' + esc((h.stem || h.branch) + '时') + '</b><span class="j ' + (h.luck === '吉' ? 'good' : 'bad') + '">' + esc(h.luck || '') + '</span></div>';
        });
        html += '</div>';
      }
    }

    var todos = guideTodos(g);
    if (todos.length){
      html += '<div class="gd-sub">' + (stale ? '上一期可做' : '今日可做') + '</div><div class="gd-todo">';
      todos.forEach(function(row){ html += '<div><b>' + esc(row.k || row[0]) + '</b><span>' + esc(row.v || row[1]) + '</span></div>'; });
      html += '</div>';
    }

    html += '<div class="gd-sub">五 维</div><table class="gd-five"><thead><tr><th>维</th><th>判</th><th>行动建议</th></tr></thead><tbody>';
    for (var i = 0; i < g.five.length; i++){
      var f = g.five[i], st = f.state < 0 ? '逆' : f.state > 0 ? '正' : '平';
      var cls = f.state < 0 ? 'neg' : f.state > 0 ? 'pos' : 'mid';
      html += '<tr><td><b>' + esc(f.key) + '</b></td><td class="' + cls + '"><b>' + st + '</b></td><td>' + esc(f.note) + '</td></tr>';
    }
    html += '</tbody></table>';
    html += '<div class="gd-sub">时 辰</div><div class="gd-hours">';
    for (var h = 0; h < g.hours.length; h++){
      html += '<div class="gd-hour"><b>' + esc(g.hours[h].branch) + '时 ' + esc(g.hours[h].time) + '</b><br>' + esc(g.hours[h].note) + '</div>';
    }
    html += '</div><div class="gd-sub">警 示</div><ul class="gd-warn">';
    for (var w = 0; w < g.warnings.length; w++){
      var txt = g.warnings[w], p = txt.indexOf('：');
      if (p < 0) p = txt.indexOf(':');
      var head = p > 0 ? txt.slice(0, p) : '';
      var body = p > 0 ? txt.slice(p + 1) : txt;
      html += '<li>' + (head ? '<b>' + esc(head) + '</b>：' : '') + esc(body) + '</li>';
    }
    html += '</ul>';
    html += '<div class="gd-one"><b>' + (g.one_source ? '今日卦辞' : (stale ? '上一期行动' : '今日一件')) + '</b>' + esc(g.one_thing) + '</div>';
    if (g.windows && g.windows[0]){
      var w0 = g.windows[0];
      html += '<div class="gd-window"><b>' + esc(w0.branch) + '时 ' + esc(w0.time) + '</b> · ' + esc(w0.note) + '</div>';
    }
    var upd = (g.updated_at || '').slice(0, 16).replace('T', ' ');
    html += '<div class="gd-src">来源：' + esc(g.source) + (upd ? ' · 更新 ' + esc(upd) : '') + '</div>';
    $('gdBody').innerHTML = html;

    hd.querySelector('.big').textContent = (stale ? '上一期指南 · ' : '今日指南 · ') + g.date;
    hd.querySelector('.sub').textContent = g.grade + ' ' + g.score + ' / 10 · ' + g.hexagram.primary + ' → ' + g.hexagram.changed;
    ft.textContent = '来源：' + (g.source || '');
  }

  /* ---------- quote ---------- */
  var qi = 0;
  function renderQuote(){
    var q = QUOTES[qi];
    var raw = '「' + q.text + '」';
    var cut = -1, best = 999, mid = raw.length / 2;
    if (raw.length > 10){
      for (var ci = 3; ci < raw.length - 3; ci++){
        if ('，；。！？'.indexOf(raw.charAt(ci)) >= 0){
          var dist = Math.abs((ci + 1) - mid);
          if (dist < best){ best = dist; cut = ci; }
        }
      }
    }
    var qEl = $('qText');
    if (cut > 0){
      var l1 = raw.slice(0, cut + 1), l2 = raw.slice(cut + 1);
      qEl.innerHTML = '<span class="q-line1">' + esc(l1) + '</span><span class="q-line2">' + esc(l2) + '</span>';
      var need = Math.max(l1.length, l2.length + 3.5);
      var fs = Math.max(28, Math.min(38, Math.floor((qEl.clientWidth || 490) / need)));
      qEl.style.fontSize = fs + 'px';
      qEl.style.lineHeight = (fs * 1.45) + 'px';
    } else if (raw.length > 18){
      var half = Math.floor(raw.length / 2);
      var m1 = raw.slice(0, half), m2 = raw.slice(half);
      qEl.innerHTML = '<span class="q-line1">' + esc(m1) + '</span><span class="q-line2">' + esc(m2) + '</span>';
      var mneed = Math.max(m1.length, m2.length + 3.5);
      var mfs = Math.max(28, Math.min(38, Math.floor((qEl.clientWidth || 490) / mneed)));
      qEl.style.fontSize = mfs + 'px';
      qEl.style.lineHeight = (mfs * 1.45) + 'px';
    } else {
      qEl.textContent = raw;
      qEl.style.fontSize = '';
      qEl.style.lineHeight = '';
    }
    $('qSource').textContent = q.src;
    $('qRef').textContent = q.ref;
    $('qAnalysis').textContent = q.a;
    $('qUsage').textContent = q.u;
  }
  function renderDots(){
    var html = '';
    for (var i = 0; i < QUOTES.length; i++){
      var label = '第 ' + (i + 1) + ' 条';
      html += '<button class="qdot' + (i === qi ? ' on' : '') + '" data-i="' + i + '" title="' + label + '" aria-label="' + label + '" aria-pressed="' + (i === qi) + '"></button>';
    }
    $('qDots').innerHTML = html;
  }

  /* ---------- history ---------- */
  function doneDay(item){ return item.done_at ? item.done_at.slice(0, 10) : (!isApp && item.date ? '2026-' + item.date : ''); }
  function doneMap(){
    var m = {};
    for (var i = 0; i < DONE.length; i++){
      var d = doneDay(DONE[i]);
      if (d) m[d] = (m[d] || 0) + 1;
    }
    return m;
  }
  function renderBars(){
    var m = doneMap(), counts = [], labels = ['一','二','三','四','五','六','日'];
    var monday = offsetDay(NOW, -((NOW.getDay() + 6) % 7));
    var total = 0, streak = 0;
    for (var i = 0; i < 7; i++){
      var c = m[dateKey(offsetDay(monday, i))] || 0;
      counts.push(c); total += c;
    }
    while (m[dateKey(offsetDay(NOW, -streak))]) streak++;
    var max = Math.max.apply(null, counts.concat(1));
    var html = '';
    for (var j = 0; j < 7; j++){
      var h = counts[j] ? counts[j] / max * 58 : 2;
      html += '<div class="barcol' + (dateKey(offsetDay(monday, j)) === TODAY ? ' today' : '') + '"><b>' + counts[j] + '</b><u style="height:' + h + 'px"></u><span>' + labels[j] + '</span></div>';
    }
    $('bars').innerHTML = html;
    var hs = document.querySelector('.hstats');
    if (hs){
      var bs = hs.querySelectorAll('b');
      if (bs.length >= 2){ bs[0].textContent = total; bs[1].textContent = streak; }
    }
  }
  function renderHeat(){
    var m = doneMap(), y = NOW.getFullYear(), month = NOW.getMonth(), days = new Date(y, month + 1, 0).getDate();
    var html = '', total = 0, offset = (new Date(y, month, 1).getDay() + 6) % 7;
    for (var j = 0; j < offset; j++) html += '<span></span>';
    for (var i = 1; i <= days; i++){
      var day = keyOf(y, month + 1, i), c = m[day] || 0;
      total += c;
      var cls = 'hc' + (c === 1 ? ' l1' : c === 2 ? ' l2' : c >= 3 ? ' l3' : '') + (day === TODAY ? ' today' : '');
      html += '<div class="' + cls + '" title="' + day + ' · ' + c + ' 件">' + i + '</div>';
    }
    $('heat').innerHTML = html;
    $('historyMonth').textContent = CN_M[month + 1] + '月 · ' + total + ' 件';
  }

  /* ---------- weather ---------- */
  function renderWeatherSpark(w){
    var svg = $('weatherSpark');
    if (!svg) return;
    var vals = (w.hourly || []).map(function(x){ return Number(x.t); }).filter(function(x){ return isFinite(x); });
    if (vals.length < 2){ svg.hidden = true; return; }
    svg.hidden = false;
    var W = 360, H = 64, pad = 6;
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), span = (mx - mn) || 1;
    var pts = vals.map(function(v, i){
      return [pad + i * (W - pad * 2) / (vals.length - 1), H - pad - (v - mn) / span * (H - pad * 2)];
    });
    var line = pts.map(function(p, i){ return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    var last = pts[pts.length - 1], first = pts[0];
    var area = line + ' L ' + last[0].toFixed(1) + ',' + (H - pad) + ' L ' + first[0].toFixed(1) + ',' + (H - pad) + ' Z';
    var peak = pts[vals.indexOf(mx)];
    svg.innerHTML = '<defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#A87C45" stop-opacity=".20"/>' +
      '<stop offset="1" stop-color="#A87C45" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#wg)"/>' +
      '<path d="' + line + '" fill="none" stroke="#A87C45" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="' + peak[0].toFixed(1) + '" cy="' + peak[1].toFixed(1) + '" r="3" fill="#A87C45"/>';
  }

  function applyWeather(w){
    var sky = document.querySelector('.sky');
    w = w || {};
    $('weatherPlace').textContent = w.place || '';
    sky.querySelector('.temp').textContent = w.temp == null ? '—' : w.temp + '°';
    sky.querySelector('.cond').textContent = w.cond || '等待天气更新';
    sky.querySelector('.smeta').textContent = w.aqi == null ? '' : 'AQI ' + w.aqi + ' · ' + (w.aqi_text || '');
    sky.querySelector('.sunrow').textContent = [w.sunrise && '日出 ' + w.sunrise, w.sunset && '日落 ' + w.sunset].filter(Boolean).join(' · ');
    var fc = sky.querySelector('.fc'), daily = (w.daily || []).slice(0, 5);
    fc.hidden = !daily.length;
    fc.innerHTML = daily.map(function(d){
      return '<div><span>' + esc(d.d) + '</span><b>' + (d.hi == null ? '—' : esc(d.hi) + '°') + '</b><em>' +
        (d.lo == null ? '—' : esc(d.lo) + '°') + ' ' + esc(d.cond) + '</em></div>';
    }).join('');
    renderWeatherSpark(w);
  }

  function renderGithub(){
    var list = $('githubList');
    var items = GITHUB && Array.isArray(GITHUB.items) ? GITHUB.items : [];
    var fetched = GITHUB && GITHUB.fetched_at ? GITHUB.fetched_at.slice(0, 10) : '';
    var live = dateKey(NOW);
    var current = fetched === live && GITHUB.guide_date === live && TODAY_DATA && TODAY_DATA.date === live;
    $('githubDate').textContent = items.length && fetched ? (current ? '' : '上次更新 · ') + fetched.slice(5) : '';
    list.innerHTML = '';
    items.slice(0, 2).forEach(function(item){
      if (!item || !/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(item.name)) return;
      var row = document.createElement('a');
      row.className = 'gh-row';
      row.href = 'https://github.com/' + item.name;
      row.target = '_blank';
      row.rel = 'noopener';
      row.title = item.description || item.name;
      var stars = typeof item.stars_today === 'number' ? '+' + item.stars_today.toLocaleString() + ' ★' : '';
      row.innerHTML = '<span><span class="muted">' + esc(item.category) + '</span><span class="gh-name">' + esc(item.name) +
        '</span><span class="gh-summary">' + esc(item.summary) + '</span></span><span class="gh-end">↗' +
        (stars ? '<span title="榜单当日新增 Stars" class="muted">' + esc(stars) + '</span>' : '') + '</span>';
      list.appendChild(row);
    });
    if (!list.children.length) list.innerHTML = '<p class="gh-empty">等待首次同步</p>';
  }

  /* ---------- news ---------- */
  var newsCat = 'all';
  function renderNewsBar(){
    var pick = NEWS[0];
    $('newsBarTitle').textContent = pick.t;
    $('newsBarSrc').textContent = pick.s + ' · ' + ago(pick.p);
  }
  function renderNewsSheet(){
    var list = NEWS.filter(function(n){ return newsCat === 'all' || n.cat === newsCat; });
    var html = '';
    for (var i = 0; i < list.length; i++){
      var n = list[i];
      html += '<div class="nrow2' + (n.read ? ' read' : '') + '" data-u="' + n.u + '">' +
        '<span class="idx">' + pad(i+1) + '</span><div class="body">' +
        '<div class="tt">' + n.t + (n.read ? '<span class="readtag">已读</span>' : '') + '</div>' +
        '<div class="meta">' + n.s + ' · ' + ago(n.p) + ' · ' + (n.cat === 'tech' ? '科技' : n.cat === 'design' ? '设计' : '金融') + '</div>' +
        (n.why ? '<div class="why">' + n.why + '</div>' : '') +
        '</div></div>';
    }
    var el = $('newsList2');
    el.innerHTML = html;
    el.classList.remove('nfade'); void el.offsetWidth; el.classList.add('nfade');
    var c = NEWS.filter(function(n){ return n.read; }).length;
    $('newsFoot').textContent = '今天点开 ' + c + ' 条';
    animateNewsHeight();
  }
  function animateNewsHeight(){
    var s = $('newsSheet'), w = $('wrapNews');
    if (!s || !w.classList.contains('open')) return;
    var start = s.offsetHeight;
    s.style.transition = 'none';
    s.style.height = 'auto';
    var end = s.offsetHeight;
    s.style.height = start + 'px';
    void s.offsetHeight;
    s.style.transition = 'height .26s cubic-bezier(.2,.8,.2,1)';
    s.style.height = Math.min(end, 1300) + 'px';
    setTimeout(function(){ s.style.height = 'auto'; s.style.transition = ''; }, 300);
  }

  /* ---------- sheets ---------- */
  function openWrap(id){ $(id).classList.add('open'); }
  function closeAll(){
    var ws = document.querySelectorAll('.sheet-wrap');
    for (var i = 0; i < ws.length; i++) ws[i].classList.remove('open');
    setFiveOpen(false);
  }

  var viewY = NOW.getFullYear(), viewM = NOW.getMonth() + 1, selKey = TODAY;
  function renderCalSheet(){
    var first = new Date(viewY, viewM - 1, 1);
    var offset = (first.getDay() + 6) % 7;
    var daysIn = new Date(viewY, viewM, 0).getDate();
    var html = '', days = 0, slots = 0, hasData = false;
    for (var i = 0; i < 42; i++){
      var d = offsetDay(first, i - offset), inM = i >= offset && i < offset + daysIn;
      var k = dateKey(d), v = CAL[k];
      var cls = 'c2' + (inM ? '' : ' out') + (k === TODAY ? ' today' : '') + (k === selKey ? ' sel' : '');
      if (inM && v){
        hasData = true;
        if (v.s.length){ days++; slots += v.s.length; }
      }
      html += '<button class="' + cls + '" data-k="' + k + '"><span class="d">' + d.getDate() + '</span><span class="l">' +
        (inM && v ? esc(v.l) : '') + '</span><span class="dots">' + (inM ? calendarDots(k) : '') + '</span></button>';
    }
    $('cal2Grid').innerHTML = html;
    $('cal2Month').textContent = CN_M[viewM] + '月';
    $('cal2Year').textContent = viewY;
    $('cal2Stat').textContent = hasData ? '本月 ' + days + ' 天 · ' + slots + ' 时辰' : '本月暂无历法数据';
    renderDay(selKey);
  }
  function renderDay(k){
    var v = CAL[k], d = dateFromKey(k);
    var head = '<div class="dd-h"><b>' + dateLabel(d) + '</b><span>' + WEEK[d.getDay()] +
      (v ? ' · 农历' + esc(v.l) + ' · ' + esc(v.g) + '日' : '') + '</span></div>';
    if (!v){
      $('cal2Detail').innerHTML = head + '<div class="empty-sheet"><div class="e1">暂无历法数据</div></div>';
      return;
    }
    if (!v.s.length){
      var wu = v.aw ? '暗戊日' : (v.mw ? '明戊日' : '');
      $('cal2Detail').innerHTML = head + '<div class="empty-sheet"><div class="e1">' + (wu || '暂无适用时辰') + '</div><div class="e2">' +
        (wu ? '当天不朝。' : '这一天没有同时满足条件的时辰。') + '</div></div>';
      return;
    }
    var html = head;
    for (var i = 0; i < v.s.length; i++){
      var s = v.s[i];
      html += '<div class="hour' + (s.p ? ' pri' : '') + '"><div class="h-top"><span class="b">' + esc(s.b) + '</span><span class="t">' +
        esc(s.t) + '</span><span class="gz">' + esc(s.g) + '时</span><span class="k' + (s.k === '凶' ? ' bad' : '') + '">' + esc(s.k) + '</span>' +
        (s.p ? '<span class="star">★ 宜祈福 + 求财</span>' : '') + '</div>' +
        '<div class="h-row"><em>宜</em><span>' + esc(s.y) + '</span></div><div class="h-row ji"><em>忌</em><span>' + esc(s.j) + '</span></div></div>';
    }
    $('cal2Detail').innerHTML = html;
  }

  function selectDay(key){
    selKey = key;
    var d = dateFromKey(key);
    viewY = d.getFullYear(); viewM = d.getMonth() + 1;
    renderCalSheet();
  }
  function openTodayCalendar(){ selectDay(TODAY); openWrap('wrapCal'); }
  function selectMonth(offset){
    var d = new Date(viewY, viewM - 1 + offset, 1);
    selectDay(dateKey(d));
  }

  $('threeDays').addEventListener('click', function(e){
    var b = e.target.closest('.wd'); if (!b) return;
    selectDay(b.getAttribute('data-k')); openWrap('wrapCal');
  });
  $('openCal').addEventListener('click', openTodayCalendar);
  $('cal2Prev').addEventListener('click', function(){ selectMonth(-1); });
  $('cal2Next').addEventListener('click', function(){ selectMonth(1); });
  $('cal2This').addEventListener('click', function(){ selectDay(TODAY); });
  $('cal2Grid').addEventListener('click', function(e){
    var b = e.target.closest('.c2');
    if (b) selectDay(b.getAttribute('data-k'));
  });

  $('memoList').addEventListener('click', function(e){
    var row = e.target.closest('.mi'); if (!row) return;
    if (e.target.closest('.check-target')) markDone(+row.getAttribute('data-i'));
  });
  $('doneBtn').addEventListener('click', function(){ renderMemoSheet('done'); openWrap('wrapMemo'); });
  $('memoExpand').addEventListener('click', function(){ renderMemoSheet('all'); openWrap('wrapMemo'); });
  $('memoAdd').addEventListener('click', function(e){
    if (!e.target.closest('button')) return;
    var box = this;
    box.innerHTML = '<input id="newMemo" aria-label="新备忘" placeholder="写一条，Enter 保存" autocomplete="off">';
    var inp = $('newMemo'); inp.focus();
    inp.addEventListener('keydown', function(ev){
      if (ev.key === 'Enter' && !ev.isComposing && ev.keyCode !== 229 && inp.value.trim()){
        var value = inp.value.trim();
        if (isApp) panelCall('PANEL:memo-add:' + encodeURIComponent(value));
        else { ACTIVE.unshift({t:value, tag:'新'}); renderMemo(); renderMemoSheet(memoMode); }
        inp.value = '';
      }
    });
    inp.addEventListener('blur', function(){ box.innerHTML = '<button type="button">＋ 添加一条</button>'; });
  });
  $('memoAll').addEventListener('click', function(e){
    var row = e.target.closest('.ms-item'); if (!row) return;
    if (row.classList.contains('done')){
      var id = row.getAttribute('data-id');
      if (id) { panelCall('PANEL:memo-undone:' + encodeURIComponent(id)); toast('已撤回，回到待办'); }
      return;
    }
    var i = +row.getAttribute('data-i');
    markDone(i);
  });

  var fiveBtn = $('fiveBtn'), fivePop = $('fivePop');
  function setFiveOpen(open){
    fivePop.classList.toggle('open', open);
    fiveBtn.setAttribute('aria-expanded', String(open));
  }
  fiveBtn.addEventListener('click', function(e){
    e.stopPropagation();
    setFiveOpen(!fivePop.classList.contains('open'));
  });
  document.addEventListener('click', function(e){
    if (!e.target.closest('.yiji-wrap')) setFiveOpen(false);
  });

  var toastTimer = null;
  function toast(msg){
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove('on'); }, 1600);
  }
  $('refreshGuide').addEventListener('click', function(){ panelCall('PANEL:refresh'); toast('已请求重新读取面板缓存'); });
  $('refreshNews').addEventListener('click', function(){ panelCall('PANEL:refresh'); renderNewsSheet(); toast('已重新读取 news.json'); });

  $('openGuide').addEventListener('click', function(){ renderGuideSheet(); openWrap('wrapGuide'); });
  $('openNews').addEventListener('click', function(){ renderNewsSheet(); openWrap('wrapNews'); });
  $('btnCal').addEventListener('click', openTodayCalendar);
  $('btnNews').addEventListener('click', function(){ renderNewsSheet(); openWrap('wrapNews'); });

  document.querySelectorAll('[data-close]').forEach(function(el){ el.addEventListener('click', closeAll); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeAll(); });

  $('newsTabs').addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    newsCat = b.getAttribute('data-cat');
    var bs = $('newsTabs').querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].className = (bs[i] === b ? 'on' : '');
    renderNewsSheet();
  });
  $('newsList2').addEventListener('click', function(e){
    var row = e.target.closest('.nrow2'); if (!row) return;
    var u = row.getAttribute('data-u');
    var n = null;
    for (var i = 0; i < NEWS.length; i++){
      if (NEWS[i].u === u){ n = NEWS[i]; n.read = true; break; }
    }
    if (n) panelCall('PANEL:news-click:' + encodeURIComponent(JSON.stringify({u:n.u,t:n.t,s:n.s,cat:n.cat})));
    renderNewsSheet();
  });

  function panelCall(msg){
    try { console.log(msg); } catch(e){}
    if (msg === 'PANEL:toggle' && window.pywebview && window.pywebview.api && window.pywebview.api.toggle_fullscreen){
      window.pywebview.api.toggle_fullscreen();
    }
  }

  document.querySelector('.github').addEventListener('click', function(e){
    var link = e.target.closest('a');
    if (isApp && link){
      e.preventDefault();
      panelCall('PANEL:github-link:' + encodeURIComponent(link.href));
    }
  });

  var topEl = document.querySelector('.top');
  if (topEl) topEl.addEventListener('dblclick', function(e){
    if (e.target.closest('button')) return;
    panelCall('PANEL:toggle');
  });

  var cd = $('collapseDot');
  if (cd) cd.addEventListener('click', function(e){
    e.stopPropagation();
    panelCall('PANEL:collapse');
  });

  $('qDots').addEventListener('click', function(e){
    var b = e.target.closest('.qdot'); if (!b) return;
    var selected = this.querySelector('.on');
    selected.classList.remove('on'); selected.setAttribute('aria-pressed', 'false');
    b.classList.add('on'); b.setAttribute('aria-pressed', 'true');
    qi = +b.getAttribute('data-i'); renderQuote();
  });

  function fit(){
    document.body.classList.remove('actual');
    var s = Math.min((window.innerWidth - 56) / 1080, (window.innerHeight - 96) / 1920, 1);
    $('wrap').style.transform = 'translate(-50%,-50%) scale(' + s + ')';
    $('btnFit').classList.add('on'); $('btnActual').classList.remove('on');
  }
  function fitApp(){
    if (!window.innerWidth || !window.innerHeight) return;
    var work = window.innerHeight / window.innerWidth < (1872 + 1920) / (2 * 1080);
    document.body.classList.toggle('workspace', work);
    var height = work ? 1872 : 1920;
    var s = Math.min(window.innerWidth / 1080, window.innerHeight / height);
    $('wrap').style.transform = 'translate(-50%,-50%) scale(' + s + ')';
  }
  $('btnFit').addEventListener('click', function(){ document.body.classList.remove('canvas'); fit(); });
  $('btnActual').addEventListener('click', function(){
    document.body.classList.add('actual'); $('wrap').style.transform = 'none';
    this.classList.add('on'); $('btnFit').classList.remove('on');
  });
  $('btnAnno').addEventListener('click', function(){ document.body.classList.toggle('annot'); this.classList.toggle('on'); });
  window.addEventListener('resize', function(){
    if (document.body.classList.contains('app')) fitApp();
    else if (!document.body.classList.contains('canvas') && !document.body.classList.contains('actual')) fit();
  });

  window.animatePanel = function(expanding){
    var art = $('art');
    art.classList.remove('panel-enter', 'panel-leave');
    art.classList.add(expanding ? 'panel-enter' : 'panel-leave');
  };

  function updateClock(){
    NOW = new Date();
    $('hhmm').textContent = pad(NOW.getHours()) + ':' + pad(NOW.getMinutes());
    $('ss').textContent = pad(NOW.getSeconds());
    renderDirs();
    syncClassicClock();
    var key = dateKey(NOW);
    if (key !== TODAY){
      TODAY = key;
      updateDates();
      renderGuide();
      renderGithub();
      renderMemoSheet(memoMode);
      renderNewsBar();
      if ($('wrapCal').classList.contains('open')) renderCalSheet();
    }
  }

  function updateDates(){
    $('dateline').textContent = WEEK[NOW.getDay()] + ' · ' + TODAY.replace(/-/g, '.');
    $('calM').textContent = CN_M[NOW.getMonth() + 1] + '月';
    renderThreeDays();
  }

  function renderLunar(g){
    var v = CAL[TODAY];
    var live = g && g.date === TODAY ? g : {};
    var lunar = v ? v.l : live.lunar;
    var gz = live.ganzhi || '';
    var fromGuide = gz.match(/([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])日/);
    var day = v ? v.g : (fromGuide ? fromGuide[1] : '');
    var extras = gz.match(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥][年月]/g) || [];
    var note = v && (v.mw ? '明戊日' : (v.aw ? '暗戊日' : ''));
    if (note || live.solar_term) extras.push(note || live.solar_term);
    $('lunarDay').textContent = lunar ? '农历' + lunar + (day ? ' · ' + day + '日' : '') : '暂无当天农历数据';
    $('lunarMeta').textContent = extras.join(' · ');
  }

  function lunarYiji(){
    var v = CAL[TODAY], yi = [], ji = [];
    function add(arr, s){
      (s || '').split(/[\s、，,]+/).forEach(function(x){
        if (x && arr.indexOf(x) < 0) arr.push(x);
      });
    }
    if (v && v.s) v.s.forEach(function(s){ add(yi, s.y); add(ji, s.j); });
    return { yi: yi.slice(0, 12), ji: ji.slice(0, 12), lunar: v ? v.l : '', day: v ? v.g : '' };
  }

  function renderPending(){
    var card = $('guideCard'), y = lunarYiji();
    card.dataset.guideState = 'pending';
    $('guideContent').hidden = true;
    $('guidePending').hidden = false;
    $('gDate').textContent = TODAY.replace(/-/g, '.') + ' · 待出稿';
    $('gpYi').textContent = y.yi.length ? y.yi.join(' · ') : '今日不朝';
    $('gpJi').textContent = y.ji.length ? y.ji.join(' · ') : '—';
    $('gpNote').textContent = '指南出稿后自动更新。';
  }

  var DIR_RANGE = {子:'23:00–00:59',丑:'01:00–02:59',寅:'03:00–04:59',卯:'05:00–06:59',辰:'07:00–08:59',巳:'09:00–10:59',午:'11:00–12:59',未:'13:00–14:59',申:'15:00–16:59',酉:'17:00–18:59',戌:'19:00–20:59',亥:'21:00–22:59'};
  var lastDirBranch = '';
  function currentBranch(d){
    var h = d.getHours();
    if (h === 23 || h === 0) return '子';
    if (h <= 2) return '丑'; if (h <= 4) return '寅'; if (h <= 6) return '卯';
    if (h <= 8) return '辰'; if (h <= 10) return '巳'; if (h <= 12) return '午';
    if (h <= 14) return '未'; if (h <= 16) return '申'; if (h <= 18) return '酉';
    if (h <= 20) return '戌'; return '亥';
  }
  function renderDirs(){
    var g = TODAY_DATA, box = $('gDirs');
    if (!g || !g.almanac || !Array.isArray(g.almanac.hours)){ box.hidden = true; return; }
    var b = currentBranch(NOW), row = null;
    for (var i = 0; i < g.almanac.hours.length; i++){ if (g.almanac.hours[i].branch === b){ row = g.almanac.hours[i]; break; } }
    if (!row){ box.hidden = true; return; }
    if (lastDirBranch === b && !box.hidden) return;
    lastDirBranch = b;
    box.hidden = false;
    $('dirBranch').textContent = b + '时';
    $('dirTime').textContent = DIR_RANGE[b] || row.time || '';
    $('dirCai').textContent = row.cai || '—';
    $('dirXi').textContent = row.xi || '—';
    $('dirFu').textContent = row.fu || '—';
  }
  function classicSlotIndex(){
    var m = NOW.getHours() * 60 + NOW.getMinutes();
    if (m < 360) return QUOTES.length - 1;
    var slot = Math.floor((m - 360) / 30);
    return Math.min(slot, QUOTES.length - 1);
  }
  var classicSlot = -1;
  function syncClassicClock(){
    if (!QUOTES.length) return;
    var s = classicSlotIndex();
    if (s === classicSlot) return;
    classicSlot = s; qi = s;
    if (typeof renderQuote === 'function'){ renderQuote(); renderDots(); }
  }
  function renderGuide(){
    var g = TODAY_DATA, card = $('guideCard');
    renderLunar(g);
    if (!g || g.date !== TODAY){
      renderPending();
      return;
    }
    $('guidePending').hidden = true;
    $('guideContent').hidden = false;
    var stale = g.date !== TODAY;
    card.dataset.guideState = stale ? 'stale' : 'current';
    $('gDate').textContent = stale ? '上一期 · ' + g.date + ' · 待更新' : '本期指南 · ' + g.date;
    card.querySelector('.grade').textContent = g.grade;
    $('gScore').textContent = g.score;
    var hex = card.querySelectorAll('.hex b');
    hex[0].textContent = g.hexagram.primary;
    hex[1].textContent = g.hexagram.changed;
    card.querySelector('.hex em').textContent = g.hexagram.moving ? g.hexagram.moving + '动' : '';
    card.querySelector('.hex .n').textContent = g.warnings.slice(0, 3).map(function(w){ return w.split(/[：:]/)[0]; }).join(' · ');
    $('gYi').textContent = (g.yi || []).join(' · ') || '—';
    $('gJi').textContent = (g.ji || []).join(' · ') || '—';
    $('oneText').textContent = g.one_thing || '—';
    $('oneSource').textContent = g.one_source || '';
    $('oneSource').hidden = !g.one_source;
    $('oneNote').textContent = g.one_note || '';
    $('oneNote').hidden = !g.one_note;
    var todos = guideTodos(g).slice(0, 8);
    $('gTodo').hidden = !todos.length;
    $('todoLabel').textContent = stale ? '上一期可做' : '今日可做';
    function todoHtml(arr){
      return arr.map(function(row){
        var k = esc(row.k || row[0]), v = esc(row.v || row[1]);
        return '<div class="todo-row"><b>' + k + '</b><span title="' + v + '">' + v + '</span></div>';
      }).join('');
    }
    $('todoLeft').innerHTML = todoHtml(todos.slice(0, 4));
    $('todoRight').innerHTML = todoHtml(todos.slice(4, 8));
    var neg = 0, mid = 0, pos = 0;
    var rows = g.five.map(function(f){
      if (f.state < 0) neg++; else if (f.state > 0) pos++; else mid++;
      var cls = f.state < 0 ? 'neg' : (f.state > 0 ? 'pos' : 'mid');
      return '<div class="frow"><span class="k">' + esc(f.key) + '</span><span class="note">' + esc(f.note) +
        '</span><span class="v ' + cls + '">' + (cls === 'neg' ? '逆' : (cls === 'pos' ? '正' : '平')) + '</span></div>';
    }).join('');
    $('fiveBtn').hidden = !rows;
    $('fiveBtn').textContent = '五维 ' + neg + '逆' + mid + '平' + (pos ? pos + '正' : '') + ' ▾';
    $('fivePop').innerHTML = '<div class="fp-h">五维 <span>P ' + (pos - neg) + '</span></div>' + rows;
    var windowRow = (g.windows || [])[0], wbadge = card.querySelector('.wbadge');
    wbadge.hidden = !windowRow;
    if (windowRow){
      wbadge.innerHTML = '<b>' + esc(windowRow.branch) + '时 ' + esc(windowRow.time) + '</b>' + (windowRow.note ? ' · ' + esc(windowRow.note) : '');
    }
    lastDirBranch = '';
    renderDirs();
  }

  window.applyPanelData = function(d){
    if (!d) return;
    var g = d.today;
    TODAY_DATA = g && /^\d{4}-\d\d-\d\d$/.test(g.date) && g.hexagram ? g : null;
    if (TODAY_DATA){
      ['five', 'hours', 'warnings'].forEach(function(field){
        if (!Array.isArray(TODAY_DATA[field])) TODAY_DATA[field] = [];
      });
    }
    renderGuide();
    renderGuideSheet();
    GITHUB = d.github || null;
    renderGithub();
    if (d.memo){
      ACTIVE = (d.memo.active || []).map(function(x){
        return {id:x.id, t:x.text || x.t || '', tag:x.tag || ''};
      });
      DONE = (d.memo.done || []).map(function(x){
        return {id:x.id, t:x.text || x.t || '', date:x.date || '', time:x.time || '', done_at:x.done_at || ''};
      });
      renderMemo(); renderMemoSheet(memoMode);
    }
    if (d.quotes && d.quotes.length){
      QUOTES = d.quotes; qi = Math.min(qi, QUOTES.length - 1); renderQuote(); renderDots();
    }
    syncClassicClock();
    if (d.news && d.news.length){
      NEWS = d.news; renderNewsBar(); renderNewsSheet();
    }
    applyWeather(d.weather);
  };

  if (isApp){
    document.body.classList.add('app');
    fitApp();
    setInterval(updateClock, 1000);
  } else {
    if (params.get('workspace') === '1') document.body.classList.add('workspace');
    if (params.get('canvas') === '1') document.body.classList.add('canvas');
    else fit();
    TODAY_DATA = FALLBACK_TODAY;
  }

  if (params.get('annot') === '1'){ document.body.classList.add('annot'); $('btnAnno').classList.add('on'); }
  if (params.get('five') === '1') setFiveOpen(true);
  if (params.get('cat')){
    newsCat = params.get('cat');
    var tbs = document.querySelectorAll('#newsTabs button');
    for (var ti = 0; ti < tbs.length; ti++) tbs[ti].className = (tbs[ti].getAttribute('data-cat') === newsCat ? 'on' : '');
  }

  $('hhmm').textContent = pad(NOW.getHours()) + ':' + pad(NOW.getMinutes());
  $('ss').textContent = pad(NOW.getSeconds());
  updateDates(); renderMemo(); renderGuide(); renderGuideSheet();
  qi = classicSlotIndex(); classicSlot = qi;
  renderQuote(); renderDots();
  renderGithub(); renderNewsBar(); renderMemoSheet(); renderNewsSheet(); renderCalSheet();

  var sh = params.get('sheet');
  if (sh === 'cal') openWrap('wrapCal');
  if (sh === 'guide') openWrap('wrapGuide');
  if (sh === 'memo') openWrap('wrapMemo');
  if (sh === 'done'){ renderMemoSheet('done'); openWrap('wrapMemo'); }
  if (sh === 'news') openWrap('wrapNews');
})();
