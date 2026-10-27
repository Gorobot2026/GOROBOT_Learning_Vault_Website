/* GO ROBOT Learning Vault — static GitHub Pages frontend.
 * Public reads use Google Apps Script JSONP. No passwords or write keys here.
 */
(() => {
  "use strict";

  const cfg = window.GOROBOT_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const state = { categories: [], resources: [], category: "all", type: "all", query: "", loading: false, error: "", configured: false };
  const sampleCategories = [
    { id: "demo-games", name: "เกมและภารกิจ", description: "เกมเขียนโค้ดและภารกิจหุ่นยนต์", icon: "Gamepad2", accent: "purple" },
    { id: "demo-docs", name: "เอกสารและใบงาน", description: "คู่มือและเอกสารประกอบบทเรียน", icon: "BookOpen", accent: "blue" },
    { id: "demo-video", name: "วิดีโอและสื่อ", description: "วิดีโอและสื่อการเรียนรู้", icon: "MonitorPlay", accent: "pink" },
    { id: "demo-contest", name: "การแข่งขัน", description: "กติกาและสื่อเตรียมการแข่งขัน", icon: "Trophy", accent: "orange" }
  ];
  const colorNames = new Set(["purple", "blue", "teal", "orange", "pink", "indigo"]);

  const paths = {
    LayoutDashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    Gamepad2: '<path d="M6 12h4m-2-2v4m7-2h.01M18 10h.01"/><path d="M6 6h12a4 4 0 0 1 3.9 3l1.1 7a3 3 0 0 1-4.8 2.8L16 17H8l-2.2 1.8A3 3 0 0 1 1 16l1.1-7A4 4 0 0 1 6 6Z"/>',
    BookOpen: '<path d="M12 7v14m0-14C9.5 5 6.3 4.5 3 5v14c3.3-.5 6.5 0 9 2m0-14c2.5-2 5.7-2.5 9-2v14c-3.3-.5-6.5 0-9 2"/>',
    FileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8m-8 4h8"/>',
    Video: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-3v10l-4-3"/>',
    Trophy: '<path d="M8 3h8v8a4 4 0 0 1-8 0V3ZM8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 3v5m-5 1h10"/>',
    Bot: '<rect x="4" y="8" width="16" height="12" rx="4"/><path d="M12 8V4m-6 8H4m16 0h2"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/>',
    Code2: '<path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-12-2 20"/>',
    FolderOpen: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v2M3 7v12a2 2 0 0 0 2 2h13a2 2 0 0 0 2-1l3-7a2 2 0 0 0-2-3H6a2 2 0 0 0-2 2"/>',
    GraduationCap: '<path d="m2 9 10-5 10 5-10 5-10-5Zm4 2v5c3 3 9 3 12 0v-5m4-2v7"/>',
    Cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v4m6-4v4m-6 14v4m6-4v4M1 9h4m-4 6h4m14-6h4m-4 6h4"/>',
    Puzzle: '<path d="M8 3H3v7h2a2 2 0 0 1 0 4H3v7h7v-2a2 2 0 0 1 4 0v2h7v-7h-2a2 2 0 0 1 0-4h2V3h-7v2a2 2 0 0 1-4 0V3H8Z"/>',
    MonitorPlay: '<rect x="2" y="3" width="20" height="15" rx="2"/><path d="m10 8 5 3-5 3V8Zm-3 14h10m-5-4v4"/>',
    Lightbulb: '<path d="M9 18h6m-5 4h4M9 15a7 7 0 1 1 6 0l-1 3h-4l-1-3Z"/>',
    Wrench: '<path d="M15 6a5 5 0 0 0-6 6L3 18a2 2 0 1 0 3 3l6-6a5 5 0 0 0 6-6l-3 3-3-3 3-3Z"/>',
    Layers: '<path d="m12 2 10 5-10 5L2 7l10-5Zm-10 10 10 5 10-5M2 17l10 5 10-5"/>',
    Rocket: '<path d="M4 15c1-7 5-11 13-12l4 4c-1 8-5 12-12 13L4 15Zm6-2 3 3m2-7h.01M5 17l-3 5 5-3"/>',
    BrainCircuit: '<path d="M12 5a4 4 0 0 0-7 2 4 4 0 0 0-1 7 4 4 0 0 0 5 6c2 0 3-1 3-3V5Zm0 0a4 4 0 0 1 7 2 4 4 0 0 1 1 7 4 4 0 0 1-5 6c-2 0-3-1-3-3"/>',
    Presentation: '<rect x="3" y="3" width="18" height="14" rx="1"/><path d="M12 17v5m-5 0h10m-9-9 3-3 3 2 3-4"/>',
    Music2: '<path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-3-3c2 0 3 1 3 3Zm12-2a3 3 0 1 1-3-3c2 0 3 1 3 3Z"/>',
    Image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m21 15-5-5L4 21"/>',
    Sparkles: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Zm7 0 .6 1.4L21 4l-1.4.6L19 6l-.6-1.4L17 4l1.4-.6L19 2Z"/>',
    Settings2: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
    Search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    ArrowUpRight: '<path d="M6 18 18 6M7 6h11v11"/>',
    ExternalLink: '<path d="M12 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-7m-8-9h9v9m0-9L11 13"/>',
    ArrowDownToLine: '<path d="M12 3v13m-5-5 5 5 5-5M4 21h16"/>',
    Star: '<path d="m12 2 3 7 7 .6-5.5 5 1.7 7.4L12 18l-6.2 4 1.7-7.4L2 9.6 9 9l3-7Z"/>'
  };

  function icon(name, size = 20) {
    const p = paths[name] || paths.FolderOpen;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  }
  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[ch]));
  const validURL = (value) => {
    if (!value || !String(value).trim()) return "";
    try { const url = new URL(String(value)); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; }
    catch { return ""; }
  };
  const color = (c) => colorNames.has(c) ? c : "purple";
  const pad = (n) => String(n).padStart(2, "0");
  const smoothLibrary = () => $("library").scrollIntoView({ behavior: "smooth" });
  const tags = (r) => Array.isArray(r.tags) ? r.tags : (() => { try { const a=JSON.parse(r.tags||"[]");return Array.isArray(a)?a:[]; } catch {return [];} })();

  function toast(message) {
    const target = $("toast");
    target.textContent = String(message);
    target.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { target.hidden = true; }, 3500);
  }
  function displayIcon(name, image, size = 27) {
    const url = validURL(image);
    return url ? `<img src="${esc(url)}" alt="" loading="lazy" onerror="this.style.display='none'">` : icon(name, size);
  }
  function displayedCategories() { return state.categories.length ? state.categories : sampleCategories; }
  function categoryById(id) { return state.categories.find(c => String(c.id) === String(id)); }

  function categoryCard(c, index) {
    const selected = state.category === c.id;
    return `<button type="button" class="category-card accent-${color(c.accent)} ${selected?"chosen":""}" data-category="${esc(c.id)}">
      <span class="cat-artmark">${pad(index + 1)}</span>
      <span class="cat-icon">${displayIcon(c.icon, c.imageUrl, 31)}</span>
      <span class="cat-title">${esc(c.name)}</span>
      <span class="cat-description">${esc(c.description || "")}</span>
      <span class="cat-bottom"><span>${Number(c.count) || 0} รายการ</span><span class="cat-arrow">${icon("ArrowUpRight",16)}</span></span>
    </button>`;
  }
  function resourceCard(r) {
    const c = categoryById(r.categoryId);
    const file = r.type === "file";
    const href = validURL(file ? r.fileUrl : r.href);
    if (!href) return "";
    const cover = validURL(r.coverUrl);
    const accent = color(c?.accent || "purple");
    const typeIcon = file ? icon("FileText",37) : icon("Gamepad2",37);
    const hashTags = tags(r).slice(0,3).map(t => `<span>#${esc(t)}</span>`).join("");
    return `<a class="resource-card" href="${esc(href)}" target="_blank" rel="noopener noreferrer">
      <div class="resource-cover cover-${accent}">
        ${cover ? `<img src="${esc(cover)}" alt="" loading="lazy" onerror="this.style.display='none'">` :
          `<div class="cover-lines"></div><div class="cover-rings"></div><span class="cover-symbol">${typeIcon}</span><span class="cover-word">GO ROBOT</span>`}
        ${Number(r.featured) ? `<span class="featured-flag">★ FEATURED</span>` : ""}
      </div>
      <div class="resource-card-body">
        <div class="resource-meta">
          <span class="resource-kind ${file?"file-kind":""}">${file ? icon("ArrowDownToLine",13) : icon("ExternalLink",13)} ${file?"DOWNLOAD":"EXTERNAL LINK"}</span>
          <span class="resource-category">${esc(c?.name || "สื่อการเรียนรู้")}</span>
        </div>
        <h3>${esc(r.title)}</h3>
        <p>${esc(r.description || "เปิดเพื่อเรียนรู้และสำรวจสื่อการเรียนรู้นี้")}</p>
        <div class="resource-tags">${hashTags}</div>
        <div class="resource-card-footer"><span>${file?"ดาวน์โหลดไฟล์":"เปิดเว็บไซต์"} ${icon("ArrowUpRight",15)}</span><span class="round-link">${icon("ArrowUpRight",17)}</span></div>
      </div>
    </a>`;
  }

  function filteredResources() {
    const q = state.query.trim().toLocaleLowerCase();
    return state.resources.filter(r => {
      if (state.category !== "all" && String(r.categoryId) !== String(state.category)) return false;
      if (state.type !== "all" && r.type !== state.type) return false;
      if (!q) return true;
      const c = categoryById(r.categoryId);
      return [r.title, r.description, c?.name, ...tags(r)].join(" ").toLocaleLowerCase().includes(q);
    });
  }
  function renderNavigation() {
    const cats = displayedCategories();
    $("sideCategoryNav").innerHTML = cats.map(c => `<button type="button" class="side-link category-side ${state.category===c.id?"active":""}" data-category="${esc(c.id)}">
      <span class="side-icon-tiny accent-${color(c.accent)}">${displayIcon(c.icon,c.imageUrl,15)}</span>
      <span class="nav-name">${esc(c.name)}</span><span class="side-count">${Number(c.count)||0}</span>
    </button>`).join("");
    $("homeNav").classList.toggle("active", state.category === "all");
    $("breadcrumbLabel").textContent = categoryById(state.category)?.name || "Learning library";
    $("categoryFilters").innerHTML = `<button type="button" data-category="all" class="${state.category==="all"?"active":""}">ทุกหมวดหมู่</button>` +
      state.categories.map(c=>`<button type="button" data-category="${esc(c.id)}" class="${state.category===c.id?"active":""}">${esc(c.name)}</button>`).join("");
  }
  function render() {
    state.categories.forEach(c => c.count = state.resources.filter(r => String(r.categoryId) === String(c.id)).length);
    $("categoryGrid").innerHTML = displayedCategories().map(categoryCard).join("");
    $("categoryCounter").textContent = state.categories.length + " CATEGORIES";
    $("statCategories").textContent = pad(state.categories.length);
    $("statLinks").textContent = pad(state.resources.filter(r=>r.type==="link").length);
    $("statFiles").textContent = pad(state.resources.filter(r=>r.type==="file").length);
    renderNavigation();

    const featured = state.resources.filter(r => Number(r.featured) && validURL(r.type==="file"?r.fileUrl:r.href)).slice(0,3);
    $("featuredSection").hidden = featured.length === 0;
    $("featuredGrid").innerHTML = featured.map(resourceCard).join("");

    const filtered = filteredResources();
    $("filteredCount").textContent = filtered.length;
    const visibleCards = filtered.map(resourceCard).filter(Boolean);
    $("resourceGrid").innerHTML = visibleCards.join("");
    $("emptyState").hidden = visibleCards.length !== 0;
    if (!visibleCards.length) {
      $("emptyTitle").textContent = state.error ? "ยังโหลดข้อมูลไม่ได้" : state.query ? "ยังไม่พบสิ่งที่ค้นหา" : state.resources.length ? "ยังไม่มีรายการในหมวดหมู่นี้" : "พื้นที่สำหรับไอเดียดี ๆ กำลังรออยู่";
      $("emptyMessage").textContent = state.error || (!state.configured ? "ยังไม่ได้ใส่ลิงก์ Apps Script ใน config.js กรุณาตั้งค่าก่อนใช้งานจริง" : state.query ? "ลองใช้คำค้นอื่น หรือเลือกหมวดหมู่ใหม่" : "ยังไม่มีสื่อในหมวดนี้ ผู้ดูแลสามารถเพิ่มได้จาก Admin Portal");
    }
    document.querySelectorAll(".resource-filters button").forEach(b=>b.classList.toggle("selected",b.dataset.type===state.type));
  }

  function setCategory(id) {
    if (id !== "all" && !state.categories.some(c=>String(c.id)===String(id))) {
      toast("หมวดหมู่นี้จะพร้อมใช้งานหลังเชื่อมฐานข้อมูล");
      return;
    }
    state.category = id;
    render();
    closeMenu();
    smoothLibrary();
  }
  function closeMenu() {
    $("sidebar").classList.remove("is-open");
    $("mobileScrim").hidden = true;
  }

  function loadCatalog() {
    const url = validURL(cfg.APPS_SCRIPT_URL);
    const isGoogle = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url);
    state.configured = isGoogle;
    if (!isGoogle) { state.error = ""; state.categories=[];state.resources=[];render();return; }
    if (state.loading) return;
    state.loading = true;
    $("refreshButton").disabled = true;
    state.error = "";
    let script = null;
    let timeout = null;
    let finished = false;
    const finalize = (message, data) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      if (script) script.remove();
      delete window.GoRobotCatalogReceive;
      state.loading = false;
      $("refreshButton").disabled = false;
      if (message) { state.error = message; toast("ไม่สามารถเชื่อม Google Sheets ได้"); }
      else {
        state.categories = Array.isArray(data.categories) ? data.categories : [];
        state.resources = Array.isArray(data.resources) ? data.resources : [];
        if (!state.categories.some(c=>String(c.id)===String(state.category))) state.category="all";
      }
      render();
    };
    window.GoRobotCatalogReceive = (payload) => {
      if (!payload || payload.ok !== true) finalize(payload?.error || "ฐานข้อมูลตอบกลับไม่ถูกต้อง");
      else finalize("", payload);
    };
    script = document.createElement("script");
    script.async = true;
    script.referrerPolicy = "no-referrer";
    script.src = url + "?mode=catalog&callback=GoRobotCatalogReceive&v=" + Date.now();
    script.onerror = () => finalize("ไม่สามารถโหลดข้อมูลจาก Google Apps Script ได้");
    timeout = setTimeout(() => finalize("การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองอีกครั้ง"), 18000);
    document.head.appendChild(script);
  }

  function init() {
    document.querySelectorAll("[data-icon]").forEach(el => el.innerHTML = icon(el.dataset.icon, 20));
    const adminBase = validURL(cfg.APPS_SCRIPT_URL);
    const adminHref = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(adminBase) ? adminBase + "?mode=admin" : "";
    ["adminTop", "adminSidebar"].forEach(id => {
      const link = $(id);
      link.href = adminHref || "#";
      if (adminHref) { link.target="_blank";link.rel="noopener noreferrer"; }
      else link.addEventListener("click", e=>{e.preventDefault();toast("กรุณาตั้งค่า Apps Script URL ใน config.js ก่อน");});
    });
    $("homeNav").addEventListener("click",()=>{state.category="all";render();closeMenu();window.scrollTo({top:0,behavior:"smooth"});});
    $("exploreButton").addEventListener("click",smoothLibrary);
    $("searchInput").addEventListener("input",e=>{state.query=e.target.value;render();});
    $("openMenu").addEventListener("click",()=>{$("sidebar").classList.add("is-open");$("mobileScrim").hidden=false;});
    $("closeMenu").addEventListener("click",closeMenu);
    $("mobileScrim").addEventListener("click",closeMenu);
    $("refreshButton").addEventListener("click",loadCatalog);
    $("reloadTop").addEventListener("click",loadCatalog);
    document.addEventListener("click",e=>{
      const categoryButton=e.target.closest("[data-category]");
      if(categoryButton) setCategory(categoryButton.dataset.category);
      const typeButton=e.target.closest(".resource-filters [data-type]");
      if(typeButton){state.type=typeButton.dataset.type;render();}
    });
    loadCatalog();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
