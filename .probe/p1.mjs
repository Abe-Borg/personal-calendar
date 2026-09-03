import { chromium } from 'playwright';

const URL = 'file:///home/user/personal-calendar/dist/index.html';
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const log = (...a) => console.log(...a);

const b = await chromium.launch({ executablePath: EXEC });
const ctx = await b.newContext();
const page = await ctx.newPage();
page.on('console', m => { if (m.type()==='error'||m.type()==='warning') log('  [console]', m.type(), m.text().slice(0,200)); });
page.on('pageerror', e => log('  [pageerror]', e.message));
await page.goto(URL);
await page.waitForSelector('text=Month view, [role=grid]', {timeout: 10000}).catch(()=>{});
await page.waitForTimeout(600);

// seed two events on today via the DB directly
const today = await page.evaluate(() => {
  const d = new Date();
  const p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
});
log('today =', today);

async function seed() {
  await page.evaluate(async (today) => {
    const req = indexedDB.open('my-calendar-db');
    const db = await new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error);});
    const tx = db.transaction('events','readwrite');
    const s = tx.objectStore('events');
    s.put({id:'AAA', title:'Alpha Event', date: today, allDay:false, startTime:'08:00', endTime:'09:00', category:'work', pinned:true, description:'desc A'});
    s.put({id:'BBB', title:'Beta Event',  date: today, allDay:true,  category:'design', pinned:true, description:'desc B'});
    await new Promise(r=>{tx.oncomplete=r;});
    db.close();
  }, today);
  await page.reload();
  await page.waitForTimeout(700);
}
await seed();

log('--- chips present ---');
log(await page.locator('button').filter({hasText:'Alpha Event'}).count(), await page.locator('button').filter({hasText:'Beta Event'}).count());

// TEST 1: open Alpha, Escape, open Beta -> which title shows?
log('\n=== TEST 1: open A, Esc, open B ===');
await page.getByRole('button', {name:/Edit Alpha Event/}).first().click();
await page.waitForTimeout(300);
log('  title field after opening A:', await page.locator('#evt-title').inputValue());
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.getByRole('button', {name:/Edit Beta Event/}).first().click();
await page.waitForTimeout(400);
log('  title field after opening B:', await page.locator('#evt-title').inputValue());
log('  allDay checked (B should be true):', await page.locator('.checkRow input[type=checkbox]').first().isChecked());
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// TEST 2: modal open for A; click directly on Beta chip (backdrop mousedown closes, then click)
log('\n=== TEST 2: modal open for A, then click Beta chip directly ===');
await page.getByRole('button', {name:/Edit Alpha Event/}).first().click();
await page.waitForTimeout(300);
log('  open with:', await page.locator('#evt-title').inputValue());
const betaBox = await page.getByRole('button', {name:/Edit Beta Event/}).first().boundingBox();
log('  beta chip box:', JSON.stringify(betaBox));
await page.mouse.move(betaBox.x+betaBox.width/2, betaBox.y+betaBox.height/2);
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(400);
const modalStill = await page.locator('[role=dialog]').count();
log('  dialog count after click:', modalStill);
if (modalStill) log('  title now:', await page.locator('#evt-title').inputValue());
await page.keyboard.press('Escape').catch(()=>{});
await page.waitForTimeout(200);

// TEST 3: same-tick double open (simulates the race the guard is meant to cover)
log('\n=== TEST 3: synchronous A.click(); B.click() ===');
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const a = btns.find(b=>/Edit Alpha Event/.test(b.getAttribute('aria-label')||''));
  const bb = btns.find(b=>/Edit Beta Event/.test(b.getAttribute('aria-label')||''));
  a.click(); bb.click();
});
await page.waitForTimeout(600);
log('  dialog heading:', await page.locator('#evt-heading').textContent().catch(()=>'none'));
log('  title:', await page.locator('#evt-title').inputValue().catch(()=>'none'));
log('  allDay:', await page.locator('.checkRow input[type=checkbox]').first().isChecked().catch(()=>'none'));
await page.keyboard.press('Escape').catch(()=>{});

await b.close();
