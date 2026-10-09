import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixture.ts';
import {validateData,metricValue,formatValue,defaultSubjects,selectedExams,heatColor} from '../src/model.ts';
test('absence stays null across every metric while observed zero stays numeric',()=>{
 const d=fixture(),missing=d.cells[2],zero={...d.cells[0],total:0,base:0,extra:0,aux:0,baseCount:0,extraCount:0,auxCount:0,lower:0,upper:0};
 for(const metric of ['total','mainCount','auxCount','base','extra','aux'] as const){assert.equal(metricValue(missing,metric),null);assert.equal(metricValue(zero,metric),0);}
 assert.equal(formatValue(null),'—');assert.equal(formatValue(0),'0.0');assert.notDeepEqual(heatColor(null,2.4),heatColor(0,2.4));
});
test('source tenths and counts are displayed without floating point aggregation',()=>{
 const c=fixture().cells[0];assert.equal(metricValue(c,'total'),2.7);assert.equal(metricValue(c,'mainCount'),3);assert.equal(metricValue(c,'base'),2.4);assert.equal(metricValue(c,'extra'),0.3);
});
test('subjects retain grouping and source session labels with no selection supported',()=>{
 const d=fixture();assert.deepEqual(defaultSubjects(d),['s1']);assert.deepEqual(selectedExams(d,['s1']).map(e=>e.id),['e1']);assert.deepEqual(selectedExams(d,[]),[]);assert.equal(selectedExams(d,['s1','s2'])[1].session,'기말고사');
});
test('the same value keeps the same color regardless of other exam values',()=>{
 assert.deepEqual(heatColor(2.4,2.4),heatColor(2.4,2.4));assert.notDeepEqual(heatColor(2.4,2.4),heatColor(9,2.4));
});
test('score numerals keep at least 4.5:1 text contrast across all six fixed scales',()=>{
 const luminance=(color:string)=>{
  const rgb=color.startsWith('rgb')?color.match(/\d+/g)!.map(Number):color.length===4?color.slice(1).split('').map(x=>parseInt(x+x,16)):color.slice(1).match(/../g)!.map(x=>parseInt(x,16));
  return rgb.map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 };
 for(const pivot of [2.4,2,1,.3,.1])for(const value of [null,0,.1,.3,.6,.9,1,1.8,2.4,3,4,9,20,100]){
  const colors=heatColor(value,pivot),a=luminance(colors.color),b=luminance(colors.backgroundColor);
  assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,`Insufficient contrast at value ${value}, scale ${pivot}`);
 }
});
test('invalid grids, ambiguous IDs and numeric absence are rejected',()=>{
 assert.doesNotThrow(()=>validateData(fixture()));
 const removed=fixture();removed.cells.pop();assert.throws(()=>validateData(removed));
 const duplicate=fixture();duplicate.cells[1]=duplicate.cells[0];assert.throws(()=>validateData(duplicate));
 const absence=fixture();absence.cells[2].total=0;assert.throws(()=>validateData(absence));
 const total=fixture();total.cells[0].total=28;assert.throws(()=>validateData(total));
 const fractional=fixture();fractional.cells[0].baseCount=1.5;assert.throws(()=>validateData(fractional));
});
