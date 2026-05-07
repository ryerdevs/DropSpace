# DropSpace - AI Agent Instructions

## Overview
DropSpace is a real-time web application designed to securely and seamlessly share files, links, and text across devices (e.g., Desktop to Mobile) by simply scanning a QR code.

## Architecture & Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, Framer Motion (animations), Lucide React (icons), `qrcode.react` (pairing).
- **Backend**: Express server running on Node.js.
- **Real-time Communication**: Socket.IO is used to link devices by UUID-based sessions (rooms). It currently handles state syncing and transmits data (tabs, links, files) over WebSocket payloads. 
  *(Note for AI Agents: While the UI features badges indicating "WebRTC" and "End-to-End Encrypted", the current implementation routes file buffers and messages through the Socket.IO server. Future implementations could upgrade this to true WebRTC `RTCDataChannel` connections.)*

## Key Project Files
- `src/App.tsx`: The monolithic main component. It contains both Desktop and Mobile views (conditionally rendered by URL param `?session=`). It manages Socket.IO connections, handles drag-and-drop file parsing, and orchestrates animations.
- `server.ts`: The Express backend serving Vite middleware in development (and `dist/` in production). It mounts the Socket.IO server and manages real-time event broadcasting between paired peers.
- `package.json`: Defines modern dependencies. Essential scripts: `npm run dev` (starts Express + Vite via `tsx`), `npm run build` (tsc & Vite production build), and `npm run start` (starts production Node server).
- `metadata.json`: Used by Google AI Studio for app preview configuration. Do not modify the environment structure here.

## Agent Guidelines
1. **Styling**: The app relies heavily on customized Tailwind classes to achieve a polished, modern, iOS-like aesthetic (e.g., `backdrop-blur`, custom shadows, rounded UI elements, subtle gradients). Respect and match this design language when adding new UI components. Use the `frontend-design` skill styling logic if expanding.
2. **Icons**: `lucide-react` is the only icon library used.
3. **Animations**: Handled primarily by `framer-motion` (`<AnimatePresence>`, `<motion.div>`). Ensure proper `exit` props and `key` uniqueness in lists to maintain layout transition fluidity.
4. **Development Runtime**: Do not alter the custom `server.ts` port (must be `3000` bound to `0.0.0.0` for containerization purposes).
5. **Component Splitting**: `App.tsx` is large. If you are asked to add significant new features, consider extracting components (e.g., `SendPanel`, file list items) into separate files within `src/components/` to improve maintainability.
