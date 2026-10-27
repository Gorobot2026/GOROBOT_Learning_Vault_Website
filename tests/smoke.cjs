/**
 * Local Google Apps Script smoke test using in-memory service mocks.
 * Run: node tests/smoke.cjs
 * This test does not access real Google Sheets, Drive, or public deployment.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

class Range {
  constructor(sheet, r, c, nr, nc) { Object.assign(this, { sheet, r, c, nr, nc }); }
  getValues() { return Array.from({length:this.nr},(_,i)=>Array.from({length:this.nc},(_,j)=>this.sheet.rows[this.r+i-1]?.[this.c+j-1] ?? '')); }
  getValue() { return this.getValues()[0][0]; }
  setValues(values) { values.forEach((row,i)=>row.forEach((value,j)=>{ const y=this.r+i-1; this.sheet.rows[y] ||= []; this.sheet.rows[y][this.c+j-1]=value; })); return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
  setFontWeight() { return this; }
}
class Sheet {
  constructor(name) { this.name=name; this.rows=[]; }
  getLastRow() { return this.rows.length; }
  getRange(r,c,nr=1,nc=1) { return new Range(this,r,c,nr,nc); }
  getDataRange() { return new Range(this,1,1,Math.max(this.rows.length,1),Math.max(this.rows[0]?.length||1,1)); }
  appendRow(row) { this.rows.push([...row]); }
  deleteRow(r) { this.rows.splice(r-1,1); }
  setFrozenRows() {}
  setColumnWidths() {}
}
class Spreadsheet {
  constructor() { this.tabs=new Map(); }
  getId() { return 'test-sheet-id'; }
  getSheetByName(name) { return this.tabs.get(name)||null; }
  insertSheet(name) { const s=new Sheet(name); this.tabs.set(name,s); return s; }
  toast() {}
}

const sheet = new Spreadsheet();
const props = new Map();
const cache = new Map();
const propService = {
  getProperty:key=>props.get(key)||null,
  setProperty:(key,value)=>{props.set(key,value);},
  setProperties:values=>Object.entries(values).forEach(([k,v])=>props.set(k,v))
};
const cacheService = {
  get:key=>cache.get(key)||null,
  put:(key,value)=>cache.set(key,value),
  remove:key=>cache.delete(key)
};
const context = vm.createContext({
  SpreadsheetApp: {
    getActiveSpreadsheet:()=>sheet,
    getUi:()=>({}),
    openById:id=>{assert.equal(id,'test-sheet-id');return sheet;}
  },
  PropertiesService: {getScriptProperties:()=>propService},
  CacheService: {getScriptCache:()=>cacheService},
  LockService: {getScriptLock:()=>({waitLock(){},releaseLock(){}})},
  DriveApp: {
    Access:{ANYONE_WITH_LINK:'anyone'},Permission:{VIEW:'view'},
    createFolder:()=>({getId:()=> 'test-folder-id'}),
    getFolderById:id=>{
      assert.equal(id,'test-folder-id');
      return {createFile:()=>({getId:()=> 'test-file-id',setSharing(){},getUrl:()=> 'https://drive.google.com/file/d/test-file-id/view'})};
    }
  },
  Utilities: {
    getUuid:()=>crypto.randomUUID(),
    Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},
    computeDigest:(algorithm,input)=>Array.from(crypto.createHash(algorithm).update(input,'utf8').digest()).map(b=>b>127?b-256:b),
    base64Decode:base64=>Array.from(Buffer.from(base64,'base64')),
    newBlob:(bytes,mime,name)=>({bytes,mime,name})
  },
  ContentService: {
    MimeType:{JAVASCRIPT:'js',TEXT:'txt'},
    createTextOutput:content=>({content,setMimeType(type){this.type=type;return this;}})
  },
  console,
});

const source=fs.readFileSync(path.resolve(__dirname,'../google-apps-script/Code.gs'),'utf8');
vm.runInContext(source,context);
const call=(name,...args)=>context[name](...args);

// Initialization and public catalog
assert.equal(call('setupDatabase'),'Database ready');
assert.equal(call('getCatalog_').categories.length,4);
assert.equal(call('getCatalog_').resources.length,0);
assert.throws(()=>call('adminLogin','wrong'),/ยังไม่ได้ตั้งรหัสผ่าน/);

// Secret lives in Apps Script Properties, not the public website.
const salt='test-unique-salt';
props.set('ADMIN_SALT',salt);
props.set('ADMIN_HASH',call('sha256_',salt+':a-long-correct-password'));
props.set('ADMIN_EPOCH','epoch-v1');
assert.throws(()=>call('adminLogin','wrong'),/รหัสผ่านไม่ถูกต้อง/);
const session=call('adminLogin','a-long-correct-password').token;
assert.ok(session.length>80);
assert.throws(()=>call('adminSaveCategory','invalid-token',{name:'No'}),/เซสชัน/);

const afterCategory=call('adminSaveCategory',session,{
  name:'ESP32 Labs',description:'ทดลองเขียนโปรแกรม',icon:'Cpu',accent:'teal',sortOrder:9
});
assert.equal(afterCategory.categories.length,5);
const addedCat=afterCategory.categories.find(c=>c.name==='ESP32 Labs');
assert.ok(addedCat.id);

// Resource write and URL validation
assert.throws(()=>call('adminSaveResource',session,{title:'Unsafe',categoryId:addedCat.id,href:'javascript:alert(1)'}),/URL/);
const afterResource=call('adminSaveResource',session,{
  categoryId:addedCat.id,title:'AGV Mission',description:'เกมแข่งหุ่นยนต์',type:'link',
  href:'https://example.com/agv',tags:'AGV, Coding',featured:true,sortOrder:1
});
assert.equal(afterResource.resources.length,1);
assert.equal(afterResource.resources[0].featured,1);
assert.deepEqual(Array.from(afterResource.resources[0].tags),['AGV','Coding']);
assert.throws(()=>call('adminDeleteCategory',session,addedCat.id),/มีรายการ/);

const file=call('adminUpload',session,{
  kind:'file',fileName:'lesson.pdf',mimeType:'application/pdf',base64:Buffer.from('sample').toString('base64')
});
assert.match(file.url,/drive.google.com\/uc/);

// Public JSONP returns data but no password or token.
const output=call('doGet',{parameter:{mode:'catalog',callback:'GoRobotCatalogReceive'}});
assert.match(output.content,/^window\.GoRobotCatalogReceive\(/);
assert.ok(!output.content.includes(session));
assert.ok(!output.content.includes('a-long-correct-password'));

const resId=afterResource.resources[0].id;
assert.equal(call('adminDeleteResource',session,resId).resources.length,0);
assert.equal(call('adminDeleteCategory',session,addedCat.id).categories.length,4);
assert.equal(call('adminLogout',session).ok,true);
assert.throws(()=>call('adminFetch',session),/เซสชัน/);

// Changing the admin password invalidates all old login sessions immediately.
const session2=call('adminLogin','a-long-correct-password').token;
props.set('ADMIN_EPOCH','epoch-v2');
assert.throws(()=>call('adminFetch',session2),/เซสชัน/);

console.log('PASS • initialization, authentication, catalog, CRUD, upload, JSONP, logout');
