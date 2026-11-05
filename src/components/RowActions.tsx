import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { clamp } from '@/lib/format';

export interface RowAction { ic: string; label: string; aria?: string; onClick: () => void; danger?: boolean }

/**
 * Row actions for tables. Up to 3 show as icon buttons with a tooltip; 4 or more collapse into a ⋯ button
 * that opens a menu with icon and name.
 */
export function RowActions({ actions }: { actions: RowAction[] }) {
  if (actions.length <= 3) {
    return (
      <div className="row-acts">
        {actions.map(a => (
          <button key={a.label} className={`icon-btn sm tip ${a.danger ? 'danger' : ''}`} aria-label={a.aria || a.label} data-tip={a.label}
            onClick={e => { e.stopPropagation(); a.onClick(); }}>
            <Icon name={a.ic} size={20} />
          </button>
        ))}
      </div>
    );
  }
  return <MenuButton actions={actions} />;
}

// The menu is portaled to <body> with position: fixed, so a table's scroll box cannot clip it.
function MenuButton({ actions }: { actions: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const r = btn.current!.getBoundingClientRect(), m = menu.current!;
    const w = m.offsetWidth, h = m.offsetHeight;
    setPos({ left: clamp(r.right - w, 8, innerWidth - w - 8), top: r.bottom + 4 + h > innerHeight - 8 ? r.top - h - 4 : r.bottom + 4 });
    m.querySelector('button')?.focus({ preventScroll: true });
    const close = (e: MouseEvent) => { if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    const items = [...menu.current!.querySelectorAll('button')], i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    } else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <div className="row-acts">
      <button ref={btn} className="icon-btn sm tip" aria-label="More actions" aria-haspopup="menu" aria-expanded={open} data-tip="More actions"
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}>
        <Icon name="dots" size={20} />
      </button>
      {open && createPortal(
        <div ref={menu} className="rowmenu" role="menu" style={pos} onKeyDown={onKey}>
          {actions.map(a => (
            <button key={a.label} role="menuitem" className={a.danger ? 'danger' : ''} aria-label={a.aria || a.label}
              onClick={e => { e.stopPropagation(); setOpen(false); a.onClick(); }}>
              <Icon name={a.ic} size={18} />{a.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
