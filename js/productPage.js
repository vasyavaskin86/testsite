function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function firstImage(product) {
  const imgs = Array.isArray(product.images) ? product.images : [];
  if (imgs.length) return imgs[0];
  if (product.image) return product.image;
  return "https://images.pexels.com/photos/276517/pexels-photo-276517.jpeg?auto=compress&cs=tinysrgb&w=1200";
}

function normalizeImages(product) {
  const imgs = Array.isArray(product.images) ? product.images : [];
  const normalized = imgs.filter((x) => typeof x === "string" && x.trim().length > 0).slice(0, 10);
  if (normalized.length) return normalized;
  return [firstImage(product)];
}

function setHeaderUI() {
  setHeaderAuthUI?.();
  setCartCountUI?.();

  document.getElementById("authButton")?.addEventListener("click", () => {
    const user = typeof currentUser === "function" ? currentUser() : null;
    if (!user) openAuthModal();
  });

  document.getElementById("logoutButton")?.addEventListener("click", () => {
    logoutUser();
    document.dispatchEvent(new CustomEvent("auth:changed"));
  });

  document.addEventListener("auth:changed", () => {
    mergeGuestCartIntoUser?.();
    setHeaderAuthUI?.();
    setCartCountUI?.();
  });

  document.addEventListener("cart:changed", () => {
    setCartCountUI?.();
  });
}

function addSpec(dt, dd, title, value) {
  if (value === undefined || value === null || value === "") return;
  const dtEl = document.createElement("dt");
  dtEl.textContent = title;
  const ddEl = document.createElement("dd");
  ddEl.textContent = String(value);
  dt.appendChild(dtEl);
  dd.appendChild(ddEl);
}

function renderSpecs(product) {
  const dl = document.getElementById("specsList");
  if (!dl) return;
  dl.innerHTML = "";

  const attrs = product.attributes || {};

  const pairs = [
    ["Категория", getCategoryLabel?.(product.category) || product.category],
    ["Цена", `${formatPrice?.(product.price) || product.price} ₽`],
    ["Производитель", attrs.manufacturer],
    ['Диаметр колеса (" )', attrs.wheelDiameter],
    ["Размер рамы", attrs.frameSize],
    ["Цвет", attrs.color],
    ["Тормоза", attrs.brakeType],
    ["Подвеска", attrs.suspension],
  ];

  pairs.forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    const dt = document.createElement("dt");
    dt.textContent = k;
    const dd = document.createElement("dd");
    dd.textContent = String(v);
    dl.appendChild(dt);
    dl.appendChild(dd);
  });

  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem("sportshop_settings") || "{}");
  } catch {}
  if (settings.enableWarehouseStocks !== false) {
    const stocks = Array.isArray(product.stocksByWarehouse) ? product.stocksByWarehouse : [];
    stocks.forEach((s) => {
      const dt = document.createElement("dt");
      dt.textContent = `Остаток (${s.warehouse})`;
      const dd = document.createElement("dd");
      dd.textContent = `${Number(s.qty) || 0} шт.`;
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
  }
}

function renderGallery(images) {
  const main = document.getElementById("mainPhoto");
  const thumbs = document.getElementById("thumbs");
  if (!main || !thumbs) return;

  let active = images[0];

  function setActive(url) {
    active = url;
    main.style.backgroundImage = `url('${url}')`;
    main.dataset.url = url;
    thumbs.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", b.dataset.url === url);
    });
  }

  thumbs.innerHTML = "";
  images.forEach((url) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "thumb";
    btn.dataset.url = url;
    btn.style.backgroundImage = `url('${url}')`;
    btn.addEventListener("click", () => setActive(url));
    thumbs.appendChild(btn);
  });

  setActive(active);
}

function initBackButton() {
  const btn = document.getElementById("backButton");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (window.history.length > 1) window.history.back();
    else window.location.href = "index.html#catalog";
  });
}

function openLightbox(images, startIndex = 0) {
  const modal = document.getElementById("lightbox");
  const img = document.getElementById("lightboxImg");
  const counter = document.getElementById("lightboxCounter");
  const prev = document.getElementById("lightboxPrev");
  const next = document.getElementById("lightboxNext");
  if (!modal || !img || !counter || !prev || !next) return;

  let idx = Math.max(0, Math.min(startIndex, images.length - 1));

  function render() {
    img.src = images[idx];
    counter.textContent = `${idx + 1} / ${images.length}`;
    prev.disabled = images.length <= 1;
    next.disabled = images.length <= 1;
  }

  function close() {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    window.removeEventListener("keydown", onKeyDown);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") {
      idx = (idx - 1 + images.length) % images.length;
      render();
    }
    if (e.key === "ArrowRight") {
      idx = (idx + 1) % images.length;
      render();
    }
  }

  modal.addEventListener(
    "click",
    (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.close === "true") close();
    },
    { once: true }
  );

  prev.onclick = () => {
    idx = (idx - 1 + images.length) % images.length;
    render();
  };
  next.onclick = () => {
    idx = (idx + 1) % images.length;
    render();
  };

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
  window.addEventListener("keydown", onKeyDown);
  render();
}

function renderProductPage(product) {
  document.title = `${product.name} — СТАРТ`;

  document.getElementById("productTitle").textContent = product.name;
  document.getElementById("productSubtitle").textContent = product.description || "";
  document.getElementById("productPrice").textContent = `${formatPrice(product.price)} ₽`;

  const full =
    (product.fullDescription && String(product.fullDescription).trim()) ||
    product.description ||
    "";

  document.getElementById("fullDescription").textContent = full;

  const imgs = normalizeImages(product);
  renderGallery(imgs);
  renderSpecs(product);

  document.getElementById("mainPhoto")?.addEventListener("click", () => {
    const current = document.getElementById("mainPhoto")?.dataset.url;
    const startIndex = Math.max(0, imgs.findIndex((x) => x === current));
    openLightbox(imgs, startIndex);
  });

  document.getElementById("thumbs")?.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const btn = target.closest(".thumb");
    if (!(btn instanceof HTMLElement)) return;
    const url = btn.dataset.url;
    const startIndex = Math.max(0, imgs.findIndex((x) => x === url));
    openLightbox(imgs, startIndex);
  });

  document.getElementById("addToCartButton").addEventListener("click", () => {
    addToCart(product.id, 1);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await restoreSession?.();
  await syncPublicDataFromServer?.();
  initYear?.();
  setHeaderUI();
  initBackButton();

  const id = getProductIdFromUrl();
  const products = loadProducts?.() || [];
  const product = products.find((p) => p.id === id);

  const notFound = document.getElementById("productNotFound");
  const section = document.getElementById("productSection");

  if (!product) {
    notFound.classList.remove("hidden");
    section.classList.add("hidden");
    return;
  }

  notFound.classList.add("hidden");
  section.classList.remove("hidden");
  renderProductPage(product);
});

