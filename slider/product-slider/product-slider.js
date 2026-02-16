/**
 * Слайдер v0.09 - Исправлена пагинация (только реальные товары)
 * Включает "шевеление" для отрисовки соседних слайдов
 */

const SLIDER_PAGES = ["projects-page", "solutions-page"];
const EXCLUDED_PAGES = ["home-page"];
let cleanupFunctions = [];

function shouldInitSlider() {
  const bodyClasses = Array.from(document.body.classList);
  return (
    bodyClasses.some((cls) => SLIDER_PAGES.includes(cls)) &&
    !bodyClasses.some((cls) => EXCLUDED_PAGES.includes(cls))
  );
}

function cleanup() {
  cleanupFunctions.forEach((fn) => fn());
  cleanupFunctions = [];
  const container = document.querySelector(".products");
  if (container) {
    container.dataset.sliderInit = "false";
    container
      .querySelectorAll(".product[data-clone]")
      .forEach((c) => c.remove());
  }
}

function initSlider() {
  const container = document.querySelector(".products");
  // ВАЖНО: берем только те продукты, которые НЕ являются клонами
  const originalProducts = Array.from(
    container.querySelectorAll(".product:not([data-clone])"),
  );

  if (
    !container ||
    originalProducts.length === 0 ||
    container.dataset.sliderInit === "true"
  )
    return;

  container.dataset.sliderInit = "true";
  const productCount = originalProducts.length;

  // === СОЗДАНИЕ КЛОНОВ ===
  const clonesBefore = [];
  const clonesAfter = [];

  originalProducts.forEach((product, index) => {
    const createClone = (type) => {
      const clone = document.createElement("div");
      clone.className = product.className;
      clone.innerHTML = product.innerHTML;
      clone.dataset.clone = type;
      clone.dataset.originalIndex = index;
      clone.classList.remove("active");

      clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));

      clone.style.cssText = `
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                transform: translateZ(0) !important;
                flex-shrink: 0 !important;
                width: ${product.offsetWidth}px;
            `;

      return clone;
    };
    clonesBefore.push(createClone("before"));
    clonesAfter.push(createClone("after"));
  });

  clonesBefore
    .reverse()
    .forEach((c) => container.insertBefore(c, container.firstChild));
  clonesAfter.forEach((c) => container.appendChild(c));

  const allProducts = Array.from(container.querySelectorAll(".product"));

  // === СКРОЛЛ И ПОЗИЦИЯ ===
  let isAdjusting = false;
  let scrollEndTimer = null;

  function scrollToIndex(index, smooth = true) {
    const target = originalProducts[index % productCount];
    if (!target) return;
    container.scrollTo({
      left:
        target.offsetLeft - container.offsetWidth / 2 + target.offsetWidth / 2,
      behavior: smooth ? "smooth" : "auto",
    });
  }

  const syncState = () => {
    const center = container.scrollLeft + container.offsetWidth / 2;
    let minDiff = Infinity;
    let activeIdx = 0;

    allProducts.forEach((p, i) => {
      const pCenter = p.offsetLeft + p.offsetWidth / 2;
      const diff = Math.abs(center - pCenter);
      if (diff < minDiff) {
        minDiff = diff;
        activeIdx = i;
      }
    });

    const currentEl = allProducts[activeIdx];
    if (!currentEl) return;

    const realIdx = currentEl.dataset.clone
      ? parseInt(currentEl.dataset.originalIndex)
      : originalProducts.indexOf(currentEl);

    if (container.dataset.activeIndex !== String(realIdx)) {
      container.dataset.activeIndex = realIdx;

      // Обновляем классы активности только на оригиналах
      originalProducts.forEach((p, i) =>
        p.classList.toggle("active", i === realIdx),
      );

      // Обновляем кнопки пагинации
      const dots = document.querySelectorAll(".pagination button");
      dots.forEach((b, i) => b.classList.toggle("active", i === realIdx));
    }
  };

  const handleScroll = () => {
    if (isAdjusting) return;
    syncState();
    clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(() => {
      const center = container.scrollLeft + container.offsetWidth / 2;
      const current = allProducts.find(
        (p) => Math.abs(center - (p.offsetLeft + p.offsetWidth / 2)) < 30,
      );

      if (current && current.dataset.clone) {
        isAdjusting = true;
        const target =
          originalProducts[parseInt(current.dataset.originalIndex)];
        container.style.scrollBehavior = "auto";
        container.scrollLeft =
          target.offsetLeft -
          container.offsetWidth / 2 +
          target.offsetWidth / 2;
        setTimeout(() => {
          isAdjusting = false;
          container.style.scrollBehavior = "smooth";
        }, 50);
      }
    }, 150);
  };

  container.addEventListener("scroll", handleScroll, { passive: true });

  // === ПАГИНАЦИЯ (ИСПОЛЬЗУЕМ ТОЛЬКО ORIGINAL PRODUCTS) ===
  let pag = document.querySelector(".pagination");
  if (!pag) {
    pag = document.createElement("div");
    pag.className = "pagination";
    container.insertAdjacentElement("afterend", pag);
  }

  // Очищаем перед созданием, чтобы не дублировались точки
  pag.innerHTML = "";

  originalProducts.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.setAttribute("aria-label", `Go to slide ${i + 1}`);
    btn.addEventListener("click", () => scrollToIndex(i));
    pag.appendChild(btn);
  });

  // === ИНИЦИАЛЬНЫЙ ЗАПУСК ===
  const initPos = () => {
    const active =
      originalProducts.find((p) => p.classList.contains("active")) ||
      originalProducts[0];
    if (!active) return;

    const targetLeft =
      active.offsetLeft - container.offsetWidth / 2 + active.offsetWidth / 2;

    container.style.scrollBehavior = "auto";
    container.scrollLeft = targetLeft;

    requestAnimationFrame(() => {
      container.scrollLeft = targetLeft + 1;
      requestAnimationFrame(() => {
        container.scrollLeft = targetLeft;
        syncState();

        container.style.display = "none";
        container.offsetHeight;
        container.style.display = "flex";
      });
    });
  };

  initPos();
  setTimeout(initPos, 100);
  setTimeout(initPos, 500);

  cleanupFunctions.push(() => {
    container.removeEventListener("scroll", handleScroll);
    // Не удаляем сам контейнер пагинации, если он нужен глобально, но очищаем содержимое
    if (pag) pag.innerHTML = "";
  });
}

function init() {
  const observer = new MutationObserver((mutations) => {
    // Проверка: инициализируем только если есть реальные товары и слайдер еще не запущен
    const realProducts = document.querySelectorAll(
      ".product:not([data-clone])",
    );
    const container = document.querySelector(".products");

    if (
      realProducts.length > 0 &&
      container &&
      container.dataset.sliderInit !== "true"
    ) {
      initSlider();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  initSlider();
}

init();
