import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

// Must match the inline script in index.html that applies the theme before first paint
const STORAGE_KEY = 'theme'

const getSystemTheme = (): Theme => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

const getStoredTheme = (): Theme | null => {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : null
}

// Follows the OS setting until the user picks a theme, then remembers their choice
export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme() ?? getSystemTheme())

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (!getStoredTheme()) setThemeState(getSystemTheme())
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
