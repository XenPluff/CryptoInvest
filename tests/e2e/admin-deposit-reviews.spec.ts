import {test,expect} from '@playwright/test';

for(const action of ['approve','reject']) test(`deposit ${action} works without evidence fields or a review note`,async({page})=>{
 const requests:any[]=[];
 const deposit={id:'review-fixture',asset:'ETH',network:'Ethereum',amount:125.5,status:'PENDING',txHash:'0x'+'a'.repeat(64),createdAt:new Date().toISOString(),user:{id:'investor',name:'Private Investor',email:'investor@example.test'},wallet:{address:'0x'+'1'.repeat(40)}};
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(req.method()!=='GET'){requests.push({path,body:req.postDataJSON()});return route.fulfill({json:{deposit:{...deposit,status:action==='approve'?'APPROVED':'REJECTED'}}});}
  return route.fulfill({json:path==='/api/auth/me'?{user:{id:'operator',name:'Operator',email:'operator@example.test',role:'ADMIN',twoFactorEnabled:true,emailVerified:true}}:path==='/api/notifications'?{notifications:[]}:path==='/api/admin/deposits'?{deposits:requests.length?[]:[deposit]}:{}});
 });
 await page.goto('/admin/deposits');await page.getByRole('button',{name:'Review',exact:true}).click();const dialog=page.getByRole('dialog');
 for(const name of ['verificationReference','ownershipEvidence','note'])await expect(dialog.locator(`[name="${name}"]`)).toHaveCount(0);
 for(const text of ['Independent on-chain evidence reference','Explorer URL or confirmed transaction record','Depositor ownership and source-of-funds evidence','Evidence and review note','Record explorer evidence, confirmations, and verified amount.'])await expect(dialog).not.toContainText(text);
 await expect(dialog.getByLabel('Confirmed amount (USD)')).toHaveValue('125.5');await dialog.getByLabel('Decision').selectOption(action);
 await dialog.getByRole('button',{name:'Record review decision'}).click();expect(requests).toEqual([]);
 await dialog.getByLabel('Operator authenticator code').fill('123456');
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
 await dialog.getByRole('button',{name:'Record review decision'}).click();await expect(dialog).toHaveCount(0);
 expect(requests).toEqual([{path:'/api/admin/deposits/review-fixture/review',body:{action,confirmedAmount:125.5,code:'123456'}}]);
});
