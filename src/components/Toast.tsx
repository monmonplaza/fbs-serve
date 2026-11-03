import { Icon } from './Icon';
import { useToastStore } from '@/store/toast';

export function Toast() {
  const message = useToastStore(s => s.message);
  return (
    <div id="toast" role="status" hidden={!message}>
      {message && <><Icon name="check" size={20} />{message}</>}
    </div>
  );
}
