import { createContext, useContext, type ReactNode } from 'react'
import { type Navigate } from './navigation-click'

const navigationContext = createContext<Navigate | undefined>(undefined)

// NavigationProvider supplies the function that opens a page of the scratch pad. A component
// inside the provider reads the function with useNavigate.
export function NavigationProvider(props: {
  readonly onNavigate: Navigate
  readonly children: ReactNode
}) {
  return (
    <navigationContext.Provider value={props.onNavigate}>
      {props.children}
    </navigationContext.Provider>
  )
}

export function useNavigate(): Navigate | undefined {
  return useContext(navigationContext)
}
