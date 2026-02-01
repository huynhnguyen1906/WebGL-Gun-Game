import { useEffect, useRef } from 'react'

import * as PIXI from 'pixi.js'

import { GameManager } from './game/GameManager'

function App() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const gameManagerRef = useRef<GameManager | null>(null)
  const isInitializedRef = useRef(false)

  useEffect(() => {
    if (!canvasRef.current || isInitializedRef.current) return

    // Prevent double initialization in React Strict Mode
    isInitializedRef.current = true

    // Multiplayer mode by default, use ?singleplayer=true to play offline
    const urlParams = new URLSearchParams(window.location.search)
    const isMultiplayer = urlParams.get('singleplayer') !== 'true'

    console.log(`Starting game in ${isMultiplayer ? 'MULTIPLAYER' : 'SINGLE PLAYER'} mode`)

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
        if (canvasRef.current && isInitializedRef.current) {
          canvasRef.current.appendChild(app.canvas as HTMLCanvasElement)

          // Create game manager with multiplayer flag
          gameManagerRef.current = new GameManager(app, isMultiplayer)
        }
      })

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up game...')
      if (gameManagerRef.current) {
        gameManagerRef.current.destroy()
        gameManagerRef.current = null
      }
      isInitializedRef.current = false
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
