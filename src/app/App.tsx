import { useEffect } from 'react';
import { useUi } from '@/store/ui';
import { useReservations } from '@/api/queries';
import { dueReservations } from '@/lib/reservations';
import { useNow } from '@/lib/useNow';
import { tm } from '@/lib/format';
import { ModalHost } from '@/components/ModalHost';
import { Toast } from '@/components/Toast';
import { BillPrintHost } from '@/components/BillPrintHost';
import { StaffShell } from './StaffShell';
import { LoginPage } from './LoginPage';
import { TopBar } from './TopBar';
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

export function App() {
  const { mode, guestOnly, signedOut } = useUi();
  useReservationNotices();
  useEffect(() => { document.body.classList.toggle('solo', guestOnly); }, [guestOnly]);
  return (
    <>
      {signedOut && !guestOnly ? <LoginPage /> : mode === 'guest' ? <>{!guestOnly && <TopBar brand />}<GuestShell /></> : <StaffShell />}
      <LightboxHost />
      <ModalHost />
      <BillPrintHost />
      <Toast />
    </>
  );
}
