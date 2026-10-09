import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {encryptData,decryptData} from '../src/crypto.ts';
import {validateData} from '../src/model.ts';

export const ADAPTER_VERSION='recall-dashboard-v1.1';
export const hash=b=>createHash('sha256').update(b).digest('hex');
const requireTrue=(value,message)=>{if(!value)throw new Error(message);};
export function projectData(rows,sourceExams,report,resultHash) {
  requireTrue(report.final_verified_at && report.checks.validation_errors===0,'Source verification is missing or failed');
  requireTrue(report.participation_verification?.independent_saved_file_audit?.status==='passed','Participation audit has not passed');
  requireTrue(rows.length===report.checks.people_exam_score_rows,'Source row count changed');
  const examMap=new Map(sourceExams.map(e=>[e.id,e]));
  const uniqueExamRows=new Map();
  for(const r of rows) {requireTrue(examMap.has(r.exam_id),'Exam metadata is missing');uniqueExamRows.set(r.exam_id,r);requireTrue(r.input_hash===report.input_hash,'Score input hash differs');}
  const currentExam=[...uniqueExamRows.values()].filter(r=>r.stage==='본1').sort((a,b)=>b.exam_number-a.exam_number)[0];
  requireTrue(currentExam,'Current roster is missing');
  const current=new Map();
  for(const r of rows.filter(r=>r.exam_id===currentExam.exam_id && r.participation_status==='응시')) {
    requireTrue(r.attendance_numbers.length===1 && Number.isInteger(r.attendance_numbers[0]),'Current attendance number is ambiguous');
    current.set(r.person_id,r.attendance_numbers[0]);
  }
  requireTrue(new Set(current.values()).size===current.size,'Current attendance number is duplicated');
  const persons=new Map();
  for(const r of rows) {
    const old=persons.get(r.person_id);requireTrue(!old||old.name===r.person_name,'Canonical names disagree');
    persons.set(r.person_id,{id:r.person_id,name:r.person_name,attendance:current.get(r.person_id)??null});
  }
  const people=[...persons.values()].sort((a,b)=>(a.attendance??Infinity)-(b.attendance??Infinity)||a.name.localeCompare(b.name,'ko'));
  const subjectsById=new Map(),exams=[];
  const courseOrder=['기초신경','감염','진단영상과검사','외과총론','호흡기','순환기','소화기'];
  for(const r of uniqueExamRows.values()) {
    const source=examMap.get(r.exam_id),name=source.formal_course_name||source.subject_family;
    const subjectId=`${source.stage}:${name}`;
    subjectsById.set(subjectId,{id:subjectId,name,family:source.subject_family,stage:source.stage,group:source.subject_group});
    exams.push({id:r.exam_id,subjectId,name:r.exam_name,session:r.display_session||'단일 시험',order:r.exam_number});
  }
  const rank=s=>(s.stage==='본1'?0:100)+(s.group==='메이저'?0:40)+(courseOrder.indexOf(s.family)>=0?courseOrder.indexOf(s.family):20);
  const subjects=[...subjectsById.values()].sort((a,b)=>rank(a)-rank(b)||a.name.localeCompare(b.name,'ko',{numeric:true}));
  const cells=rows.map(r=>{
    requireTrue(typeof r.score_missing==='boolean' && ['응시','미응시'].includes(r.participation_status),'Participation is not confirmed');
    return {personId:r.person_id,examId:r.exam_id,missing:r.score_missing,participation:r.participation_status,
      total:r.total_tenths,base:r.base_tenths,extra:r.extra_tenths,aux:r.auxiliary_tenths,
      baseCount:r.base_count,extraCount:r.extra_count,auxCount:r.auxiliary_count,
      provisional:!r.score_missing && r.lower_tenths!==r.upper_tenths,lower:r.lower_tenths,upper:r.upper_tenths};
  });
  const data={schemaVersion:1,meta:{dataVersion:hash(`${resultHash}:${report.input_hash}:${ADAPTER_VERSION}`),verifiedAt:report.final_verified_at,ruleVersion:report.rule_version,resultHash,sourceHash:report.input_hash},people,subjects,exams,cells};
  return validateData(data);
}
export function loadVerified(taskRoot) {
  const final=join(taskRoot,'최종본'),scoreBytes=readFileSync(join(final,'시험별_복기점수.jsonl')),datasetBytes=readFileSync(join(final,'dataset.jsonl'));
  const report=JSON.parse(readFileSync(join(final,'채점_검증결과.json'),'utf8'));
  requireTrue(hash(scoreBytes)===report.deliverable_sha256['시험별_복기점수.jsonl'],'Score file differs from verified hash');
  requireTrue(hash(datasetBytes)===report.input_hash,'Dataset differs from verified hash');
  const rows=scoreBytes.toString('utf8').trim().split(/\r?\n/).map(l=>JSON.parse(l));
  const sourceExams=datasetBytes.toString('utf8').split(/\r?\n/).filter(l=>/"record_type"\s*:\s*"exam"/.test(l)).map(l=>JSON.parse(l));
  return {data:projectData(rows,sourceExams,report,hash(scoreBytes)),sourceHashes:{scores:hash(scoreBytes),dataset:hash(datasetBytes),report:hash(readFileSync(join(final,'채점_검증결과.json')))}};
}
const here=dirname(fileURLToPath(import.meta.url));
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const web=resolve(here,'..'),task=resolve(web,'..');
  const {data,sourceHashes}=loadVerified(task);
  if(process.argv.includes('--audit')) {
    const dist=join(web,'dist');
    const {readdirSync}=await import('node:fs');
    const files=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);
    let checks=0;
    for(const path of files(dist)) {
      if(path.endsWith('data.enc.json'))continue;
      const text=readFileSync(path,'utf8');
      for(const p of data.people){requireTrue(!text.includes(p.name),'A real name leaked into public output');checks++;}
      requireTrue(!/"person_name"\s*:|"sender_raw_values"\s*:|"evidence"\s*:/.test(text),'Raw source leaked into output');
    }
    console.log(JSON.stringify({status:'passed',realNameChecks:checks}));
  } else {
    let password=readFileSync(0,'utf8').replace(/\r?\n$/,'');requireTrue(password.length>0,'Password is required on stdin');
    const envelope=await encryptData(data,password);
    const roundtrip=validateData(await decryptData(envelope,password));
    requireTrue(JSON.stringify(roundtrip)===JSON.stringify(data),'Encryption round trip changed data');
    const latest=loadVerified(task);requireTrue(JSON.stringify(latest.sourceHashes)===JSON.stringify(sourceHashes),'Sources changed while exporting');
    mkdirSync(join(web,'public'),{recursive:true});mkdirSync(join(web,'.private'),{recursive:true});
    const output=join(web,'public/data.enc.json');writeFileSync(output,JSON.stringify(envelope)+'\n');
    const audit={status:'passed',adapterVersion:ADAPTER_VERSION,dataVersion:data.meta.dataVersion,sourceHashes,people:data.people.length,exams:data.exams.length,cells:data.cells.length,currentRoster:data.people.filter(p=>p.attendance!==null).length,missing:data.cells.filter(c=>c.missing).length,zero:data.cells.filter(c=>!c.missing&&c.total===0).length,initialSubjects:data.subjects.filter(s=>s.stage==='본1'&&s.group==='메이저').length,initialExams:data.exams.filter(e=>data.subjects.some(s=>s.id===e.subjectId&&s.stage==='본1'&&s.group==='메이저')).length,ciphertextHash:hash(readFileSync(output)),generatedAt:new Date().toISOString()};
    writeFileSync(join(web,'.private/export-audit.json'),JSON.stringify(audit,null,2)+'\n');password='';console.log(JSON.stringify(audit));
  }
}
