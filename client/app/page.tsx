'use client';
import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import CanvasBoard from '@/components/CanvasBoard';
import UsersPanel from '@/components/UsersPanel';
import Controls from '@/components/Controls';
import { useApp } from '@/lib/store';

export default function Home() {
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState('');
  const [room, setRoom] = useState('room-1');
  const { set, color } = useApp();
  const socket = getSocket();
  useEffect(()=>{ return () => { socket.emit('room:leave'); }; }, [socket]);
  function join() {
    if (!room.trim()) return;
    set({ roomId: room });
    socket.emit('room:join', { roomId: room, name });
    setJoined(true);
  }
  if (!joined) {
    return (
      <main style={{ minHeight:'100vh', display:'grid', placeItems:'center' }}>
        <div className="glass card-pad-lg" style={{ width:480 }}>
          <div className="header" style={{ marginBottom:12 }}>
            <div className="brand">Ink-Credi-Art</div>
            <div className="chip small"><span className="dot" style={{ background:'var(--accent1)' }} />Live collaboration</div>
          </div>
          <div className="subtle" style={{ marginBottom:16 }}>Matte-blue, glass UI — jump into a room and sketch together.</div>
          <div style={{ display:'grid', gap:10 }}>
            <input className="input-white" placeholder="Your nickname" value={name} onChange={e=>setName(e.target.value)} />
            <input className="input-white" placeholder="Room ID (e.g., room-1)" value={room} onChange={e=>setRoom(e.target.value)} />
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-accent" onClick={join}>Join Room</button>
              <button className="btn" onClick={()=>{ setName(''); setRoom('room-1'); }}>Reset</button>
            </div>
          </div>
        </div>
      </main>
    );
  }
  return (
    <main className="page">
      <header className="glass card-pad" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div className="brand">Ink-Credi-Art <span className="subtle">— Room: {room}</span></div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div className="chip"><span className="dot" style={{ background: color }} />Your color</div>
          <Controls />
        </div>
      </header>
      <section className="split">
        <div>
          <CanvasBoard />
        </div>
        <div style={{ display:'grid', gridTemplateRows:'auto', gap:14 }}>
          <UsersPanel />
        </div>
      </section>
    </main>
  );
}
