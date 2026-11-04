import { useEffect } from 'react';
import { useUi } from '@/store/ui';
import { useReservations, useUsers } from '@/api/queries';
import { dueReservations } from '@/lib/reservations';
import { useNow } from '@/lib/useNow';
import { tm } from '@/lib/format';
import { ModalHost } from '@/components/ModalHost';
import { Toast } from '@/components/Toast';
import { toast } from '@/store/toast';
import { StaffShell } from './StaffShell';
import { TopBar, initials } from './TopBar';
import { GuestShell } from '@/features/guest/GuestShell';
import { LightboxHost } from '@/features/foods/Lightbox';

const notified = new Set<string>();

/** One bell entry per reservation when its reminder window opens. */
function useReservationNotices() {
  const list = useReservations().data;
  const now = useNow(15000);
  useEffect(() => {
    dueReservations(list, now).forEach(r => {
      if (notified.has(r.id)) return;
      notified.add(r.id);
      useUi.getState().notify('calendar', `Reservation at ${tm(r.at)}: ${r.name}, ${r.pax} guests`, 'reservations');
    });
  }, [list, now]);
}

function SignedOut() {
  const { meId } = useUi();
  const me = useUsers().data.find(u => u.id === meId);
  return (
    <main className="signedout">
      <div className="card">
        <div className="avatar lg" aria-hidden="true">{initials(me?.name ?? '')}</div>
        <h2 style={{ margin: 0 }}>You are signed out</h2>
        <p className="muted" style={{ margin: 0 }}>Sign in again to keep managing the restaurant.</p>
        <button className="btn btn-primary" onClick={() => { useUi.setState({ signedOut: false }); toast(`Welcome back, ${me?.name.split(' ')[0]}`); }}>Sign in as {me?.name}</button>
      </div>
    </main>
  );
}

export function App() {
  const { mode, guestOnly, signedOut } = useUi();
  useReservationNotices();
  useEffect(() => { document.body.classList.toggle('solo', guestOnly); }, [guestOnly]);
  return (
    <>
      {signedOut && !guestOnly ? <SignedOut /> : mode === 'guest' ? <>{!guestOnly && <TopBar brand />}<GuestShell /></> : <StaffShell />}
      <LightboxHost />
      <ModalHost />
      <Toast />
    </>
  );
}
