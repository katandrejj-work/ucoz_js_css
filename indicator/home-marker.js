/**
 * Скрипт: Индикатор страниц по категориям
 * Назначение: Добавляет CSS-классы к <body> в зависимости от текста в '.js-cat-name-text'.
 * Поддерживает динамическое обновление контента (SPA/MutationObserver).
 */
(function () {
  // ============ КОНФИГУРАЦИЯ ============
  // Добавьте новые правила в формате: 'Текст категории': 'css-класс'
  const PAGE_MARKERS = {
    Главная: "home-page",
    "Наши решения": "solutions-page",
    "Наши проекты": "projects-page",
    FAQ: "faq-page",
    // Добавляйте новые страницы здесь:
    // 'О компании': 'about-page',
    // 'Контакты': 'contacts-page'
  };

  const TARGET_SELECTOR = ".js-cat-name-text";
  const DEBUG_MODE = false; // Установите false, чтобы отключить логи
  // ======================================

  // Собираем все возможные классы для удаления
  const allPageClasses = Object.values(PAGE_MARKERS);

  // Нормализация текста: убираем лишние пробелы, переносы строк и т.д.
  const normalizeText = (text) => {
    return text.replace(/\s+/g, " ").trim();
  };

  const updateBodyIndicator = () => {
    const catElement = document.querySelector(TARGET_SELECTOR);

    if (!catElement) {
      if (DEBUG_MODE) console.log("❌ Элемент не найден:", TARGET_SELECTOR);
      return;
    }

    const rawText = catElement.textContent;
    const currentText = normalizeText(rawText);

    // Отладочная информация
    if (DEBUG_MODE) {
      console.log("📍 Сырой текст:", JSON.stringify(rawText));
      console.log("✨ Нормализованный текст:", JSON.stringify(currentText));
      console.log("🔍 Ищем совпадение в:", Object.keys(PAGE_MARKERS));
    }

    // Удаляем все классы страниц
    document.body.classList.remove(...allPageClasses);

    // Добавляем нужный класс, если текст совпадает
    if (PAGE_MARKERS[currentText]) {
      document.body.classList.add(PAGE_MARKERS[currentText]);
      if (DEBUG_MODE) {
        console.log("✅ Добавлен класс:", PAGE_MARKERS[currentText]);
      }
    } else if (DEBUG_MODE && currentText) {
      console.log("⚠️ Совпадение не найдено для:", JSON.stringify(currentText));
      console.log("💡 Доступные ключи:", Object.keys(PAGE_MARKERS));
    }
  };

  const observer = new MutationObserver(() => {
    updateBodyIndicator();
  });

  // Начинаем наблюдение
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: false,
  });

  // На случай, если SPA использует History API без перерисовки всего DOM
  window.addEventListener("popstate", updateBodyIndicator);

  // Первая проверка при загрузке
  if (DEBUG_MODE) console.log("🚀 Скрипт запущен");
  updateBodyIndicator();
})();
