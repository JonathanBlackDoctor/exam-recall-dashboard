export type MetricId = 'total' | 'mainCount' | 'auxCount' | 'base' | 'extra' | 'aux';
export type Person = { id: string; name: string; attendance: number | null };
export type Subject = { id: string; name: string; family: string; stage: string; group: string };
export type Exam = { id: string; subjectId: string; name: string; session: string; order: number };
export type Cell = {
  personId: string; examId: string; missing: boolean; participation: string;
  total: number | null; base: number | null; extra: number | null; aux: number | null;
  baseCount: number | null; extraCount: number | null; auxCount: number | null;
  provisional: boolean; lower: number | null; upper: number | null;
};
export type DashboardData = {
  schemaVersion: 1;
  meta: { dataVersion: string; verifiedAt: string; ruleVersion: string; resultHash: string; sourceHash: string; demo?: boolean };
  people: Person[]; subjects: Subject[]; exams: Exam[]; cells: Cell[];
};
export const metrics: {id: MetricId; label: string; unit: string; pivot: number; count: boolean}[] = [
  {id:'total', label:'총점', unit:'점', pivot:2.4, count:false},
  {id:'mainCount', label:'본복기 문항 수', unit:'문항', pivot:2, count:true},
  {id:'auxCount', label:'보충 문항 수', unit:'문항', pivot:1, count:true},
  {id:'base', label:'기본 점수', unit:'점', pivot:2.4, count:false},
  {id:'extra', label:'초과 복기 점수', unit:'점', pivot:0.3, count:false},
  {id:'aux', label:'보충 점수', unit:'점', pivot:0.1, count:false},
];
export function metricValue(cell: Cell | undefined, metric: MetricId): number | null {
  if (!cell || cell.missing) return null;
  if (metric === 'mainCount') return cell.baseCount! + cell.extraCount!;
  if (metric === 'auxCount') return cell.auxCount;
  return cell[metric] === null ? null : cell[metric]! / 10;
}
export function formatValue(value: number | null, count = false) {
  return value === null ? '—' : count ? String(value) : value.toFixed(1);
}
export function heatColor(value: number | null, pivot: number) {
  if (value === null) return {backgroundColor:'#e5eaf2', color:'#53627a'};
  if (value === 0) return {backgroundColor:'#f4f6fa', color:'#647189'};
  const strength = value / (value + pivot);
  const start = [236, 243, 255], end = [30, 64, 175];
  const rgb = start.map((v,i) => Math.round(v + (end[i]-v)*strength));
  const luminance=rgb.map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
  return {backgroundColor:`rgb(${rgb.join(',')})`, color:luminance < 0.179 ? '#fff' : '#000'};
}
export function defaultSubjects(data: DashboardData): string[] {
  return data.subjects.filter(s => s.stage === '본1' && s.group === '메이저').map(s => s.id);
}
export function selectedExams(data: DashboardData, subjects: string[]) {
  const picked = new Set(subjects);
  const rank = new Map(data.subjects.map((s,i) => [s.id,i]));
  return data.exams.filter(e => picked.has(e.subjectId)).sort((a,b) => rank.get(a.subjectId)!-rank.get(b.subjectId)! || a.order-b.order);
}
export const cellKey = (person: string, exam: string) => `${person}/${exam}`;
export function validateData(input: unknown): DashboardData {
  const d = input as DashboardData;
  const fail = () => { throw new Error('Invalid dashboard data'); };
  if (!d || d.schemaVersion !== 1 || !d.meta || typeof d.meta.dataVersion !== 'string' || typeof d.meta.verifiedAt !== 'string' || typeof d.meta.ruleVersion !== 'string') fail();
  if (![d.people,d.exams,d.subjects,d.cells].every(Array.isArray) || !d.people.length || d.people.length > 1000 || d.exams.length > 200 || !d.exams.length) fail();
  const people = new Set<string>(), subjects = new Set<string>(), exams = new Set<string>(), cells = new Set<string>();
  const short = (s: unknown) => typeof s === 'string' && s.length > 0 && s.length < 200;
  for (const p of d.people) {
    if (!short(p.id) || !short(p.name) || people.has(p.id) || !(p.attendance === null || (Number.isInteger(p.attendance) && p.attendance > 0))) fail();
    people.add(p.id);
  }
  for (const s of d.subjects) { if (![s.id,s.name,s.family,s.stage,s.group].every(short) || subjects.has(s.id)) fail(); subjects.add(s.id); }
  for (const e of d.exams) { if (![e.id,e.name,e.session].every(short) || !subjects.has(e.subjectId) || exams.has(e.id) || !Number.isInteger(e.order)) fail(); exams.add(e.id); }
  for (const c of d.cells) {
    const key=cellKey(c.personId,c.examId);
    if (!people.has(c.personId) || !exams.has(c.examId) || cells.has(key) || typeof c.missing !== 'boolean' || typeof c.provisional !== 'boolean') fail();
    cells.add(key);
    const values=[c.total,c.base,c.extra,c.aux,c.baseCount,c.extraCount,c.auxCount,c.lower,c.upper];
    if (c.missing) { if (values.some(v => v !== null) || c.participation !== '미응시') fail(); }
    else {
      if (values.some(v => !Number.isInteger(v) || v! < 0) || c.participation !== '응시') fail();
      if (c.total !== c.base! + c.extra! + c.aux! || c.baseCount! > 2 || c.lower! > c.total! || c.upper! < c.total!) fail();
    }
  }
  if (cells.size !== people.size * exams.size) fail();
  return d;
}
