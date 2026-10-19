import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const prisma = new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
async function main() {
  const plans = [
    { name:'Starter', slug:'starter', dailyRate:.025, monthlyRate:0, minCents:10000, maxCents:199900, durationDays:7, description:'For investors exploring the platform. Target rates are illustrative and are not guaranteed.' },
    { name:'Elite', slug:'elite', dailyRate:.03, monthlyRate:0, minCents:200000, maxCents:999900, durationDays:7, description:'A seven-day investment mandate. Capital is at risk.' },
    { name:'Gold', slug:'gold', dailyRate:.04, monthlyRate:0, minCents:1000000, maxCents:4999900, durationDays:7, description:'An elevated investment allocation. Capital is at risk.' },
    { name:'Platinum', slug:'platinum', dailyRate:.05, monthlyRate:0, minCents:5000000, maxCents:49999900, durationDays:7, description:'For substantial investment allocations. Capital is at risk.' },
    { name:'Shareholder', slug:'shareholder', dailyRate:0, monthlyRate:.10, minCents:1500000, maxCents:100000000, durationDays:365, description:'A one-year mandate with target monthly dividends. Returns are not guaranteed.' }
  ];
  for (const plan of plans) await prisma.plan.upsert({where:{slug:plan.slug},create:plan,update:{}});
  const wallets = [
    {asset:'BTC',network:'Bitcoin',address:'bc1qd6y65dug0zfrm6dy9m33a27k93psddqdaxs3s4'},
    {asset:'ETH',network:'Ethereum',address:'0x56Eb85F6DE376B668caaa4FD14113FB003772FF9'},
    {asset:'USDT',network:'TRC20',address:'TXNBz6qWyo72beUWDtC1qKiBdFFb7c1A74'},
    {asset:'BNB',network:'BSC',address:'0x56Eb85F6DE376B668caaa4FD14113FB003772FF9'},
    {asset:'SOL',network:'Solana',address:'66PAnBEKahkxQzBF1kwDGETHxvrXhrKSoA43ieKwcQG5'},
    {asset:'USDT',network:'ERC20',address:'0x56Eb85F6DE376B668caaa4FD14113FB003772FF9'}
  ];
  for (const wallet of wallets) await prisma.wallet.upsert({where:{asset_network:{asset:wallet.asset,network:wallet.network}},create:wallet,update:{}});
  console.log('Seeded supplied plan definitions and six supplied public deposit addresses. No users, funds, performance history, or verified custody claims created.');
}
main().catch(()=>{console.error('Seed failed; check database configuration.');process.exitCode=1;}).finally(()=>prisma.$disconnect());
