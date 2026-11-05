import { useEffect, useState } from 'react';
import { Icon } from './Icon';

export const PER_OPTS = [10, 15, 25, 50, 100];
const PER_PAGE = 15;

/**
 * Table pagination with a Rows-per-page dropdown. `resetKey` is the table's current filter; when it changes the table goes back to page 1.
 * Lists shorter than the smallest page size show no pager.
 */
export function usePaged<T>(list: T[], resetKey = '') {
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(PER_PAGE);
  useEffect(() => setPage(1), [resetKey]);
  const pages = Math.max(1, Math.ceil(list.length / per));
  const p = Math.min(pages, Math.max(1, page));
  const from = (p - 1) * per;
  const rows = list.slice(from, from + per);
  const bar = list.length <= PER_OPTS[0] ? null : (
    <Pager total={list.length} from={from} shown={rows.length} page={p} pages={pages} per={per} onPage={setPage} onPer={n => { setPer(n); setPage(1); }} />
  );
  return { rows, bar, page: p, per };
}

interface PagerProps {
  total: number; from: number; shown: number; page: number; pages: number; per: number;
  onPage: (n: number) => void; onPer: (n: number) => void; id?: string;
}
export function Pager({ total, from, shown, page: p, pages, per, onPage, onPer, id = 'pp' }: PagerProps) {
  const nums = [...new Set([1, p - 1, p, p + 1, pages])].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
  const btn = (n: number, label: string, inner: React.ReactNode, off: boolean, isNum = false) => (
    <button key={label} className="pg num" aria-label={label} disabled={off} aria-current={isNum && n === p ? 'page' : undefined} onClick={() => onPage(n)}>{inner}</button>
  );
  return (
    <nav className="pager" aria-label="Pages">
      <span className="caption canvas-note num">Showing {total ? from + 1 : 0}–{from + shown} of {total}</span>
      <div className="pager-right">
        <label className="pp caption">Rows per page
          <select id={id} className="input" value={per} onChange={e => onPer(+e.target.value)}>
            {PER_OPTS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        {pages > 1 && (
          <div className="pager-btns">
            {btn(p - 1, 'Previous page', <Icon name="left" size={18} />, p === 1)}
            {nums.map((n, i) => [
              i && n - nums[i - 1] > 1 ? <span key={'g' + n} className="pg-gap" aria-hidden="true">…</span> : null,
              btn(n, `Page ${n}`, String(n), false, true),
            ])}
            {btn(p + 1, 'Next page', <Icon name="right" size={18} />, p === pages)}
          </div>
        )}
      </div>
    </nav>
  );
}
