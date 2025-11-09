'use client';
import { useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { useApp } from '@/lib/store';

export default function Controls() {
  const { tool, color, size, set } = useApp();
  const socket = getSocket();
  const fileRef = useRef(null);

  function pick(t) { set({ tool: t }); }
  function uploadClick(){ fileRef.current?.click(); }
  function onFile(e){
    const f = e.target.files?.[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const w = Math.min(320, img.width);
        const h = Math.floor(img.height * (w / img.width));
        const obj = { id: '', type:'image', src: reader.result, x: 40, y: 40, w, h, z: Date.now(), owner: '' };
        socket.emit('object:add', obj);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  }
  function exportPNG(){
    const a = document.createElement('a');
    a.download = 'ink-credi-art.png';
    const canvas = document.querySelector('canvas');
    if(!canvas) return;
    a.href = canvas.toDataURL('image/png');
    a.click();
  }
  const seg = (active)=>({padding:'10px 14px',borderRadius:10,border:'1px solid var(--blue-border)',background:active?'rgba(255,255,255,.18)':'rgba(255,255,255,.06)',color:'var(--fg)',fontWeight:800});
  return (
    <div className="toolbar">
      <div className="glass card-pad" style={{ display:'flex', gap:8, alignItems:'center' }}>
        <button style={seg(tool==='brush')} onClick={()=>pick('brush')}>Brush</button>
        <button style={seg(tool==='eraser')} onClick={()=>pick('eraser')}>Eraser</button>
        <button style={seg(tool==='select')} onClick={()=>pick('select')}>Select</button>
      </div>
      <div className="glass card-pad menu">
        <button className="btn" onClick={()=>pick('shape-rect')}>Rect</button>
        <button className="btn" onClick={()=>pick('shape-ellipse')}>Ellipse</button>
        <button className="btn" onClick={()=>pick('shape-line')}>Line</button>
      </div>
      <div className="chip"><span className="dot" style={{ background: color }} />Your color</div>
      <div className="glass card-pad" style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div className="small subtle" style={{ width:60 }}>Stroke</div>
        <input className="range" type="range" min={1} max={40} value={size} onChange={e=>set({ size: Number(e.target.value) })} />
      </div>
      <button className="btn" onClick={()=>socket.emit('ops:undo')}>Undo</button>
      <button className="btn" onClick={()=>socket.emit('ops:redo')}>Redo</button>
      <button className="btn btn-accent" onClick={uploadClick}>Upload Image</button>
      <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={onFile} />
      <button className="btn btn-accent" onClick={exportPNG}>Export PNG</button>
    </div>
  );
}
