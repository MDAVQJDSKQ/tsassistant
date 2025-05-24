'use client'

import { Provider } from 'jotai'
import { DevTools } from 'jotai-devtools'

interface JotaiProviderProps {
  children: React.ReactNode
}

export function JotaiProvider({ children }: JotaiProviderProps) {
  return (
    <Provider>
      {process.env.NODE_ENV === 'development' && <DevTools />}
      {children}
    </Provider>
  )
} 