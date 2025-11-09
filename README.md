**Ink-Credi-Art**

A real-time collaborative sketching platform built with Next.js, TypeScript, and Socket.IO.
It allows multiple users to join a room, draw together on a shared canvas, upload images, insert shapes, and export the final artwork as a PNG — all synchronized live.

**Features**
1. Drawing & Collaboration

Real-time synchronized freehand drawing

Each user is assigned a unique color automatically

Drawings are broadcast live as strokes are made (not after release)

Global undo/redo support

2. Shapes & Images

Add rectangles, ellipses, or lines using your assigned color

Upload and insert images (PNG/JPG) directly onto the canvas

Drag, move, and resize shapes and images

All object actions sync live across every connected user

3. Multi-User Experience

Join or create rooms by ID

Unique nickname and color for each user

Visible cursors with name tags in real time

Active users list with their assigned colors

4. Export & Persistence

Export the entire board (strokes, shapes, and images) as a PNG file

Undo/Redo for collaborative edits

Each room maintains its current drawing state

5. Design

Matte blue aesthetic with glassmorphism

White drawing board centered inside a dark, minimal UI

Responsive and smooth layout transitions

**Tech Stack**
Layer	Technology
Frontend	Next.js 14 (App Router) + React 18 + TypeScript
Styling	CSS (custom glass theme, animations)
State Management	Zustand
Realtime	Socket.IO
Backend	Express + Socket.IO server
Tools	npm, Node.js
⚙️ Installation & Setup
I. Enter the folder

cd ink-credi-art

II. Run the Server

cd server
npm install
npm run dev


Server starts on http://localhost:4001

III. Run the Client

cd ../client
npm install
npm run dev


Client runs on http://localhost:3000

**Usage Guide**

Open the client in your browser.

Enter a nickname and room ID (e.g. room-1).

Click Join Room — you’ll be assigned a color automatically.

Start drawing!

Use Brush, Eraser, or Select tools.

Add Rect, Ellipse, or Line shapes.

Upload an Image to insert and move it around.

Click Export PNG to download your artwork.

Invite others to the same room ID — all actions sync live.



**Future Enhancements**

Resize handles for shapes and images

Layer management (bring forward/backward)

Optional chat or sticky notes for collaboration

Save/load drawings to cloud storage

**Author**

Ink-Credi-Art — designed and implemented by Karthikeya Komarraju
