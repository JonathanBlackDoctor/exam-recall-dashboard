import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error The adapter is a Node-only module.
import {projectData} from '../scripts/build-data.mjs';
import {fixture} from './fixture.ts';
function source(){
 const d=fixture(),inputHash='c'.repeat(64);
 const rows=d.cells.map(c=>({exam_id:c.examId,person_id:c.personId,person_name:d.people.find(p=>p.id===c.personId)!.name,exam_number:c.examId==='e1'?32:1,stage:c.examId==='e1'?'본1':'예2',exam_name:c.examId==='e1'?'소화기 1차':'기초 실습 기말',display_session:c.examId==='e1'?'1차':'기말고사',input_hash:inputHash,participation_status:c.participation,score_missing:c.missing,attendance_numbers:c.personId==='p1'?[1]:c.examId==='e1'?[]:[2],total_tenths:c.total,base_tenths:c.base,extra_tenths:c.extra,auxiliary_tenths:c.aux,base_count:c.baseCount,extra_count:c.extraCount,auxiliary_count:c.auxCount,lower_tenths:c.lower,upper_tenths:c.upper}));
 const exams=[{id:'e1',stage:'본1',subject_group:'메이저',subject_family:'소화기',formal_course_name:null},{id:'e2',stage:'예2',subject_group:'마이너',subject_family:'기초 실습',formal_course_name:'기초 실습'}];
 const report={final_verified_at:d.meta.verifiedAt,checks:{validation_errors:0,people_exam_score_rows:4},input_hash:inputHash,rule_version:d.meta.ruleVersion,participation_verification:{independent_saved_file_audit:{status:'passed'}}};
 return {rows,exams,report};
}
test('current roster determines row order and older-only people remain outside it',()=>{
 const {rows,exams,report}=source(),d=projectData(rows,exams,report,'b'.repeat(64));
 assert.deepEqual(d.people.map((p:{attendance:number|null})=>p.attendance),[1,null]);assert.equal(d.cells[2].total,null);assert.equal(d.exams.find((e:{id:string})=>e.id==='e2').session,'기말고사');
 assert.equal(JSON.stringify(d).includes('attendance_numbers'),false);assert.equal(JSON.stringify(d).includes('evidence'),false);
});
test('unverified, changed-input and contradictory attendance sources stop export',()=>{
 const {rows,exams,report}=source();assert.throws(()=>projectData(rows,exams,{...report,final_verified_at:null},'hash'));
 const changed=structuredClone(rows);changed[0].input_hash='changed';assert.throws(()=>projectData(changed,exams,report,'hash'));
 const ambiguous=structuredClone(rows);ambiguous[0].attendance_numbers=[1,2];assert.throws(()=>projectData(ambiguous,exams,report,'hash'));
 const names=structuredClone(rows);names[1].person_name='다른 가상 이름';assert.throws(()=>projectData(names,exams,report,'hash'));
});
