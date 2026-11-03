import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useUi } from '@/store/ui';
import { useRoles, useUsers } from '@/api/queries';
import { openModal, closeModal } from '@/store/modal';
import { mins } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import { useNow } from '@/lib/useNow';
import { ProfileModal } from './ProfileModal';

const LOGO = <img className="logo" src="/assets/fbs-serve-logo.png" alt="FBS Serve logo" />;
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const ago = (t: number) => { const m = mins(t); return m < 1 ? 'Just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`; };

/** Closes a popover when the user clicks outside it or presses Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open, close]);
  return ref;
}

function Bell() {
  const [open, setOpen] = useState(false);
  const { notifs, go } = useUi();
  useNow(30000);
  const ref = useDismiss(open, () => setOpen(false));
  const un = notifs.filter(n => !n.read).length;
  const mark = (fn: (n: typeof notifs[number]) => typeof notifs[number]) => useUi.setState({ notifs: useUi.getState().notifs.map(fn) });
  return (
    <div className="notif" ref={ref}>
      <button className="icon-btn" aria-label={`Notifications${un ? `, ${un} unread` : ''}`} aria-expanded={open} title="Notifications" onClick={() => setOpen(o => !o)}>
        <Icon name="bell" />
        {un ? <span className="nbadge num">{un > 9 ? '9+' : un}</span> : null}
      </button>
      {open && (
        <div className="npanel" role="dialog" aria-label="Notifications">
          <div className="nhead">
            <h3>Notifications</h3>
            <button onClick={() => mark(n => ({ ...n, read: true }))}>Mark all as read</button>
            <button onClick={() => { useUi.setState({ notifs: [] }); setOpen(false); }}>Clear</button>
          </div>
          <div className="nlist">
            {notifs.length ? notifs.map(n => (
              <button key={n.id} className={`nitem ${n.read ? '' : 'unread'}`} onClick={() => { mark(x => (x.id === n.id ? { ...x, read: true } : x)); setOpen(false); go(n.view); }}>
                <span className="nic"><Icon name={n.ic} size={18} /></span>
                <span className="grow"><span className="nt">{n.text}</span><span className="nw">{ago(n.at)}</span></span>
                {n.read ? null : <span className="ndot" aria-hidden="true" />}
              </button>
            )) : <div className="nempty">No notifications yet</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function AccountMenu() {
  const [open, setOpen] = useState(false);
  const { meId, go } = useUi();
  const users = useUsers().data, roles = useRoles().data;
  const ref = useDismiss(open, () => setOpen(false));
  const me = users.find(u => u.id === meId) ?? users[0];
  if (!me) return null;
  const role = roles.find(r => r.id === me.role)?.name || me.role;
  const logout = () => openModal({
    title: 'Log out?',
    content: (
      <>
        <div className="m-body"><p>You will be signed out of FBS Serve on this device.</p></div>
        <div className="m-foot">
          <button className="btn btn-outline" onClick={closeModal}>Stay signed in</button>
          <button className="btn btn-primary" onClick={() => { closeModal(); useUi.setState({ signedOut: true }); }}>Log out</button>
        </div>
      </>
    ),
  });
  const item = (ic: string, label: string, fn: () => void, danger = false) => (
    <button className={`mi ${danger ? 'danger' : ''}`} role="menuitem" onClick={() => { setOpen(false); fn(); }}><Icon name={ic} size={18} />{label}</button>
  );
  return (
    <div className="uwrap" ref={ref}>
      <button className="ubtn" aria-label={`Account: ${me.name}, ${role}`} aria-expanded={open} title={me.name} onClick={() => setOpen(o => !o)}>
        <span className="avatar" aria-hidden="true">{initials(me.name)}</span>
        <span className="utext"><b>{me.name.split(' ')[0]}</b><small>{role}</small></span>
      </button>
      {open && (
        <div className="umenu" role="menu" aria-label="Account">
          <div className="uinfo"><b>{me.name}</b></div>
          {item('user', 'Profile', () => openModal({ title: 'Profile', content: <ProfileModal user={me} role={role} /> }))}
          {item('sliders', 'Settings', () => go('settings'))}
          {item('logout', 'Log out', logout, true)}
        </div>
      )}
    </div>
  );
}

export function TopBar({ brand }: { brand: boolean }) {
  const { isDark, toggle } = useTheme();
  const { mode, set } = useUi();
  return (
    <header className="top">
      <div className="top-in">
        {brand && <span className="brand">{LOGO}FBS Serve <small>Restaurant manager</small></span>}
        <span className="spacer" />
        <span className="tools">
          {!brand && <Bell />}
          <button className="icon-btn" aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} title={isDark ? 'Light mode' : 'Dark mode'} onClick={toggle}>
            <Icon name={isDark ? 'sun' : 'moon'} />
          </button>
        </span>
        <div className="seg" role="group" aria-label="View as">
          <button aria-pressed={mode === 'staff'} onClick={() => set({ mode: 'staff' })}><Icon name="user" size={20} />Staff</button>
          <button aria-pressed={mode === 'guest'} onClick={() => set({ mode: 'guest' })}><Icon name="phone" size={20} />Guest phone</button>
        </div>
        {!brand && <AccountMenu />}
      </div>
    </header>
  );
}
export { LOGO, initials };
