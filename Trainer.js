/* GO ROBOT Learning Vault — Trainer (Student Review) view.
 * Runs inside the main site (index.html). Elements live in <section id="trainerView">.
 * Search this file for "#comment" to find every Admin-related spot.
 */
(() => {
  "use strict";
  if (!document.getElementById('trainerView')) return;

  const MAX_GENS = 4;

  const LEVELS = [
    { id: 'lv1', label: 'Lv. 1' },
    { id: 'lv2', label: 'Lv. 2' },
    { id: 'lv3', label: 'Lv. 3' },
    { id: 'lv4', label: 'Lv. 4' },
    { id: 'lv5', label: 'Lv. 5' },
  ];

  function createGensForLevel(levelId, count) {
    const list = [];
    for (let i = 1; i <= count; i += 1) {
      list.push({
        id: `gen${i}`,
        num: i,
        name: `Gen ${i}`,
        // Link google drive Gen1..Gen4
        driveUrl: `#${levelId}-drive-gen${i}`,
        // Link Assesment Gen 1..Gen 4
        assessmentUrl: `#${levelId}-assessment-gen${i}`,
      });
    }
    return list;
  }

  const state = {
    // #comment [FLAG: ADMIN_AUTH_STATUS] Flag รับสถานะจากเว็บหน้าหลักว่า Admin เข้าสู่ระบบหรือยัง (ค่าเริ่มต้น false = ยังไม่เข้าสู่ระบบ)
    isAdmin: false,
    activeLevel: 'lv1',
    sortOrder: 'asc', // 'asc' | 'desc'
    expandedGenId: null,
    data: {
      lv1: createGensForLevel('lv1', 4), // Default: 4 Gen
      lv2: createGensForLevel('lv2', 3), // Default: 3 Gen
      lv3: createGensForLevel('lv3', 2), // Default: 2 Gen
      lv4: createGensForLevel('lv4', 1), // Default: 1 Gen
      lv5: createGensForLevel('lv5', 0), // Default: 0 Gen -> Coming soon
    },
  };

  const levelPillsEl = document.getElementById('levelPills');
  const sortGenBtn = document.getElementById('sortGenBtn');
  const sortGenLabel = document.getElementById('sortGenLabel');
  const genListEl = document.getElementById('genList');
  const addGenBtn = document.getElementById('addGenBtn');

  // #comment TOAST: ใช้ toast ของเว็บหลัก (app.js เปิดให้ผ่าน window.GoRobotToast)
  function showToast(message) {
    if (typeof window.GoRobotToast === 'function') window.GoRobotToast(message);
  }

  function getActiveGens() {
    return state.data[state.activeLevel] || [];
  }

  function getDisplayValue(url) {
    return url && !url.startsWith('#') ? url : '';
  }

  function escapeAttr(val) {
    return String(val || '').replace(/"/g, '&quot;');
  }

  // #comment [FUNCTION: DISABLE_ADMIN_BUTTONS] ฟังก์ชันสำหรับ Disable/Enable ปุ่ม 'บันทึก' และ '+ Add Gen' ตามสิทธิ์ Admin
  function applyAdminButtonPermissions() {
    const gens = getActiveGens();
    const isMaxed = gens.length >= MAX_GENS;
    const allowAdmin = Boolean(state.isAdmin);

    // Disable ปุ่ม '+ Add Gen' หากไม่ใช่ Admin หรือจำนวน Gen ครบสูงสุดแล้ว
    addGenBtn.disabled = !allowAdmin || isMaxed;
    if (!allowAdmin) {
      addGenBtn.title = 'สำหรับผู้ดูแลระบบ (Admin) เท่านั้น';
    } else if (isMaxed) {
      addGenBtn.title = `มีได้สูงสุด ${MAX_GENS} Gen`;
    } else {
      addGenBtn.title = '';
    }

    // Disable ปุ่ม 'บันทึก' ทุกตัวใน Admin Section หากไม่ใช่ Admin
    const saveButtons = genListEl.querySelectorAll('.btn-save-admin');
    saveButtons.forEach((btn) => {
      btn.disabled = !allowAdmin;
      btn.title = allowAdmin ? '' : 'สำหรับผู้ดูแลระบบ (Admin) เท่านั้น';
    });
  }

  // #comment [FUNCTION: RECEIVE_ADMIN_FLAG] ฟังก์ชันรับ Flag สถานะ Admin จากเว็บหน้าหลัก แล้วสั่งอัปเดตสิทธิ์ปุ่ม
  function setAdminStatus(isAdminLoggedIn) {
    state.isAdmin = Boolean(isAdminLoggedIn);
    applyAdminButtonPermissions();
  }

  // #comment [ADMIN_HOOK] เปิดให้เว็บหน้าหลักเรียกใช้ฟังก์ชันรับ Flag ได้โดยตรงผ่าน window.setTrainerAdminStatus(true/false) หรือ Event 'admin-auth-change'
  window.setTrainerAdminStatus = setAdminStatus;
  window.addEventListener('admin-auth-change', (e) => {
    if (e.detail && typeof e.detail.isAdmin === 'boolean') {
      setAdminStatus(e.detail.isAdmin);
    }
  });

  // ปุ่มคัดลอกลิงก์ภายในกรอบช่องฟอร์ม
  async function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
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

  function renderLevels() {
    levelPillsEl.innerHTML = '';
    LEVELS.forEach((lv) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `level-pill${lv.id === state.activeLevel ? ' active' : ''}`;
      btn.textContent = lv.label;
      btn.setAttribute('aria-pressed', String(lv.id === state.activeLevel));
      btn.addEventListener('click', () => {
        state.activeLevel = lv.id;
        state.expandedGenId = null;
        renderAll();
      });
      levelPillsEl.appendChild(btn);
    });

    const isDesc = state.sortOrder === 'desc';
    sortGenBtn.classList.toggle('desc', isDesc);
    sortGenLabel.textContent = isDesc ? 'Gen ↓' : 'Gen ↑';
  }

  function renderGens() {
    const rawGens = getActiveGens();
    genListEl.innerHTML = '';

    if (rawGens.length === 0) {
      const emptyBox = document.createElement('div');
      emptyBox.className = 'empty-coming-soon';
      emptyBox.textContent = 'Coming soon';
      genListEl.appendChild(emptyBox);
      applyAdminButtonPermissions();
      return;
    }

    const sortedGens = [...rawGens].sort((a, b) =>
      state.sortOrder === 'asc' ? a.num - b.num : b.num - a.num
    );

    sortedGens.forEach((gen) => {
      const isExpanded = state.expandedGenId === gen.id;
      const card = document.createElement('article');
      card.className = `gen-card${isExpanded ? ' expanded' : ''}`;
      card.dataset.genCard = gen.id;

      card.innerHTML = `
        <div class="gen-card-main" data-toggle-gen="${gen.id}" role="button" tabindex="0" aria-expanded="${isExpanded}">
          <div class="gen-card-left">
            <div class="gen-number-badge">G${gen.num}</div>
            <h2 class="gen-title">${gen.name}</h2>
            <span class="gen-chevron" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </div>
          <div class="gen-card-actions">
            <!-- Link google drive Gen${gen.num} -->
            <a
              href="${escapeAttr(gen.driveUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-action btn-photo"
              data-link-type="drive"
              data-gen="${gen.name}"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="3"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <path d="M21 15l-5-5L5 21"></path>
              </svg>
              <span>อัปโหลดรูป</span>
            </a>
            <!-- Link Assesment Gen ${gen.num} -->
            <a
              href="${escapeAttr(gen.assessmentUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-action btn-review"
              data-link-type="assessment"
              data-gen="${gen.name}"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              <span>ประเมิน</span>
            </a>
          </div>
        </div>

        <!-- #comment [ADMIN_DRAWER] Admin Section: Dropdown ใส่ลิงก์ -->
        <div class="admin-drawer">
          <form class="admin-form" data-admin-form="${gen.id}">
            <div class="admin-inputs">
              <div class="admin-input-wrap">
                <input
                  type="url"
                  name="driveUrl"
                  class="admin-input admin-input-photo"
                  placeholder="ลิ้งค์อัปโหลดรูป"
                  value="${escapeAttr(getDisplayValue(gen.driveUrl))}"
                />
                <!-- ปุ่มคัดลอกลิงก์อัปโหลดรูป -->
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
                <!-- ปุ่มคัดลอกลิงก์ประเมิน -->
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

  // Toggle Asc / Desc sort
  sortGenBtn.addEventListener('click', () => {
    state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
    renderAll();
  });

  // Handle Card Interactions (Links + Copy Link + Admin Section Drawer Toggle)
  genListEl.addEventListener('click', async (e) => {
    // 1. Copy Link button inside Admin Drawer input box
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

    // 2. External link buttons
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

    // 4. Toggle Admin Section drawer when clicking a Gen row
    const toggleRow = e.target.closest('[data-toggle-gen]');
    if (toggleRow) {
      const genId = toggleRow.dataset.toggleGen;
      state.expandedGenId = state.expandedGenId === genId ? null : genId;
      renderGens();
    }
  });

  // Keyboard accessibility for toggling Gen drawer
  genListEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const toggleRow = e.target.closest('[data-toggle-gen]');
    if (!toggleRow || e.target.closest('a[data-link-type]')) return;
    e.preventDefault();
    const genId = toggleRow.dataset.toggleGen;
    state.expandedGenId = state.expandedGenId === genId ? null : genId;
    renderGens();
  });

  // #comment [ADMIN_SAVE] Admin Section: บันทึกลิงก์ทั้ง 2 ช่อง (อัปโหลดรูป + ประเมิน) ของ Gen นั้นพร้อมกัน
  genListEl.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-admin-form]');
    if (!form) return;
    e.preventDefault();
    if (!state.isAdmin) return; // #comment [ADMIN_ONLY] กันบันทึกถ้าไม่ใช่ Admin

    const genId = form.dataset.adminForm;
    const gen = getActiveGens().find((g) => g.id === genId);
    if (!gen) return;

    const driveVal = form.elements.driveUrl.value.trim();
    const assessmentVal = form.elements.assessmentUrl.value.trim();

    gen.driveUrl = driveVal || `#${state.activeLevel}-drive-${gen.id}`;
    gen.assessmentUrl = assessmentVal || `#${state.activeLevel}-assessment-${gen.id}`;
    state.expandedGenId = null;

    renderGens();
    showToast(`บันทึกลิงก์ ${gen.name} เรียบร้อย`);
  });

  // #comment [ADMIN_ONLY] ปุ่ม + Add Gen (ซ่อน/ลบถ้าต้องการจำกัด CRUD)
  addGenBtn.addEventListener('click', () => {
    if (!state.isAdmin) return; // #comment [ADMIN_ONLY]
    const gens = getActiveGens();
    if (gens.length >= MAX_GENS) return;

    const nextNum = gens.length + 1;
    gens.push({
      id: `gen${nextNum}`,
      num: nextNum,
      name: `Gen ${nextNum}`,
      // Link google drive GenN
      driveUrl: `#${state.activeLevel}-drive-gen${nextNum}`,
      // Link Assesment Gen N
      assessmentUrl: `#${state.activeLevel}-assessment-gen${nextNum}`,
    });
    renderGens();
    showToast(`เพิ่ม Gen ${nextNum} แล้ว`);
  });

  // Initial Render
  renderAll();

})();
