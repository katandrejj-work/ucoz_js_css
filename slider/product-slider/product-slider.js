/**
 * Слайдер с автоматической инициализацией на определённых страницах
 * Оптимизирован для SPA (Telegram WebApp)
 */

// Конфигурация страниц, где нужен слайдер
const SLIDER_PAGES = ["projects-page", "solutions-page"];
const EXCLUDED_PAGES = ["home-page"];

// Хранилище для cleanup-функций
let cleanupFunctions = [];

/**
 * Проверяет, нужна ли инициализация на текущей странице
 */
function shouldInitSlider() {
  const bodyClasses = Array.from(document.body.classList);

  // Проверяем исключения
  if (bodyClasses.some((cls) => EXCLUDED_PAGES.includes(cls))) {
    return false;
  }

  // Проверяем разрешённые страницы
  return bodyClasses.some((cls) => SLIDER_PAGES.includes(cls));
}

/**
 * Очистка всех слушателей и ресурсов
 */
function cleanup() {
  cleanupFunctions.forEach((fn) => fn());
  cleanupFunctions = [];

  const container = document.querySelector(".products");
  if (container) {
    container.dataset.sliderInit = "false";
    container.style.cursor = "";
    container.style.scrollBehavior = "";
  }
}

/**
 * Инициализация слайдера
 */
function initSlider() {
  const container = document.querySelector(".products");
  const products = document.querySelectorAll(".product");

  // Проверка на существование
  if (!container || products.length === 0) return;

  // Проверка на повторную инициализацию
  if (container.dataset.sliderInit === "true") return;

  container.dataset.sliderInit = "true";

  // === 1. ПАГИНАЦИЯ ===
  let paginationContainer = document.querySelector(".pagination");
  if (!paginationContainer) {
    paginationContainer = document.createElement("div");
    paginationContainer.className = "pagination";
    container.insertAdjacentElement("afterend", paginationContainer);
  }
  paginationContainer.innerHTML = "";

  // Создаём точки пагинации по количеству продуктов
  const paginationButtons = [];
  products.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.setAttribute("aria-label", `Go to slide ${i + 1}`);
    btn.addEventListener("click", () => scrollToIndex(i));
    paginationContainer.appendChild(btn);
    paginationButtons.push(btn);
  });

  let scrollEndTimer = null;
  let rafId = null;

  /**
   * Плавный скролл к индексу
   */
  function scrollToIndex(index) {
    const targetProduct = products[index];
    if (!targetProduct) return;

    container.scrollTo({
      left:
        targetProduct.offsetLeft -
        container.offsetWidth / 2 +
        targetProduct.offsetWidth / 2,
      behavior: "smooth",
    });
  }

  /**
   * Синхронизация активного состояния
   */
  function syncActiveState() {
    let closestIndex = 0;
    let minDiff = Infinity;
    const containerCenter = container.scrollLeft + container.offsetWidth / 2;

    products.forEach((product, index) => {
      const productCenter = product.offsetLeft + product.offsetWidth / 2;
      const diff = Math.abs(containerCenter - productCenter);

      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = index;
      }
    });

    // Обновляем только при изменении индекса
    if (container.dataset.activeIndex !== String(closestIndex)) {
      container.dataset.activeIndex = closestIndex;

      products.forEach((p, i) =>
        p.classList.toggle("active", i === closestIndex),
      );
      paginationButtons.forEach((dot, i) =>
        dot.classList.toggle("active", i === closestIndex),
      );
    }
  }

  // === 2. ОБРАБОТЧИК СКРОЛЛА ===
  const handleScroll = () => {
    // Оптимизация через requestAnimationFrame
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(syncActiveState);

    // Таймер для snap-эффекта
    clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(() => {
      const currentIndex = parseInt(container.dataset.activeIndex || "0");
      scrollToIndex(currentIndex);
    }, 120);
  };

  container.addEventListener("scroll", handleScroll, { passive: true });

  // === 3. DRAG-TO-SCROLL ===
  let isDragging = false;
  let startX, scrollLeftPos;

  const handleMouseDown = (e) => {
    isDragging = true;
    container.classList.add("dragging");
    container.style.cursor = "grabbing";
    container.style.scrollBehavior = "auto";
    startX = e.pageX - container.offsetLeft;
    scrollLeftPos = container.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5;
    container.scrollLeft = scrollLeftPos - walk;
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    isDragging = false;
    container.classList.remove("dragging");
    container.style.cursor = "grab";
    container.style.scrollBehavior = "smooth";

    const currentIndex = parseInt(container.dataset.activeIndex || "0");
    scrollToIndex(currentIndex);
  };

  container.addEventListener("mousedown", handleMouseDown);
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);

  // === 4. НАЧАЛЬНАЯ УСТАНОВКА ===
  container.style.cursor = "grab";

  // ВАЖНО: Сначала определяем активный индекс по существующему классу .active
  let initialIndex = 0;
  products.forEach((product, index) => {
    if (product.classList.contains("active")) {
      initialIndex = index;
    }
  });

  // Устанавливаем начальный индекс
  container.dataset.activeIndex = String(initialIndex);

  // Применяем активное состояние к пагинации
  paginationButtons.forEach((dot, i) =>
    dot.classList.toggle("active", i === initialIndex),
  );

  // Затем синхронизируем состояние на основе скролла (если нужно)
  syncActiveState();

  // === 5. CLEANUP-ФУНКЦИИ ===
  cleanupFunctions.push(() => {
    container.removeEventListener("scroll", handleScroll);
    container.removeEventListener("mousedown", handleMouseDown);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
    clearTimeout(scrollEndTimer);
    if (rafId) cancelAnimationFrame(rafId);
    if (paginationContainer) paginationContainer.remove();
  });
}

/**
 * Проверка и инициализация/деинициализация слайдера
 */
function checkAndUpdateSlider() {
  const container = document.querySelector(".products");
  const products = document.querySelectorAll(".product");
  const isInitialized = container?.dataset.sliderInit === "true";
  const shouldInit = shouldInitSlider();
  const hasProducts = products.length > 0;

  if (shouldInit && hasProducts && !isInitialized) {
    // Нужно инициализировать
    initSlider();
  } else if (!shouldInit && isInitialized) {
    // Нужно очистить
    cleanup();
  } else if (shouldInit && isInitialized && hasProducts) {
    // Проверяем, изменилось ли количество продуктов
    const currentDots = document.querySelectorAll(".pagination button");
    if (currentDots.length !== products.length) {
      cleanup();
      initSlider();
    }
  }
}

/**
 * Глобальная инициализация
 */
function init() {
  let updateTimeout;

  // MutationObserver для отслеживания изменений
  const observer = new MutationObserver(() => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(checkAndUpdateSlider, 100);
  });

  // Наблюдаем за изменениями в body (классы) и .products (товары)
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    subtree: true,
  });

  // Начальная проверка
  checkAndUpdateSlider();

  // Cleanup при закрытии (для WebApp)
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.onEvent("viewportChanged", () => {
      checkAndUpdateSlider();
    });
  }

  // Cleanup при unload
  window.addEventListener("beforeunload", cleanup);
}

// Запуск
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
