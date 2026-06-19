const CONTROLS = [
  ['Move', 'W A S D or arrow keys'],
  ['Look / camera', 'Click the game, then move the mouse'],
  ['Jump', 'Space'],
  ['Dash', 'Shift while suited'],
  ['Switch state', 'Q or E'],
  ['Pause', 'Esc or P'],
  ['Restart zone', 'R'],
  ['Back to map', 'M or pause menu'],
]

export function ControlsGuide() {
  return (
    <div className="controls-guide">
      <p className="intro-copy">
        A 3D puzzle platformer about precise movement: run, jump, and switch between suited and bare
        states to cross gaps, reveal hidden paths, and solve traversal puzzles.
      </p>
      <div className="control-list" aria-label="Keyboard and mouse controls">
        {CONTROLS.map(([action, binding]) => (
          <div className="control-row" key={action}>
            <span>{action}</span>
            <kbd>{binding}</kbd>
          </div>
        ))}
      </div>
    </div>
  )
}
