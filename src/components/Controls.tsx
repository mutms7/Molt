import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { initControls, disposeControls } from '../game/input'

export function Controls() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    initControls(gl.domElement)
    return () => disposeControls()
  }, [gl])
  return null
}
