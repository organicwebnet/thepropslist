import React from 'react';
import { Bell } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import { useWebAuth } from '../contexts/WebAuthContext';
import { NotificationService } from '../shared/services/notificationService';
import type { AppNotification } from '../shared/types/notification';

const NotificationBell: React.FC = () => {
  const { service } = useFirebase();
  const { user } = useWebAuth();
  const [unread, setUnread] = React.useState<number>(0);
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<AppNotification[]>([]);

  React.useEffect(() => {
    if (!user) return;
    const svc = new NotificationService(service);
    let mounted = true;
    const load = async () => {
      const all = await svc.listForUser(user.uid, { max: 20 });
      if (!mounted) return;
      setItems(all);
      setUnread(all.filter(n => !n.read).length);
    };
    load();
    const id = setInterval(load, 15000);
    return () => { mounted = false; clearInterval(id); };
  }, [service, user]);

  return (
    <div className="relative">
      <button
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-pb-primary/20 transition"
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center border border-black">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-pb-darker border border-pb-primary/20 rounded-lg shadow-lg z-50">
          <div className="px-3 py-2 border-b border-white/10 text-sm font-semibold">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <div className="p-4 text-sm text-pb-gray">No notifications</div>
            )}
            {items.map(n => (
              <a key={n.id} className={`block px-3 py-2 text-sm hover:bg-white/10 ${n.read ? 'opacity-70' : ''}`} href={(() => {
                if (n.entity?.kind === 'task') return `/boards`; // TODO: deep link to task
                if (n.entity?.kind === 'prop') return `/props/${n.entity.id}`;
                if (n.entity?.kind === 'container') return `/containers/${n.entity.id}`;
                if (n.entity?.kind === 'packList') return `/packing-lists/${n.entity.id}`;
                return '#';
              })()}>
                <div className="font-medium">{n.title}</div>
                {n.message && <div className="text-pb-gray text-xs mt-0.5 whitespace-pre-line">{n.message}</div>}
                <div className="text-[10px] text-pb-gray mt-1">{new Date(n.createdAt).toLocaleString()}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;


