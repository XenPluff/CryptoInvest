import {test,expect,type Page} from "@playwright/test";

const wallet={id:"policy-wallet",asset:"ETH",network:"Ethereum",address:"0x"+"1".repeat(40)};
const user={id:"policy-investor",name:"Policy Investor",email:"policy@example.test",role:"USER",emailVerified:true,kycStatus:"APPROVED",twoFactorEnabled:false};
async function fixture(page:Page,account={...user}){
  const mutations:{path:string;body:any}[]=[];
  await page.route("**/api/**",async route=>{
    const req=route.request(),path=new URL(req.url()).pathname;
    if(path==="/api/deposit-price")return route.fulfill({json:{price:{asset:"ETH",priceUsd:"2500",source:"Browser fixture",updatedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+90000).toISOString()}}});
    if(path==="/api/deposits/quote")return route.fulfill({json:{quote:{walletId:wallet.id,asset:"ETH",network:wallet.network,address:wallet.address,amountCents:1000,cryptoAmount:"0.004",priceUsd:"2500",source:"Browser fixture",updatedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+90000).toISOString(),quotedAt:new Date().toISOString(),quoteToken:"browser-only"}}});
    if(req.method()!=="GET"){
      const body=req.postDataJSON();mutations.push({path,body});
      return route.fulfill({json:path==="/api/deposits"?{deposit:{id:"browser-only",asset:"ETH",amount:10,status:"PENDING"}}:{message:"Saved for browser validation."}});
    }
    const data=path==="/api/auth/me"?{user:account}:path==="/api/wallets"?{wallets:[wallet],fundingEnabled:true}:path==="/api/health"?{fundingEnabled:true}:path==="/api/dashboard"?{balance:1000}:path==="/api/transactions"?{transactions:[]}:path==="/api/notifications"?{notifications:[]}:path==="/api/plans"?{plans:[{id:"policy-plan",name:"Starter",slug:"starter",minAmount:10,maxAmount:10000,dailyRate:0.025,durationDays:7,description:"Browser plan fixture"}]}:path==="/api/auth/passkeys"?{credentials:[]}:path==="/api/wallet-connect/links"?{links:[{id:"browser-link",provider:"MetaMask",address:wallet.address,chainId:1,verifiedAt:new Date().toISOString()}]}:path==="/api/admin/users"?{users:[{...user,suspended:false}]}:path==="/api/admin/content"?{entries:[]}:path==="/api/admin/plans"?{plans:[]}:path==="/api/admin/campaigns"?{campaigns:[],confirmed:0}:{};
    return route.fulfill({json:data});
  });return mutations;
}

for(const enabled of [false,true])test(`investor ${enabled?"enabled":"disabled"} two-factor preference only adds a withdrawal code`,async({page})=>{
  const mutations=await fixture(page,{...user,twoFactorEnabled:enabled});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/dashboard/wallets");await expect(page.locator('#dp-code')).toHaveCount(0);
  await page.getByLabel("Deposit amount (USD)").fill("10");await page.getByRole("button",{name:"Proceed to payment"}).click();await page.getByRole("checkbox").check();await page.getByRole("button",{name:"Done — I have sent the funds"}).click();
  await expect(page.getByRole("heading",{name:"Submitted for review."})).toBeVisible();expect(mutations[0].body).not.toHaveProperty("code");
  await page.goto("/dashboard/plans");await page.getByRole("button",{name:"Choose Starter"}).click();const dialog=page.getByRole("dialog");await expect(dialog.locator('input[name="code"]')).toHaveCount(0);await dialog.getByLabel("Investment amount (USD)").fill("10");await dialog.getByRole("checkbox").check();await dialog.getByRole("button",{name:"Confirm investment"}).click();await expect.poll(()=>mutations.filter(m=>m.path==="/api/investments").length).toBe(1);expect(mutations.find(m=>m.path==="/api/investments")!.body).not.toHaveProperty("code");
  await page.goto("/dashboard/withdrawals");const form=page.locator('form').filter({has:page.getByRole("button",{name:"Request withdrawal",exact:true})});await expect(form.locator('input[name="code"]')).toHaveCount(enabled?1:0);await form.getByLabel("Amount (USD)",{exact:true}).fill("10");await form.locator('select[name="wallet"]').selectOption(wallet.id);await form.getByLabel("Destination wallet address").fill(wallet.address);await form.getByRole("checkbox").check();await form.getByRole("button",{name:"Request withdrawal",exact:true}).click();
  if(enabled){expect(mutations.filter(m=>m.path==="/api/withdrawals")).toHaveLength(0);await form.getByLabel("Authenticator code",{exact:false}).fill("123456");await form.getByRole("button",{name:"Request withdrawal",exact:true}).click();}
  await expect.poll(()=>mutations.filter(m=>m.path==="/api/withdrawals").length).toBe(1);const withdrawal=mutations.find(m=>m.path==="/api/withdrawals")!.body;if(enabled)expect(withdrawal.code).toBe("123456");else expect(withdrawal).not.toHaveProperty("code");
  await page.goto("/dashboard/account");const security=page.locator('.ws-panel').filter({has:page.getByRole("heading",{name:"Two-factor authentication",exact:true})});await expect(security).toContainText("optional");await expect(security.locator('input[name="code"]')).toHaveCount(0);if(enabled)await expect(security.getByLabel("Current password")).toBeVisible();
  const passkeys=page.locator('.ws-panel').filter({has:page.getByRole("heading",{name:"Passkeys & biometrics"})});await expect(passkeys.getByLabel("Current password")).toBeVisible();await expect(passkeys.locator('input[name="code"]')).toHaveCount(0);
  await page.getByRole("button",{name:"Unlink from AUREON"}).click();await expect(page.getByRole("button",{name:"Confirm unlink"})).toBeVisible();await expect(page.getByLabel("Current authenticator code")).toHaveCount(0);
  for(const width of [1440,390,320]){await page.setViewportSize({width,height:950});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}expect(errors).toEqual([]);
});

test("administrator setup is compulsory and only the enrollment screen is shown until enabled",async({page})=>{
  const reads:string[]=[];await page.route('**/api/**',route=>{const req=route.request(),path=new URL(req.url()).pathname;reads.push(path);return route.fulfill({json:path==='/api/auth/me'?{user:{...user,role:'ADMIN'}}:path==='/api/auth/2fa/setup'?{secret:'BROWSER-ONLY-SETUP',otpauthUrl:'otpauth://totp/Test'}:{}});});
  await page.goto('/admin');await expect(page.getByRole('heading',{name:'Secure your operator account.'})).toBeVisible();await expect(page.locator('.ws-sidebar')).toHaveCount(0);expect(reads).toEqual(['/api/auth/me']);await page.getByRole('button',{name:'Set up authenticator'}).click();await expect(page.getByLabel('Authenticator code')).toBeVisible();await expect(page.getByRole('button',{name:'Disable two-factor authentication'})).toHaveCount(0);
});

test("administrator changes always include a required code, even when a form transform omits it",async({page})=>{
  const mutations=await fixture(page,{...user,role:'ADMIN',twoFactorEnabled:true});await page.goto('/admin/users');await page.getByRole('button',{name:'Manage',exact:true}).click();let dialog=page.getByRole('dialog');await expect(dialog.locator('input[name="code"]')).toHaveCount(1);await dialog.getByRole('button',{name:'Save investor account'}).click();expect(mutations).toHaveLength(0);await dialog.getByLabel('Operator authenticator code').fill('123456');await dialog.getByRole('button',{name:'Save investor account'}).click();await expect(dialog).toHaveCount(0);expect(mutations[0]).toEqual({path:'/api/admin/users/'+user.id,body:{name:user.name,suspended:false,code:'123456'}});
  for(const [path,button] of [['/admin/content','New draft'],['/admin/plans','New plan'],['/admin/campaigns','New campaign']]){await page.goto(path);await page.getByRole('button',{name:button,exact:true}).click();dialog=page.getByRole('dialog');await expect(dialog.locator('input[name="code"]')).toHaveCount(1);await expect(dialog.getByLabel('Operator authenticator code')).toHaveAttribute('required','');}
  await page.goto('/dashboard/account');const security=page.locator('.ws-panel').filter({has:page.getByRole('heading',{name:'Two-factor authentication',exact:true})});await expect(security).toContainText('mandatory');await expect(page.getByRole('button',{name:'Disable two-factor authentication'})).toHaveCount(0);
});

for(const kind of ['investor-off','investor-on','admin'] as const)test(`${kind} login requests codes according to the account policy`,async({page})=>{
  const needCode=kind!=='investor-off';const bodies:any[]=[];const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/**',route=>{const req=route.request(),path=new URL(req.url()).pathname;if(path==='/api/analytics'||path==='/api/admin/analytics')return route.fulfill({status:503,json:{error:'Unavailable in this browser fixture.'}});if(path==='/api/auth/login'){const body=req.postDataJSON();bodies.push(body);return route.fulfill({json:needCode&&!body.code?{requiresTwoFactor:true}:{user:{role:kind==='admin'?'ADMIN':'USER'}}});}return route.fulfill({json:path==='/api/auth/me'?{user:{...user,role:kind==='admin'?'ADMIN':'USER',twoFactorEnabled:needCode}}:path==='/api/notifications'?{notifications:[]}:path==='/api/dashboard'?{balance:0,transactions:[]}:path==='/api/admin/analytics'?{history:[],allocations:[],pending:[],summary:{}}:{}});});
  await page.goto('/login');const form=page.locator('.auth-form').first();await form.getByLabel('Email address').fill(user.email);await form.locator('input[name="password"]').fill('Browser-only password 123');await form.getByRole('button',{name:'Sign in to your account'}).click();if(needCode){await expect(form.getByLabel('Authentication code',{exact:true})).toBeVisible();expect(bodies).toHaveLength(1);await form.getByLabel('Authentication code',{exact:true}).fill('123456');await form.getByRole('button',{name:'Verify & sign in'}).click();}await expect(page).toHaveURL(kind==='admin'?/\/admin$/:/\/dashboard$/);if(needCode)expect(bodies.at(-1)).toHaveProperty('code','123456');else expect(bodies.at(-1)).not.toHaveProperty('code');expect(errors).toEqual([]);
});
