/**
 * Инициализация слайдера с привязкой пагинации к реальному положению скролла
 */
function initSlider() {
  const container = document.querySelector(".products");
  const products = document.querySelectorAll(".product");

  // Проверка на существование и повторную инициализацию
  if (
    !container ||
    products.length === 0 ||
    container.dataset.sliderInit === "true"
  )
    return;
  container.dataset.sliderInit = "true";

  // 1. Подготовка пагинации
  let paginationContainer = document.querySelector(".pagination");
  if (!paginationContainer) {
    paginationContainer = document.createElement("div");
    paginationContainer.className = "pagination";
    container.insertAdjacentElement("afterend", paginationContainer);
  }
  paginationContainer.innerHTML = "";

  // Создаем точки пагинации
  products.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.setAttribute("aria-label", `Go to slide ${i + 1}`);
    btn.addEventListener("click", () => {
      scrollToIndex(i);
    });
    paginationContainer.appendChild(btn);
  });

  const dots = paginationContainer.querySelectorAll("button");

  /**
   * Функция плавного скролла к нужному индексу
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
   * Синхронизация активной точки и класса товара на основе позиции скролла
   * Работает для тача, мыши, колесика и клавиатуры
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

    // Обновляем активные классы только если индекс изменился (оптимизация)
    if (container.dataset.activeIndex !== String(closestIndex)) {
      container.dataset.activeIndex = closestIndex;

      products.forEach((p, i) =>
        p.classList.toggle("active", i === closestIndex),
      );
      dots.forEach((dot, i) =>
        dot.classList.toggle("active", i === closestIndex),
      );
    }
  }

  // 2. Слушатель скролла для обновления пагинации "на лету"
  container.addEventListener(
    "scroll",
    () => {
      window.requestAnimationFrame(syncActiveState);
    },
    { passive: true },
  );

  // 3. Логика перетаскивания мышью (Drag-to-Scroll) для ПК
  let isDragging = false;
  let startX, scrollLeftPos;

  container.addEventListener("mousedown", (e) => {
    isDragging = true;
    container.classList.add("dragging");
    container.style.cursor = "grabbing";
    container.style.scrollBehavior = "auto"; // Отключаем smooth во время драга для отзывчивости
    startX = e.pageX - container.offsetLeft;
    scrollLeftPos = container.scrollLeft;
  });

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5; // Скорость прокрутки
    container.scrollLeft = scrollLeftPos - walk;
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    isDragging = false;
    container.classList.remove("dragging");
    container.style.cursor = "grab";
    container.style.scrollBehavior = "smooth";

    // После того как отпустили мышь — "примагничиваем" к ближайшему слайду
    const currentIndex = parseInt(container.dataset.activeIndex);
    scrollToIndex(currentIndex);
  };

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);

  // Начальная установка
  container.style.cursor = "grab";
  syncActiveState();
}

/**
 * Глобальный контроль запуска
 */
function checkAndInitSlider() {
  // Инициализируем только если НЕ главная (согласно вашему условию)
  if (!document.body.classList.contains("home-page")) {
    initSlider();
  }
}

// Следим за динамическими изменениями (например, если товары подгружаются после AJAX)
let initTimeout;
const observer = new MutationObserver(() => {
  clearTimeout(initTimeout);
  initTimeout = setTimeout(checkAndInitSlider, 150);
});

// Наблюдаем за body, так как .products может появиться позже
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Запуск при загрузке
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", checkAndInitSlider);
} else {
  checkAndInitSlider();
}
