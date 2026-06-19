import * as THREE from 'three'

// Cross-cutting, non-reactive shared values read every frame.
// Kept out of the React store so we don't trigger renders 60x/second.
export const fx = { bare: 0 } // 0 = fully suited, 1 = fully bare (smoothed)
export const playerPos = new THREE.Vector3(0, 2, 8)
export const checkpoint = new THREE.Vector3(0, 1.4, 8)
