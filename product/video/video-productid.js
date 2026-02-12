/*
 * =================================================================================================
 * Volto • Product Videos (Catalog + Modal) • v1.0
 *
 * Что делает:
 * 1) Каталог (карточки товаров):
 *    - Проверяет наличие видео только по пути /upload/video/{id}.mp4
 *    - Защищается от “фейковых” ответов (200 + HTML) через Content-Type (не text/html)
 *    - Вставляет <video> в карточку ТОЛЬКО после реального подтверждения (loadedmetadata)
 *    - Не плодит дубли при SPA/перерендерах (data-метки + MutationObserver)
 *
 * 2) Модалка товара (SweetAlert2 + Swiper):
 *    - При открытии модалки добавляет ВИДЕО отдельным слайдом №1 (картинки не трогает)
 *    - Автовоспроизведение (muted) + пауза, когда слайд не активен, и play когда активен
 *    - Не спамит HEAD-проверками (seen-метка)
 *    - Самовосстановление, если Swiper пересобрал DOM (self-heal)
 *
 * Важно:
 * - Глобальные настройки Swiper/SweetAlert2 не трогаются
 * - Всё работает в SPA (повторные рендеры/подгрузки)
 * =================================================================================================
 */
$(document).ready(function () {
  const CFG = {
    debug: true, // true = показываем логи, false = тихо

    enableCatalogVideos: true, // ВКЛ/ВЫКЛ видео на карточках в каталоге
    enableModalVideos: true, // ВКЛ/ВЫКЛ видео в модалке товара (Swiper)

    initDelayMs: 800, // задержка первого запуска
    rerunDelayMs: 700, // задержка при добавлении новых товаров
    headTimeoutMs: 2000, // таймаут HEAD

    videoRoot: "/upload/video/", // где лежат видео
    videoExt: ".mp4",

    clsIndicator: "video-indicator",
    clsOverlay: "video-play-overlay",
    clsVideo: "product-video",

    // data-метки на карточке (каталог)
    dataDone: "mdxVideoDone",
    dataHas: "mdxVideoHas",

    // модалка
    selModal: ".swal2-product-modal-container .product-modal[data-id]",
    sliderIdTpl: (id) => `#product_${id}_slider`,
    modalDoneAttr: "data-mdx-modal-video-done",
    modalSeenAttr: "data-mdx-modal-video-seen",
    clsModalVideoSlide: "mdx-modal-video-slide",
    clsModalVideoEl: "mdx-modal-video-el",
  };

  const LOG = {
    info: (m) => CFG.debug && console.log("%c[INFO] " + m, "color:#007bff;"),
    success: (m) =>
      CFG.debug && console.log("%c[SUCCESS] " + m, "color:#28a745;"),
    warn: (m) => CFG.debug && console.log("%c[WARNING] " + m, "color:#ffc107;"),
    error: (m) =>
      console.log("%c[ERROR] " + m, "color:#dc3545;font-weight:bold;"),
  };

  LOG.info("ProductVideos v1.0: старт.");

  // ===== CSS инъекция (без правок HTML) =====
  (function injectCSSOnce() {
    const id = "mdx_product_videos_v10_css";
    if (document.getElementById(id)) return;

    const css = `
      .${CFG.clsIndicator} { display: none !important; }
      .${CFG.clsModalVideoEl} { border-radius: 12px !important; }
    `;

    const st = document.createElement("style");
    st.id = id;
    st.type = "text/css";
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  })();

  // ===== Общие утилиты =====
  let INIT_LOCK = false;
  let OBS_TIMER = null;

  function abortableHead(url, timeoutMs) {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      let settled = false;

      const t = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          xhr.abort();
        } catch (e) {}
        resolve({ ok: false, status: null, contentType: "", timeout: true });
      }, timeoutMs);

      xhr.open("HEAD", url, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && !settled) {
          settled = true;
          clearTimeout(t);
          const ct = (
            xhr.getResponseHeader("Content-Type") || ""
          ).toLowerCase();
          resolve({
            ok: true,
            status: xhr.status,
            contentType: ct,
            timeout: false,
          });
        }
      };
      xhr.onerror = function () {
        if (settled) return;
        settled = true;
        clearTimeout(t);
        resolve({ ok: false, status: null, contentType: "", timeout: false });
      };
      try {
        xhr.send();
      } catch (e) {
        if (settled) return;
        settled = true;
        clearTimeout(t);
        resolve({ ok: false, status: null, contentType: "", timeout: false });
      }
    });
  }

  function buildVideoUrl(productId) {
    return `${CFG.videoRoot}${productId}${CFG.videoExt}`;
  }

  function cleanupOverlays($imgContainer) {
    $imgContainer.find("." + CFG.clsIndicator).remove();
    $imgContainer.find("." + CFG.clsOverlay).remove();
  }

  function addVideoIndicator($imgContainer) {
    if ($imgContainer.find("." + CFG.clsIndicator).length) return;

    const html = `
      <div class="${CFG.clsIndicator}"
           style="position:absolute;
                  bottom:10px;
                  right:10px;
                  background:rgba(0,0,0,0.7);
                  color:#fff;
                  border-radius:50%;
                  width:30px;
                  height:30px;
                  display:none;
                  align-items:center;
                  justify-content:center;
                  z-index:10;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M8 5v14l11-7z"></path>
        </svg>
      </div>
    `;
    $imgContainer.append(html);
  }

  function addPlayOverlay($imgContainer, videoEl) {
    if ($imgContainer.find("." + CFG.clsOverlay).length) return;

    const html = `
      <div class="${CFG.clsOverlay}"
           style="position:absolute;
                  top:0;
                  left:0;
                  width:100%;
                  height:100%;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  background:rgba(0,0,0,0.3);
                  cursor:pointer;
                  z-index:20;">
        <div class="video-play-button"
             style="background:rgba(0,0,0,0.7);
                    border-radius:50%;
                    width:60px;
                    height:60px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    transition:transform 0.3s;">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z"></path>
          </svg>
        </div>
      </div>
    `;

    $imgContainer.append(html);

    $imgContainer.find("." + CFG.clsOverlay).on("click", function (e) {
      if (!e.isTrusted) return;
      videoEl
        .play()
        .then(() => {
          $(this).fadeOut(250);
        })
        .catch(() => {});
    });
  }

  function attachIntersectionPause(videoEl) {
    try {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              videoEl.play().catch(() => {});
            } else {
              videoEl.pause();
            }
          });
        },
        { threshold: 0.1 },
      );

      obs.observe(videoEl);
      videoEl.__mdxIO = obs;
    } catch (e) {}
  }

  function replaceImageWithVideo(
    $product,
    $imgContainer,
    $img,
    videoUrl,
    productId,
  ) {
    cleanupOverlays($imgContainer);
    $imgContainer.find("video." + CFG.clsVideo).remove();

    const poster = $img.attr("src") || "";
    const videoId = `mdx_product_video_${productId}`;

    const $video = $(`
      <video id="${videoId}"
             class="${CFG.clsVideo}"
             src="${videoUrl}"
             poster="${poster}"
             autoplay
             muted
             loop
             playsinline
             preload="metadata"
             style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">
      </video>
    `);

    $img.before($video);

    const videoEl = document.getElementById(videoId);
    if (!videoEl) return;

    let settled = false;

    function rollback(reason) {
      if (settled) return;
      settled = true;

      try {
        videoEl.__mdxIO && videoEl.__mdxIO.disconnect();
      } catch (e) {}

      cleanupOverlays($imgContainer);
      $video.remove();
      $img.show();

      $product.data(CFG.dataHas, false);

      if (CFG.debug) LOG.warn(`rollback: товар ${productId} (${reason})`);
    }

    videoEl.addEventListener(
      "loadedmetadata",
      function () {
        if (settled) return;
        settled = true;

        $img.hide();
        $product.data(CFG.dataHas, true);

        addVideoIndicator($imgContainer);

        const p = videoEl.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => {
            addPlayOverlay($imgContainer, videoEl);
          });
        }

        attachIntersectionPause(videoEl);
        if (CFG.debug)
          LOG.success(`Видео подтверждено и включено: товар ${productId}`);
      },
      { once: true },
    );

    videoEl.addEventListener(
      "error",
      function () {
        rollback("video error");
      },
      { once: true },
    );

    setTimeout(() => {
      if (!settled) rollback("metadata timeout");
    }, 4000);
  }

  // ===== Каталог: init =====
  async function initProductVideosCatalog() {
    if (!CFG.enableCatalogVideos) return;

    if (INIT_LOCK) return;
    INIT_LOCK = true;

    try {
      const $products = $(".product");
      if (!$products.length) {
        INIT_LOCK = false;
        return;
      }

      let scanned = 0;
      let injected = 0;

      for (let i = 0; i < $products.length; i++) {
        const $product = $products.eq(i);
        const productId = $product.data("product-id");
        if (!productId) continue;

        if ($product.data(CFG.dataDone) === true) continue;
        $product.data(CFG.dataDone, true);

        scanned++;

        const $imgContainer = $product.find(".product__picture").first();
        if (!$imgContainer.length) continue;

        if ($imgContainer.find("video." + CFG.clsVideo).length) continue;

        const $img = $imgContainer.find(".product__image").first();
        if (!$img.length) continue;

        const videoUrl = buildVideoUrl(productId);
        const head = await abortableHead(videoUrl, CFG.headTimeoutMs);

        const exists =
          head.ok &&
          (head.status === 200 || head.status === 304) &&
          head.contentType &&
          !head.contentType.includes("text/html");

        if (!exists) {
          cleanupOverlays($imgContainer);
          continue;
        }

        replaceImageWithVideo(
          $product,
          $imgContainer,
          $img,
          videoUrl,
          productId,
        );
        injected++;
      }

      if (CFG.debug)
        LOG.info(
          `catalog init: scanned=${scanned}, injected_attempts=${injected}`,
        );
    } finally {
      INIT_LOCK = false;
    }
  }

  // ===== Каталог: первый запуск + MO =====
  if (CFG.enableCatalogVideos) {
    setTimeout(() => {
      initProductVideosCatalog();
    }, CFG.initDelayMs);

    const productsContainer = document.querySelector(
      ".products, .product-list, [data-products]",
    );
    if (productsContainer) {
      const mo = new MutationObserver((mutations) => {
        let should = false;

        mutations.forEach((m) => {
          if (!m.addedNodes || !m.addedNodes.length) return;
          m.addedNodes.forEach((n) => {
            if (!(n instanceof HTMLElement)) return;
            if (n.classList && n.classList.contains("product")) should = true;
            if (!should && n.querySelector && n.querySelector(".product"))
              should = true;
          });
        });

        if (!should) return;

        if (OBS_TIMER) clearTimeout(OBS_TIMER);
        OBS_TIMER = setTimeout(() => {
          initProductVideosCatalog();
        }, CFG.rerunDelayMs);
      });

      mo.observe(productsContainer, { childList: true, subtree: true });
      if (CFG.debug) LOG.info("Catalog MutationObserver: включён.");
    } else {
      if (CFG.debug)
        LOG.warn(
          "Catalog: контейнер товаров не найден — будет только первый запуск.",
        );
    }

    window.addEventListener(
      "error",
      function (e) {
        const t = e.target;
        if (!t || t.tagName !== "VIDEO") return;

        const $video = $(t);
        const $imgContainer = $video.closest(".product__picture");
        const $img = $imgContainer.find(".product__image").first();

        cleanupOverlays($imgContainer);
        $video.remove();
        $img.show();
      },
      true,
    );
  }

  // ===== Модалка: видео как слайд №1 =====
  function getSwiperInstance(sliderEl) {
    if (!sliderEl) return null;
    return sliderEl.swiper || null;
  }

  function ensureModalVideoSlide(productId, sliderEl) {
    const wrapper = sliderEl.querySelector(".swiper-wrapper");
    if (!wrapper) return { ok: false, reason: "swiper-wrapper missing" };

    const hasOurSlide = !!wrapper.querySelector("." + CFG.clsModalVideoSlide);
    const done = sliderEl.getAttribute(CFG.modalDoneAttr) === "1";

    if (done && !hasOurSlide) {
      sliderEl.removeAttribute(CFG.modalDoneAttr);
      sliderEl.__mdxModalVideoBound = false;
    }

    if (wrapper.querySelector("." + CFG.clsModalVideoSlide)) {
      sliderEl.setAttribute(CFG.modalDoneAttr, "1");
      return { ok: true, reason: "already exists" };
    }

    const slide = document.createElement("div");
    slide.className = `swiper-slide product-slider__slide ${CFG.clsModalVideoSlide}`;

    const zc = document.createElement("div");
    zc.className = "swiper-zoom-container";

    const video = document.createElement("video");
    video.className = CFG.clsModalVideoEl;
    video.src = buildVideoUrl(productId);
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";
    video.style.borderRadius = "12px";

    zc.appendChild(video);
    slide.appendChild(zc);

    wrapper.insertBefore(slide, wrapper.firstChild);

    sliderEl.setAttribute(CFG.modalDoneAttr, "1");
    return { ok: true, reason: "inserted", videoEl: video, slideEl: slide };
  }

  function wireModalPauseResume(sliderEl, videoEl) {
    const swiper = getSwiperInstance(sliderEl);
    if (!swiper) return { ok: false, reason: "swiper instance not found" };

    const onChange = () => {
      const ai =
        typeof swiper.activeIndex === "number" ? swiper.activeIndex : -1;
      const isVideoActive = ai === 0;

      if (isVideoActive) {
        const p = videoEl.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } else {
        try {
          videoEl.pause();
        } catch (e) {}
      }
    };

    if (!sliderEl.__mdxModalVideoBound) {
      sliderEl.__mdxModalVideoBound = true;

      try {
        swiper.update();
      } catch (e) {}
      try {
        swiper.slideTo(0, 0);
      } catch (e) {}

      swiper.on("slideChange", onChange);
      swiper.on("transitionEnd", onChange);

      onChange();
    }

    return { ok: true, reason: "wired" };
  }

  async function handleOpenedModalOnce(modalEl) {
    if (!CFG.enableModalVideos) return;
    if (!modalEl) return;

    const productId = modalEl.getAttribute("data-id");
    if (!productId) return;

    const sliderSel = CFG.sliderIdTpl(productId);
    const sliderEl = modalEl.querySelector(sliderSel);
    if (!sliderEl) return;

    if (sliderEl.getAttribute(CFG.modalSeenAttr) === "1") return;
    sliderEl.setAttribute(CFG.modalSeenAttr, "1");

    const videoUrl = buildVideoUrl(productId);

    const head = await abortableHead(videoUrl, CFG.headTimeoutMs);
    const exists =
      head.ok &&
      (head.status === 200 || head.status === 304) &&
      head.contentType &&
      !head.contentType.includes("text/html");

    if (!exists) return;

    const res = ensureModalVideoSlide(productId, sliderEl);
    if (!res.ok) return;

    if (res.reason === "already exists") return;

    const videoEl = res.videoEl;

    let metaOk = false;
    const metaTimer = setTimeout(() => {
      if (metaOk) return;
      try {
        res.slideEl.remove();
      } catch (e) {}
      sliderEl.removeAttribute(CFG.modalDoneAttr);
    }, 4000);

    videoEl.addEventListener(
      "loadedmetadata",
      () => {
        metaOk = true;
        clearTimeout(metaTimer);

        const swiper = getSwiperInstance(sliderEl);
        if (swiper) {
          try {
            swiper.update();
          } catch (e) {}
          try {
            swiper.slideTo(0, 0);
          } catch (e) {}
        }

        wireModalPauseResume(sliderEl, videoEl);
      },
      { once: true },
    );

    videoEl.addEventListener(
      "error",
      () => {
        clearTimeout(metaTimer);
        try {
          res.slideEl.remove();
        } catch (e) {}
        sliderEl.removeAttribute(CFG.modalDoneAttr);
      },
      { once: true },
    );
  }

  // Модалка: лёгкий polling (без спама, потому что seenAttr)
  if (CFG.enableModalVideos) {
    setInterval(() => {
      const modalEl = document.querySelector(CFG.selModal);
      if (!modalEl) return;
      handleOpenedModalOnce(modalEl);
    }, 300);
  }
});
