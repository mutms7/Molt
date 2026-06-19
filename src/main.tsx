import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// No StrictMode: the game loop, audio context, and physics world should
// initialize exactly once, not twice.
createRoot(document.getElementById('root')!).render(<App />)
