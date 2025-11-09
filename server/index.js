import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { customAlphabet } from 'nanoid';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET','POST'] } });

const PORT = process.env.PORT || 4001;

const rooms = new Map();
const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#8b5cf6','#ec4899','#10b981','#f59e0b'];
const nano = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

function ensureRoom(roomId){
  if(!rooms.has(roomId)){
    rooms.set(roomId,{ users:{}, ops:[], undone:[], cursors:{}, objects:[] });
  }
  return rooms.get(roomId);
}
function assignUniqueColor(room){
  const taken = new Set(Object.values(room.users).map(u=>u.color));
  const free = COLORS.find(c=>!taken.has(c));
  return free || COLORS[(Object.keys(room.users).length)%COLORS.length];
}

io.on('connection',(socket)=>{
  let currentRoom = null;

  socket.on('room:join', ({roomId,name})=>{
    currentRoom = roomId;
    const room = ensureRoom(roomId);
    const color = assignUniqueColor(room);
    room.users[socket.id] = { name: (name?.trim() || `User-${socket.id.slice(0,4)}`), color };
    socket.join(roomId);
    socket.emit('room:state', { ops: room.ops, objects: room.objects });
    io.to(roomId).emit('room:users', room.users);
  });

  socket.on('room:leave', ()=>{
    if(!currentRoom) return;
    const room = rooms.get(currentRoom);
    if(room){
      delete room.users[socket.id];
      delete room.cursors[socket.id];
      io.to(currentRoom).emit('room:users', room.users);
      io.to(currentRoom).emit('room:cursors', room.cursors);
    }
    socket.leave(currentRoom);
    currentRoom=null;
  });

  socket.on('draw:op', (op)=>{
    if(!currentRoom) return;
    const room = ensureRoom(currentRoom);
    const user = room.users[socket.id];
    const enforcedColor = user?.color || '#111827';
    const id = op.id || nano();
    const full = { ...op, id, color: enforcedColor };
    room.ops.push(full);
    room.undone = [];
    socket.to(currentRoom).emit('draw:op', full);
  });

  socket.on('draw:live', (pt)=>{
    if(!currentRoom) return;
    const room = ensureRoom(currentRoom);
    const user = room.users[socket.id] || { name:'Anon', color:'#111827' };
    const payload = { from: socket.id, x: Number(pt?.x)||0, y: Number(pt?.y)||0, tool: pt?.tool || 'brush', size: Number(pt?.size)||4, color: user.color };
    socket.to(currentRoom).emit('draw:live', payload);
  });
  socket.on('draw:live:end', ()=>{
    if(!currentRoom) return;
    socket.to(currentRoom).emit('draw:live:end', { from: socket.id });
  });

  socket.on('cursor:update', (pos)=>{
    if(!currentRoom) return;
    const room = ensureRoom(currentRoom);
    const user = room.users[socket.id] || { name:'Anon', color:'#111827' };
    room.cursors[socket.id] = { x: Number(pos?.x)||0, y: Number(pos?.y)||0, drawing: !!pos?.drawing, name: user.name, color: user.color };
    socket.to(currentRoom).emit('room:cursors', room.cursors);
  });

  socket.on('object:add', (obj)=>{
    if(!currentRoom) return;
    const room = ensureRoom(currentRoom);
    const user = room.users[socket.id] || { color:'#111827' };
    const id = obj.id || nano();
    const full = { ...obj, id, owner: socket.id, color: obj.type==='shape' ? user.color : (obj.color||user.color), z: Number(obj.z)||Date.now() };
    const existingIdx = room.objects.findIndex(o=>o.id===id);
    if(existingIdx!==-1) room.objects[existingIdx] = full; else room.objects.push(full);
    io.to(currentRoom).emit('object:added', full);
  });
  socket.on('object:update', (obj)=>{
    if(!currentRoom) return;
    const room = ensureRoom(currentRoom);
    const idx = room.objects.findIndex(o=>o.id===obj.id);
    if(idx===-1) return;
    room.objects[idx] = { ...room.objects[idx], ...obj };
    io.to(currentRoom).emit('object:updated', room.objects[idx]);
  });
  socket.on('object:remove', ({id})=>{
    if(!currentRoom) return;
    const room = ensureRoom(currentRoom);
    const idx = room.objects.findIndex(o=>o.id===id);
    if(idx===-1) return;
    const removed = room.objects.splice(idx,1)[0];
    io.to(currentRoom).emit('object:removed', { id: removed.id });
  });

  socket.on('ops:undo', ()=>{
    if(!currentRoom) return;
    const room = ensureRoom(currentRoom);
    if(room.ops.length===0) return;
    const op = room.ops.pop();
    room.undone.push(op);
    io.to(currentRoom).emit('room:state', { ops: room.ops, objects: room.objects });
  });
  socket.on('ops:redo', ()=>{
    if(!currentRoom) return;
    const room = ensureRoom(currentRoom);
    if(room.undone.length===0) return;
    const op = room.undone.pop();
    room.ops.push(op);
    io.to(currentRoom).emit('room:state', { ops: room.ops, objects: room.objects });
  });

  socket.on('disconnect', ()=>{
    if(!currentRoom) return;
    const room = rooms.get(currentRoom);
    if(room){
      delete room.users[socket.id];
      delete room.cursors[socket.id];
      io.to(currentRoom).emit('room:users', room.users);
      io.to(currentRoom).emit('room:cursors', room.cursors);
      io.to(currentRoom).emit('draw:live:end', { from: socket.id });
    }
  });
});

app.get('/', (_req,res)=>res.json({ok:true, service:'ink-credi-art-socket', rooms: rooms.size}));

server.listen(PORT, ()=>console.log('Socket server listening on :'+PORT));
