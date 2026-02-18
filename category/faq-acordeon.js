(function () {
  // MaisonDelux • FAQ External Config • PROD v1.0
  // зачем: управлять FAQ через /config/faq.txt
  // если файл не загрузился → используем дефолт

  const FAQ_ID = "11";
  const FAQ_CONFIG_URL = "/config/faq.txt";

  let __FAQ_ITEMS__ = null;
  let __FAQ_ERROR_LOGGED__ = false;

  // ===== LOGS (по твоему стандарту) =====
  function faqLogInfo(msg) {
    console.log("%c[INFO] " + msg, "color:#007bff;");
  }
  function faqLogSuccess(msg) {
    console.log("%c[SUCCESS] " + msg, "color:#28a745;");
  }
  function faqLogError(msg) {
    if (__FAQ_ERROR_LOGGED__) return;
    __FAQ_ERROR_LOGGED__ = true;
    console.log("%c[ERROR] " + msg, "color:#dc3545;font-weight:bold;");
  }

  // ======================
  // ДЕФОЛТНЫЕ ДАННЫЕ (fallback)
  // ======================
  function getDefaultFaqItems() {
    return [
      {
        title: "Почему стоит делать приложение на Flutter?",
        content: "Flutter позволяет создавать кроссплатформенные приложения.",
      },
      {
        title: "Сколько стоит разработка?",
        content: "Стоимость зависит от сложности проекта.",
      },
    ];
  }

  // ======================
  // ПАРСИНГ faq.txt
  // ======================
  function parseFaqTxt(text) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

    const items = [];
    let current = null;

    lines.forEach((line) => {
      const clean = line.trim();
      if (!clean) {
        if (current) {
          items.push(current);
          current = null;
        }
        return;
      }

      const match = clean.match(/^([^:]+):\s*(.*)$/);
      if (!match) return;

      const key = match[1].toLowerCase().trim();
      const value = match[2].trim();

      if (key === "заголовок") {
        if (current) items.push(current);
        current = { title: value, content: "" };
      }

      if (key === "текст" && current) {
        current.content = value;
      }
    });

    if (current) items.push(current);

    return items;
  }

  // ======================
  // ЗАГРУЗКА КОНФИГА
  // ======================
  function loadFaqConfig() {
    return fetch(FAQ_CONFIG_URL, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then((text) => {
        const parsed = parseFaqTxt(text);

        if (!parsed.length) {
          throw new Error("FAQ parsed 0 items");
        }

        faqLogSuccess("FAQ loaded: " + parsed.length + " items");
        return parsed;
      });
  }

  // ======================
  // СОЗДАНИЕ FAQ БЛОКА
  // ======================
  function createFaqBlock() {
    const wrapper = document.createElement("div");
    wrapper.className = "faq-dynamic";

    (__FAQ_ITEMS__ || []).forEach((item) => {
      const faqItem = document.createElement("div");
      faqItem.className = "faq__item";

      const header = document.createElement("div");
      header.className = "faq__header";

      const title = document.createElement("div");
      title.className = "faq__title";
      title.textContent = item.title;

      const toggle = document.createElement("div");
      toggle.className = "faq__toggle";
      toggle.textContent = "+";

      const content = document.createElement("div");
      content.className = "faq__content";
      content.textContent = item.content;

      header.appendChild(title);
      header.appendChild(toggle);
      faqItem.appendChild(header);
      faqItem.appendChild(content);
      wrapper.appendChild(faqItem);
    });

    wrapper.addEventListener("click", function (e) {
      const header = e.target.closest(".faq__header");
      if (!header) return;

      const item = header.parentElement;
      const content = item.querySelector(".faq__content");
      const icon = item.querySelector(".faq__toggle");

      const isActive = item.classList.contains("active");

      if (isActive) {
        content.style.maxHeight = null;
        item.classList.remove("active");
        icon.textContent = "+";
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
        item.classList.add("active");
        icon.textContent = "−";
      }
    });

    return wrapper;
  }

  // ======================
  // ПЕРЕХВАТ FAQ
  // ======================
  document.addEventListener(
    "click",
    function (e) {
      const btn = e.target.closest(".chips-card.js-cat-link");
      if (!btn) return;
      if (btn.dataset.id !== FAQ_ID) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const parentLi = btn.closest(".chips-menu__item");
      if (!parentLi) return;

      const existing = parentLi.querySelector(".faq-dynamic");
      if (existing) {
        existing.remove();
        return;
      }

      const faqBlock = createFaqBlock();
      parentLi.appendChild(faqBlock);
    },
    true,
  );

  // ======================
  // BOOT
  // ======================
  loadFaqConfig()
    .then((items) => {
      __FAQ_ITEMS__ = items;
    })
    .catch((err) => {
      faqLogError("FAQ config load failed → using defaults. " + err.message);
      __FAQ_ITEMS__ = getDefaultFaqItems();
    });
})();
