import { test, expect, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { aureonVideos } from '../../lib/video-content';
import { pageTitles } from '../../lib/page-titles';
import { supportedLocales, type Locale } from '../../lib/i18n';
const dictionaries = new Map<string, Record<string,string>>();
async function text(locale:Locale,key:string){if(locale==='en')return key;if(!dictionaries.has(locale))dictionaries.set(locale,JSON.parse(await readFile(`lib/locales/${locale}.json`,'utf8')));return dictionaries.get(locale)![key];}
async function choose(page:Page,locale:Locale){await page.locator('.language-selector select').first().selectOption(locale);await expect(page.locator('html')).toHaveAttribute('lang',locale);await expect(page.locator('.language-selector select').first()).toHaveAttribute('aria-busy','false');await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar'?'rtl':'ltr');}
const paths=['/','/about','/approach','/how-it-works','/plans','/insights','/security','/support','/cards','/company-profile','/videos','/journal','/legal','/legal/terms','/legal/privacy','/legal/risk','/legal/aml','/register','/login','/forgot-password','/reset-password','/verify-email','/newsletter/confirm','/newsletter/unsubscribe','/missing-page'];

test('every public page changes language and preserves its choice on navigation and reload',async({page})=>{
 test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});
 // Only public data requests are unavailable; page HTML and language chunks are real.
 await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'The live market provider is temporarily unavailable.'}}));
 const untranslated:Record<string,string[]>={};
 const englishHeadings=new Map<string,string>();for(const path of paths){await page.goto(path);englishHeadings.set(path,await page.locator('h1').first().innerText());}
 for(const locale of supportedLocales.filter(value=>value!=='en')){
  await page.goto('/');await choose(page,locale);
  for(const path of paths){await page.goto(path);await expect(page.locator('html')).toHaveAttribute('lang',locale);await expect(page.locator('.language-selector select').first()).toHaveValue(locale);await expect(page.locator('.language-selector select').first()).toHaveAttribute('aria-busy','false');await expect(page.locator('h1').first()).not.toHaveText(englishHeadings.get(path)!);
   const titleKey=pageTitles[path]||'Page not found';await expect(page).toHaveTitle((await text(locale,titleKey))+(path==='/'?'':' | AUREON'));
   if(path==='/legal/terms')await expect(page.getByText(await text(locale,'Original documents are in English. Translations are provided for convenience.'),{exact:true})).toBeVisible();
   if(path==='/approach')await expect(page.locator('#crypto-mining h2')).toContainText(await text(locale,'1. Cryptocurrency Mining and Digital Infrastructure'));
   if(path==='/company-profile')await expect(page.locator('a[download="AUREON-Company-Profile.pdf"]')).toHaveAttribute('href','/documents/aureon-company-profile.pdf');
   const visibleText=await page.locator('main').first().evaluate(root=>{const texts:string[]=[];const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){const parent=node.parentElement;if(parent&&!parent.closest('code,pre,bdi,script,style,option,[translate="no"]')&&getComputedStyle(parent).visibility!=='hidden'&&parent.getClientRects().length)texts.push((node.textContent||'').replace(/\s+/g,' ').trim());}return texts;});
   const catalog=dictionaries.get(locale)??JSON.parse(await readFile(`lib/locales/${locale}.json`,'utf8'));const leftovers=[...new Set(visibleText.filter(key=>key.length>2&&catalog[key]&&catalog[key]!==key))];if(leftovers.length)untranslated[locale+path]=leftovers;

  }
  await page.reload();await expect(page.locator('.language-selector select').first()).toHaveValue(locale);
 }
 await writeFile('.aureon/validation/localization-coverage.json',JSON.stringify(untranslated,null,2));expect(untranslated).toEqual({});expect(errors).toEqual([]);
});

test('long languages and Arabic fit desktop and narrow public/auth layouts',async({page})=>{
 test.setTimeout(180000);await page.emulateMedia({reducedMotion:'reduce'});await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'The live market provider is temporarily unavailable.'}}));
 for(const path of ['/','/approach','/cards','/register','/login','/legal/terms']){
  await page.goto(path);
  for(const locale of ['de','es','it','ru','uk','ar'] as const){await choose(page,locale);for(const width of [1440,390,320]){await page.setViewportSize({width,height:950});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),{message:`${path} ${locale} ${width}px fits`}).toBe(true);}}
 }
 await page.goto('/');await choose(page,'ar');await page.screenshot({path:'.aureon/screenshots/localization-ar-home.png',fullPage:true});
});

test('translated investor forms preserve wallet destinations, typed values, API payloads and private names',async({page})=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const mutations:{path:string,body:any}[]=[];
 const wallet={id:'wallet-browser',asset:'ETH',network:'Ethereum',address:'0x1234567890aBCDEF1234567890abcdef12345678'};
 const quote={walletId:wallet.id,asset:wallet.asset,network:wallet.network,address:wallet.address,amountCents:12345,cryptoAmount:'0.04938',priceUsd:'2500',source:'Browser fixture',updatedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+90000).toISOString(),quotedAt:new Date().toISOString(),quoteToken:'browser-only-instructions'};
 await page.route('**/api/**',async route=>{const request=route.request();const path=new URL(request.url()).pathname;
 if(path==='/api/deposit-price')return route.fulfill({json:{price:quote}});
 if(path==='/api/deposits/quote')return route.fulfill({json:{quote}});
 if(request.method()!=='GET'){mutations.push({path,body:request.postDataJSON()});return route.fulfill({status:400,json:{error:'Unsupported deposit network.'}});}
 const data=path==='/api/auth/me'?{user:{id:'browser-only',name:'Pending',email:'fixture@example.test',role:'USER',emailVerified:true,twoFactorEnabled:true,kycStatus:'APPROVED'}}:path==='/api/notifications'?{notifications:[]}:path==='/api/wallets'?{wallets:[wallet],fundingEnabled:true}:path==='/api/transactions'?{transactions:[]}:{};
 return route.fulfill({json:data});});
 await page.goto('/dashboard/wallets');await expect(page.getByTestId('deposit-address')).toHaveCount(0);
 await page.locator('#dp-amount').fill('123.45');await page.getByRole('button',{name:'Proceed to payment'}).click();await page.locator('#dp-hash').fill('0x'+'a'.repeat(64));await page.locator('.dp-close').click();
 for(const locale of supportedLocales){await choose(page,locale);await expect(page.locator('.ws-user strong')).toHaveText('Pending');await page.locator('.dp-saved-payment .dp-primary-button').click();await expect(page.getByTestId('deposit-address')).toHaveText(wallet.address);await expect(page.getByTestId('deposit-coin-amount')).toHaveText('0.04938 ETH');await expect(page.locator('#dp-hash')).toHaveValue('0x'+'a'.repeat(64));for(const width of [1440,390,320]){await page.setViewportSize({width,height:950});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),{message:`deposit ${locale} ${width}px fits`}).toBe(true);}await page.locator('.dp-close').click();}
 expect(mutations).toEqual([]);await choose(page,'ar');await page.locator('.dp-saved-payment .dp-primary-button').click();await page.locator('.dp-confirm-check input').check();await page.locator('.dp-payment-dialog button[type="submit"]').click();await expect.poll(()=>mutations.length).toBe(1);expect(mutations[0]).toEqual({path:'/api/deposits',body:{walletId:wallet.id,amount:123.45,txHash:'0x'+'a'.repeat(64),quoteToken:'browser-only-instructions'}});await expect(page.locator('.dp-form [role="alert"]')).toContainText(await text('ar','Unsupported deposit network.'));await page.screenshot({path:'.aureon/screenshots/localization-ar-deposit.png',fullPage:true});expect(errors).toEqual([]);
});

test('admin controls and status labels translate without changing select values',async({page})=>{
 test.setTimeout(90000);const mutations:string[]=[];
 await page.route('**/api/**',route=>{const req=route.request(),path=new URL(req.url()).pathname;if(req.method()!=='GET'){mutations.push(path);return route.fulfill({status:400,json:{error:'Not permitted.'}});}return route.fulfill({json:path==='/api/auth/me'?{user:{id:'browser-admin',name:'Approved',email:'private@example.test',role:'ADMIN',emailVerified:true,twoFactorEnabled:true}}:path==='/api/notifications'?{notifications:[]}:path==='/api/admin/card-applications'?{program:{message:'Pre-launch review only. Administrator decisions cannot issue cards or approve credit.'},applications:[],total:0,page:1,pageSize:20}:path==='/api/admin/operations'?{alerts:[],backups:[],backup:{encryptionConfigured:false,keyFingerprint:null,storageConfigured:false,missingStorageSettings:['BACKUP_S3_BUCKET'],validStorageEndpoint:true,automaticEnabled:false,schedule:'Daily',retention:'30 days'}}:{}});});
 await page.goto('/admin/cards');const original=await page.locator('main select').first().locator('option').evaluateAll(options=>options.map(el=>(el as HTMLOptionElement).value));
 for(const locale of ['de','es','it','ru','uk','ar'] as const){await choose(page,locale);await expect(page.locator('.ws-user strong')).toHaveText('Approved');expect(await page.locator('main select').first().locator('option').evaluateAll(options=>options.map(el=>(el as HTMLOptionElement).value))).toEqual(original);await expect(page.locator('h1')).toHaveText(await text(locale,'Card applications'));for(const width of [1440,390,320]){await page.setViewportSize({width,height:950});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}}
 await page.goto('/admin/operations');await expect(page.locator('h1')).toHaveText(await text('ar','Operations & backups'));expect(mutations).toEqual([]);
});

test('registration keeps entered credentials and consent while switching languages',async({page})=>{
 const mutations:string[]=[];await page.route('**/api/**',route=>{mutations.push(route.request().method());return route.fulfill({status:503,json:{error:'Please try again later.'}});});
 await page.goto('/register');const values={name:'Pending',email:'private@example.test',password:'Browser-only-credential-471',confirmPassword:'Browser-only-credential-471'};
 for(const [name,value] of Object.entries(values))await page.locator(`input[name="${name}"]`).fill(value);
 const consent=page.locator('.auth-register-form input[type="checkbox"]').first();await consent.check();
 for(const locale of supportedLocales){await choose(page,locale);for(const [name,value] of Object.entries(values))await expect(page.locator(`input[name="${name}"]`)).toHaveValue(value);await expect(consent).toBeChecked();}
 await choose(page,"en");await expect(page.locator("html")).toHaveAttribute("dir","ltr");expect(mutations).toEqual([]);
});


test('all five video guides show complete translated chapter headings',async({page})=>{
 test.setTimeout(90000);await page.goto('/videos');await page.locator('details summary').first().click();
 for(const locale of supportedLocales.filter(value=>value!=='en')){
  await choose(page,locale);
  for(let videoIndex=0;videoIndex<aureonVideos.length;videoIndex++){
   await page.locator('aside button[aria-pressed]').nth(videoIndex).click();
   const headings=page.locator('details ol li h3');const scenes=aureonVideos[videoIndex].scenes;await expect(headings).toHaveCount(scenes.length);
   for(let i=0;i<scenes.length;i++)await expect(headings.nth(i)).toHaveText(await text(locale,scenes[i].title+' '+scenes[i].accent));
  }
 }
});
