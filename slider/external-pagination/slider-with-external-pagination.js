$(document).ready(function () {
// MaisonDelux • Brand66 • MoveSliderIntoHeaderAfterStories • PROD v1.1
// зачем: слайдер создаётся движком/твоим кодом в .container, но нужен внутри .header сразу после сториз
// важно: не переинициализируем Swiper, не ломаем Swiper и SweetAlert2 — только перестановка DOM
// - v1.1 Добавлено Slider -> Nav/Gender Commands
// - v2 Добавлено данные берутся из конфиг файла CONFIG_URL: '/config/slider.txt'
    
(function mdxMoveSliderIntoHeaderAfterStoriesProd(){
  const MAX_WAIT = 8000; // зачем: не ждать бесконечно
  const STEP_MS = 80;    // зачем: редко опрашиваем, без спама и нагрузки
  const start = Date.now();

  function q(sel, root){ return (root || document).querySelector(sel); }

  function findHeader(){
    return q('.shop .container .header') || q('.header');
  }

  function findStories(header){
    return q('#storiesdivly', header) || document.getElementById('storiesdivly');
  }

  function findSlider(header){
    const container = q('.shop .container') || q('.container');
    if (!container) return null;

    // 1) чаще всего слайдер стоит сразу после header (как у тебя на скрине)
    const next = header && header.nextElementSibling;
    if (next && next.classList && (next.classList.contains('swiper-container') || next.classList.contains('swiper'))) {
      return next;
    }

    // 2) запасной вариант — ищем любой swiper в container, но не внутри header
    const c1 = q('.swiper-container', container);
    if (c1 && !(header && header.contains(c1))) return c1;

    const c2 = q('.swiper', container);
    if (c2 && !(header && header.contains(c2))) return c2;

    return null;
  }

  function tick(){
    const header = findHeader();
    if (!header) return retry();

    const stories = findStories(header);
    if (!stories) return retry();

    const slider = findSlider(header);
    if (!slider) return retry();

    // Уже правильно стоит — ничего не делаем
    const okPlace = header.contains(slider) && (stories.nextElementSibling === slider);
    if (okPlace) return;

    // Переносим внутрь header сразу после сториз
    stories.insertAdjacentElement('afterend', slider);
  }

  function retry(){
    if (Date.now() - start > MAX_WAIT) return; // зачем: тихий выход
    setTimeout(tick, STEP_MS);
  }

  tick();
})();

  // === BRAND66 • Показывать слайдер только на главной ===
  (function brand66HomeGate(){
    // 1) Явные признаки не-главной: товар/корзина/кастом/параметры
    const u = new URL(location.href);
    const path = u.pathname.replace(/\/+$/, '');  // без завершающего /
    const qs   = u.search;

    const notHomeByPath = /(product|prod|basket|cart|checkout|order|custom_page)/i.test(path);
    const notHomeByQS   = /[?&](cat|prodid|page|a|id)=/i.test(qs);

    // 2) Признаки главной (подстрой под свой движок, оставляю несколько вариантов)
    const looksLikeHomePath =
      path === '' || path === '/' ||
      /\/telegram_shop$/i.test(path) ||
      /\/shop\/telegram_shop$/i.test(path);

    // 3) Маркер главной по DOM: есть «пилюли»/хедер категорий, но нет корзины/карточки товара
    const hasChips = !!document.querySelector('.chips-menu, #chips_menu, .chips-categories__header');
    const noCartOrProduct = !document.querySelector('#basket, .product, .order, .checkout');

    // 4) Решение
    const IS_HOME = (!notHomeByPath && !notHomeByQS) && (looksLikeHomePath || (hasChips && noCartOrProduct));

    // — опциональная диагностика (можно удалить):
    window.DEBUG_BRAND66 && console.log('[BRAND66] isHome:', {
      path, qs, notHomeByPath, notHomeByQS, looksLikeHomePath, hasChips, noCartOrProduct, IS_HOME
    });

    if (!IS_HOME) {
      // Не главная — ничего не создаём и выходим из ready-блока
      return; // <— ВАЖНО: останавливаем дальнейший код слайдера
    }
  })();


// --------- 1) ДАННЫЕ СЛАЙДОВ ----------

// =========================================================
// MaisonDelux • Brand66 • Slider External Config • PROD v1.2
// Зачем: управлять слайдами и настройками через /config/slider.txt (без правки JS)
// Важно:
// - Если конфиг не загрузился/битый → используем дефолты из скрипта (Variant A)
// - При проблеме конфига логируем ОДИН [ERROR] даже при режиме тишины
// - Остальные логи зависят от debug
// =========================================================

var __BRAND66_SLIDER_CFG__ = {
  debug: false,                 // debug-логи (по умолчанию ВЫКЛ)
  CONFIG_URL: '/config/slider-txt-v2-config.txt',

  // Дефолты (используются, если параметра нет в slider.txt)
  DEFAULT_LOADING: 'lazy',      // lazy | eager | auto(=без атрибута)
  DEFAULT_AUTOPLAY: true,
  DEFAULT_DELAY_MS: 7000,
  DEFAULT_LOOP: true,
  DEFAULT_DISABLE_ON_INTERACTION: false,
  DEFAULT_PAUSE_ON_HOVER: true,
  
  // =========================================================
  // НОВЫЕ НАСТРОЙКИ ПАГИНАЦИИ
  // =========================================================
  DEFAULT_PAGINATION_MODE: 'inside',      // inside | outside (внутри или снаружи слайдера)
  DEFAULT_PAGINATION_POSITION: 'center'   // left | center | right (горизонтальное выравнивание)
};

var __brand66CriticalLogged__ = false;

// ===== LOGS (твой стандарт) =====
function b66LogInfo(msg) {
  if (!__BRAND66_SLIDER_CFG__.debug) return;
  console.log('%c[INFO] ' + msg, 'color:#007bff;');
}
function b66LogSuccess(msg) {
  if (!__BRAND66_SLIDER_CFG__.debug) return;
  console.log('%c[SUCCESS] ' + msg, 'color:#28a745;');
}
function b66LogWarn(msg) {
  if (!__BRAND66_SLIDER_CFG__.debug) return;
  console.log('%c[WARNING] ' + msg, 'color:#ffc107;');
}
// КРИТИЧЕСКИЙ [ERROR] — печатаем ВСЕГДА (даже при debug=false)
function b66LogCriticalErr(msg) {
  if (__brand66CriticalLogged__) return;
  __brand66CriticalLogged__ = true;
  console.log('%c[ERROR] ' + msg, 'color:#dc3545;font-weight:bold;');
}

// ===== Default slides (fallback) =====
// (это то, что у тебя было в slideData, только без <img> — картинку соберём позже общим loading)
var __brand66DefaultSlides__ = [
  { imageSrc: '/images/slider/slider_1.jpg', category: '19', gender: 'female' },
  { imageSrc: '/images/slider/slider_2.jpg', category: '19', gender: 'male' },
  { imageSrc: '/images/slider/slider_3.jpg' }
];

// ===== Helpers: normalize & parsing =====
function b66NormText(text) {
  var t = String(text || '');
  t = t.replace(/^\uFEFF/, '');
  t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  t = t.replace(/\u00A0/g, ' ');
  t = t.replace(/[｜¦]/g, '|');
  return t;
}

// Inline-коммент в конце строки через "| #"
function b66StripInlinePipeComment(line) {
  return String(line || '').replace(/\|\s*#.*$/g, '').trim();
}

// Для настроек разрешаем "Loading: lazy   # comment"
function b66StripHashTailForSettings(val) {
  var v = String(val || '');
  v = b66StripInlinePipeComment(v);
  v = v.replace(/\s+#.*$/g, ''); // безопасно для настроек
  return v.trim();
}

// Для значений слайдов тоже можно резать "# ...", но аккуратно:
// - для "Ссылка" НЕ режем по "#", чтобы не ломать URL с якорем
function b66StripHashTailForSlide(keyLower, val) {
  var v = String(val || '');
  v = b66StripInlinePipeComment(v);
  if (keyLower === 'ссылка' || keyLower === 'link' || keyLower === 'url') return v.trim();
  v = v.replace(/\s+#.*$/g, '');
  return v.trim();
}

function b66ParseBool(val, def) {
  var s = String(val || '').trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes' || s === 'да') return true;
  if (s === 'false' || s === '0' || s === 'no' || s === 'нет') return false;
  return def;
}

function b66ParseInt(val, def) {
  var n = parseInt(String(val || '').trim(), 10);
  return isFinite(n) ? n : def;
}

function b66IsSlideTitle(line) {
  return /^слайд\s+\d+/i.test(String(line || '').trim());
}

function b66ParseKeyVal(line) {
  var m = String(line || '').match(/^([^:]+):\s*(.*)$/);
  if (!m) return null;
  return { key: m[1].trim(), val: m[2].trim() };
}

// ===== Parse slider.txt in your simple format =====
function b66ParseSliderTxtSimple(rawText) {
  var text = b66NormText(rawText);
  var lines = text.split('\n');

  var settings = {};
  var slides = [];
  var cur = null;

  function pushCur() {
    if (!cur) return;
    slides.push(cur);
    cur = null;
  }

  for (var i = 0; i < lines.length; i++) {
    var line = (lines[i] || '').trim();
    if (!line) continue;
    if (line.startsWith('#') || line.startsWith('//')) continue;

    line = b66StripInlinePipeComment(line);
    if (!line) continue;

    if (b66IsSlideTitle(line)) {
      pushCur();
      cur = {
        title: line,
        imageSrc: '',
        gender: '',
        category: '',
        prodid: '',
        page: '',
        link: '',
        clipboardText: ''
      };
      continue;
    }

    var kv = b66ParseKeyVal(line);
    if (!kv) continue;

    var key = kv.key;
    var keyLower = key.trim().toLowerCase();

    if (cur) {
      var vSlide = b66StripHashTailForSlide(keyLower, kv.val);

      if (keyLower === 'картинка' || keyLower === 'image') { cur.imageSrc = vSlide; continue; }
      if (keyLower === 'пол' || keyLower === 'gender') { cur.gender = vSlide.toLowerCase(); continue; }

      // Действия (ровно одно должно быть задано в slider.txt — это описано в шапке файла)
      if (keyLower === 'категория' || keyLower === 'category') { cur.category = vSlide; continue; }
      if (keyLower === 'товар' || keyLower === 'prodid' || keyLower === 'product') { cur.prodid = vSlide; continue; }
      if (keyLower === 'страница' || keyLower === 'page') { cur.page = vSlide; continue; }
      if (keyLower === 'ссылка' || keyLower === 'link' || keyLower === 'url') { cur.link = vSlide; continue; }
      if (keyLower === 'промокод' || keyLower === 'clipboard') { cur.clipboardText = vSlide; continue; }

      continue;
    }

    // Global settings
    settings[key] = b66StripHashTailForSettings(kv.val);
  }

  pushCur();
  return { settings: settings, slides: slides };
}

// ===== Build runtime config (defaults overridden only if present in slider.txt) =====
function b66BuildRuntimeOptions(parsedSettings) {
  var s = parsedSettings || {};

  var loading = (s.Loading || s.loading || __BRAND66_SLIDER_CFG__.DEFAULT_LOADING || 'lazy');
  loading = String(loading || '').trim().toLowerCase();

  var autoplay = __BRAND66_SLIDER_CFG__.DEFAULT_AUTOPLAY;
  if (s.Autoplay !== undefined) autoplay = b66ParseBool(s.Autoplay, autoplay);

  var delayMs = __BRAND66_SLIDER_CFG__.DEFAULT_DELAY_MS;
  if (s.AutoplayDelayMs !== undefined) delayMs = b66ParseInt(s.AutoplayDelayMs, delayMs);

  var loop = __BRAND66_SLIDER_CFG__.DEFAULT_LOOP;
  if (s.Loop !== undefined) loop = b66ParseBool(s.Loop, loop);

  var disableOnInteraction = __BRAND66_SLIDER_CFG__.DEFAULT_DISABLE_ON_INTERACTION;
  if (s.DisableOnInteraction !== undefined) disableOnInteraction = b66ParseBool(s.DisableOnInteraction, disableOnInteraction);

  var pauseOnHover = __BRAND66_SLIDER_CFG__.DEFAULT_PAUSE_ON_HOVER;
  if (s.PauseOnHover !== undefined) pauseOnHover = b66ParseBool(s.PauseOnHover, pauseOnHover);

  // =========================================================
  // НОВЫЕ НАСТРОЙКИ ПАГИНАЦИИ
  // =========================================================
  var paginationMode = __BRAND66_SLIDER_CFG__.DEFAULT_PAGINATION_MODE;
  if (s.PaginationMode !== undefined) {
    var mode = String(s.PaginationMode || '').trim().toLowerCase();
    if (mode === 'inside' || mode === 'outside') {
      paginationMode = mode;
    }
  }

  var paginationPosition = __BRAND66_SLIDER_CFG__.DEFAULT_PAGINATION_POSITION;
  if (s.PaginationPosition !== undefined) {
    var pos = String(s.PaginationPosition || '').trim().toLowerCase();
    if (pos === 'left' || pos === 'center' || pos === 'right') {
      paginationPosition = pos;
    }
  }

  return {
    loading: loading,
    autoplay: autoplay,
    delayMs: delayMs,
    loop: loop,
    disableOnInteraction: disableOnInteraction,
    pauseOnHover: pauseOnHover,
    paginationMode: paginationMode,
    paginationPosition: paginationPosition
  };
}

// ===== Enforce "only one action" safely (if user made a mistake) =====
function b66NormalizeSlideAction(sl) {
  var has = [];
  if (sl.clipboardText) has.push('clipboardText');
  if (sl.category) has.push('category');
  if (sl.prodid) has.push('prodid');
  if (sl.page) has.push('page');
  if (sl.link) has.push('link');

  if (has.length <= 1) return sl;

  // Приоритет как у твоего клика:
  // clipboardText → category → prodid → page → link
  var keep = has.includes('clipboardText') ? 'clipboardText'
          : has.includes('category') ? 'category'
          : has.includes('prodid') ? 'prodid'
          : has.includes('page') ? 'page'
          : 'link';

  // Остальное чистим
  if (keep !== 'clipboardText') sl.clipboardText = '';
  if (keep !== 'category') sl.category = '';
  if (keep !== 'prodid') sl.prodid = '';
  if (keep !== 'page') sl.page = '';
  if (keep !== 'link') sl.link = '';

  b66LogWarn('В slider.txt у одного слайда найдено несколько действий. Оставил только: ' + keep);
  return sl;
}

// ===== Convert parsed slides to your original slideData format =====
function b66BuildSlideDataFromParsed(parsedSlides, runtimeOpts) {
  var loading = runtimeOpts.loading;
  var attrLoading = '';
  if (loading === 'lazy' || loading === 'eager') {
    attrLoading = ' loading="' + loading + '"';
  } else {
    attrLoading = ''; // auto => не ставим атрибут
  }

  var out = [];
  for (var i = 0; i < (parsedSlides || []).length; i++) {
    var s = parsedSlides[i];
    if (!s || !s.imageSrc) continue;

    var item = {
      image: '<img src="' + s.imageSrc + '"' + attrLoading + '>',
      gender: s.gender || ''
    };

    // действия
    item.clipboardText = s.clipboardText || '';
    item.category = s.category || '';
    item.prodid = s.prodid || '';
    item.page = s.page || '';
    item.link = s.link || '';

    b66NormalizeSlideAction(item);
    out.push(item);
  }

  return out;
}

// ===== Load config once (Variant A: fallback to defaults) =====
function b66LoadConfigOnce() {
  return fetch(__BRAND66_SLIDER_CFG__.CONFIG_URL, { cache: 'no-store' })
    .then(function(res){
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function(raw){
      var parsed = b66ParseSliderTxtSimple(raw);

      // Валидация: должны быть слайды с картинкой
      var rt = b66BuildRuntimeOptions(parsed.settings);
      var slideData = b66BuildSlideDataFromParsed(parsed.slides, rt);

      if (!slideData.length) throw new Error('Parsed 0 slides (check slider.txt)');

      b66LogSuccess('slider.txt loaded: slides=' + slideData.length);
      return { runtime: rt, slideData: slideData };
    });
}

// =========================================================
// MaisonDelux • Slider -> Nav/Gender Commands • PROD v1.0
// Зачем: слайдер должен уметь:
// 1) задать пол (male/female) ДО появления UI,
// 2) включить "Каталог" в навбаре,
// 3) только потом делать setCat()
// Важно: это просто события, Swiper/SweetAlert2 не трогаем.
// =========================================================
function mdxCmdSetGender(gender, source){
  try{
    document.dispatchEvent(new CustomEvent('mdx:gender:set', {
      detail: { gender: String(gender || ''), source: source || 'slider' }
    }));
  }catch(_){}
}

function mdxCmdGoCatalog(source){
  try{
    document.dispatchEvent(new CustomEvent('mdx:nav:set', {
      detail: { tab: 'promotions', source: source || 'slider' }
    }));
  }catch(_){}
}

// ===== Start slider (original logic, selectors unchanged) =====
function b66StartSlider(slideData, runtime) {
  // --------- 2) БАЗОВАЯ РАЗМЕТКА SWIPER ----------
  var $slidesContainer = $('<div class="swiper-container"></div>');
  var $wrapper = $('<div class="swiper-wrapper"></div>');
  
  // =========================================================
  // НОВАЯ ЛОГИКА ПАГИНАЦИИ
  // =========================================================
  var $pagination = $('<div class="swiper-pagination"></div>');
  
  // Добавляем data-атрибуты для управления через CSS
  $pagination.attr('data-pagination-mode', runtime.paginationMode);
  $pagination.attr('data-pagination-position', runtime.paginationPosition);
  
  $('.header').after($slidesContainer.append($wrapper));
  
  // Размещаем пагинацию в зависимости от режима
  if (runtime.paginationMode === 'outside') {
    // Пагинация ПОСЛЕ слайдера (снаружи)
    $slidesContainer.after($pagination);
  } else {
    // Пагинация ВНУТРИ слайдера (по умолчанию)
    $slidesContainer.append($pagination);
  }

  // =========================================================
  // СТИЛИ ДЛЯ ГИБКОГО ПОЗИЦИОНИРОВАНИЯ ПАГИНАЦИИ
  // =========================================================
  (function ensureSlideIsRelative() {
    var css = `
  .swiper-container { width: 100%; }
  .swiper-wrapper { width: 100%; }
  .swiper-slide { position: relative; }
  .swiper-slide img { display:block; width:100%; height:100%; object-fit:cover; }

  /* === ПАГИНАЦИЯ ВНУТРИ СЛАЙДЕРА === */
  .swiper-pagination[data-pagination-mode="inside"] {
    position: absolute;
    bottom: 10px; /* Отступ снизу внутри слайдера */
    left: 0;
    width: 100%;
    z-index: 10;
    display: flex;
    padding: 0 15px; /* Боковые отступы */
  }

  /* Обёртка для фона пилюли (внутри) */
  .swiper-pagination[data-pagination-mode="inside"]::before {
    content: "";
    position: absolute;
    background: rgba(0, 0, 0, 0.3); /* Полупрозрачный фон - настраивается */
    backdrop-filter: blur(8px); /* Размытие фона - настраивается */
    -webkit-backdrop-filter: blur(8px);
    border-radius: 20px; /* Скругление пилюли - настраивается */
    padding: 6px 12px; /* Внутренние отступы пилюли - настраивается */
    z-index: -1;
  }

  /* Горизонтальное выравнивание внутри слайдера */
  .swiper-pagination[data-pagination-mode="inside"][data-pagination-position="left"] {
    justify-content: flex-start;
  }
  .swiper-pagination[data-pagination-mode="inside"][data-pagination-position="center"] {
    justify-content: center;
  }
  .swiper-pagination[data-pagination-mode="inside"][data-pagination-position="right"] {
    justify-content: flex-end;
  }

  /* Позиционирование пилюли для left */
  .swiper-pagination[data-pagination-mode="inside"][data-pagination-position="left"]::before {
    left: 15px;
    transform: translateY(-50%);
    top: 50%;
    width: fit-content;
    height: fit-content;
  }

  /* Позиционирование пилюли для center */
  .swiper-pagination[data-pagination-mode="inside"][data-pagination-position="center"]::before {
    left: 50%;
    transform: translate(-50%, -50%);
    top: 50%;
    width: fit-content;
    height: fit-content;
  }

  /* Позиционирование пилюли для right */
  .swiper-pagination[data-pagination-mode="inside"][data-pagination-position="right"]::before {
    right: 15px;
    transform: translateY(-50%);
    top: 50%;
    width: fit-content;
    height: fit-content;
  }

  /* === ПАГИНАЦИЯ СНАРУЖИ СЛАЙДЕРА === */
  .swiper-pagination[data-pagination-mode="outside"] {
    position: relative;
    display: flex;
    margin-top: 20px; /* Отступ сверху от слайдера */
    margin-bottom: 12px; /* Отступ снизу до следующего элемента */
    padding: 0 15px; /* Боковые отступы */
  }

  /* Обёртка для фона пилюли (снаружи) */
  .swiper-pagination[data-pagination-mode="outside"]::before {
    content: "";
    position: absolute;
    background: rgba(0, 0, 0, 0.05); /* Светлый фон - настраивается */
    border: 1px solid rgba(0, 0, 0, 0.1); /* Тонкая обводка - настраивается */
    border-radius: 20px; /* Скругление пилюли - настраивается */
    padding: 10px 30px; /* Внутренние отступы пилюли - настраивается */
    z-index: -1;
  }

  /* Горизонтальное выравнивание снаружи слайдера */
  .swiper-pagination[data-pagination-mode="outside"][data-pagination-position="left"] {
    justify-content: flex-start;
  }
  .swiper-pagination[data-pagination-mode="outside"][data-pagination-position="center"] {
    justify-content: center;
  }
  .swiper-pagination[data-pagination-mode="outside"][data-pagination-position="right"] {
    justify-content: flex-end;
  }

  /* Позиционирование пилюли для left (outside) */
  .swiper-pagination[data-pagination-mode="outside"][data-pagination-position="left"]::before {
    left: 15px;
    transform: translateY(-50%);
    top: 50%;
    width: fit-content;
    height: fit-content;
  }

  /* Позиционирование пилюли для center (outside) */
  .swiper-pagination[data-pagination-mode="outside"][data-pagination-position="center"]::before {
    left: 50%;
    transform: translate(-50%, -50%);
    top: 50%;
    width: fit-content;
    height: fit-content;
  }

  /* Позиционирование пилюли для right (outside) */
  .swiper-pagination[data-pagination-mode="outside"][data-pagination-position="right"]::before {
    right: 15px;
    transform: translateY(-50%);
    top: 50%;
    width: fit-content;
    height: fit-content;
  }

  /* Стили буллетов (одинаковы для обоих режимов) */
  .swiper-pagination-bullet {
    margin: 0 4px !important;
  }
`;
    
    var old = document.getElementById('slider-safety-css');
    if (old) old.remove();
    $('<style id="slider-safety-css">').text(css).appendTo(document.head);
  })();

  // --------- 3) СОЗДАНИЕ СЛАЙДОВ (кликабельная область 100%) ----------
  slideData.forEach(function(data){
    var $slide = $('<div class="swiper-slide"></div>');

    var $clickableArea = $('<a>', {
      href: 'javascript:void(0);',
      'aria-label': 'Перейти',
      role: 'button'
    }).css({
      display: 'block',
      width: '100%',
      height: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 2,
      background: 'transparent',
      opacity: 1
    });

    $clickableArea.on('click', function(event){
      event.preventDefault();

      var SRC = 'brand66-slider';

      // НОРМАЛИЗУЕМ значения (чтобы пробелы не считались "действием")
      var actClipboard = String(data.clipboardText || '').trim();
      var actCategory  = String(data.category || '').trim();
      var actProdid    = String(data.prodid || '').trim();
      var actPage      = String(data.page || '').trim();
      var actLink      = String(data.link || '').trim();

      // ВАЖНО: если у слайда НЕТ действия — клик ничего не делает
      var hasAction = !!(
        actClipboard ||
        actCategory  ||
        actProdid    ||
        actPage      ||
        (actLink && actLink !== '#')
      );

      if (!hasAction) {
        return; // ничего не происходит
      }

// MaisonDelux • Brand66 • Slider Actions Policy • PROD v1.3
// зачем: Пол/Навбар трогаем только когда это реально нужно пользователю по конфигу

// Приоритет действий: clipboardText → category → prodid → page → link

// 1) Промокод — всегда без Пол/Навбар
if (actClipboard) {
  copyToClipboard(actClipboard);
  return;
}

// 2) Категория — Пол только если он указан, Навбар включаем только тут
if (actCategory) {
  if (data.gender) {
    mdxCmdSetGender(data.gender, SRC); // Пол = доп-действие только по явному параметру "Пол:"
  }
  mdxCmdGoCatalog(SRC); // Каталог нужен для корректной работы перехода по категориям
  setTimeout(function(){ setCat(String(actCategory)); }, 0);
  return;
}

// 3) Товар — без Пол/Навбар
if (actProdid) {
  setupProdLinkClickListener(String(actProdid));
  return;
}

// 4) Страница — без Пол/Навбар
if (actPage) {
  setupPageLinkClickListener(String(actPage));
  return;
}

// 5) Ссылка — всегда без Пол/Навбар
if (actLink && actLink !== '#') {
  window.location.href = actLink;
  return;
}


    });

    $slide.append(data.image).append($clickableArea);
    $wrapper.append($slide);
  });

  // --------- 4) ИНИЦИАЛИЗАЦИЯ SWIPER ----------
  var swiperOpts = {
    loop: !!runtime.loop,
    pagination: {
      el: '.swiper-pagination',
      clickable: true
    }
  };

  if (runtime.autoplay) {
    swiperOpts.autoplay = {
      delay: runtime.delayMs,
      disableOnInteraction: !!runtime.disableOnInteraction
    };
  }

  var swiper = new Swiper('.swiper-container', swiperOpts);
  window.__BRAND66_SWIPER__ = swiper;


  // Пауза при наведении мыши (на десктопе)
  if (runtime.pauseOnHover) {
    $slidesContainer.on('mouseenter', function(){
      if (swiper && swiper.autoplay) swiper.autoplay.stop();
    });
    $slidesContainer.on('mouseleave', function(){
      if (swiper && swiper.autoplay) swiper.autoplay.start();
    });
  }

  // BRAND66 • JS-страховка на случай, если :has() не поддерживается
  (function ensureShopModeHeight() {
    var sliders = document.querySelectorAll('.swiper-container');
    sliders.forEach(function(sl){
      var host = sl.closest('.shop-mode');
      if (host) {
        host.style.height = 'auto';
        host.style.minHeight = '1px';
        host.style.overflow = 'visible';
      }
    });
  })();

  // --- Deep-link из Telegram (tgWebAppStartParam) ---
  (function handleStartParam() {
    var u = getUrlVars()['tgWebAppStartParam'];
    if (!u) return;
    var parts = u.split('_');
    var o = parts[0];
    var p = parts[1];
    if (o === 'cid' && p) setCat(p);
  })();

  // --------- 6) СТАРТ ПОСЛЕ ПОЛНОЙ ЗАГРУЗКИ СТРАНИЦЫ ----------
  $(window).on('load', function () {
    if (!swiper) return;
    swiper.slideTo(0);
    if (swiper.autoplay) swiper.autoplay.start();
  });
}

// ===== Boot: try config, fallback to defaults =====
(function b66Boot(){
  var runtimeDefault = b66BuildRuntimeOptions({});
  var slideDataDefault = b66BuildSlideDataFromParsed(
    __brand66DefaultSlides__.map(function(x){
      // приводим дефолты к формату parsedSlides
      return {
        imageSrc: x.imageSrc || '',
        gender: x.gender || '',
        category: x.category || '',
        prodid: x.prodid || '',
        page: x.page || '',
        link: x.link || '',
        clipboardText: x.clipboardText || ''
      };
    }),
    runtimeDefault
  );

  b66LoadConfigOnce()
    .then(function(res){
      b66StartSlider(res.slideData, res.runtime);
    })
    .catch(function(e){
      var msg = (e && e.message) ? e.message : String(e);
      b66LogCriticalErr('Brand66 slider.txt load failed → using defaults. ' + msg + ' | URL=' + __BRAND66_SLIDER_CFG__.CONFIG_URL);
      b66StartSlider(slideDataDefault, runtimeDefault);
    });
})();




    // --------- 5) ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------
    const copyToClipboard = (text) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => alert('Промокод скопирован. Вставьте его при оформлении заказа.'))
                .catch(() => alert('Не удалось скопировать промокод.'));
        } else {
            alert('Ваш браузер не поддерживает буфер обмена.');
        }
    };

// MaisonDelux • Brand66 • Open Product Only If Exists In DOM • PROD v1.0
// зачем: tg-shop открывает товар по клику делегированно и ожидает, что .js-modal-link находится внутри .product[data-product-id]
// важно: если товара нет в DOM — показываем уведомление и выходим, без "призраков"
function setupProdLinkClickListener(prodId, delay = 0) {
  var id = String(prodId || '').trim();
  if (!id) return;

  var products = document.querySelector('.products');
  if (!products) {
    alert('Каталог (.products) не найден. Открыть товар невозможно.');
    return;
  }

  // Ищем товар только в текущем DOM
  var link =
    products.querySelector('.product[data-product-id="' + id + '"] .js-modal-link[data-product-id="' + id + '"]') ||
    products.querySelector('.product[data-product-id="' + id + '"] .js-modal-link') ||
    products.querySelector('.product[data-product-id="' + id + '"] .product__main-link');

  if (!link) {
    alert('Товар ' + id + ' не найден в текущем каталоге (в DOM).');
    return;
  }

  setTimeout(function(){
    try { link.click(); } catch(_) {}
  }, Math.max(0, Number(delay) || 0));
}


    function setupPageLinkClickListener(pageId) {
        const pageLink = document.createElement('a');
        pageLink.className = 'page-link js-page-link';
        pageLink.setAttribute('href', `/shop/telegram_shop/custom_page/${pageId}`);
        pageLink.addEventListener('click', (event) => event.preventDefault());

        const products = document.querySelector('.products');
        if (!products) return;
        products.appendChild(pageLink);

        // мгновенный переход (через клик, как ожидает движок)
        setTimeout(() => pageLink.click(), 0);
    }

    // --- Deep-link из Telegram (tgWebAppStartParam) ---
    (function handleStartParam() {
        const u = getUrlVars()['tgWebAppStartParam'];
        if (!u) return;
        const [o, p] = u.split('_');
        if (o === 'cid' && p) setCat(p);
    })();

    function setCat(par) {
        const items = document.querySelectorAll('.chips-menu__item');
        items.forEach(item => {
            const id = String($('.js-cat-link', item).data('id'));
            const ids = id.split(',');
            if (ids.includes(par)) {
                const button = document.querySelector(`[data-id="${id}"]`);
                button && button.click();
                if (ids.length > 1) {
                    const st = setInterval(() => {
                        const d = document.querySelectorAll('.chips-menu__item');
                        for (let n = 0; n < d.length; n++) {
                            const r = String($('.js-cat-link', d[n]).data('id'));
                            if (r === par) {
                                const button = document.querySelector(`[data-id="${par}"]`);
                                button && button.click();
                                clearInterval(st);
                            }
                        }
                    }, 100);
                }
            }
        });
    }

    function getUrlVars() {
        const vars = {};
        window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, (_, key, value) => {
            vars[key] = value;
        });
        return vars;
    }

// --------- 6) СТАРТ ПОСЛЕ ПОЛНОЙ ЗАГРУЗКИ СТРАНИЦЫ ----------
$(window).on('load', function () {
  try {
    var inst = window.__BRAND66_SWIPER__;
    if (!inst) return;
    inst.slideTo(0);
    if (inst.autoplay) inst.autoplay.start();
  } catch (_) {}
});

});
