import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

// Persistent settings atoms
export const apiKeyAtom = atomWithStorage('apiKey', '')
export const centralModelAtom = atomWithStorage('centralModel', 'openrouter')
export const titleGenerationPromptAtom = atomWithStorage('titleGenerationPrompt', '')

// Derived settings atom
export const settingsAtom = atom(
  (get) => ({
    apiKey: get(apiKeyAtom),
    centralModel: get(centralModelAtom),
    titleGenerationPrompt: get(titleGenerationPromptAtom)
  })
)

// Settings validation atom
export const isSettingsValidAtom = atom(
  (get) => {
    const settings = get(settingsAtom)
    return settings.apiKey.length > 0 && settings.centralModel.length > 0
  }
) 