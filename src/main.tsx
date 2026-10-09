import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { decryptData } from './crypto.ts';
import type { Envelope } from './crypto.ts';
import { cellKey, defaultSubjects, formatValue, heatColor, metrics, metricValue, selectedExams, validateData } from './model.ts';
import type { DashboardData, MetricId, Cell, Person } from './model.ts';
import { ScoringGuide } from './ScoringGuide.tsx';
import './style.css';

function Mark() { return <span className="brand-mark" aria-hidden="true"><i/><i/><i/><i/></span>; }
function LockIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg>; }
function App() {
  const [data,setData]=useState<DashboardData|null>(null), [password,setPassword]=useState(''), [visible,setVisible]=useState(false), [busy,setBusy]=useState(false), [error,setError]=useState('');
  async function unlock(e: React.FormEvent) {
    e.preventDefault(); if (busy || !password) return;
    setBusy(true); setError('');
    let entered=password; setPassword('');
    try {
      const response=await fetch(`${import.meta.env.BASE_URL}data.enc.json`,{cache:'no-store'});
      if (!response.ok) throw new Error('network');
      const body=await response.text(); if (body.length>8_100_000) throw new Error('invalid');
      setData(validateData(await decryptData(JSON.parse(body) as Envelope,entered)));
      setVisible(false);
    } catch (e) { setError(e instanceof Error && e.message==='network' ? '결과 파일을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' : '열지 못했습니다. 비밀번호를 확인해주세요.'); }
    finally { entered=''; setBusy(false); }
  }
  if (data) return <Dashboard data={data} lock={()=>{setData(null);setPassword('');setError('');}}/>;
  return <main className="locked"><div className="lock-brand"><Mark/><span>복기 기록</span></div>
    <section className="unlock-panel"><div className="lock-emblem"><LockIcon/></div><h1>복기 기록 열기</h1><p className="muted">공유 비밀번호를 입력하세요.</p>
      <form onSubmit={unlock}><label htmlFor="password">비밀번호</label><div className="password-field"><input id="password" autoFocus type={visible?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} disabled={busy} required/><button type="button" className="show-password" onClick={()=>setVisible(v=>!v)} disabled={busy} aria-label={visible?'비밀번호 숨기기':'비밀번호 표시'}>{visible?'숨기기':'표시'}</button></div>
        {error&&<p className="error" role="alert">{error}</p>}<button type="submit" className="primary unlock-button" disabled={busy||!password}>{busy?'기록을 여는 중…':'기록 열기'}<span aria-hidden="true">→</span></button>
      </form><p className="privacy-note"><LockIcon/>결과는 비밀번호로 암호화되어 있습니다.</p></section><div className="lock-bottom">EXAM RECALL</div></main>;
}
function Dashboard({data,lock}:{data:DashboardData;lock:()=>void}) {
  const [subjects,setSubjects]=useState(()=>defaultSubjects(data)), [metric,setMetric]=useState<MetricId>('total'), [view,setView]=useState<'table'|'detail'>('table'), [picker,setPicker]=useState(false);
  const [personId,setPersonId]=useState(data.people[0].id), [examId,setExamId]=useState(data.exams[0].id);
  const [scoring,setScoring]=useState(false);
  const exams=useMemo(()=>selectedExams(data,subjects),[data,subjects]);
  const index=useMemo(()=>new Map(data.cells.map(c=>[cellKey(c.personId,c.examId),c])),[data]);
  const active=metrics.find(m=>m.id===metric)!;
  const detailExam=exams.find(e=>e.id===examId)??exams[0];
  const person=data.people.find(p=>p.id===personId)??data.people[0];
  function openDetail(p:Person,eid:string) { setPersonId(p.id);setExamId(eid);setView('detail'); }
  const groups=data.subjects.filter(s=>exams.some(e=>e.subjectId===s.id));
  const legendValues=active.count?[0,1,2,4,8]:[0,active.pivot/4,active.pivot/2,active.pivot,active.pivot*2,active.pivot*4];
  return <div className="app-shell">
    <header className="app-header"><div className="brand"><Mark/><div><h1>복기 기록</h1><span className="brand-sub">시험별 기여 비교</span></div></div><button className="lock-button" onClick={lock}><LockIcon/>잠그기</button></header>
    {data.meta.demo&&<div className="demo-banner">화면 검증용 가상 데이터입니다.</div>}
    <main className="workspace"><div className="workspace-top"><div><h2>{view==='table'?'시험별 비교':'기여 요약'}</h2><p className="scope-text">현재 본1 출석번호순 <span>·</span> {data.people.length}명 <span>·</span> {exams.length}개 시험</p></div>
      <div className="workspace-actions"><button className="scoring-button" onClick={()=>setScoring(true)} aria-haspopup="dialog"><span aria-hidden="true">ⓘ</span> 점수 기준</button><div className="view-switch" aria-label="표시 방식"><button aria-pressed={view==='table'} onClick={()=>setView('table')}>표</button><button aria-pressed={view==='detail'} onClick={()=>setView('detail')}>상세</button></div></div></div>
    <section className="data-panel"><div className="toolbar"><button className="subject-button" onClick={()=>setPicker(true)} aria-haspopup="dialog"><span>과목 선택</span><b>{subjects.length}</b><span aria-hidden="true">⌄</span></button>
      <div className="metric-field"><label htmlFor="metric">표시 척도</label><select id="metric" value={metric} onChange={e=>setMetric(e.target.value as MetricId)}>{metrics.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></div><span className="toolbar-hint">{view==='table'?'칸을 누르면 기여 요약이 열립니다.':'기본 · 초과 · 보충 구성'}</span></div>
      {exams.length===0?<div className="empty"><h3>선택된 과목이 없습니다.</h3><button className="primary" onClick={()=>setPicker(true)}>과목 선택하기</button></div>:view==='table'?<>
      <div className="table-scroll" tabIndex={0} aria-label="시험별 복기 점수 비교표. 가로로 스크롤할 수 있습니다."><table><thead><tr><th rowSpan={2} className="person-head" scope="col">출석번호 · 이름</th>{groups.map(s=><th className="subject-head" key={s.id} scope="colgroup" colSpan={exams.filter(e=>e.subjectId===s.id).length}><span>{s.name}</span><small>{s.stage}</small></th>)}</tr><tr>{exams.map(e=><th className="session-head" key={e.id} scope="col">{e.session}</th>)}</tr></thead>
        <tbody>{data.people.map((p,i)=><React.Fragment key={p.id}>{p.attendance===null&&(i===0||data.people[i-1].attendance!==null)&&<tr className="outside-roster"><th colSpan={exams.length+1} scope="rowgroup"><span>현재 명단 외</span></th></tr>}<tr><th className="person-cell" scope="row"><span className="attendance">{p.attendance??'—'}</span><span>{p.name}</span></th>{exams.map(e=>{
          const c=index.get(cellKey(p.id,e.id)),value=metricValue(c,metric),text=formatValue(value,active.count),status=c?.missing?'미응시':c?.provisional?'잠정 점수':'';
          return <td key={e.id}><button className={`score-cell ${c?.missing?'missing':''}`} style={heatColor(value,active.pivot)} onClick={()=>openDetail(p,e.id)} aria-label={`${p.name} ${e.name} ${active.label} ${text}${value===null?'':active.unit}${status?' · '+status:''}`} title={c?.missing?'미응시':c?.provisional?`잠정 · ${formatValue(c.lower===null?null:c.lower/10)}~${formatValue(c.upper===null?null:c.upper/10)}점`:undefined}>{text}{c?.provisional&&<span className="provisional-dot" aria-hidden="true">•</span>}</button></td>;
        })}</tr></React.Fragment>)}</tbody></table></div>
        <div className="legend-bar"><div className="legend"><span>{active.label}</span>{legendValues.map(v=><span className="legend-entry" key={v}><i style={heatColor(v,active.pivot)}/>{formatValue(v,active.count)}</span>)}<span className="legend-more">이상도 같은 기준</span></div><span className="missing-key"><i/>미응시</span></div></>:<div className="detail-area"><div className="detail-controls"><label>사람<select value={person.id} onChange={e=>setPersonId(e.target.value)}>{data.people.map(p=><option key={p.id} value={p.id}>{p.attendance??'명단 외'} · {p.name}</option>)}</select></label><label>시험<select value={detailExam.id} onChange={e=>setExamId(e.target.value)}>{exams.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label></div>
          <Summary cell={index.get(cellKey(person.id,detailExam.id))!} metric={metric}/></div>}
    </section><footer className="data-footer"><span>같은 값은 모든 시험에서 같은 색으로 표시합니다. 미응시는 0점과 구분합니다.</span><details><summary>척도 안내</summary><p>본복기 문항 수는 기본과 초과 문항 수의 합입니다. 기본 점수는 상위 두 문항, 초과 복기는 나머지 본복기, 보충은 별도 보충 기여입니다. 색상은 의무 이행 여부를 판정하지 않습니다.</p></details><div className="version"><span>검증 {new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(data.meta.verifiedAt))}</span><span>{data.meta.ruleVersion} · {data.meta.dataVersion.slice(0,8)}</span></div></footer>
    </main>{picker&&<SubjectPicker data={data} selected={subjects} close={()=>setPicker(false)} apply={value=>{setSubjects(value);setPicker(false);}}/>}{scoring&&<ScoringGuide close={()=>setScoring(false)}/>}</div>;
}
function Summary({cell,metric}:{cell:Cell;metric:MetricId}) {
  if (cell.missing) return <div className="missing-summary"><span className="status-badge">미응시</span><h3>이 시험의 점수가 없습니다.</h3><p>응시자 명단에 포함되지 않아 결측으로 표시합니다.</p></div>;
  const rows=[{label:'기본 복기',count:cell.baseCount,value:cell.base,id:'base'}, {label:'초과 복기',count:cell.extraCount,value:cell.extra,id:'extra'}, {label:'보충',count:cell.auxCount,value:cell.aux,id:'aux'}];
  return <div className="summary"><div className="summary-total"><span>총점</span><strong>{formatValue(cell.total===null?null:cell.total/10)}<small>점</small></strong>{cell.provisional&&<span className="status-badge">잠정 · {formatValue(cell.lower===null?null:cell.lower/10)}~{formatValue(cell.upper===null?null:cell.upper/10)}점</span>}</div><table className="summary-table"><thead><tr><th>구성</th><th>문항 수</th><th>점수</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className={metric===r.id?'highlight':''}><th scope="row">{r.label}</th><td>{r.count}문항</td><td>{formatValue(r.value===null?null:r.value/10)}점</td></tr>)}</tbody></table>{cell.total===0&&<p className="zero-note">응시자 명단에 있으나 채점 대상 기여가 없습니다.</p>}</div>;
}
function SubjectPicker({data,selected,close,apply}:{data:DashboardData;selected:string[];close:()=>void;apply:(v:string[])=>void}) {
  const dialog=useRef<HTMLDialogElement>(null), [draft,setDraft]=useState([...selected]);
  useEffect(()=>{const d=dialog.current!;d.showModal();return()=>d.close();},[]);
  const categories=Array.from(new Set(data.subjects.map(s=>`${s.stage} ${s.group}`)));
  return <dialog ref={dialog} onCancel={e=>{e.preventDefault();close();}} aria-labelledby="picker-title" className="subject-dialog"><header><div><h2 id="picker-title">비교할 과목</h2><p>선택한 과목의 모든 시험을 표시합니다.</p></div><button onClick={close} className="icon-button" aria-label="과목 선택 닫기">×</button></header><div className="presets"><button onClick={()=>setDraft(defaultSubjects(data))}>본1 메이저</button><button onClick={()=>setDraft(data.subjects.map(s=>s.id))}>전체 선택</button><button onClick={()=>setDraft([])}>선택 해제</button></div><div className="subject-options">{categories.map(cat=><fieldset key={cat}><legend>{cat}</legend>{data.subjects.filter(s=>`${s.stage} ${s.group}`===cat).map(s=><label className="subject-option" key={s.id}><input type="checkbox" checked={draft.includes(s.id)} onChange={e=>setDraft(v=>e.target.checked?[...v,s.id]:v.filter(id=>id!==s.id))}/><span>{s.name}</span><small>{data.exams.filter(e=>e.subjectId===s.id).length}개 시험</small></label>)}</fieldset>)}</div><footer><span>{draft.length}개 과목 선택</span><button className="primary" onClick={()=>apply(data.subjects.filter(s=>draft.includes(s.id)).map(s=>s.id))}>선택 적용</button></footer></dialog>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
