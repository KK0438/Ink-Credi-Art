# Ink-Credi-Art

**Ink-Credi-Art** is a real-time collaborative sketching platform built with **Next.js, TypeScript, and Socket.IO**. It allows multiple users to join a room, draw together on a shared canvas, upload images, insert shapes, and export the final artwork as a PNG — all synchronized live.


## Features

### Drawing & Collaboration
- Real-time synchronized freehand drawing
- Each user is assigned a unique color automatically
- Drawings are broadcast live as strokes are made
- Global undo/redo support

### Shapes & Images
- Add rectangles, ellipses, or lines using your assigned color
- Upload and insert images (PNG/JPG) directly onto the canvas
- Drag, move, and resize shapes and images
- All object actions sync live across connected users

### Multi-User Experience
- Join or create rooms by ID
- Unique nickname and color for each user
- Visible cursors with name tags in real time
- Active users list with their assigned colors

### Export & Persistence
- Export the entire board (strokes, shapes, images) as a PNG
- Undo/Redo support for collaborative edits
- Each room maintains its current drawing state

### Design
- Matte blue aesthetic with glassmorphism
- White drawing board centered inside a dark, minimal UI
- Responsive layout with smooth transitions

---

## Tech Stack

| Layer       | Technology |
|------------|------------|
| Frontend   | Next.js 14 (App Router) + React 18 + TypeScript |
| Styling    | CSS (custom glass theme, animations) |
| State Mgmt | Zustand |
| Realtime   | Socket.IO |
| Backend    | Express + Socket.IO server |
| Tools      | npm, Node.js |

---

## Installation & Setup

### 1. Enter the project folder

'cd ink-credi-art'

### 2. Run the Server

`cd server`

`npm install`

`npm run dev`

Server starts on: `http://localhost:4001`

### 3. Run the Client

`cd client`

`npm install`

`npm run dev`

Client runs on: `http://localhost:3000`

## Usage Guide

1. Open the client in your browser.
2. Enter a nickname and room ID (e.g., `room-1`).
3. Click **Join Room** — you’ll be assigned a color automatically.
4. Start drawing using Brush, Eraser, or Select tools.
5. Add Rect, Ellipse, or Line shapes.
6. Upload images to insert and move them around.
7. Click **Export PNG** to download your artwork.
8. Invite others to the same room — all actions sync live.



**Ink-Credi-Art** — designed and implemented by **Karthikeya Komarraju**
