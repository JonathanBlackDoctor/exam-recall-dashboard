import {mkdirSync,writeFileSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadVerified} from './build-data.mjs';
import {encryptData} from '../src/crypto.ts';
import {validateData} from '../src/model.ts';
const {data}=loadVerified(resolve('..'));
data.meta={dataVersion:'0'.repeat(64),verifiedAt:'2026-10-09T20:08:00+09:00',ruleVersion:'scoring-v1.3',resultHash:'0'.repeat(64),sourceHash:'0'.repeat(64),demo:true};
data.people=data.people.map((p,i)=>({id:`demo-person-${i+1}`,name:`가상학생 ${String(i+1).padStart(2,'0')}`,attendance:i<86?i+1:null}));
data.exams=data.exams.map((e,i)=>({...e,id:`demo-exam-${i+1}`}));
data.cells=data.people.flatMap((p,i)=>data.exams.map((e,j)=>{
 const missing=(i===86&&j%2===0)||(i%17===0&&j%7===0),baseCount=(i+j)%3,extraCount=baseCount===2?(i*j)%5:0,auxCount=(i+j)%2;
 const base=baseCount*12,extra=extraCount*3,aux=auxCount,total=base+extra+aux;
 const val=v=>missing?null:v;
 return {personId:p.id,examId:e.id,missing,participation:missing?'미응시':'응시',total:val(total),base:val(base),extra:val(extra),aux:val(aux),baseCount:val(baseCount),extraCount:val(extraCount),auxCount:val(auxCount),provisional:!missing&&i===2&&j===0,lower:val(total),upper:val(total+(!missing&&i===2&&j===0?1:0))};
}));
validateData(data);mkdirSync('.private/demo-public',{recursive:true});
writeFileSync('.private/demo-public/data.enc.json',JSON.stringify(await encryptData(data,'demo-only')));
copyFileSync('public/favicon.svg','.private/demo-public/favicon.svg');
console.log(JSON.stringify({demo:true,people:data.people.length,exams:data.exams.length}));
