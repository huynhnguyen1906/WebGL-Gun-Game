import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import './style/globalStyles.scss'

// Disable StrictMode for game to prevent double initialization
createRoot(document.getElementById('root')!).render(<App />)
