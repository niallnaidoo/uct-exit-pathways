/** EdOS — inbox: everything the Careers Service and your mentor sent you. */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useEdos, markRead } from '../pathways/store.js';
import { Icon } from '../pathways/ui.jsx';
import { timeAgo } from '../../../../packages/bridge/describe.js';

const ICON = { support: 'spark', mentor: 'users', message: 'send', meeting: 'clock', opportunity: 'briefcase', sent: 'send', application: 'flag' };

export function Inbox() {
  const { inbox } = useEdos();
  useEffect(() => {
    const unread = inbox.filter((n) => n.unread).map((n) => n.id);
    if (unread.length) {
      const t = setTimeout(() => markRead(unread), 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [inbox]);
  return (
    <div className="ed-page">
      <header className="ed-page-head">
        <div className="t-eyebrow">Inbox</div>
        <h1 className="t-display">Updates for you</h1>
      </header>
      <div className="card ed-inbox">
        {inbox.length === 0 && <p className="t-meta">Nothing yet.</p>}
        {inbox.map((n) => (
          <Link key={n.id} to={n.to} className={`ed-note ${n.unread ? 'unread' : ''}`}>
            <span className={`ed-note-icon ${n.kind}`}>
              <Icon name={ICON[n.kind]} size={15} />
            </span>
            <div>
              <strong>{n.title}</strong>
              <p>{n.body}</p>
              <small>
                {n.from} · {timeAgo(n.at)}
              </small>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
