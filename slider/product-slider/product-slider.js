/**
 * Слайдер v3.0
 *
 * Проблема была: SPA делает несколько childList-операций при переходе:
 *   1. added:32  — добавляет клоны слайдера (!) в свой рендер
 *   2. added:25 removed:64 — финальная фильтрация, убирает лишнее
 * Слайдер стартовал на шаге 1 и видел неверное количество.
 *
 * Решение: инициализируемся только после шага с removed > 0
 * (финальная фильтрация SPA) + debounce 200ms что DOM устаканился.
 *
 * Клоны НИКОГДА не попадают в счётчик — фильтруем по data-clone.
 * Клоны удаляются ДО того как SPA получит управление — в destroy().
 */

(() => {
  const ALLOWED_PAGES = ["projects-page", "solutions-page"];
  const BLOCKED_PAGES = ["home-page"];
  const STABLE_MS = 200; // ждём после последнего childList-события

  // ─── Страница ─────────────────────────────────────────────

  const isPageAllowed = () => {
    const cls = document.body.classList;
    return (
      ALLOWED_PAGES.some((c) => cls.contains(c)) &&
      !BLOCKED_PAGES.some((c) => cls.contains(c))
    );
  };

  // ─── Товары — только оригиналы, никогда клоны ─────────────

  const getOriginals = (container) =>
    Array.from(container.querySelectorAll(".product:not([data-clone])"));

  // ─── Клоны ────────────────────────────────────────────────

  const createClones = (container, originals) => {
    originals.forEach((src, index) => {
      const make = (type) => {
        const c = document.createElement("div");
        c.className = src.className;
        c.innerHTML = src.innerHTML;
        c.dataset.clone = type;
        c.dataset.originalIndex = index;
        c.classList.remove("active");
        c.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
        return c;
      };
      container.insertBefore(make("before"), container.firstChild);
      container.appendChild(make("after"));
    });
  };

  const removeClones = (container) =>
    container
      .querySelectorAll(".product[data-clone]")
      .forEach((el) => el.remove());

  // ─── Пагинация ────────────────────────────────────────────

  const buildPagination = (container, count, onDotClick) => {
    let pag = container.nextElementSibling;
    if (!pag?.classList.contains("pagination")) {
      pag = document.createElement("div");
      pag.className = "pagination";
      container.insertAdjacentElement("afterend", pag);
    }
    pag.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const btn = document.createElement("button");
      btn.setAttribute("aria-label", `Перейти к слайду ${i + 1}`);
      btn.addEventListener("click", () => onDotClick(i));
      pag.appendChild(btn);
    }
    return pag;
  };

  const setActiveDot = (pag, idx) =>
    pag
      ?.querySelectorAll("button")
      .forEach((b, i) => b.classList.toggle("active", i === idx));

  // ─── Скролл ───────────────────────────────────────────────

  const centeredLeft = (container, el) =>
    el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;

  const createScrollCtrl = (container, originals, pag) => {
    let adjusting = false;
    let timer = null;

    const all = () => Array.from(container.querySelectorAll(".product"));

    const closest = () => {
      const cx = container.scrollLeft + container.offsetWidth / 2;
      let min = Infinity,
        found = null;
      for (const p of all()) {
        const d = Math.abs(cx - (p.offsetLeft + p.offsetWidth / 2));
        if (d < min) {
          min = d;
          found = p;
        }
      }
      return found;
    };

    const realIdx = (el) =>
      el.dataset.clone
        ? parseInt(el.dataset.originalIndex, 10)
        : originals.indexOf(el);

    const sync = () => {
      const el = closest();
      if (!el) return;
      const idx = realIdx(el);
      if (container.dataset.activeIndex === String(idx)) return;
      container.dataset.activeIndex = idx;
      originals.forEach((p, i) => p.classList.toggle("active", i === idx));
      setActiveDot(pag, idx);
    };

    const loopCheck = () => {
      const el = closest();
      if (!el?.dataset.clone) return;
      adjusting = true;
      const target = originals[parseInt(el.dataset.originalIndex, 10)];
      container.style.scrollBehavior = "auto";
      container.scrollLeft = centeredLeft(container, target);
      setTimeout(() => {
        adjusting = false;
        container.style.scrollBehavior = "";
      }, 50);
    };

    const onScroll = () => {
      if (adjusting) return;
      sync();
      clearTimeout(timer);
      timer = setTimeout(loopCheck, 150);
    };

    const scrollTo = (idx, smooth = true) => {
      const t = originals[idx];
      if (!t) return;
      container.scrollTo({
        left: centeredLeft(container, t),
        behavior: smooth ? "smooth" : "auto",
      });
    };

    const initPos = () => {
      const active =
        originals.find((p) => p.classList.contains("active")) ?? originals[0];
      if (!active) return;
      const idx = originals.indexOf(active);
      const left = centeredLeft(container, active);

      // Выставляем активное состояние синхронно — не ждём скролла
      container.dataset.activeIndex = idx;
      originals.forEach((p, i) => p.classList.toggle("active", i === idx));
      setActiveDot(pag, idx);

      container.style.scrollBehavior = "auto";
      container.scrollLeft = left;
      requestAnimationFrame(() => {
        container.scrollLeft = left + 1;
        requestAnimationFrame(() => {
          container.scrollLeft = left;
        });
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });

    return {
      scrollTo,
      initPos,
      destroy() {
        container.removeEventListener("scroll", onScroll);
        clearTimeout(timer);
      },
    };
  };

  // ─── Состояние ────────────────────────────────────────────

  let current = null; // { container, count, ctrl, pag }

  const destroySlider = () => {
    if (!current) return;
    current.ctrl.destroy();
    // Удаляем клоны ДО того как SPA может их подхватить
    removeClones(current.container);
    if (current.pag) current.pag.innerHTML = "";
    current.container.dataset.sliderInit = "false";
    current = null;
  };

  const initSlider = (container) => {
    destroySlider();

    const originals = getOriginals(container);
    if (originals.length === 0) return;

    container.dataset.sliderInit = "true";
    createClones(container, originals);

    // Пагинация создаётся до scrollCtrl чтобы передать в него
    // scrollTo будет доступен через замыкание после создания ctrl
    let ctrl;
    const pag = buildPagination(container, originals.length, (i) =>
      ctrl.scrollTo(i),
    );
    ctrl = createScrollCtrl(container, originals, pag);

    current = { container, count: originals.length, ctrl, pag };

    ctrl.initPos();
    setTimeout(() => ctrl.initPos(), 100);
    setTimeout(() => ctrl.initPos(), 500);
  };

  // ─── Observer — только на .products, только childList ─────
  //
  // Ключевая логика:
  // - Запускаемся только если последняя пачка мутаций содержала
  //   removedNodes (это финальная фильтрация SPA, не наши клоны)
  // - Debounce STABLE_MS — DOM устаканился
  // - Если страница не разрешена — уничтожаем
  //
  // body[class] НЕ используем как триггер — он приходит
  // одновременно с childList и не даёт нужной последовательности.

  let stableTimer = null;
  let hadRemovals = false;
  let watching = null; // текущий наблюдаемый контейнер

  const onChildList = (mutations) => {
    const removed = mutations.reduce((n, m) => n + m.removedNodes.length, 0);
    if (removed > 0) hadRemovals = true;

    clearTimeout(stableTimer);
    stableTimer = setTimeout(() => {
      if (!isPageAllowed()) {
        destroySlider();
        hadRemovals = false;
        return;
      }

      // Инициализируемся только если было реальное удаление
      // (финальная фильтрация SPA), а не только добавление клонов
      if (!hadRemovals) {
        hadRemovals = false;
        return;
      }

      hadRemovals = false;

      const container = document.querySelector(".products");
      if (!container) {
        destroySlider();
        return;
      }

      const originals = getOriginals(container);

      // Если счётчик не изменился — не переинициализируем
      if (
        current?.container === container &&
        current.count === originals.length
      )
        return;

      initSlider(container);
    }, STABLE_MS);
  };

  // Подключаем observer к контейнеру
  const attachObserver = () => {
    const container = document.querySelector(".products");
    if (!container || container === watching) return;

    if (watching) watching._obs?.disconnect();

    const obs = new MutationObserver(onChildList);
    obs.observe(container, { childList: true });
    container._obs = obs;
    watching = container;
  };

  // ─── Старт ────────────────────────────────────────────────
  // Наблюдаем за появлением .products в DOM (SPA может его создать позже)

  const rootObs = new MutationObserver(() => attachObserver());
  rootObs.observe(document.querySelector("main") ?? document.body, {
    childList: true,
    subtree: false,
  });

  attachObserver();
})();
