(function () {
  const BASE_URL = "https://protoinfo.ucoz.net/old/lp-old/";
  const MODAL_ID = "dynamic_product_modal_v3";

  if (window.__DYNAMIC_PRODUCT_MODAL_V3__) {
    console.log("Скрипт уже активен");
    return;
  }
  window.__DYNAMIC_PRODUCT_MODAL_V3__ = true;

  /* ================== Получение номера ================== */

  function extractProductId(el) {
    if (!el || !el.id) return null;
    const match = el.id.match(/^inf_product_(\d+)_img$/);
    return match ? match[1] : null;
  }

  /* ================== Получение HTML ================== */

  function loadHtml(url) {
    return fetch(url, { credentials: "same-origin" })
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then((html) => {
        const base = new URL(url);
        const basePath = base.origin + base.pathname.replace(/\/[^\/]*$/, "/");

        if (/<head[^>]*>/i.test(html)) {
          html = html.replace(
            /<head([^>]*)>/i,
            `<head$1><base href="${basePath}">`,
          );
        } else {
          html = `<head><base href="${basePath}"></head>` + html;
        }

        return html;
      });
  }

  /* ================== Создание модалки ================== */

  function createModal(html, url) {
    if (document.getElementById(MODAL_ID)) return;

    const overlay = document.createElement("div");
    overlay.id = MODAL_ID;

    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2147483647,
    });

    const container = document.createElement("div");
    Object.assign(container.style, {
      width: "100%",
      maxWidth: "1200px",
      height: "100%",
      background: "#fff",
      borderRadius: "8px",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    });

    const header = document.createElement("div");
    Object.assign(header.style, {
      padding: "8px 12px",
      background: "#f5f5f5",
      display: "flex",
      justifyContent: "space-between",
    });

    const title = document.createElement("div");
    title.textContent = url;
    title.style.fontSize = "12px";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕ Закрыть";
    closeBtn.style.cursor = "pointer";
    closeBtn.onclick = () => {
      overlay.remove();
      document.body.style.overflow = "";
    };

    header.appendChild(title);
    header.appendChild(closeBtn);

    /* ======== ОБЁРТКА ДЛЯ СКРЫТИЯ СКРОЛЛА ======== */

    const iframeWrapper = document.createElement("div");

    Object.assign(iframeWrapper.style, {
      flex: "1 1 auto",
      overflow: "hidden",
    });

    /* ======== IFRAME ======== */

    const iframe = document.createElement("iframe");

    iframe.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-forms allow-modals",
    );

    iframe.style.border = "0";
    iframe.style.height = "100%";
    iframe.style.width = "calc(100% + 20px)";
    iframe.style.paddingRight = "20px";
    iframe.style.boxSizing = "content-box";
    iframe.style.overflowY = "scroll";

    iframe.srcdoc = html;

    /* ======== СБОРКА ======== */

    iframeWrapper.appendChild(iframe);
    container.appendChild(header);
    container.appendChild(iframeWrapper);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    document.body.style.overflow = "hidden";
  }

  /* ================== Обработчик клика ================== */

  function handleClick(event) {
    const id = extractProductId(event.target);
    if (!id) return;

    event.preventDefault();
    event.stopPropagation();

    const url = BASE_URL + id + ".html";

    loadHtml(url)
      .then((html) => createModal(html, url))
      .catch((err) => {
        console.error("Ошибка загрузки:", err.message);
      });
  }

  /* ================== Запуск ================== */

  document.addEventListener("click", handleClick);

  console.log("Dynamic modal v3 ready.");
})();
