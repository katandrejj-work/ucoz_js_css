/**
 * Product Slider v5.5
 */
(() => {
  const ALLOWED_PAGES = ["projects-page", "solutions-page"];
  const BLOCKED_PAGES = ["home-page"];

  const isPageAllowed = () => {
    const cls = document.body.classList;
    return (
      ALLOWED_PAGES.some((c) => cls.contains(c)) &&
      !BLOCKED_PAGES.some((c) => cls.contains(c))
    );
  };

  let swiperInstance = null;

  // ─── Динамическая загрузка CSS ────────────────────────────
  const loadCSS = (url) => {
    return new Promise((resolve) => {
      if (document.querySelector(`link[href="${url}"]`)) {
        resolve();
        return;
      }
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      link.onload = resolve;
      link.onerror = resolve;
      document.head.appendChild(link);
    });
  };

  // ─── Динамическая загрузка JS ──────────────────────────────
  const loadJS = (url) => {
    return new Promise((resolve) => {
      if (window.Swiper) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = url;
      script.onload = resolve;
      script.onerror = resolve;
      document.body.appendChild(script);
    });
  };

  // ─── Загрузка Swiper ───────────────────────────────────────
  const loadSwiper = async () => {
    if (window.Swiper) return;
    await loadCSS(
      "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css",
    );
    await loadJS("https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js");
  };

  // ─── Подготовка HTML ───────────────────────────────────────
  const prepareHTML = (container) => {
    if (container.querySelector(".swiper-wrapper")) return;
    const products = Array.from(container.querySelectorAll(".product"));
    const wrapper = document.createElement("div");
    wrapper.className = "swiper-wrapper";
    products.forEach((product) => {
      product.classList.add("swiper-slide");
      wrapper.appendChild(product);
    });
    container.innerHTML = "";
    container.appendChild(wrapper);
    container.classList.add("swiper");
  };

  // ─── Восстановление HTML ───────────────────────────────────
  const restoreHTML = (container) => {
    container.classList.remove(
      "swiper",
      "swiper-initialized",
      "swiper-horizontal",
    );
    const wrapper = container.querySelector(".swiper-wrapper");
    if (!wrapper) return;
    const slides = Array.from(wrapper.querySelectorAll(".swiper-slide"));
    slides.forEach((slide) => {
      slide.classList.remove(
        "swiper-slide",
        "swiper-slide-active",
        "swiper-slide-prev",
        "swiper-slide-next",
        "swiper-slide-duplicate",
      );
      slide.removeAttribute("style");
      container.appendChild(slide);
    });
    wrapper.remove();
  };

  // ─── Инициализация Swiper ──────────────────────────────────
  const initSwiper = () => {
    const container = document.querySelector(".products");
    if (!isPageAllowed()) {
      if (swiperInstance) destroySwiper();
      return;
    }
    if (!container) return;

    if (swiperInstance && !swiperInstance.destroyed) {
      destroySwiper();
    }

    const products = Array.from(container.querySelectorAll(".product"));
    if (products.length === 0) return;

    prepareHTML(container);

    const section = container.closest("section.shop");
    let pag = section.querySelector(".product-slider-pagination");
    if (!pag) {
      pag = document.createElement("div");
      pag.className = "product-slider-pagination";
      container.insertAdjacentElement("afterend", pag);
    } else {
      pag.innerHTML = "";
    }

    swiperInstance = new Swiper(container, {
      loop: true,
      centeredSlides: true,
      slidesPerView: "auto",
      spaceBetween: 15,
      speed: 400,
      mousewheel: {
        sensitivity: 1,
        forceToAxis: true,
        releaseOnEdges: true,
      },
      pagination: {
        el: ".product-slider-pagination",
        clickable: true,
        type: "bullets",
      },
      touchRatio: 1,
      simulateTouch: true,
      allowTouchMove: true,
      threshold: 10,
      shortSwipes: true,
      longSwipes: true,
      longSwipesRatio: 0.5,
      longSwipesMs: 300,
      followFinger: true,
      preventClicks: false,
      preventClicksPropagation: false,
      touchStartPreventDefault: false,
      slideToClickedSlide: false,
      on: {
        init: function () {
          const lastIndex = products.length - 1;
          setTimeout(() => {
            // ✅ ПРАВКА: прыжок на последний слайд без анимации,
            // затем сразу на первый — Swiper правильно расставляет клоны слева
            this.slideToLoop(lastIndex, 0);
            this.slideToLoop(0, 0);
          }, 50);
        },
        slideChange: function () {
          const slides = this.slides;
          slides.forEach((slide) => {
            slide.classList.remove("active");
          });
          const activeSlide = slides[this.activeIndex];
          if (activeSlide) {
            activeSlide.classList.add("active");
          }
        },
      },
    });

    setTimeout(() => {
      if (swiperInstance && !swiperInstance.destroyed) {
        swiperInstance.slideToLoop(0, 0);
      }
    }, 200);
  };

  // ─── Очистка ───────────────────────────────────────────────
  const destroySwiper = () => {
    if (!swiperInstance) return;
    const container = document.querySelector(".products");
    swiperInstance.destroy(true, true);
    swiperInstance = null;
    if (container) {
      restoreHTML(container);
    }
    const pag = document.querySelector(".product-slider-pagination");
    if (pag) {
      pag.remove();
    }
  };

  // ─── CSS стили ─────────────────────────────────────────────
  const injectStyles = () => {
    if (document.getElementById("swiper-custom-styles")) return;
    const style = document.createElement("style");
    style.id = "swiper-custom-styles";
    style.textContent = `
      /* Прячем на главной */
      body.home-page section.shop .products {
        display: none !important;
      }

      /* Прячем пагинацию на главной */
      body.home-page .product-slider-pagination {
        display: none !important;
      }

      /* Swiper контейнер */
      .products.swiper {
        overflow: visible !important;
        touch-action: pan-y !important;
        padding-left: calc(
          max(16px, (100vw - 76vw)/2 )
          + env(safe-area-inset-left, 0px)
        );
        padding-right: calc(
          max(16px, (100vw - 76vw)/2 )
          + env(safe-area-inset-right, 0px)
        );
      }

      .swiper-wrapper {
        display: flex;
      }

      /* Слайды (карточки) */
      .product.swiper-slide {
        flex: 0 0 76vw;
        max-width: 76vw;
        width: 76vw !important;
        height: auto;
        aspect-ratio: 3 / 4.2;
        cursor: pointer;
      }

      /* Блокируем drag картинок */
      .swiper-slide img {
        pointer-events: none;
        -webkit-user-drag: none;
        user-drag: none;
      }

      /* Ссылки и контент кликабельны */
      .swiper-slide a,
      .swiper-slide .product__content {
        pointer-events: auto;
        cursor: pointer;
      }

      /* Пагинация */
      body.projects-page .product-slider-pagination,
      body.solutions-page .product-slider-pagination {
        position: relative !important;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        margin: 10px auto;
        left: 50%;
        transform: translateX(-50%);
        background: var(--pagination-bg, #c0c0c070);
        backdrop-filter: blur(4px);
        border-radius: 999px;
        padding: 4px 5px !important;
        gap: 5px;
        width: auto !important;
        bottom: auto !important;
        top: auto !important;
      }

      .product-slider-pagination .swiper-pagination-bullet {
        width: 8px !important;
        height: 8px !important;
        margin: 0 !important;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5) !important;
        opacity: 1 !important;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .product-slider-pagination .swiper-pagination-bullet-active {
        background: var(--pagination-active, #c6a4ff) !important;
        transform: scale(1.2);
      }

      section.shop > .products,
      section.shop > * > .products,
      .products.swiper {
        overflow-x: visible !important;
        overflow-y: hidden !important;
        touch-action: pan-y;
        overscroll-behavior-x: contain;
      }
    `;
    document.head.appendChild(style);
  };

  // ─── Observer для SPA ──────────────────────────────────────
  const setupObserver = () => {
    let debounce = null;
    const observer = new MutationObserver(() => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        if (!isPageAllowed()) {
          destroySwiper();
          return;
        }
        const container = document.querySelector(".products");
        if (!container) {
          destroySwiper();
          return;
        }
        if (!swiperInstance || swiperInstance.destroyed) {
          initSwiper();
        }
      }, 300);
    });

    const target = document.querySelector("main") || document.body;
    observer.observe(target, { childList: true, subtree: true });
  };

  // ─── Старт ─────────────────────────────────────────────────
  const init = async () => {
    await loadSwiper();
    injectStyles();
    if (isPageAllowed()) {
      initSwiper();
    }
    setupObserver();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
