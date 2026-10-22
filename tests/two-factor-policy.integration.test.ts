import {afterAll,beforeAll,describe,expect,it,vi} from "vitest";
import {createServer,type Server} from "node:http";
import {randomBytes,randomUUID} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pg from "pg";
import {authenticator} from "otplib";
import "dotenv/config";

const connection=process.env.TEST_DATABASE_URL;
(connection?describe:describe.skip)("investor choice and mandatory administrator two-factor policy",()=>{
  let db:any,server:Server,base:string,encrypt:(s:string)=>string,tokenHash:(s:string)=>string;
  let investor:any,protectedInvestor:any,admin:any,wallet:any,plan:any;
  const password="Policy test password 123!",secret=authenticator.generateSecret();
  const code=()=>authenticator.generate(secret),cookies:Record<string,string>={};
  async function request(path:string,method="GET",body?:unknown,as="investor"){
    const r=await fetch(base+"/api"+path,{method,headers:{origin:"http://localhost:3000",...(body?{"content-type":"application/json"}:{}),...(cookies[as]?{cookie:cookies[as]}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:r.status,data:await r.json(),cookie:r.headers.get("set-cookie")?.split(";")[0]};
  }
  async function account(role="USER",enabled=false){
    return db.user.create({data:{name:"Policy fixture",email:randomUUID()+"@example.test",referralCode:randomUUID(),passwordHash:await bcrypt.hash(password,4),role,emailVerifiedAt:new Date(),twoFactorEnabled:enabled,twoFactorSecret:enabled?encrypt(secret):null,kyc:{create:{country:"Test",documentType:"passport",status:"APPROVED",encryptedPayload:encrypt("{}")}}}});
  }
  async function login(as:string,user:any,withCode=false){
    const result=await request("/auth/login","POST",{email:user.email,password,...(withCode?{code:code()}:{})},"none");
    expect(result.status).toBe(200);expect(result.cookie).toBeTruthy();cookies[as]=result.cookie!;return result;
  }
  const withdrawal={amount:10,asset:"ETH",network:"Ethereum",address:"0x"+"2".repeat(40)};
  beforeAll(async()=>{
    const url=new URL(connection!);
    if(!url.pathname.endsWith("_test")||url.pathname===new URL(process.env.DATABASE_URL!).pathname)throw new Error("Separate disposable test database required.");
    process.env.DATABASE_URL=connection;process.env.NODE_ENV="test";process.env.FUNDING_ENABLED="true";process.env.APP_ORIGIN="http://localhost:3000";
    process.env.JWT_SECRET=randomBytes(48).toString("hex");process.env.KYC_ENCRYPTION_KEY=randomBytes(32).toString("hex");
    const native=new pg.Client({connectionString:connection});await native.connect();
    try{await native.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");const root=new URL("../prisma/migrations/",import.meta.url);for(const entry of (await readdir(root,{withFileTypes:true})).filter(entry=>entry.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await native.query(await readFile(new URL(entry.name+"/migration.sql",root),"utf8"));}finally{await native.end();}
    db=(await import("../server/db")).prisma;({encrypt,tokenHash}=await import("../server/crypto"));
    server=createServer((await import("../server/app")).app);await new Promise<void>(r=>server.listen(0,"127.0.0.1",r));base=`http://127.0.0.1:${(server.address() as any).port}`;
    investor=await account();protectedInvestor=await account("USER",true);admin=await account("ADMIN",true);
    wallet=await db.wallet.create({data:{asset:"ETH",network:"Ethereum",address:"0x"+"1".repeat(40)}});
    plan=await db.plan.create({data:{name:"Policy plan",slug:"starter",minCents:100,maxCents:100000,dailyRate:0.025,durationDays:7,description:"Isolated policy test plan"}});
    for(const user of [investor,protectedInvestor])await db.ledgerEntry.create({data:{userId:user.id,amountCents:100000,kind:"TEST_FIXTURE",referenceId:randomUUID()}});
    await login("investor",investor);await login("protected",protectedInvestor,true);await login("admin",admin,true);
  },30000);
  afterAll(async()=>{if(server)await new Promise<void>(r=>{server.close(()=>r());server.closeAllConnections();});await db?.$disconnect();},30000);

  it("does not enroll investors automatically; enabled accounts and administrators cannot sign in without a code",async()=>{
    expect(investor.twoFactorEnabled).toBe(false);
    for(const user of [protectedInvestor,admin]){
      const challenge=await request("/auth/login","POST",{email:user.email,password},"none");expect(challenge.data.requiresTwoFactor).toBe(true);expect(challenge.cookie).toBeUndefined();
      expect((await request("/auth/login","POST",{email:user.email,password,code:"invalid"},"none")).status).toBe(401);
    }
  });
  it("allows eligible investors with either preference to deposit and invest without a code",async()=>{
    for(const as of ["investor","protected"]){
      expect((await request("/deposits","POST",{walletId:wallet.id,amount:10,txHash:"0x"+randomBytes(32).toString("hex")},as)).status).toBe(201);
      expect((await request("/investments","POST",{planId:plan.id,amount:10},as)).status).toBe(201);
    }
  });
  it("captures owner-bound deposit instructions and records Done as pending without crediting funds",async()=>{
    const nativeFetch=globalThis.fetch;
    const spy=vi.spyOn(globalThis,"fetch").mockImplementation((input,init)=>String(input).startsWith("https://api.coinbase.com/")?Promise.resolve(Response.json({data:{amount:"2500",base:"ETH",currency:"USD"}})):nativeFetch(input,init));
    try{
      expect((await request("/deposit-price?asset=ETH","GET",undefined,"none")).status).toBe(401);
      const prices=await request("/deposit-price?asset=ETH");expect(prices.data.price.priceUsd).toBe("2500");
      const response=await request("/deposits/quote","POST",{walletId:wallet.id,amount:"250.75"});expect(response.status).toBe(200);
      const quote=response.data.quote;expect(quote.address).toBe(wallet.address);expect(quote.cryptoAmount).toBe("0.1003");
      const body={walletId:wallet.id,amount:250.75,txHash:"0x"+randomBytes(32).toString("hex"),quoteToken:quote.quoteToken};
      const before=await db.ledgerEntry.count({where:{userId:investor.id}});
      expect((await request("/deposits","POST",{...body,amount:251})).status).toBe(400);
      expect((await request("/deposits","POST",body,"protected")).status).toBe(400);
      expect((await request("/deposits","POST",{...body,quoteToken:quote.quoteToken+"tampered"})).status).toBe(400);
      const result=await request("/deposits","POST",body);expect(result.status).toBe(201);expect(result.data.deposit.status).toBe("PENDING");expect(result.data.deposit.note).toContain("0.1003 ETH");
      const recorded=await db.auditLog.findFirstOrThrow({where:{action:"DEPOSIT_INSTRUCTIONS_REPORTED",targetId:result.data.deposit.id}});expect(recorded.metadata.cryptoAmount).toBe("0.1003");expect(recorded.metadata).not.toHaveProperty("quoteToken");
      expect(await db.ledgerEntry.count({where:{userId:investor.id}})).toBe(before);
      expect((await request("/deposits","POST",body)).status).toBe(409);
    }finally{spy.mockRestore();}
  });
  it("requires withdrawal codes only for live enrolled accounts and never reserves funds on failed proof",async()=>{
    expect((await request("/withdrawals","POST",withdrawal)).status).toBe(201);
    const before=await db.ledgerEntry.count({where:{userId:protectedInvestor.id}});
    expect((await request("/withdrawals","POST",{...withdrawal,twoFactorEnabled:false},"protected")).status).toBe(403);
    expect((await request("/withdrawals","POST",{...withdrawal,code:"bad"},"protected")).status).toBe(403);
    expect(await db.ledgerEntry.count({where:{userId:protectedInvestor.id}})).toBe(before);
    expect((await request("/withdrawals","POST",{...withdrawal,code:code()},"protected")).status).toBe(201);
  });
  it("rechecks enrollment inside the withdrawal transaction rather than trusting earlier request state",async()=>{
    const original=db.wallet.findUnique.bind(db.wallet);
    const spy=vi.spyOn(db.wallet,"findUnique").mockImplementationOnce(async(args:any)=>{
      const result=await original(args);
      await db.user.update({where:{id:investor.id},data:{twoFactorEnabled:true,twoFactorSecret:encrypt(secret)}});return result;
    });
    try{const before=await db.ledgerEntry.count({where:{userId:investor.id}});expect((await request("/withdrawals","POST",withdrawal)).status).toBe(403);expect(await db.ledgerEntry.count({where:{userId:investor.id}})).toBe(before);}finally{spy.mockRestore();await db.user.update({where:{id:investor.id},data:{twoFactorEnabled:false,twoFactorSecret:null}});}
  });
  it("preserves email, identity and funding gates regardless of the investor preference",async()=>{
    await db.user.update({where:{id:investor.id},data:{emailVerifiedAt:null}});
    expect((await request("/withdrawals","POST",withdrawal)).status).toBe(403);
    await db.user.update({where:{id:investor.id},data:{emailVerifiedAt:new Date()}});
    await db.kycSubmission.update({where:{userId:investor.id},data:{status:"PENDING"}});
    expect((await request("/investments","POST",{planId:plan.id,amount:10})).status).toBe(403);
    await db.kycSubmission.update({where:{userId:investor.id},data:{status:"APPROVED"}});
    await db.setting.upsert({where:{key:"fundingEnabled"},create:{key:"fundingEnabled",value:"false"},update:{value:"false"}});
    expect((await request("/withdrawals","POST",withdrawal)).status).toBe(503);
    await db.setting.update({where:{key:"fundingEnabled"},data:{value:"true"}});
  });
  it("allows investor opt-out with the current password, revokes other sessions and keeps administrator protection mandatory",async()=>{
    const second=await login("protected-second",protectedInvestor,true);
    expect((await request("/auth/2fa/disable","POST",{password:"wrong"},"protected")).status).toBe(403);
    expect((await request("/auth/2fa/disable","POST",{password},"protected")).status).toBe(200);
    expect((await request("/auth/me","GET",undefined,"protected-second")).status).toBe(401);expect(second.cookie).toBeTruthy();
    expect((await login("protected",protectedInvestor)).data.user.twoFactorEnabled).toBe(false);
    expect((await request("/auth/2fa/disable","POST",{password,code:code()},"admin")).status).toBe(403);
    expect((await db.user.findUnique({where:{id:admin.id}})).twoFactorEnabled).toBe(true);
  });
  it("cannot disable mandatory protection when an investor is promoted during password reauthentication",async()=>{
    const target=await account("USER",true);await login("promotion-race",target,true);
    const original=bcrypt.compare.bind(bcrypt);const spy=vi.spyOn(bcrypt,"compare").mockImplementationOnce((async(plain:string,hash:string)=>{
      const valid=await original(plain,hash);await db.user.update({where:{id:target.id},data:{role:"ADMIN"}});return valid;
    }) as any);
    try{expect((await request("/auth/2fa/disable","POST",{password},"promotion-race")).status).toBe(409);const updated=await db.user.findUniqueOrThrow({where:{id:target.id}});expect(updated.role).toBe("ADMIN");expect(updated.twoFactorEnabled).toBe(true);expect(updated.twoFactorSecret).toBe(target.twoFactorSecret);}finally{spy.mockRestore();}
  });
  it("requires current administrator proof for every mutation, including user, plan and draft changes",async()=>{
    const paths:[string,string][]=[["PATCH",`/admin/users/${investor.id}`],["POST","/admin/plans"],["PATCH",`/admin/plans/${plan.id}`],["POST","/admin/content"],["PATCH","/admin/content/unknown"],["POST","/admin/campaigns"],["PATCH","/admin/campaigns/unknown"],["PATCH","/admin/settings"],["POST","/admin/card-applications/unknown/review"],["POST","/admin/operations/alerts/unknown/acknowledge"],["POST","/admin/deposits/unknown/review"],["POST","/admin/withdrawals/unknown/review"],["POST","/admin/kyc/unknown/review"],["POST","/admin/balance-adjustments"],["POST","/admin/transfers"],["POST","/admin/investments/unknown/settle"]];
    const before=await db.auditLog.count();
    for(const [method,path] of paths){for(const proof of [{},{code:"invalid"}])expect((await request(path,method,proof,"admin")).status,path).toBe(403);}
    expect(await db.auditLog.count()).toBe(before);
    expect((await request(`/admin/users/${investor.id}`,"PATCH",{name:"Updated investor",code:code()},"admin")).status).toBe(200);
    expect((await request(`/admin/plans/${plan.id}`,"PATCH",{description:"Updated policy test plan",code:code()},"admin")).status).toBe(200);
    const draft=await request("/admin/content","POST",{kind:"ARTICLE",slug:"policy-test",title:"Policy test article",summary:"A test summary",body:"A test article body for the isolated security checks.",code:code()},"admin");
    expect(draft.status).toBe(201);expect(draft.data.entry).not.toHaveProperty("code");
    const campaign=await request("/admin/campaigns","POST",{title:"Policy draft",subject:"Policy test subject",message:"An isolated draft that is never sent to any subscriber.",code:code()},"admin");expect(campaign.status).toBe(201);expect(campaign.data.campaign).not.toHaveProperty("code");
    expect((await request("/admin/transfers","POST",{fromUserId:investor.id,toUserId:protectedInvestor.id,amount:1,note:"Isolated policy transfer between accounts without mandatory investor MFA.",idempotencyKey:randomUUID(),code:code()},"admin")).status).toBe(201);
  });
  it("restricts unenrolled administrators to a ten-minute setup session and issues full access only after proof",async()=>{
    const pending=await account("ADMIN");const start=await login("pending",pending);expect(start.data.requiresTwoFactorSetup).toBe(true);
    const partial=cookies.pending;
    for(const path of ["/dashboard","/analytics","/notifications","/auth/passkeys","/wallet-connect/links","/admin/overview"])expect((await request(path,"GET",undefined,"pending")).status,path).toBe(403);
    expect((await request("/auth/me","GET",undefined,"pending")).status).toBe(200);
    const setup=await request("/auth/2fa/setup","POST",{},"pending");expect(setup.status).toBe(200);
    expect((await request("/auth/2fa/enable","POST",{code:"bad"},"pending")).status).toBe(400);
    const enabled=await request("/auth/2fa/enable","POST",{code:authenticator.generate(setup.data.secret)},"pending");expect(enabled.status).toBe(200);expect(enabled.cookie).toBeTruthy();cookies.pending=enabled.cookie!;
    expect((await request("/admin/overview","GET",undefined,"pending")).status).toBe(200);
    cookies.old=partial;expect((await request("/auth/me","GET",undefined,"old")).status).toBe(401);
    const other=await account("ADMIN");await login("expired",other);await db.session.updateMany({where:{userId:other.id},data:{expiresAt:new Date(Date.now()-1)}});expect((await request("/auth/2fa/setup","POST",{},"expired")).status).toBe(401);
  });
  it("rejects administrator sessions issued without an MFA claim, including legacy sessions",async()=>{
    const id=randomUUID();const token=jwt.sign({},process.env.JWT_SECRET!,{algorithm:"HS256",subject:admin.id,jwtid:id,issuer:"aureon",audience:"aureon-web",expiresIn:"1h"});
    await db.session.create({data:{id,userId:admin.id,tokenHash:tokenHash(token),expiresAt:new Date(Date.now()+3600000)}});cookies.legacy="aureon_session="+token;
    expect((await request("/admin/overview","GET",undefined,"legacy")).status).toBe(401);
    expect((await request("/admin/overview","GET",undefined,"admin")).status).toBe(200);
  });
});
