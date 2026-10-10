import { useEffect, useRef, useState } from 'react';
import { Dialog } from './Dialog.tsx';
import { Icon } from './Icons.tsx';

const scores = [
  ['본인의 실제 문제 내용 복기', '1.2'],
  ['필수 요소 누락이 확인된 실제 복기', '1.1'],
  ['기출 이미지만 제공 또는 내용을 확인할 수 없는 첨부', '1.0'],
  ['‘같습니다’ 또는 ‘이전 기출에 있었습니다’라고만 확인', '0.9'],
  ['다른 사람의 복기 보충 또는 답만 제공', '0.1'],
];
const definitions = [
  { name: '실제 문제 내용 복기', text: '본인이 응시한 문항의 지문·물음·보기·구체적 변경 내용 제공.', note: '동일 확인·답만·독립 사진은 별도 배점.' },
  { name: '문제의 대상·상황', text: '질환·개념·약물·검사·현상·자료 또는 사례의 상황·조건.', note: '질문 안에 포함되어도 인정.' },
  { name: '물음', text: '무엇을 선택·설명·답해야 하는지.', note: '‘진단?’, ‘원인은?’, ‘옳은 것은?’도 인정.' },
  { name: '필수 시각 자료', text: '답에 필요한 그림·표·영상.', note: '실제 자료 대신 관찰 특징·수치·표 내용을 제공해도 인정.' },
];

export function ScoringGuide({ close }: { close: () => void }) {
  const [page, setPage] = useState(0);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => { if (body.current) body.current.scrollTop = 0; }, [page]);
  return <Dialog labelledBy="scoring-title" className="scoring-dialog" close={close}>
    <header className="dialog-header"><div><span className="eyebrow">한 사람의 한 시험 기준</span><h2 id="scoring-title">점수 기준</h2></div><button className="icon-button" onClick={close} aria-label="점수 기준 닫기"><Icon name="close"/></button></header>
    <nav className="guide-nav" aria-label="점수 안내 페이지"><button aria-pressed={page === 0} onClick={() => setPage(0)}><span>01</span>배점·계산</button><button aria-pressed={page === 1} onClick={() => setPage(1)}><span>02</span>용어·판정</button></nav>
    <div ref={body} className="guide-body" tabIndex={0} aria-label={page === 0 ? '배점과 계산 안내' : '용어와 판정 안내'}>
      {page === 0 ? <section className="guide-page">
        <div className="guide-page-heading"><span>01 / 02</span><h3>복기 점수 기준</h3><p>한 사람의 한 시험 기준 · 계산 단위는 문항 수</p></div>
        <table className="scoring-table"><thead><tr><th scope="col">제공한 내용</th><th scope="col">문항당 기본 배점</th></tr></thead><tbody>{scores.map(([label, score]) => <tr key={score}><th scope="row">{label}</th><td><strong>{score}<small>점</small></strong></td></tr>)}</tbody></table>
        <div className="guide-contributions"><p><strong>본복기</strong><span>0.9~1.2점 유형</span></p><p><strong>부가 기여</strong><span>보충·답만 제공 0.1점</span></p></div>
        <h4>총점 계산</h4><ol className="calculation-steps"><li><span>본복기 중 높은 배점의 <b>최대 2문항</b></span><strong>기본 배점</strong></li><li><span>나머지 본복기</span><strong>문항당 +0.3점</strong></li><li><span>별도 문항 보충·답만 제공</span><strong>문항당 +0.1점</strong></li></ol>
        <ul className="guide-rules"><li>같은 사람·같은 시험·같은 문항은 글·첨부를 합쳐 <b>최고 배점 한 번만</b> 인정합니다.</li><li>보충·답만 기여는 <b>본복기 두 자리를 채우지 않습니다.</b></li><li>본복기가 1문항이면 그 배점만, 없으면 부가 기여만 합산합니다.</li><li>배정 번호·게시 순서와 무관하며, <b>총점 상한은 없습니다.</b></li></ul>
        <div className="scoring-example"><span className="eyebrow">계산 예시</span><p>실제 복기 3문항 + 다른 문항 보충 1건</p><div className="example-equation">1.2 + 1.2 + 0.3 + 0.1 = <strong>2.8<small>점</small></strong></div><p className="example-note">실제 복기 3문항은 각 1.2점, 보충은 다른 문항입니다.<br/>2.4점은 통과선이나 총점 상한이 아닙니다.</p></div>
      </section> : <section className="guide-page">
        <div className="guide-page-heading"><span>02 / 02</span><h3>용어와 판정 기준</h3><p>원문에서 확인된 누락만 판단합니다.</p></div>
        <div className="definition-grid">{definitions.map((item, index) => <section className="definition-card" key={item.name}><h4><span>{String(index + 1).padStart(2, '0')}</span>{item.name}</h4><p>{item.text}</p><p>{item.note}</p></section>)}</div>
        <section className="deduction-card"><h4><Icon name="check"/>1.1점은 누락이 확인될 때만</h4><p>같은 사람이 같은 문항에 올린 글·첨부를 함께 검토합니다.</p><p><b>대상·상황 없음, 물음 없음, 필수 그림·표·영상과 이를 대신할 설명 모두 없음</b> 중 하나 이상이 확인된 경우.</p><p>필수 시각 자료 누락은 그 문항이 그림·표·영상에 의존할 때 적용합니다.</p></section>
        <div className="judgment-grid"><section><h4>없음이 확인됨</h4><p>원문 근거로 필수 요소 누락 확인</p><strong>실제 복기 1.2 → 1.1점</strong></section><section><h4>불명</h4><p>읽기·문항 연결을 확인하지 못함</p><strong>감점하지 않음</strong></section></div>
        <div className="judgment-note"><p>여러 누락이 있어도 1.1점이며, 불명확하다는 이유로 감점하지 않습니다.</p><p>글의 길이·보기 개수·정답·해설 유무는 감점 기준이 아닙니다.</p></div>
        <div className="status-legend"><p><strong>0</strong><span>응시했으나 채점 대상 복기 기여 없음</span></p><p><strong>—</strong><span>미응시하여 점수가 결측<small>미응시를 숫자 0으로 바꾸지 않습니다.</small></span></p></div>
        <details className="guide-details"><summary>적용 조건 자세히</summary><ul><li>같은 문항의 관련 글·첨부를 함께 확인하여 누락이 확인될 때만 1.1점을 적용합니다.</li><li>시각 자료 대신 관찰 특징·수치·표 내용을 제공하면 누락으로 처리하지 않습니다.</li><li>대상과 물음이 있으면 선지가 없거나 일부만 있어도 그 이유로 감점하지 않습니다.</li><li>내용을 확인할 수 없는 첨부만 제출한 1.0점과 실제 복기의 일부 요소가 불명확한 경우를 구분합니다.</li><li>같은 작성자의 같은 문항에 실제 문제 내용이나 구체적인 변경 내용이 추가되면 함께 검토합니다.</li><li>메시지를 여러 번 보냈다는 이유로 문항 수가 늘어나지 않습니다. 서로 다른 사람의 기여를 한 사람의 기여로 합치지 않습니다.</li><li>화면의 ‘보충’에는 답만 제공한 기여도 포함합니다. 점수는 소수점 한 자리, 문항 수는 정수로 표시합니다.</li></ul></details>
      </section>}
    </div>
    <footer className="dialog-footer"><span>{page === 0 ? '01' : '02'} / 02</span><div>{page === 0 && <button className="text-button" onClick={close}>닫기</button>}<button className="primary" onClick={page === 0 ? () => setPage(1) : close}>{page === 0 ? '용어·판정 보기' : '확인'}<Icon name={page === 0 ? 'arrow' : 'check'}/></button></div></footer>
  </Dialog>;
}
