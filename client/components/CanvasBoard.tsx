'use client';
import React, { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { useApp } from '@/lib/store';

function drawStroke(ctx, op){
  if(op.points.length<2) return;
  ctx.save();
  ctx.globalCompositeOperation = op.tool==='eraser' ? 'destination-out' : 'source-over';
  ctx.lineJoin='round'; ctx.lineCap='round';
  ctx.strokeStyle=op.color; ctx.lineWidth=op.size;
  ctx.beginPath(); ctx.moveTo(op.points[0].x,op.points[0].y);
  for(let i=1;i<op.points.length;i++) ctx.lineTo(op.points[i].x,op.points[i].y);
  ctx.stroke(); ctx.restore();
}
function drawRect(ctx, o){ ctx.save(); ctx.fillStyle=o.color; ctx.fillRect(o.x,o.y,o.w,o.h); ctx.restore(); }
function drawEllipse(ctx, o){
  ctx.save(); ctx.fillStyle=o.color;
  ctx.beginPath(); ctx.ellipse(o.x+o.w/2,o.y+o.h/2,Math.abs(o.w/2),Math.abs(o.h/2),0,0,Math.PI*2); ctx.fill(); ctx.restore();
}
function drawLine(ctx, o){
  ctx.save(); ctx.strokeStyle=o.color; ctx.lineWidth=4; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(o.x,o.y); ctx.lineTo(o.x+o.w,o.y+o.h); ctx.stroke(); ctx.restore();
}
function drawImageObj(ctx, o){
  const img = new Image(); img.src = o.src; ctx.drawImage(img, o.x, o.y, o.w, o.h);
}
function drawObjects(ctx, objects){
  const sorted = [...objects].sort((a,b)=>a.z-b.z);
  for(const o of sorted){
    if(o.type==='shape'){
      if(o.shape==='rect') drawRect(ctx,o);
      else if(o.shape==='ellipse') drawEllipse(ctx,o);
      else drawLine(ctx,o);
    } else drawImageObj(ctx,o);
  }
}
function hitTest(o, x, y){
  if(o.type==='shape'){
    if(o.shape==='line'){
      const x1=o.x,y1=o.y,x2=o.x+o.w,y2=o.y+o.h;
      const A=y2-y1,B=x1-x2,C=x2*y1-x1*y2;
      const dist = Math.abs(A*x+B*y+C)/Math.sqrt(A*A+B*B);
      const within = (x>=Math.min(x1,x2)-6 && x<=Math.max(x1,x2)+6 && y>=Math.min(y1,y2)-6 && y<=Math.max(y1,y2)+6);
      return within && dist<=6;
    }
    return x>=o.x && x<=o.x+o.w && y>=o.y && y<=o.y+o.h;
  } else {
    return x>=o.x && x<=o.x+o.w && y>=o.y && y<=o.y+o.h;
  }
}
function drawSelection(ctx, o){
  ctx.save();
  ctx.strokeStyle='rgba(0,0,0,.6)'; ctx.setLineDash([6,4]); ctx.lineWidth=1.5;
  const x=o.x,y=o.y,w=o.w,h=o.h; ctx.strokeRect(x,y,w,h);
  ctx.restore();
}

export default function CanvasBoard(){
  const ref = useRef(null);
  const [isDrawing,setIsDrawing] = useState(false);
  const [dragging,setDragging] = useState(false);
  const creatingId = useRef(null);
  const createStart = useRef(null);
  const createShape = useRef(null);
  const pathRef = useRef([]);
  const startRef = useRef(null);
  const { ops, live, objects, set, tool, color, size, cursors, selectedId } = useApp();
  const socket = getSocket();

  function resizeCanvas(){
    const canvas = ref.current;
    const parent = canvas.parentElement;
    const dpr = window.devicePixelRatio||1;
    const w = parent.clientWidth, h = parent.clientHeight;
    canvas.width=w*dpr; canvas.height=h*dpr; canvas.style.width=w+'px'; canvas.style.height=h+'px';
    const ctx = canvas.getContext('2d'); ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr,dpr);
    render();
  }
  function render(){
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawObjects(ctx, objects);
    for(const op of ops) drawStroke(ctx, op);
    for(const k of Object.keys(live)){ const l=live[k]; if(l.points?.length>=2) drawStroke(ctx, { id:'live:'+k, type:'stroke', points:l.points, color:l.color, size:l.size, tool:l.tool }); }
    const sel = objects.find(o=>o.id===selectedId); if(sel){ ctx.save(); drawSelection(ctx, sel); ctx.restore(); }
  }

  useEffect(()=>{
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas); ro.observe(ref.current.parentElement);
    return ()=>ro.disconnect();
  }, [ops, live, objects, selectedId]);

  useEffect(()=>{
    const onOp=(op)=>{ set({ ops:[...useApp.getState().ops, op] }); };
    const onState=({ops,objects})=>{ set({ ops, live:{}, objects }); render(); };
    const onCursors=(map)=>set({ cursors: map });
    const onLive=(p)=>{
      const st=useApp.getState(); const prev=st.live[p.from] || { points:[], color:p.color, size:p.size, tool:p.tool };
      const updated={...prev, color:p.color, size:p.size, tool:p.tool, points:[...prev.points,{x:p.x,y:p.y}]};
      set({ live:{...st.live,[p.from]:updated} });
    };
    const onLiveEnd=({from})=>{ const st=useApp.getState(); const next={...st.live}; delete next[from]; set({ live: next }); };
    const onAdded=(obj)=>{ const arr=[...useApp.getState().objects]; const idx=arr.findIndex(o=>o.id===obj.id); if(idx!==-1) arr[idx]=obj; else arr.push(obj); set({ objects: arr }); };
    const onUpdated=(obj)=>{
      const arr=[...useApp.getState().objects]; const i=arr.findIndex(o=>o.id===obj.id); if(i!==-1){ arr[i]=obj; set({ objects: arr }); }
    };
    const onRemoved=({id})=>{ set({ objects: useApp.getState().objects.filter(o=>o.id!==id) }); };
    socket.on('draw:op',onOp);
    socket.on('room:state',onState);
    socket.on('room:cursors',onCursors);
    socket.on('draw:live',onLive);
    socket.on('draw:live:end',onLiveEnd);
    socket.on('object:added',onAdded);
    socket.on('object:updated',onUpdated);
    socket.on('object:removed',onRemoved);
    return()=>{
      socket.off('draw:op',onOp);
      socket.off('room:state',onState);
      socket.off('room:cursors',onCursors);
      socket.off('draw:live',onLive);
      socket.off('draw:live:end',onLiveEnd);
      socket.off('object:added',onAdded);
      socket.off('object:updated',onUpdated);
      socket.off('object:removed',onRemoved);
    };
  }, [set, socket]);

  function emitCursor(e, drawing){
    const p = point(e);
    socket.emit('cursor:update', { ...p, drawing });
    return p;
  }

  function down(e){
    const p = emitCursor(e,true);
    if(tool==='brush' || tool==='eraser'){
      setIsDrawing(true); pathRef.current=[p]; socket.emit('draw:live', { ...p, tool, size });
      return;
    }
    const hit = [...useApp.getState().objects].map(o=>o).reverse().find(o=>hitTest(o,p.x,p.y));
    if(tool==='select'){
      if(hit){ const sel = hit; set({ selectedId: sel.id }); const x=sel.x,y=sel.y; startRef.current={ xOff:p.x - x, yOff:p.y - y }; setDragging(true); }
      else { set({ selectedId: null }); }
      return;
    }
    if(tool.startsWith('shape-')){
      const id = Math.random().toString(36).slice(2);
      const shape = tool==='shape-rect'?'rect':tool==='shape-ellipse'?'ellipse':'line';
      createShape.current = shape;
      createStart.current = { x:p.x, y:p.y };
      creatingId.current = id;
      const obj = { id, type:'shape', shape, x:p.x, y:p.y, w:1, h:1, color: useApp.getState().color, z: Date.now(), owner:'' };
      socket.emit('object:add', obj);
      return;
    }
  }

  function move(e){
    const p = emitCursor(e,isDrawing||dragging||!!creatingId.current);
    if(tool==='brush' || tool==='eraser'){
      if(!isDrawing) return;
      const path=[...pathRef.current,p]; pathRef.current=path;
      const ctx = ref.current.getContext('2d');
      const dpr = window.devicePixelRatio||1;
      ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr,dpr);
      render();
      drawStroke(ctx, { id:'preview', type:'stroke', points:path, color, size, tool });
      socket.emit('draw:live', { ...p, tool, size });
      return;
    }
    if(tool==='select' && dragging && selectedId){
      const sel = useApp.getState().objects.find(o=>o.id===selectedId); if(!sel) return;
      const off = startRef.current;
      const nx = p.x - off.xOff; const ny = p.y - off.yOff;
      const upd = { ...sel, x:nx, y:ny, z:Date.now() };
      socket.emit('object:update', upd);
      return;
    }
    if(tool.startsWith('shape-') && creatingId.current){
      const start = createStart.current;
      if(!start) return;
      let x = start.x, y = start.y, w = p.x - start.x, h = p.y - start.y;
      if(createShape.current==='line'){
        x = start.x; y = start.y;
      } else {
        if(w<0){ x = p.x; w = start.x - p.x; }
        if(h<0){ y = p.y; h = start.y - p.y; }
      }
      const upd = { id: creatingId.current, x, y, w, h, z: Date.now() };
      socket.emit('object:update', upd);
      return;
    }
  }

  function up(){
    if(tool==='brush' || tool==='eraser'){
      if(!isDrawing) return; setIsDrawing(false);
      const pts = pathRef.current; pathRef.current=[]; socket.emit('draw:live:end');
      if(pts.length<2) return;
      const op = { id: Math.random().toString(36).slice(2), type:'stroke', points: pts, color, size, tool };
      set({ ops:[...useApp.getState().ops, op] }); socket.emit('draw:op', op);
      return;
    }
    if(tool==='select' && dragging){ setDragging(false); return; }
    if(tool.startsWith('shape-') && creatingId.current){ creatingId.current=null; createStart.current=null; createShape.current=null; return; }
  }

  function point(e){
    const rect=e.target.getBoundingClientRect(); return { x:e.clientX-rect.left, y:e.clientY-rect.top };
  }

  return (
    <div className="canvas-wrap glass">
      <canvas className="canvas" ref={ref} onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up} />
      {Object.entries(useApp.getState().cursors).map(([id,c])=>{
        if(id===useApp.getState().me?.id) return null;
        return <div key={id} style={{position:'absolute',left:c.x,top:c.y,transform:'translate(-45%,-120%)',pointerEvents:'none',background:'rgba(0,0,0,.35)',padding:'2px 6px',borderRadius:8,fontSize:11,color:'#fff',border:'1px solid rgba(255,255,255,.22)'}}><span className="dot" style={{ background:c.color, marginRight:6 }} />{c.name}</div>;
      })}
    </div>
  );
}
