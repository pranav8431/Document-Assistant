import { createContext, useContext, useState } from 'react'
import { themes, defaultTheme } from '../themes'

const ThemeContext = createContext({ theme: defaultTheme, setTheme: () => {}, themes })

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(defaultTheme)
  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
