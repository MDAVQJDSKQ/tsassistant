import { atom } from 'jotai'

// UI state atoms
export const sidebarOpenAtom = atom(true)
export const settingsOpenAtom = atom(false)
export const isResizingAtom = atom(false)

// Loading states
export const loadingStatesAtom = atom({
  conversations: false,
  messages: false,
  creating: false,
  deleting: false,
  saving: false,
  generating: false
})

// Error states
export const errorStatesAtom = atom<{
  conversations?: string
  messages?: string
  chat?: string
}>({}) 