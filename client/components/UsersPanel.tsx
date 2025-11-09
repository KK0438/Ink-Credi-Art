'use client';
import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useApp } from '@/lib/store';

export default function UsersPanel() {
  const { users, set, me } = useApp();
  const socket = getSocket();
  useEffect(()=>{
    const onUsers = (list) => {
      set({ users: list });
      const id = socket.id;
      if (id && list[id]) {
        const mine = list[id];
        set({ me: { id, name: mine.name, color: mine.color }, color: mine.color });
      }
    };
    socket.on('room:users', onUsers);
    return () => socket.off('room:users', onUsers);
  }, [set, socket]);
  const entries = Object.entries(users);
  return (
    <div className="glass card-pad fade-up">
      <div style={{ fontWeight:800, marginBottom:10 }}>Online Users</div>
      <div style={{ display:'grid', gap:10 }}>
        {entries.map(([id, u]) => (
          <div key={id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span className="dot" style={{ background:u.color }} />
              <div>{u.name}{me?.id===id ? " (you)" : ""}</div>
            </div>
            <div className="chip small"><span className="dot" style={{ background:u.color }} />{u.color}</div>
          </div>
        ))}
        {entries.length === 0 && <div className="subtle">No users online</div>}
      </div>
    </div>
  );
}
