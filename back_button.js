(function () {
  const BACK_ICON_URL = "/images/icon/back_button.png";

  function adjustBackButton() {
    const parentContainer = document.querySelector(".chips-categories__inner");
    let customBtn = document.getElementById("custom-back-btn");

    // 1. Условие: если мы на главной странице (body.home-page)
    if (document.body.classList.contains("home-page")) {
      if (customBtn) {
        customBtn.style.display = "none";
      }
      return;
    }

    // 2. Если мы НЕ на главной, и контейнер существует
    if (parentContainer) {
      if (!customBtn) {
        // Создаем кнопку-картинку
        customBtn = document.createElement("img");
        customBtn.id = "custom-back-btn";
        customBtn.src = BACK_ICON_URL;
        customBtn.alt = "Back";

        // Стилизация
        customBtn.style.cursor = "pointer";
        customBtn.style.display = "block";
        customBtn.style.width = "80vw";
        customBtn.style.height = "auto";
        customBtn.style.margin = "0 auto"; // Центрирование, если нужно

        // Имитация клика по оригинальной кнопке "Назад"
        customBtn.addEventListener("click", () => {
          const originalBack = document.getElementById("chips_name");
          if (originalBack) {
            originalBack.click();
          }
        });

        // Вставляем ПЕРЕД контейнером .chips-categories__inner
        parentContainer.parentNode.insertBefore(customBtn, parentContainer);
      } else {
        // Если кнопка уже создана, просто показываем её
        customBtn.style.display = "block";
      }
    }
  }

  // Запуск при загрузке
  adjustBackButton();

  // Наблюдатель за изменениями (для динамических переходов без перезагрузки)
  const observer = new MutationObserver(() => {
    adjustBackButton();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
})();
