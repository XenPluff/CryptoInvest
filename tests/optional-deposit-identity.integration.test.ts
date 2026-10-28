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
(connection?describe:describe.skip)("optional identity review for deposits",()=>{
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

  it("allows quotes, pending deposits and reviewed funding without identity approval",async()=>{
    const nativeFetch=globalThis.fetch;
    const spy=vi.spyOn(globalThis,"fetch").mockImplementation((input,init)=>String(input).startsWith("https://api.coinbase.com/")?Promise.resolve(Response.json({data:{amount:"2500",base:"ETH",currency:"USD"}})):nativeFetch(input,init));
    const depositBody=()=>({walletId:wallet.id,amount:10,txHash:"0x"+randomBytes(32).toString("hex")});
    try{
      for(const status of [null,"PENDING","REJECTED","APPROVED"]){
        if(status===null)await db.kycSubmission.deleteMany({where:{userId:investor.id}});
        else await db.kycSubmission.upsert({where:{userId:investor.id},create:{userId:investor.id,country:"Test",documentType:"passport",encryptedPayload:encrypt("{}"),status},update:{status}});
        expect((await request("/auth/me")).data.user.kycStatus).toBe(status??"NOT_SUBMITTED");
        const quote=await request("/deposits/quote","POST",{walletId:wallet.id,amount:10});expect(quote.status).toBe(200);
        const before=(await request("/dashboard")).data.balance;
        const submitted=await request("/deposits","POST",{...depositBody(),quoteToken:quote.data.quote.quoteToken});
        expect(submitted.status).toBe(201);expect(submitted.data.deposit.status).toBe("PENDING");
        expect((await request("/dashboard")).data.balance).toBe(before);
        expect((await request(`/admin/deposits/${submitted.data.deposit.id}/review`,"POST",{action:"approve",confirmedAmount:10,code:code()},"admin")).status).toBe(200);
        expect((await request("/dashboard")).data.balance).toBe(before+10);
        if(status!=="APPROVED"){
          expect((await request("/investments","POST",{planId:plan.id,amount:10})).status).toBe(403);
          expect((await request("/withdrawals","POST",withdrawal)).status).toBe(403);
        }
      }
      await db.user.update({where:{id:investor.id},data:{emailVerifiedAt:null}});
      expect((await request("/deposits/quote","POST",{walletId:wallet.id,amount:10})).status).toBe(403);
      expect((await request("/deposits","POST",depositBody())).status).toBe(403);
      await db.user.update({where:{id:investor.id},data:{emailVerifiedAt:new Date()}});
      await db.setting.upsert({where:{key:"fundingEnabled"},create:{key:"fundingEnabled",value:"false"},update:{value:"false"}});
      expect((await request("/deposits/quote","POST",{walletId:wallet.id,amount:10})).status).toBe(503);
      expect((await request("/deposits","POST",depositBody())).status).toBe(503);
    }finally{
      spy.mockRestore();await db.user.update({where:{id:investor.id},data:{emailVerifiedAt:new Date()}});
      await db.setting.upsert({where:{key:"fundingEnabled"},create:{key:"fundingEnabled",value:"true"},update:{value:"true"}});
      await db.kycSubmission.upsert({where:{userId:investor.id},create:{userId:investor.id,country:"Test",documentType:"passport",encryptedPayload:encrypt("{}"),status:"APPROVED"},update:{status:"APPROVED"}});
    }
  });
});
