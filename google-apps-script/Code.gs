/**
 * GO ROBOT Learning Vault — Google Sheets database and Drive file storage.
 * Paste this into a BOUND Apps Script project opened from Google Sheets.
 * Deploy as Web App: Execute as ME / Access: ANYONE.
 * Public: doGet(mode=catalog) only returns published catalog data.
 * Writes and uploads: require a short-lived, server-verified admin session.
 * Never put an administrator password or session token in GitHub files.
 */

var GR_CATEGORY_TAB = 'Categories';
var GR_RESOURCE_TAB = 'Resources';
var GR_CATEGORIES = ['id', 'name', 'description', 'icon', 'imageUrl', 'accent', 'sortOrder', 'createdAt'];
var GR_RESOURCES = ['id', 'categoryId', 'title', 'description', 'type', 'href', 'fileUrl', 'fileName', 'coverUrl', 'tags', 'featured', 'sortOrder', 'createdAt', 'updatedAt'];
var GR_ICONS = ['Gamepad2','BookOpen','FileText','Video','Trophy','Bot','Code2','FolderOpen','GraduationCap','Cpu','Puzzle','MonitorPlay','Lightbulb','Wrench','Layers','Rocket','BrainCircuit','Presentation','Music2','Image','Sparkles'];
var GR_COLORS = ['purple', 'blue', 'teal', 'orange', 'pink', 'indigo'];
var GR_SESSION_SECONDS = 21600; // 6 hours
var GR_FILE_MAX_BYTES = 8 * 1024 * 1024;

function onOpen() {
  SpreadsheetApp.getUi().createMenu('GO ROBOT')
    .addItem('1. เตรียมฐานข้อมูล', 'setupDatabase')
    .addItem('2. ตั้ง/เปลี่ยนรหัสผ่าน Admin', 'setAdminPasswordFromSheet')
    .addToUi();
}

/** Run once manually, or use the custom menu in the Sheet. Preserves existing records. */
function setupDatabase() {
  // Refuse calls from the public Web App / google.script.run context.
  // Initialization must happen in the bound spreadsheet editor UI.
  try { SpreadsheetApp.getUi(); }
  catch (e) { throw new Error('คำสั่งติดตั้งต้องเรียกจาก Google Sheet ของเจ้าของเท่านั้น'); }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('กรุณาเปิด Apps Script ผ่านเมนู Extensions ของ Google Sheet');
  var props = PropertiesService.getScriptProperties();
  props.setProperty('SPREADSHEET_ID', ss.getId());
  var cat = ensureTab_(ss, GR_CATEGORY_TAB, GR_CATEGORIES);
  ensureTab_(ss, GR_RESOURCE_TAB, GR_RESOURCES);
  if (cat.getLastRow() === 1) {
    var now = new Date().toISOString();
    var defaults = [
      ['cat_games','เกมและภารกิจ','เกมเขียนโค้ดและภารกิจหุ่นยนต์','Gamepad2','','purple',1,now],
      ['cat_docs','เอกสารและใบงาน','คู่มือการเรียนรู้และไฟล์ประกอบบทเรียน','BookOpen','','blue',2,now],
      ['cat_media','วิดีโอและสื่อ','คลิปสอนและสื่อการเรียนรู้ออนไลน์','MonitorPlay','','pink',3,now],
      ['cat_events','การแข่งขัน','กติกา สนามแข่งขัน และเอกสารเตรียมตัว','Trophy','','orange',4,now]
    ];
    cat.getRange(2, 1, defaults.length, GR_CATEGORIES.length).setValues(defaults);
  }
  if (!props.getProperty('UPLOAD_FOLDER_ID')) {
    var folder = DriveApp.createFolder('GO ROBOT Learning Vault Uploads');
    props.setProperty('UPLOAD_FOLDER_ID', folder.getId());
  }
  SpreadsheetApp.getActiveSpreadsheet().toast('พร้อมใช้งานแล้ว • ตั้งรหัส Admin เป็นขั้นตอนต่อไป', 'GO ROBOT', 6);
  return 'Database ready';
}

/** Only call from the bound spreadsheet UI. Never publish passwords in code. */
function setAdminPasswordFromSheet() {
  var ui = SpreadsheetApp.getUi();
  var prompt = ui.prompt('ตั้งรหัสผ่าน GO ROBOT Admin', 'กรอกรหัสผ่านใหม่อย่างน้อย 10 ตัวอักษร (ไม่ใช่รหัสผ่าน Google)', ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  var password = prompt.getResponseText();
  if (password.length < 10 || password.length > 128) {
    ui.alert('รหัสผ่านต้องมีความยาว 10–128 ตัวอักษร');
    return;
  }
  var confirm = ui.prompt('ยืนยันรหัสผ่าน', 'พิมพ์รหัสผ่านอีกครั้งเพื่อยืนยัน', ui.ButtonSet.OK_CANCEL);
  if (confirm.getSelectedButton() !== ui.Button.OK) return;
  if (password !== confirm.getResponseText()) {
    ui.alert('รหัสผ่านไม่ตรงกัน • ยังไม่ได้เปลี่ยน');
    return;
  }
  var salt = Utilities.getUuid() + Utilities.getUuid();
  var props = PropertiesService.getScriptProperties();
  // Rotating this value immediately invalidates every previously issued token.
  props.setProperties({ ADMIN_SALT: salt, ADMIN_HASH: sha256_(salt + ':' + password), ADMIN_EPOCH: Utilities.getUuid() });
  CacheService.getScriptCache().remove('login_failures');
  ui.alert('ตั้งรหัสผ่านสำเร็จ! เปิด Admin Portal จากเว็บเพื่อเข้าสู่ระบบ');
}

function doGet(e) {
  var mode = String(e && e.parameter && e.parameter.mode || '');
  if (mode === 'admin') {
    return HtmlService.createHtmlOutputFromFile('Admin')
      .setTitle('GO ROBOT • Admin Portal')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  if (mode === 'catalog') {
    // Hardcoded callback prevents arbitrary JavaScript injection through JSONP.
    if (String(e.parameter.callback || '') !== 'GoRobotCatalogReceive') {
      return ContentService.createTextOutput('Invalid callback').setMimeType(ContentService.MimeType.TEXT);
    }
    var payload;
    try { payload = getCatalog_(); }
    catch (err) { payload = {ok:false,error: String(err.message || 'Cannot read database')}; }
    var js = 'window.GoRobotCatalogReceive(' + JSON.stringify(payload).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029') + ');';
    return ContentService.createTextOutput(js).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return HtmlService.createHtmlOutput('<h2>GO ROBOT Learning Vault</h2><p>Open the main library on GitHub Pages.</p>');
}

function adminLogin(password) {
  var cache = CacheService.getScriptCache();
  var attempts = Number(cache.get('login_failures') || 0);
  if (attempts >= 15) throw new Error('ลองเข้าสู่ระบบหลายครั้งเกินไป โปรดลองใหม่ใน 15 นาที');
  var props = PropertiesService.getScriptProperties();
  var salt = props.getProperty('ADMIN_SALT');
  var stored = props.getProperty('ADMIN_HASH');
  if (!salt || !stored) throw new Error('ยังไม่ได้ตั้งรหัสผ่าน Admin ใน Google Sheet');
  if (typeof password !== 'string' || password.length > 128 || sha256_(salt + ':' + password) !== stored) {
    cache.put('login_failures', String(attempts + 1), 900);
    throw new Error('รหัสผ่านไม่ถูกต้อง');
  }
  cache.remove('login_failures');
  var token = [Utilities.getUuid(), Utilities.getUuid(), Utilities.getUuid()].join('-');
  cache.put('session_' + sha256_(token), props.getProperty('ADMIN_EPOCH') || 'initial', GR_SESSION_SECONDS);
  return { token:token, expiresIn:GR_SESSION_SECONDS, catalog:getCatalog_() };
}

function adminLogout(token) {
  if (typeof token === 'string' && token.length < 200) {
    CacheService.getScriptCache().remove('session_' + sha256_(token));
  }
  return {ok:true};
}

function adminFetch(token) {
  requireAdmin_(token);
  return getCatalog_();
}

function adminSaveCategory(token, input) {
  requireAdmin_(token);
  var data = input || {};
  var name = safeText_(data.name, 90, true);
  var description = safeText_(data.description, 300, false);
  var imageUrl = safeUrl_(data.imageUrl, false);
  var icon = GR_ICONS.indexOf(data.icon) !== -1 ? data.icon : 'FolderOpen';
  var accent = GR_COLORS.indexOf(data.accent) !== -1 ? data.accent : 'purple';
  var requestedOrder = boundedInteger_(data.sortOrder, 1, 99999, 9999);
  var id = safeId_(data.id);
  return withLock_(function() {
    var sheet = db_().getSheetByName(GR_CATEGORY_TAB);
    var existing = id ? findRow_(sheet, id) : -1;
    if (id && existing < 2) throw new Error('ไม่พบหมวดหมู่ที่ต้องการแก้ไข กรุณาโหลดข้อมูลอีกครั้ง');
    if (!id) id = 'cat_' + Utilities.getUuid().replace(/-/g,'').slice(0,20);
    var created = existing > 1 ? String(sheet.getRange(existing,8).getValue()) : new Date().toISOString();
    var row = [id,name,description,icon,imageUrl,accent,requestedOrder,created];
    if (existing > 1) sheet.getRange(existing,1,1,row.length).setValues([row]);
    else sheet.appendRow(row);
    return getCatalog_();
  });
}

function adminDeleteCategory(token, id) {
  requireAdmin_(token);
  id = safeId_(id);
  return withLock_(function() {
    var ss = db_();
    var rs = readRecords_(ss.getSheetByName(GR_RESOURCE_TAB));
    if (rs.some(function(r){return String(r.categoryId)===id;})) {
      throw new Error('หมวดนี้ยังมีรายการอยู่ กรุณาย้ายหรือลบรายการออกก่อน');
    }
    var sheet = ss.getSheetByName(GR_CATEGORY_TAB);
    var row = findRow_(sheet,id);
    if (row < 2) throw new Error('ไม่พบหมวดหมู่');
    sheet.deleteRow(row);
    return getCatalog_();
  });
}

function adminSaveResource(token, input) {
  requireAdmin_(token);
  var data = input || {};
  var title = safeText_(data.title, 130, true);
  var description = safeText_(data.description, 600, false);
  var categoryId = safeId_(data.categoryId);
  var type = data.type === 'file' ? 'file' : 'link';
  var href = safeUrl_(data.href, false);
  var fileUrl = safeUrl_(data.fileUrl, false);
  if (type === 'link' && !href) throw new Error('กรุณาระบุ URL ของเว็บไซต์หรือเกม');
  if (type === 'file' && !fileUrl) throw new Error('กรุณาอัปโหลดไฟล์หรือใส่ URL ดาวน์โหลด');
  var fileName = safeText_(data.fileName, 180, false);
  var coverUrl = safeUrl_(data.coverUrl, false);
  var tags = safeText_(data.tags, 250, false).split(',').map(function(t){return t.trim();}).filter(Boolean).slice(0,8);
  var featured = data.featured === true || data.featured === 'true' || Number(data.featured) === 1 ? 1 : 0;
  var order = boundedInteger_(data.sortOrder, 1, 99999, 9999);
  var id = safeId_(data.id);
  return withLock_(function() {
    var ss = db_();
    var categories = readRecords_(ss.getSheetByName(GR_CATEGORY_TAB));
    if (!categories.some(function(c){return String(c.id)===categoryId;})) throw new Error('กรุณาเลือกหมวดหมู่ที่มีอยู่');
    var sheet = ss.getSheetByName(GR_RESOURCE_TAB);
    var existing = id ? findRow_(sheet,id) : -1;
    if (id && existing < 2) throw new Error('ไม่พบรายการที่ต้องการแก้ไข กรุณาโหลดข้อมูลอีกครั้ง');
    if (!id) id = 'res_' + Utilities.getUuid().replace(/-/g,'').slice(0,20);
    var now = new Date().toISOString();
    var created = existing > 1 ? String(sheet.getRange(existing,13).getValue()) : now;
    var row = [id,categoryId,title,description,type,href,fileUrl,fileName,coverUrl,JSON.stringify(tags),featured,order,created,now];
    if (existing > 1) sheet.getRange(existing,1,1,row.length).setValues([row]);
    else sheet.appendRow(row);
    return getCatalog_();
  });
}

function adminDeleteResource(token, id) {
  requireAdmin_(token);
  id = safeId_(id);
  return withLock_(function() {
    var sheet = db_().getSheetByName(GR_RESOURCE_TAB);
    var row = findRow_(sheet,id);
    if (row < 2) throw new Error('ไม่พบรายการ');
    sheet.deleteRow(row);
    // Does not delete the physical Drive file, to avoid accidental data loss.
    return getCatalog_();
  });
}

/** Upload small files into the configured Drive folder; caller must be Admin. */
function adminUpload(token, input) {
  requireAdmin_(token);
  var data = input || {};
  var kind = data.kind === 'image' ? 'image' : 'file';
  var fileName = safeText_(data.fileName, 140, true).replace(/[\\/<>:"|?*]/g,'_');
  var mime = String(data.mimeType || 'application/octet-stream').slice(0,90);
  if (!/^[\w.+-]+\/[\w.+-]+$/.test(mime)) throw new Error('ประเภทไฟล์ไม่ถูกต้อง');
  if (kind === 'image' && !/^image\/(png|jpeg|webp|gif)$/.test(mime)) {
    throw new Error('รูปภาพรองรับ PNG, JPG, WebP หรือ GIF');
  }
  var base64 = String(data.base64 || '');
  if (!/^[A-Za-z0-9+/=]+$/.test(base64) || base64.length > Math.ceil(GR_FILE_MAX_BYTES * 4 / 3) + 8) {
    throw new Error('ไฟล์มีขนาดใหญ่เกิน 8 MB หรือรูปแบบไม่ถูกต้อง');
  }
  var bytes = Utilities.base64Decode(base64);
  if (!bytes.length || bytes.length > GR_FILE_MAX_BYTES) throw new Error('ไฟล์ต้องมีขนาดไม่เกิน 8 MB');
  var folderId = PropertiesService.getScriptProperties().getProperty('UPLOAD_FOLDER_ID');
  if (!folderId) throw new Error('กรุณารัน setupDatabase() ใน Google Sheet ก่อน');
  var file = DriveApp.getFolderById(folderId).createFile(Utilities.newBlob(bytes, mime, fileName));
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (e) {
    file.setTrashed(true); // only the newly-created unusable upload
    throw new Error('Google Drive ไม่อนุญาตให้แชร์สาธารณะ กรุณาตรวจสิทธิ์บัญชี/องค์กร');
  }
  var id = file.getId();
  return {
    ok:true,
    fileId:id,
    fileName:fileName,
    url: kind === 'image'
      ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w1000'
      : 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(id),
    viewUrl:file.getUrl(),
    kind:kind
  };
}

/* ======================== internal helpers ======================== */
function getCatalog_() {
  var ss = db_();
  var categories = readRecords_(ss.getSheetByName(GR_CATEGORY_TAB)).map(function(c) {
    return {
      id:String(c.id||''),name:String(c.name||''),description:String(c.description||''),
      icon:String(c.icon||'FolderOpen'),imageUrl:String(c.imageUrl||''),
      accent:String(c.accent||'purple'),sortOrder:Number(c.sortOrder)||9999
    };
  }).filter(function(c){return c.id && c.name;});
  var resources = readRecords_(ss.getSheetByName(GR_RESOURCE_TAB)).map(function(r) {
    var tags=[];
    try { tags=JSON.parse(String(r.tags||'[]')); } catch(e) {}
    if (!Array.isArray(tags)) tags=[];
    return {
      id:String(r.id||''), categoryId:String(r.categoryId||''), title:String(r.title||''),
      description:String(r.description||''), type:r.type==='file'?'file':'link',
      href:String(r.href||''),fileUrl:String(r.fileUrl||''),fileName:String(r.fileName||''),
      coverUrl:String(r.coverUrl||''),tags:tags,featured:Number(r.featured)?1:0,
      sortOrder:Number(r.sortOrder)||9999
    };
  }).filter(function(r){return r.id && r.title;});
  categories.sort(function(a,b){return a.sortOrder-b.sortOrder || a.name.localeCompare(b.name);});
  resources.sort(function(a,b){return a.sortOrder-b.sortOrder || a.title.localeCompare(b.title);});
  return {ok:true,categories:categories,resources:resources,updatedAt:new Date().toISOString()};
}

function db_() {
  var id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('ฐานข้อมูลยังไม่พร้อม กรุณาเรียก setupDatabase() ใน Google Sheet');
  var ss=SpreadsheetApp.openById(id);
  if (!ss.getSheetByName(GR_CATEGORY_TAB)||!ss.getSheetByName(GR_RESOURCE_TAB)) {
    throw new Error('ไม่พบแท็บ Categories / Resources กรุณาเรียก setupDatabase()');
  }
  return ss;
}

function ensureTab_(ss,name,headers) {
  var sheet=ss.getSheetByName(name)||ss.insertSheet(name);
  if (sheet.getLastRow()===0) {
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1,1,1,headers.length).setBackground('#5d42ba').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setColumnWidths(1,headers.length,150);
  } else {
    var existing=sheet.getRange(1,1,1,headers.length).getValues()[0].map(String);
    if (headers.join('|')!==existing.join('|')) throw new Error('คอลัมน์ในแท็บ '+name+' ไม่ตรงกับรูปแบบที่ระบบต้องการ');
  }
  return sheet;
}

function readRecords_(sheet) {
  var data=sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers=data[0].map(String);
  return data.slice(1).map(function(row) {
    var rec={};
    headers.forEach(function(key,i){rec[key]=row[i];});
    return rec;
  }).filter(function(rec){return rec.id;});
}

function findRow_(sheet,id) {
  if (!id || sheet.getLastRow()<2) return -1;
  var ids=sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues();
  for (var i=0;i<ids.length;i++) if (String(ids[i][0])===id) return i+2;
  return -1;
}

function requireAdmin_(token) {
  if (typeof token!=='string' || token.length<80 || token.length>200 ||
      CacheService.getScriptCache().get('session_'+sha256_(token))!==
        (PropertiesService.getScriptProperties().getProperty('ADMIN_EPOCH') || 'initial')) {
    throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  }
}

function sha256_(s) {
  var digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  return digest.map(function(b){return ('0'+(b<0?b+256:b).toString(16)).slice(-2);}).join('');
}

function safeText_(s,max,required) {
  var value=String(s==null?'':s).replace(/[\u0000-\u001F\u007F]/g,' ').trim();
  if (value.length>max) throw new Error('ข้อความยาวเกิน '+max+' ตัวอักษร');
  if (required && !value) throw new Error('กรุณากรอกข้อมูลที่จำเป็น');
  // Prevent spreadsheet formula execution when writing user-provided strings.
  if (/^[=+\-@]/.test(value)) value="'"+value;
  return value;
}

function safeUrl_(s,required) {
  var value=String(s||'').trim();
  if (!value) {
    if (required) throw new Error('กรุณาระบุลิงก์');
    return '';
  }
  if (value.length>2000 || !/^https?:\/\//i.test(value)) throw new Error('URL ต้องขึ้นต้นด้วย https:// หรือ http://');
  return value;
}

function safeId_(s) {
  var value=String(s||'');
  if (value && !/^[a-zA-Z0-9_-]{1,90}$/.test(value)) throw new Error('รหัสรายการไม่ถูกต้อง');
  return value;
}

function boundedInteger_(x,min,max,fallback) {
  var n=Number(x);
  return Number.isFinite(n) && n>=min && n<=max ? Math.round(n) : fallback;
}

function withLock_(callback) {
  var lock=LockService.getScriptLock();
  lock.waitLock(15000);
  try {return callback();} finally {lock.releaseLock();}
}
