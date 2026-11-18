/* ==========================================================================
 * GO ROBOT Learning Vault — Trainer (Student Review) Standalone Script
 * --------------------------------------------------------------------------
 * Reads LEVELS, GEN_COUNTS, and DEFAULT_GEN_LINKS from trainer-data.js.
 * Search this file for "#comment" to find every Admin-related spot.
 * ========================================================================== */
(() => {
  "use strict";
  if (!document.getElementById('trainerView')) return;

  // ---------- 1. Load Configuration from trainer-data.js ----------
  const dataSource = window.TRAINER_DATA || {};
  const MAX_GENS = Number.isFinite(dataSource.MAX_GENS) ? dataSource.MAX_GENS : 4;
  const LEVELS = Array.isArray(dataSource.LEVELS) ? dataSource.LEVELS : [];
  const GEN_COUNTS = dataSource.GEN_COUNTS || {};
  const DEFAULT_GEN_LINKS = dataSource.DEFAULT_GEN_LINKS || {};

  const ALL_LEVEL_ID = 'all';
  const LEVEL_TABS = [{ id: ALL_LEVEL_ID, label: 'All' }, ...LEVELS];
  const LEVEL_META = Object.fromEntries(
    LEVELS.map((lv, index) => [
      lv.id,
      { index, label: lv.label, shortLabel: lv.label.replace(/\s+/g, '') },
    ])
  );

  function getLevelShortLabel(levelId) {
    return (LEVEL_META[levelId] && LEVEL_META[levelId].shortLabel) || levelId;
  }

  function makeGenRecord(levelId, num, preset = {}) {
    const genId = `gen${num}`;
    return {
      id: genId,
      key: `${levelId}:${genId}`,
      levelId,
      num,
      name: `Gen ${num}`,
      // Google Drive upload link (falls back to placeholder "#..." if not set)
      driveUrl: preset.driveUrl || `#${levelId}-drive-${genId}`,
      // Smartsheet / Assessment form link
      assessmentUrl: preset.assessmentUrl || `#${levelId}-assessment-${genId}`,
    };
  }

  // Build initial Gen objects for a given level
  function createGensForLevel(levelId, count) {
    const levelLinks = DEFAULT_GEN_LINKS[levelId] || {};
    const list = [];
    for (let i = 1; i <= count; i += 1) {
      list.push(makeGenRecord(levelId, i, levelLinks[`gen${i}`]));
    }
    return list;
  }

  // Initialize state.data for every level defined in LEVELS
  const initialData = {};
  LEVELS.forEach((lv) => {
    const count = Number.isFinite(GEN_COUNTS[lv.id]) ? GEN_COUNTS[lv.id] : 0;
    initialData[lv.id] = createGensForLevel(lv.id, count);
  });

  // ---------- 2. Application State ----------
  const state = {
    // #comment [FLAG: ADMIN_AUTH_STATUS] Admin flag (false = read-only for edit/add)
    isAdmin: false,
    activeLevel: ALL_LEVEL_ID,
    onlyWithLinks: false,
    sortOrder: 'asc', // 'asc' | 'desc'
    expandedGenKey: null,
    data: initialData,
  };

  // ---------- 3. DOM Elements ----------
  const levelPillsEl = document.getElementById('levelPills');
  const filterLinkedBtn = document.getElementById('filterLinkedBtn');
  const sortGenBtn = document.getElementById('sortGenBtn');
  const sortGenLabel = document.getElementById('sortGenLabel');
  const genListEl = document.getElementById('genList');
  const addGenBtn = document.getElementById('addGenBtn');
  const toastEl = document.getElementById('trainerToast');

  // Mobile sidebar drawer elements
  const sidebarEl = document.getElementById('sidebar');
  const openMenuBtn = document.getElementById('openMenu');
  const closeMenuBtn = document.getElementById('closeMenu');
  const mobileScrimEl = document.getElementById('mobileScrim');

  // ---------- 4. Mobile Sidebar Drawer Controls ----------
  function openMenu() {
    if (sidebarEl) sidebarEl.classList.add('is-open');
    if (mobileScrimEl) mobileScrimEl.hidden = false;
  }

  function closeMenu() {
    if (sidebarEl) sidebarEl.classList.remove('is-open');
    if (mobileScrimEl) mobileScrimEl.hidden = true;
  }

  if (openMenuBtn) openMenuBtn.addEventListener('click', openMenu);
  if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMenu);
  if (mobileScrimEl) mobileScrimEl.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  // ---------- 5. Standalone Toast Notification ----------
  // Built-in toast (no dependency on app.js)
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = String(message);
    toastEl.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toastEl.hidden = true;
    }, 3500);
  }

  // ---------- 6. Helper Functions ----------
  function getActiveGens() {
    if (state.activeLevel === ALL_LEVEL_ID) {
      return LEVELS.flatMap((lv) => state.data[lv.id] || []);
    }
    return state.data[state.activeLevel] || [];
  }

  function hasRealUrl(url) {
    return Boolean(url && !String(url).startsWith('#'));
  }

  function hasAnyLink(gen) {
    return hasRealUrl(gen.driveUrl) || hasRealUrl(gen.assessmentUrl);
  }

  // Hide placeholder "#..." URLs in the admin input fields
  function getDisplayValue(url) {
    return hasRealUrl(url) ? url : '';
  }

  // Escape double quotes before inserting into HTML attributes
  function escapeAttr(val) {
    return String(val || '').replace(/"/g, '&quot;');
  }

  // ---------- 7. Admin Permission Controls ----------
  // #comment [FUNCTION: DISABLE_ADMIN_BUTTONS] Enable or disable Save and "+ Add Gen" buttons based on state.isAdmin
  function applyAdminButtonPermissions() {
    const isAllTab = state.activeLevel === ALL_LEVEL_ID;
    const gens = isAllTab ? [] : getActiveGens();
    const isMaxed = gens.length >= MAX_GENS;
    const allowAdmin = Boolean(state.isAdmin);

    addGenBtn.disabled = !allowAdmin || isAllTab || isMaxed;
    if (!allowAdmin) {
      addGenBtn.title = 'สำหรับผู้ดูแลระบบ (Admin) เท่านั้น';
    } else if (isAllTab) {
      addGenBtn.title = 'กรุณาเลือก Lv. ที่ต้องการเพิ่ม Gen';
    } else if (isMaxed) {
      addGenBtn.title = `มีได้สูงสุด ${MAX_GENS} Gen`;
    } else {
      addGenBtn.title = '';
    }

    const saveButtons = genListEl.querySelectorAll('.btn-save-admin');
    saveButtons.forEach((btn) => {
      btn.disabled = !allowAdmin;
      btn.title = allowAdmin ? '' : 'สำหรับผู้ดูแลระบบ (Admin) เท่านั้น';
    });
  }

  // #comment [FUNCTION: RECEIVE_ADMIN_FLAG] Update Admin state and refresh button permissions
  function setAdminStatus(isAdminLoggedIn) {
    state.isAdmin = Boolean(isAdminLoggedIn);
    applyAdminButtonPermissions();
  }

  // #comment [ADMIN_HOOK] Expose window.setTrainerAdminStatus(true/false) and listen for 'admin-auth-change'
  window.setTrainerAdminStatus = setAdminStatus;
  window.addEventListener('admin-auth-change', (e) => {
    if (e.detail && typeof e.detail.isAdmin === 'boolean') {
      setAdminStatus(e.detail.isAdmin);
    }
  });

  // ---------- 8. Clipboard Helper ----------
  async function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    // Fallback for non-HTTPS or older browsers
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    tempInput.setAttribute('readonly', '');
    tempInput.style.position = 'fixed';
    tempInput.style.opacity = '0';
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
  }

  // ---------- 9. Render Functions ----------
  // Render level selector pills (All, Lv. 1 - Lv. 5), link filter, and sort button label
  function renderLevels() {
    levelPillsEl.innerHTML = '';
    LEVEL_TABS.forEach((lv) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `level-pill${lv.id === state.activeLevel ? ' active' : ''}`;
      btn.textContent = lv.label;
      btn.setAttribute('aria-pressed', String(lv.id === state.activeLevel));
      btn.addEventListener('click', () => {
        state.activeLevel = lv.id;
        state.expandedGenKey = null;
        renderAll();
      });
      levelPillsEl.appendChild(btn);
    });

    if (filterLinkedBtn) {
      filterLinkedBtn.classList.toggle('active', state.onlyWithLinks);
      filterLinkedBtn.setAttribute('aria-pressed', String(state.onlyWithLinks));
    }

    const isDesc = state.sortOrder === 'desc';
    sortGenBtn.classList.toggle('desc', isDesc);
    sortGenLabel.textContent = isDesc ? 'Gen ↓' : 'Gen ↑';
  }

  // Render Gen cards for the active level (or all levels when "All" is active)
  function renderGens() {
    const rawGens = getActiveGens();
    genListEl.innerHTML = '';

    // Show "Coming soon" box when a level has 0 Gens (e.g., Lv. 5)
    if (rawGens.length === 0) {
      const emptyBox = document.createElement('div');
      emptyBox.className = 'empty-coming-soon';
      emptyBox.textContent = 'Coming soon';
      genListEl.appendChild(emptyBox);
      applyAdminButtonPermissions();
      return;
    }

    const visibleGens = state.onlyWithLinks ? rawGens.filter(hasAnyLink) : rawGens;
    if (visibleGens.length === 0) {
      const emptyBox = document.createElement('div');
      emptyBox.className = 'empty-coming-soon';
      emptyBox.textContent = 'ยังไม่มีรายการที่มีลิงก์';
      genListEl.appendChild(emptyBox);
      applyAdminButtonPermissions();
      return;
    }

    const sortedGens = [...visibleGens].sort((a, b) => {
      const levelDiff = (LEVEL_META[a.levelId]?.index ?? 0) - (LEVEL_META[b.levelId]?.index ?? 0);
      if (levelDiff !== 0) return state.sortOrder === 'asc' ? levelDiff : -levelDiff;
      return state.sortOrder === 'asc' ? a.num - b.num : b.num - a.num;
    });

    sortedGens.forEach((gen) => {
      const isExpanded = state.expandedGenKey === gen.key;
      const displayTitle = `${getLevelShortLabel(gen.levelId)} ${gen.name}`;
      const card = document.createElement('article');
      card.className = `gen-card${isExpanded ? ' expanded' : ''}`;
      card.dataset.genCard = gen.key;

      card.innerHTML = `
        <div class="gen-card-main" data-toggle-gen="${gen.key}" role="button" tabindex="0" aria-expanded="${isExpanded}">
          <div class="gen-card-left">
            <div class="gen-number-badge">G${gen.num}</div>
            <h2 class="gen-title">${displayTitle}</h2>
            <span class="gen-chevron" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </div>
          <div class="gen-card-actions">
            <!-- Photo Upload Link -->
            <a
              href="${escapeAttr(gen.driveUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-action btn-photo"
              data-link-type="drive"
              data-gen="${escapeAttr(displayTitle)}"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="3"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <path d="M21 15l-5-5L5 21"></path>
              </svg>
              <span>อัปโหลดรูป</span>
            </a>
            <!-- Assessment Link -->
            <a
              href="${escapeAttr(gen.assessmentUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-action btn-review"
              data-link-type="assessment"
              data-gen="${escapeAttr(displayTitle)}"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              <span>ประเมิน</span>
            </a>
          </div>
        </div>

        <!-- #comment [ADMIN_DRAWER] Expandable Admin Drawer for viewing/editing links -->
        <div class="admin-drawer">
          <form class="admin-form" data-admin-form="${gen.key}" data-level-id="${gen.levelId}" data-gen-id="${gen.id}">
            <div class="admin-inputs">
              <div class="admin-input-wrap">
                <input
                  type="url"
                  name="driveUrl"
                  class="admin-input admin-input-photo"
                  placeholder="ลิ้งค์อัปโหลดรูป"
                  value="${escapeAttr(getDisplayValue(gen.driveUrl))}"
                />
                <button type="button" class="btn-copy-link" data-copy-field="driveUrl" title="คัดลอกลิงก์" aria-label="คัดลอกลิงก์อัปโหลดรูป">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
              <div class="admin-input-wrap">
                <input
                  type="url"
                  name="assessmentUrl"
                  class="admin-input admin-input-review"
                  placeholder="ลิ้งค์ประเมิน"
                  value="${escapeAttr(getDisplayValue(gen.assessmentUrl))}"
                />
                <button type="button" class="btn-copy-link" data-copy-field="assessmentUrl" title="คัดลอกลิงก์" aria-label="คัดลอกลิงก์ประเมิน">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
            </div>
            <button type="submit" class="btn-save-admin">บันทึก</button>
          </form>
        </div>
      `;
      genListEl.appendChild(card);
    });

    applyAdminButtonPermissions();
  }

  function renderAll() {
    renderLevels();
    renderGens();
  }

  // ---------- 10. Event Listeners ----------
  // Toggle filter for cards that have at least one configured link
  if (filterLinkedBtn) {
    filterLinkedBtn.addEventListener('click', () => {
      state.onlyWithLinks = !state.onlyWithLinks;
      state.expandedGenKey = null;
      renderAll();
    });
  }

  // Toggle Asc / Desc sort order
  sortGenBtn.addEventListener('click', () => {
    state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
    renderAll();
  });

  // Handle Gen Card clicks (Copy button, External link validation, Drawer toggle)
  genListEl.addEventListener('click', async (e) => {
    // 1. Copy Link button inside Admin Drawer
    const copyBtn = e.target.closest('[data-copy-field]');
    if (copyBtn) {
      const form = copyBtn.closest('[data-admin-form]');
      const fieldName = copyBtn.dataset.copyField;
      const input = form ? form.elements[fieldName] : null;
      const urlText = input ? input.value.trim() : '';

      if (!urlText) {
        showToast('ยังไม่มีลิงก์ให้คัดลอก');
        return;
      }

      try {
        await copyTextToClipboard(urlText);
        copyBtn.classList.add('copied');
        setTimeout(() => copyBtn.classList.remove('copied'), 1200);
        showToast('คัดลอกลิงก์แล้ว');
      } catch {
        showToast('ไม่สามารถคัดลอกลิงก์ได้');
      }
      return;
    }

    // 2. External link buttons (warn if link is still a placeholder "#...")
    const link = e.target.closest('a[data-link-type]');
    if (link) {
      const href = link.getAttribute('href') || '';
      if (href.startsWith('#')) {
        e.preventDefault();
        const label = link.dataset.linkType === 'drive' ? 'อัปโหลดรูป' : 'ประเมิน';
        showToast(`ยังไม่ได้ตั้งค่าลิงก์${label}สำหรับ ${link.dataset.gen} (กดที่แถวเพื่อดูหรือใส่ลิงก์)`);
      }
      return;
    }

    // 3. Ignore clicks inside the Admin Drawer itself
    if (e.target.closest('.admin-drawer')) return;

    // 4. Toggle Admin Drawer when clicking a Gen row
    const toggleRow = e.target.closest('[data-toggle-gen]');
    if (toggleRow) {
      const genKey = toggleRow.dataset.toggleGen;
      state.expandedGenKey = state.expandedGenKey === genKey ? null : genKey;
      renderGens();
    }
  });

  // Keyboard accessibility (Enter / Space) for toggling Gen drawer
  genListEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const toggleRow = e.target.closest('[data-toggle-gen]');
    if (!toggleRow || e.target.closest('a[data-link-type]')) return;
    e.preventDefault();
    const genKey = toggleRow.dataset.toggleGen;
    state.expandedGenKey = state.expandedGenKey === genKey ? null : genKey;
    renderGens();
  });

  // #comment [ADMIN_SAVE] Save both Drive & Assessment URLs for a Gen
  genListEl.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-admin-form]');
    if (!form) return;
    e.preventDefault();
    if (!state.isAdmin) return; // #comment [ADMIN_ONLY] Block save if not Admin

    const levelId = form.dataset.levelId;
    const genId = form.dataset.genId;
    const levelList = state.data[levelId] || [];
    const gen = levelList.find((g) => g.id === genId);
    if (!gen) return;

    const driveVal = form.elements.driveUrl.value.trim();
    const assessmentVal = form.elements.assessmentUrl.value.trim();

    gen.driveUrl = driveVal || `#${levelId}-drive-${gen.id}`;
    gen.assessmentUrl = assessmentVal || `#${levelId}-assessment-${gen.id}`;
    state.expandedGenKey = null;

    renderGens();
    showToast(`บันทึกลิงก์ ${getLevelShortLabel(levelId)} ${gen.name} เรียบร้อย`);
  });

  // #comment [ADMIN_ONLY] Add a new Gen card to the active level (up to MAX_GENS)
  addGenBtn.addEventListener('click', () => {
    if (!state.isAdmin || state.activeLevel === ALL_LEVEL_ID) return; // #comment [ADMIN_ONLY]
    const gens = state.data[state.activeLevel] || [];
    if (gens.length >= MAX_GENS) return;

    const nextNum = gens.length + 1;
    gens.push(makeGenRecord(state.activeLevel, nextNum));
    renderGens();
    showToast(`เพิ่ม ${getLevelShortLabel(state.activeLevel)} Gen ${nextNum} แล้ว`);
  });

  // ---------- 11. Initial Render ----------
  renderAll();
})();
