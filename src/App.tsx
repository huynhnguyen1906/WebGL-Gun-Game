import { useEffect, useRef } from 'react'

import * as PIXI from 'pixi.js'

import { GameManager } from './game/GameManager'

function App() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const gameManagerRef = useRef<GameManager | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Create PixiJS application
    const app = new PIXI.Application()

    // Initialize PixiJS
    app
      .init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x1a1a1a,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })
      .then(() => {
        if (canvasRef.current) {
          canvasRef.current.appendChild(app.canvas as HTMLCanvasElement)

          // Create game manager
          gameManagerRef.current = new GameManager(app)
        }
      })

    // Cleanup on unmount
    return () => {
      if (gameManagerRef.current) {
        gameManagerRef.current.destroy()
        gameManagerRef.current = null
      }
    }
  }, [])

  return (
    <div
      ref={canvasRef}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
    />
  )
}

export default App
