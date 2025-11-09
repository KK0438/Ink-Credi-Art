'use client';
import { create } from 'zustand';
export type Tool = 'brush'|'eraser'|'select'|'shape-rect'|'shape-ellipse'|'shape-line'|'image';
export interface UserInfo { id?: string; name: string; color: string; }
export interface CursorInfo { x:number; y:number; name:string; color:string; drawing:boolean; }
export interface DrawOp { id: string; type: 'stroke'; points: { x: number, y: number }[]; color: string; size: number; tool: 'brush'|'eraser'; }
export type ObjShape = { id:string; type:'shape'; shape:'rect'|'ellipse'|'line'; x:number; y:number; w:number; h:number; color:string; z:number; owner:string };
export type ObjImage = { id:string; type:'image'; src:string; x:number; y:number; w:number; h:number; z:number; owner:string };
export type AnyObject = ObjShape | ObjImage;
type LiveOp = { points: {x:number,y:number}[]; color:string; size:number; tool:'brush'|'eraser' };
type State = { me: UserInfo | null; users: Record<string, UserInfo>; cursors: Record<string, CursorInfo>; ops: DrawOp[]; live: Record<string, LiveOp>; objects: AnyObject[]; roomId: string; tool: Tool; color: string; size: number; selectedId: string | null; set: (p: Partial<State>) => void; resetRoom: () => void; };
export const useApp = create<State>((set) => ({ me: null, users: {}, cursors: {}, ops: [], live: {}, objects: [], roomId: '', tool: 'brush', color: '#7ab8ff', size: 4, selectedId: null, set: (p) => set(p), resetRoom: () => set({ users: {}, cursors: {}, ops: [], live: {}, objects: [], selectedId: null }), }));
