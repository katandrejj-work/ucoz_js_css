/**
 * Скрипт: Индикатор главной страницы
 * Назначение: Добавляет класс 'home-page' к <body>, если текст в '.js-cat-name-text' равен 'Главная'.
 * Поддерживает динамическое обновление контента (SPA/MutationObserver).
 */

(function () {
  const targetSelector = ".js-cat-name-text";
  const homeText = "Главная";
  const bodyClass = "home-page";

  const updateBodyIndicator = () => {
    const catElement = document.querySelector(targetSelector);
    const currentText = catElement ? catElement.textContent.trim() : null;

    // Лог для отладки — откройте консоль (F12), чтобы увидеть это
    // console.log('Текущий текст категории:', currentText);

    if (currentText === homeText) {
      document.body.classList.add(bodyClass);
    } else {
      document.body.classList.remove(bodyClass);
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

  // Первая проверка
  updateBodyIndicator();
})();
