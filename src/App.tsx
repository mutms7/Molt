import { useGame } from './game/store'
import { Game } from './components/Game'
import { TitleScreen } from './ui/TitleScreen'
import { LevelSelect } from './ui/LevelSelect'
import { HUD } from './ui/HUD'
import { CompleteScreen } from './ui/CompleteScreen'

export default function App() {
  const screen = useGame((s) => s.screen)
  const inGame = screen === 'play' || screen === 'complete'

  return (
    <>
      {inGame && <Game />}
      {screen === 'title' && <TitleScreen />}
      {screen === 'select' && <LevelSelect />}
      {screen === 'play' && <HUD />}
      {screen === 'complete' && <CompleteScreen />}
    </>
  )
}
