/** Static frontend structure sanity check. Run with Node.js, no dependencies. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
const directLookups=new Set([...js.matchAll(/\$\("([a-zA-Z0-9]+)"\)/g)].map(m=>m[1]));
for(const id of directLookups)assert.ok(ids.has(id),`Missing HTML id: ${id}`);
for(const name of ['index.html','styles.css','app.js','config.js','favicon.svg','.nojekyll']){
  assert.ok(fs.existsSync(path.join(root,name)),`Missing public file: ${name}`);
}
for(const cls of ['category-grid','resource-card','hero-art','sidebar','topbar']){
  assert.ok(css.includes('.'+cls),`Missing CSS class: ${cls}`);
}
assert.match(html,/<html lang="th">/);
console.log(`PASS • ${directLookups.size} element IDs, assets, responsive styles`);
