export interface Zone {
  id: string
  idx: number
  name: string
  tag: string
  twist: string
  colors: [string, string, string]
  status: 'play' | 'soon'
  next?: string
}

export const ZONES: Zone[] = [
  {
    id: 'trend-mile', idx: 1, name: 'The Trend Mile', tag: 'glossy promenade',
    twist: 'Blend with the crowd, or step out and see what they cannot.',
    colors: ['#F5B68C', '#A8E6CF', '#fbefe2'], status: 'play', next: 'glasshouse',
  },
  {
    id: 'glasshouse', idx: 2, name: 'The Glasshouse', tag: 'rain-soaked atrium',
    twist: 'Rain opens hidden water-routes, but only to the bare.',
    colors: ['#1d9e75', '#c2d9db', '#0f6e56'], status: 'play', next: 'underhum',
  },
  {
    id: 'underhum', idx: 3, name: 'The Underhum', tag: 'service substrata',
    twist: 'Trade your bright suit-light for the glow that only stillness shows.',
    colors: ['#ef9f27', '#6f6e69', '#412402'], status: 'soon',
  },
  {
    id: 'gallery', idx: 4, name: 'The Gallery of Faces', tag: 'mirrored plaza',
    twist: 'Wear the right face to pass, then learn to take it off.',
    colors: ['#ffd24a', '#d4537e', '#993556'], status: 'soon',
  },
  {
    id: 'open-field', idx: 5, name: 'The Open Field', tag: 'the edge of the city',
    twist: 'No suit to help you out here. Just the air, and what you notice.',
    colors: ['#b4b2a9', '#97c459', '#85b7eb'], status: 'soon',
  },
]

export const zoneById = (id: string | null) => ZONES.find((z) => z.id === id)

// Moment (collectible) count per zone. Single source of truth for the count
// seeded into the store on startZone/replay; the zone's own useEffect drives
// the live HUD. Keep in sync with the MOMENTS array in each zone component.
export const MOMENT_COUNT: Record<string, number> = {
  'trend-mile': 10,
  'glasshouse': 11,
}
