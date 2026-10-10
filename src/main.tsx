import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { decryptData } from './crypto.ts';
import type { Envelope } from './crypto.ts';
import { cellKey, defaultSubjects, formatValue, heatColor, metrics, metricValue, selectedExams, validateData } from './model.ts';
import type { DashboardData, MetricId, Cell, Person } from './model.ts';
import { ScoringGuide } from './ScoringGuide.tsx';
import { Dialog } from './Dialog.tsx';
import { Icon, Mark } from './Icons.tsx';
import './style.css';

const descriptions: Record<MetricId, string> = {
  total: '기본 점수 + 초과 복기 점수 + 보충 점수',
  mainCount: '기본 배점 적용 문항과 초과 본복기 문항의 합',
  auxCount: '별도 문항의 보충·답만 제공한 기여',
  base: '배점이 높은 최대 두 본복기 문항의 점수',
  extra: '나머지 본복기 문항 수 × 0.3점',
  aux: '별도 보충·답만 제공 문항 수 × 0.1점',
};
function Brand() {
  return <div className="brand"><Mark/><div><span className="brand-name">복기 기록</span><span className="brand-sub">시험별 기여를 한눈에</span></div></div>;
}
function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [password, setPassword] = useState(''), [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [guide, setGuide] = useState(false);
  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !password) return;
    setBusy(true); setError('');
    let entered = password;
    setPassword('');
    try {
      const response = await fetch(import.meta.env.BASE_URL + 'data.enc.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('network');
      const body = await response.text();
      if (body.length > 8_100_000) throw new Error('invalid');
      setData(validateData(await decryptData(JSON.parse(body) as Envelope, entered)));
      setVisible(false);
    } catch (cause) {
      setError(cause instanceof Error && cause.message === 'network'
        ? '결과 파일을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
        : '열지 못했습니다. 비밀번호를 확인해주세요.');
    } finally { entered = ''; setBusy(false); }
  }
  if (data) return <Dashboard data={data} lock={() => { setData(null); setPassword(''); setError(''); setGuide(false); }}/>;
  return <div className="locked">
    <header className="lock-header"><Brand/><button className="text-button scoring-button" onClick={() => setGuide(true)} aria-haspopup="dialog"><Icon name="info"/>점수 기준</button></header>
    <main className="lock-layout">
      <section className="lock-intro"><span className="eyebrow">전체 시험 복기 히트맵</span>
        <h1>복기 기여를,<br/><em>한눈에.</em></h1>
        <p>시험별 기여를 비교하고<br/>각 문항의 배점과 판정 기준을 확인하세요.</p>
        <div className="intro-features"><span><Icon name="grid"/>시험별 히트맵</span><span><Icon name="list"/>기여 요약</span><span><Icon name="info"/>점수 기준</span></div>
      </section>
      <section className="unlock-panel" aria-labelledby="unlock-title">
        <div className="lock-emblem"><Icon name="lock"/></div><span className="eyebrow">함께 남긴 복기 기록</span>
        <h2 id="unlock-title">기록 열기</h2><p className="muted">공유받은 비밀번호를 입력해주세요.</p>
        <form onSubmit={unlock}>
          <label htmlFor="password">비밀번호</label><div className="password-field">
            <input id="password" autoFocus type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => { setPassword(event.target.value); setError(''); }} disabled={busy} required aria-describedby={error ? 'unlock-error' : undefined}/>
            <button type="button" className="show-password" onClick={() => setVisible(value => !value)} disabled={busy} aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'}>{visible ? '숨기기' : '표시'}</button>
          </div>
          {error && <p id="unlock-error" className="error" role="alert">{error}</p>}
          <button type="submit" className="primary unlock-button" disabled={busy || !password}>{busy ? '기록을 여는 중…' : '기록 열기'}<Icon name="arrow"/></button>
        </form>
        <p className="privacy-note"><Icon name="lock"/>결과는 비밀번호로 보호되어 있습니다.</p>
      </section>
    </main>
    <footer className="lock-footer">한 사람의 한 시험 기준 · 같은 문항은 한 번만</footer>
    {guide && <ScoringGuide close={() => setGuide(false)}/>}
  </div>;
}

function Dashboard({ data, lock }: { data: DashboardData; lock: () => void }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const [subjects, setSubjects] = useState(() => defaultSubjects(data));
  const [metric, setMetric] = useState<MetricId>('total'), [view, setView] = useState<'table' | 'detail'>('table');
  const [picker, setPicker] = useState(false), [scoring, setScoring] = useState(false), [query, setQuery] = useState('');
  const [personId, setPersonId] = useState(data.people[0].id), [examId, setExamId] = useState(data.exams[0].id);
  const scroll = useRef<HTMLDivElement>(null), scrollPosition = useRef({ left: 0, top: 0 }), returnCell = useRef('');
  const exams = useMemo(() => selectedExams(data, subjects), [data, subjects]);
  const index = useMemo(() => new Map(data.cells.map(cell => [cellKey(cell.personId, cell.examId), cell])), [data]);
  const active = metrics.find(item => item.id === metric)!;
  const detailExam = exams.find(exam => exam.id === examId) ?? exams[0];
  const person = data.people.find(item => item.id === personId) ?? data.people[0];
  const visiblePeople = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    if (!value) return data.people;
    return data.people.filter(item => item.name.toLocaleLowerCase().includes(value)
      || (item.attendance !== null && String(item.attendance).padStart(2, '0').includes(value))
      || (item.attendance === null && '명단외'.includes(value.replaceAll(' ', ''))));
  }, [data, query]);
  useEffect(() => {
    if (view === 'table' && scroll.current) {
      scroll.current.scrollTo(scrollPosition.current.left, scrollPosition.current.top);
      if (returnCell.current) Array.from(scroll.current.querySelectorAll<HTMLButtonElement>('button[data-cell-key]')).find(button => button.dataset.cellKey === returnCell.current)?.focus({ preventScroll: true });
    } else if (view === 'detail') document.getElementById('detail-person')?.focus({ preventScroll: true });
  }, [view]);
  function openDetail(item: Person, id: string) {
    if (scroll.current) scrollPosition.current = { left: scroll.current.scrollLeft, top: scroll.current.scrollTop };
    returnCell.current = cellKey(item.id, id);
    setPersonId(item.id); setExamId(id); setView('detail');
  }
  const groups = data.subjects.filter(subject => exams.some(exam => exam.subjectId === subject.id));
  const legendValues = active.count ? [1, 2, 4, 8] : [active.pivot / 4, active.pivot / 2, active.pivot, active.pivot * 2];
  const presets = [
    { label: '본1 메이저', ids: defaultSubjects(data) },
    { label: '본1 전체', ids: data.subjects.filter(item => item.stage === '본1').map(item => item.id) },
    { label: '예2 전체', ids: data.subjects.filter(item => item.stage === '예2').map(item => item.id) },
    { label: '전체 시험', ids: data.subjects.map(item => item.id) },
  ];
  return <div className="app-shell">
    <header className="app-header"><Brand/><div className="header-actions"><button className="scoring-button" onClick={() => setScoring(true)} aria-haspopup="dialog"><Icon name="info"/>점수 기준</button><button className="lock-button text-button" onClick={lock}><Icon name="lock"/>잠그기</button></div></header>
    {data.meta.demo && <div className="demo-banner">화면 검증용 가상 데이터입니다.</div>}
    <main className="workspace">
      <div className="workspace-top"><div><span className="eyebrow">전체 시험 복기 히트맵</span>
        <h1>{view === 'table' ? '시험별 기여를 한눈에' : '기여 요약'}</h1>
        <p className="scope-text">현재 본1 출석번호순 <span>·</span> {data.people.length}명 <span>·</span> {exams.length}개 시험</p>
      </div><div className="view-switch" aria-label="표시 방식">
        <button aria-pressed={view === 'table'} onClick={() => setView('table')}><Icon name="grid"/>히트맵</button>
        <button aria-pressed={view === 'detail'} onClick={() => setView('detail')}><Icon name="list"/>상세</button>
      </div></div>
      <section className="data-panel" aria-label="시험별 복기 기여">
        <div className="toolbar"><div className="preset-list" aria-label="과목 빠른 선택">{presets.map(preset => <button key={preset.label} aria-pressed={subjects.length === preset.ids.length && preset.ids.every(id => subjects.includes(id))} onClick={() => setSubjects(preset.ids)}>{preset.label}</button>)}</div>
          <button className="subject-button" onClick={() => setPicker(true)} aria-haspopup="dialog"><Icon name="filter"/>과목 선택 <b>{subjects.length}</b></button>
        </div>
        <div className="control-row">{view === 'table' ? <div className="search-field"><Icon name="search"/><label className="sr-only" htmlFor="people-search">이름·출석번호 검색</label><input id="people-search" placeholder="이름·출석번호 검색" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button className="icon-button" onClick={() => setQuery('')} aria-label="검색 지우기"><Icon name="close"/></button>}</div> : <p className="control-hint">사람과 시험을 선택해 기여 구성을 확인하세요.</p>}
          <div className="metric-field"><label htmlFor="metric">표시 척도</label><select id="metric" value={metric} onChange={event => setMetric(event.target.value as MetricId)}>{metrics.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
        </div>
        <div className="table-caption"><span><strong>{active.label}</strong><span>{descriptions[metric]}</span></span><span className="table-hint">{view === 'table' ? '칸을 누르면 기여 요약이 열립니다' : '기본 · 초과 · 보충 구성'}</span></div>
        {exams.length === 0 ? <div className="empty"><span className="empty-icon"><Icon name="filter"/></span><h2>비교할 과목을 선택해주세요</h2><p>선택한 과목의 시험이 이곳에 표시됩니다.</p><button className="primary" onClick={() => setPicker(true)}>과목 선택하기</button></div>
          : view === 'table' ? visiblePeople.length === 0 ? <div className="empty"><span className="empty-icon"><Icon name="search"/></span><h2>검색 결과가 없습니다</h2><p>이름이나 출석번호를 다시 확인해주세요.</p><button onClick={() => setQuery('')}>전체 명단 보기</button></div> : <>
            <div ref={scroll} className="table-scroll" tabIndex={0} aria-label="시험별 복기 점수 비교표. 가로와 세로로 스크롤할 수 있습니다."><table className="heatmap-table"><thead><tr><th rowSpan={2} className="person-head" scope="col">출석번호 · 이름</th>{groups.map(subject => <th className="subject-head" key={subject.id} scope="colgroup" colSpan={exams.filter(exam => exam.subjectId === subject.id).length}><small>{subject.stage} · {subject.group}</small><span>{subject.name}</span></th>)}</tr><tr>{exams.map(exam => <th className="session-head" key={exam.id} scope="col">{exam.session}</th>)}</tr></thead>
              <tbody>{visiblePeople.map((item, row) => <React.Fragment key={item.id}>{item.attendance === null && (row === 0 || visiblePeople[row - 1].attendance !== null) && <tr className="outside-roster"><th colSpan={exams.length + 1} scope="rowgroup"><span>현재 명단 외 · 과거 기록 포함</span></th></tr>}<tr className={Math.floor(row / 5) % 2 === 0 ? 'row-band' : ''}><th className="person-cell" scope="row"><span className="attendance">{item.attendance === null ? '—' : String(item.attendance).padStart(2, '0')}</span><span>{item.name}</span></th>{exams.map(exam => {
                const cell = index.get(cellKey(item.id, exam.id)), value = metricValue(cell, metric), text = formatValue(value, active.count);
                const status = cell?.missing ? '미응시' : cell?.provisional ? '잠정 점수' : '';
                return <td key={exam.id}><button data-cell-key={cellKey(item.id, exam.id)} className={'score-cell' + (cell?.missing ? ' missing' : '') + (value === 0 ? ' zero' : '')} style={heatColor(value, active.pivot)} onClick={() => openDetail(item, exam.id)} aria-label={item.name + ' ' + exam.name + ' ' + active.label + ' ' + text + (value === null ? '' : active.unit) + (status ? ' · ' + status : '')} title={cell?.missing ? '미응시' : cell?.provisional ? '잠정 · ' + formatValue(cell.lower === null ? null : cell.lower / 10) + '~' + formatValue(cell.upper === null ? null : cell.upper / 10) + '점' : undefined}>{text}{cell?.provisional && <span className="provisional-dot" aria-hidden="true">•</span>}</button></td>;
              })}</tr></React.Fragment>)}</tbody></table></div>
            <div className="legend-bar"><div className="legend"><span>낮음</span>{legendValues.map(value => <span className="legend-entry" key={value}><i style={heatColor(value, active.pivot)}/>{formatValue(value, active.count)}</span>)}<span>높음</span></div><div className="legend-states"><span className="zero-key"><i style={heatColor(0, active.pivot)}/>0 · 기여 없음</span><span className="missing-key"><i/>— · 미응시</span></div>{query && <span className="search-count" role="status">{visiblePeople.length}명 표시</span>}</div>
          </> : <div className="detail-area"><div className="detail-controls"><label htmlFor="detail-person">사람<select id="detail-person" value={person.id} onChange={event => setPersonId(event.target.value)}>{data.people.map(item => <option key={item.id} value={item.id}>{item.attendance ?? '명단 외'} · {item.name}</option>)}</select></label><label htmlFor="detail-exam">시험<select id="detail-exam" value={detailExam.id} onChange={event => setExamId(event.target.value)}>{exams.map(exam => <option key={exam.id} value={exam.id}>{exam.name}</option>)}</select></label><button className="text-button detail-back" onClick={() => setView('table')}><Icon name="grid"/>히트맵으로</button></div>
            <Summary cell={index.get(cellKey(person.id, detailExam.id))!} metric={metric}/></div>}
      </section>
      <footer className="data-footer"><p>같은 값은 모든 시험에서 같은 색입니다. 색이 진할수록 기여가 큽니다.</p><p>0은 응시·기여 없음, —는 미응시입니다. 색상은 통과 여부를 의미하지 않습니다.</p><details><summary>척도와 자료 안내</summary><dl>{metrics.map(item => <React.Fragment key={item.id}><dt>{item.label}</dt><dd>{descriptions[item.id]}</dd></React.Fragment>)}</dl><p>번호는 현재 본1 명단 기준이며 명단 외 과거 기록도 포함합니다.</p></details>
        <span className="verified-date">자료 검증 {new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(data.meta.verifiedAt))}</span>
      </footer>
    </main>
    {picker && <SubjectPicker data={data} selected={subjects} close={() => setPicker(false)} apply={value => { setSubjects(value); setPicker(false); }}/>}
    {scoring && <ScoringGuide close={() => setScoring(false)}/>}
  </div>;
}

function Summary({ cell, metric }: { cell: Cell; metric: MetricId }) {
  if (cell.missing) return <div className="missing-summary"><span className="status-badge">미응시</span><strong>—</strong><h2>이 시험의 점수는 결측입니다</h2><p>응시자 명단에 포함되지 않아 0점과 구분합니다.</p></div>;
  const active = metrics.find(item => item.id === metric)!;
  const rows = [
    { label: '기본 점수', count: cell.baseCount!, value: cell.base!, id: 'base', note: '상위 최대 두 본복기 문항' },
    { label: '초과 복기', count: cell.extraCount!, value: cell.extra!, id: 'extra', note: '나머지 본복기 · 문항당 0.3점' },
    { label: '보충', count: cell.auxCount!, value: cell.aux!, id: 'aux', note: '별도 보충·답만 · 문항당 0.1점' },
  ];
  return <div className="summary"><div className="summary-hero"><div><span className="eyebrow">{active.label}</span><strong>{formatValue(metricValue(cell, metric), active.count)}<small>{active.unit}</small></strong></div><div className="summary-context"><span>한 사람의 한 시험 기준</span><p>{descriptions[metric]}</p>{metric !== 'total' && <b>복기 총점 {formatValue(cell.total! / 10)}점</b>}</div></div>
    {cell.provisional && <span className="status-badge">총점 잠정 · {formatValue(cell.lower! / 10)}~{formatValue(cell.upper! / 10)}점</span>}
    <div className="contribution-cards">{rows.map(row => <section key={row.id} className={metric === row.id || (metric === 'mainCount' && row.id !== 'aux') || (metric === 'auxCount' && row.id === 'aux') ? 'contribution-card selected' : 'contribution-card'}><span>{row.label}</span><strong>{formatValue(row.value / 10)}<small>점</small></strong><b>{row.count}문항</b><p>{row.note}</p></section>)}</div>
    <p className="summary-equation"><span>총점 계산</span>{rows.map(row => formatValue(row.value / 10)).join(' + ')} = <strong>{formatValue(cell.total! / 10)}점</strong></p>
    {cell.total === 0 && <p className="zero-note">응시자 명단에 있으나 채점 대상 복기 기여가 없습니다.</p>}
  </div>;
}

function SubjectPicker({ data, selected, close, apply }: { data: DashboardData; selected: string[]; close: () => void; apply: (value: string[]) => void }) {
  const [draft, setDraft] = useState([...selected]);
  const categories = Array.from(new Set(data.subjects.map(item => item.stage + ' ' + item.group)));
  return <Dialog labelledBy="picker-title" className="subject-dialog" close={close}>
    <header className="dialog-header"><div><span className="eyebrow">과목 선택</span><h2 id="picker-title">어떤 시험을 볼까요?</h2><p>선택한 과목의 모든 시험을 함께 표시합니다.</p></div><button onClick={close} className="icon-button" aria-label="과목 선택 닫기"><Icon name="close"/></button></header>
    <div className="presets"><button onClick={() => setDraft(defaultSubjects(data))}>본1 메이저</button><button onClick={() => setDraft(data.subjects.map(item => item.id))}>전체 선택</button><button onClick={() => setDraft([])}>선택 해제</button></div>
    <div className="subject-options">{categories.map(category => <fieldset key={category}><legend>{category}</legend>{data.subjects.filter(item => item.stage + ' ' + item.group === category).map(item => <label className="subject-option" key={item.id}><input type="checkbox" checked={draft.includes(item.id)} onChange={event => setDraft(value => event.target.checked ? [...value, item.id] : value.filter(id => id !== item.id))}/><span>{item.name}</span><small>{data.exams.filter(exam => exam.subjectId === item.id).length}개 시험</small></label>)}</fieldset>)}</div>
    <footer className="dialog-footer"><span>{draft.length}개 과목 선택</span><button className="primary" onClick={() => apply(data.subjects.filter(item => draft.includes(item.id)).map(item => item.id))}>선택 적용<Icon name="check"/></button></footer>
  </Dialog>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
