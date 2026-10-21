/** Build-time translation of public interface copy only. Never submits account or runtime data. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {french} from '../lib/i18n.ts';
import {externalFetch} from '../server/network.ts';
const source=JSON.parse(await readFile('lib/locales/source.json','utf8')) as Record<string,string[]>;
const locales=(process.argv.slice(2).length?process.argv.slice(2):['fr','de','es','it','ru','uk','ar']);
await mkdir('lib/locales',{recursive:true});
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const placeholders=(text:string)=>[...text.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort().join(',');
async function translateBatch(keys:string[],locale:string,attempt=0):Promise<string[]>{
 const url=new URL('https://translate.googleapis.com/translate_a/single');url.search=new URLSearchParams({client:'gtx',sl:'en',tl:locale,dt:'t',q:keys.join('\n')}).toString();
 try{const response=await externalFetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error(`Translation HTTP ${response.status}`);const result=await response.json();const text=(result[0] as any[]).map(part=>part[0]||'').join('');const lines=text.trim().split('\n').map(line=>line.trim());if(lines.length===keys.length&&lines.every((line,i)=>line&&placeholders(line)===placeholders(keys[i])))return lines;
 if(keys.length===1)throw new Error('Translation did not preserve placeholders');
 }catch(error){if(attempt<2){await wait(1000*(attempt+1));return translateBatch(keys,locale,attempt+1);}if(keys.length===1)throw error;}
 const split=Math.ceil(keys.length/2);return [...await translateBatch(keys.slice(0,split),locale),...await translateBatch(keys.slice(split),locale)];
}
for(const locale of locales){
 let messages:Record<string,string>={};try{messages=JSON.parse(await readFile(`lib/locales/${locale}.json`,'utf8'));}catch{}
 if(locale==='fr')for(const [key,value] of Object.entries(french)){if(Object.hasOwn(source,key))messages[key]=value;}
 const missing=Object.keys(source).filter(key=>!messages[key]);let cursor=0;let finished=Object.keys(source).length-missing.length;
 const batches:string[][]=[];let batch:string[]=[];let length=0;for(const key of missing){if(length+key.length>2200||batch.length>=35){batches.push(batch);batch=[];length=0;}batch.push(key);length+=key.length+1;}if(batch.length)batches.push(batch);
 console.log(JSON.stringify({locale,total:Object.keys(source).length,pending:missing.length,batches:batches.length}));
 const save=async()=>writeFile(`lib/locales/${locale}.json`,JSON.stringify(Object.fromEntries(Object.keys(source).filter(k=>messages[k]).sort().map(key=>[key,messages[key]])),null,2)+'\n');
 await Promise.all(Array.from({length:3},async()=>{while(cursor<batches.length){const keys=batches[cursor++];const values=await translateBatch(keys,locale);keys.forEach((key,index)=>messages[key]=values[index]);finished+=keys.length;if(cursor%12===0){await save();console.log(JSON.stringify({locale,finished,total:Object.keys(source).length}));}await wait(100);}}));await save();console.log(JSON.stringify({locale,complete:true,keys:finished}));
}
