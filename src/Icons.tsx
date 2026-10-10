type Name = 'lock' | 'grid' | 'list' | 'info' | 'search' | 'close' | 'arrow' | 'filter' | 'check';
const paths: Record<Name, string> = {
  lock: 'M7 10V7a5 5 0 0 1 10 0v3M12 14v3',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  list: 'M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01',
  info: 'M12 11v6M12 7h.01',
  search: 'm16 16 5 5',
  close: 'm6 6 12 12M6 18 18 6',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  filter: 'M4 6h16M7 12h10M10 18h4',
  check: 'm5 12 4 4L19 6',
};
export function Icon({ name }: { name: Name }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'lock' && <rect x="4" y="10" width="16" height="11" rx="3"/>}
    {name === 'info' && <circle cx="12" cy="12" r="9"/>}
    {name === 'search' && <circle cx="10.5" cy="10.5" r="6.5"/>}
    <path d={paths[name]}/>
  </svg>;
}
export function Mark() {
  return <span className="brand-mark" aria-hidden="true"><i/><i/><i/><i/></span>;
}
