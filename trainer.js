/* GO ROBOT • Student Review
 * Live Gen links are read from the existing Google Apps Script backend (JSONP).
 * No admin tokens, editable fields, passwords, or private data in this public file.
 */
(() => {
  'use strict';
  const root = document.getElementById('trainerView');
  if (!root) return;
  const LEVELS = ['lv1','lv2','lv3','lv4','lv5'];
  const DEFAULTS = {lv1:4,lv2:3,lv3:2,lv4:1,lv5:0};
  const $ = id => document.getElementById(id);
  const state = {level:'lv1', sort:'asc', data:defaultData(), loading:false, initialized:false, error:'', lastUpdated:null};

  function defaultData() {
    const data = {};
    LEVELS.forEach(level => {
      data[level] = Array.from({length:DEFAULTS[level]}, (_, i) => ({
        level, gen:i+1, driveUrl:'', assessmentUrl:''
      }));
    });
    return data;
  }
  function validURL(value) {
    const input = String(value || '').trim();
    if (!input || input.length > 2000) return '';
    try {
      const url = new URL(input);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch { return ''; }
  }
  const icon = (name, size=18) => {
    const paths = {
      image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
      check:'<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
      arrow:'<path d="M7 17 17 7M8 7h9v9"/>',
      refresh:'<path d="M20 11a8 8 0 1 0-2 6M20 4v7h-7"/>',
      lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
      chevron:'<path d="m6 9 6 6 6-6"/>',
      book:'<path d="M12 7v14m0-14C9.5 5 6.3 4.5 3 5v14c3.3-.5 6.5 0 9 2m0-14c2.5-2 5.7-2.5 9-2v14c-3.3-.5-6.5 0-9 2"/>'
    };
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.arrow}</svg>`;
  };

  function paintLevels() {
    $('levelPills').innerHTML = LEVELS.map(level => `<button type="button" class="level-pill ${level===state.level?'active':''}" data-trainer-level="${level}" aria-pressed="${level===state.level}">${level.replace('lv','Lv. ')}</button>`).join('');
    const desc = state.sort === 'desc';
    $('sortGenBtn').classList.toggle('desc',desc);
    $('sortGenLabel').textContent = `Gen ${desc?'↓':'↑'}`;
  }
  function actionButton(url, type, gen) {
    const ok = Boolean(url);
    const photo = type==='photo';
    const label = photo ? 'อัปโหลดรูป' : 'ประเมิน';
    const ico = icon(photo?'image':'check',18);
    const copy = ok ? `<span class="action-arrow">${icon('arrow',15)}</span>` : '<span class="action-missing">ยังไม่ตั้งค่า</span>';
    if (!ok) return `<div class="trainer-action trainer-action--empty ${photo?'trainer-action--photo':'trainer-action--review'}" aria-label="${label} Gen ${gen} ยังไม่ได้ตั้งค่าลิงก์">${ico}<span>${label}</span>${copy}</div>`;
    const safe = url.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
    return `<a class="trainer-action ${photo?'trainer-action--photo':'trainer-action--review'}" href="${safe}" target="_blank" rel="noopener noreferrer" title="เปิดลิงก์ ${label} Gen ${gen}">${ico}<span>${label}</span>${copy}</a>`;
  }
  function paintGens() {
    const gens = [...(state.data[state.level] || [])].sort((a,b) => state.sort === 'asc' ? a.gen - b.gen : b.gen - a.gen);
    const configured = gens.reduce((sum,g)=>sum+Number(Boolean(g.driveUrl))+Number(Boolean(g.assessmentUrl)),0);
    $('trainerSummary').textContent = `${gens.length} Gen  ·  ${configured}/${gens.length*2} ลิงก์พร้อมใช้งาน`;
    $('genList').innerHTML = gens.length ? gens.map(g=>{
      const count=Number(Boolean(g.driveUrl))+Number(Boolean(g.assessmentUrl));
      const status=count===2?'ครบทั้ง 2 ลิงก์':count===1?'ตั้งค่าแล้ว 1 ลิงก์':'ยังไม่มีลิงก์';
      return `<article class="gen-card">
        <div class="gen-card-main">
          <div class="gen-card-left"><span class="gen-number-badge">G${g.gen}</span><div class="gen-card-titles"><h2 class="gen-title">Gen ${g.gen}</h2><span class="gen-meta"><i class="gen-state-dot ${count===2?'ready':count===1?'partial':''}"></i>${status}</span></div></div>
          <div class="gen-card-actions">${actionButton(g.driveUrl,'photo',g.gen)}${actionButton(g.assessmentUrl,'review',g.gen)}</div>
        </div>
      </article>`;
    }).join('') : `<div class="trainer-empty">${icon('book',30)}<strong>ยังไม่มี Gen สำหรับระดับนี้</strong><span>ผู้ดูแลสามารถเพิ่ม Gen ได้จากหน้า Trainer Links Admin</span></div>`;
  }
  function paintState() {
    const node=$('trainerDataStatus');
    node.classList.toggle('is-error',!!state.error);
    node.classList.toggle('is-loading',state.loading);
    if(state.loading) node.textContent='กำลังอัปเดตข้อมูล…';
    else if(state.error) node.textContent=state.error;
    else if(state.lastUpdated) node.textContent='อัปเดตข้อมูลล่าสุดแล้ว';
    else node.textContent='กำลังรอข้อมูลจาก Google Sheets';
    $('trainerRefreshBtn').disabled=state.loading;
  }
  function render() { paintLevels(); paintGens(); paintState(); }

  let timeout=null, script=null;
  function refreshLinks() {
    if (state.loading) return;
    const base=validURL(window.GOROBOT_CONFIG?.APPS_SCRIPT_URL || '');
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(base)) {
      state.error='ยังไม่ได้ตั้งค่า Apps Script URL'; render(); return;
    }
    state.loading=true;state.error='';render();
    let done=false;
    function finish(error, payload) {
      if(done)return;
      done=true;
      clearTimeout(timeout);
      if(script)script.remove();
      delete window.GoRobotTrainerReceive;
      state.loading=false;
      if(error) state.error=error;
      else {
        const fresh={};LEVELS.forEach(level=>fresh[level]=[]);
        (Array.isArray(payload.items)?payload.items:[]).forEach(raw=>{
          const level=String(raw.level||'').toLowerCase();
          const num=Number(raw.gen);
          if(!LEVELS.includes(level)||!Number.isInteger(num)||num<1||num>4)return;
          if(fresh[level].some(g=>g.gen===num))return;
          fresh[level].push({level,gen:num,driveUrl:validURL(raw.driveUrl),assessmentUrl:validURL(raw.assessmentUrl)});
        });
        state.data=fresh;
        state.lastUpdated=new Date();
        state.initialized=true;
      }
      render();
    }
    window.GoRobotTrainerReceive=(payload)=>{
      if(payload && payload.ok===true) finish('',payload);
      else finish('โหลดลิงก์ไม่สำเร็จ กรุณาลองอีกครั้ง');
    };
    script=document.createElement('script');
    script.async=true;script.referrerPolicy='no-referrer';
    script.src=base+'?mode=trainer-links&callback=GoRobotTrainerReceive&t='+Date.now();
    script.onerror=()=>finish('เชื่อมต่อฐานข้อมูลไม่ได้');
    timeout=setTimeout(()=>finish('การเชื่อมต่อหมดเวลา ลองกดรีเฟรชอีกครั้ง'),18000);
    document.head.appendChild(script);
  }

  $('levelPills').addEventListener('click',e=>{
    const btn=e.target.closest('[data-trainer-level]');
    if(!btn)return;
    state.level=btn.dataset.trainerLevel; render();
  });
  $('sortGenBtn').addEventListener('click',()=>{state.sort=state.sort==='asc'?'desc':'asc';render();});
  $('trainerRefreshBtn').addEventListener('click',refreshLinks);
  const base=validURL(window.GOROBOT_CONFIG?.APPS_SCRIPT_URL||'');
  const manage=$('trainerManageLink');
  if(manage && base) { manage.href=base+'?mode=trainer-admin';manage.target='_blank';manage.rel='noopener noreferrer'; }
  else if(manage)manage.hidden=true;
  window.addEventListener('gorobot:trainer-open',refreshLinks);
  render();
  // Initial data will automatically load the first time Trainer tab is opened.
})();
