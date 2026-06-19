import { memo } from 'react'
import { useGame } from './game/store'
import { Game } from './components/Game'
import { TitleScreen } from './ui/TitleScreen'
import { LevelSelect } from './ui/LevelSelect'
import { HUD } from './ui/HUD'
import { CompleteScreen } from './ui/CompleteScreen'
import { PauseMenu } from './ui/PauseMenu'

const StableGame = memo(Game)

export default function App() {
  const screen = useGame((s) => s.screen)
  const runId = useGame((s) => s.runId)
  const inGame = screen === 'play' || screen === 'complete'

  return (
    <>
      {inGame && <StableGame key={runId} />}
      {screen === 'title' && <TitleScreen />}
      {screen === 'select' && <LevelSelect />}
      {screen === 'play' && <HUD />}
      <PauseLayer />
      {screen === 'complete' && <CompleteScreen />}
    </>
  )
}

function PauseLayer() {
  const screen = useGame((s) => s.screen)
  const paused = useGame((s) => s.paused)
  return screen === 'play' && paused ? <PauseMenu /> : null
}
