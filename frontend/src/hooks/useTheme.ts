import { useCallback, useEffect, useState } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

// Must match the inline script in index.html that applies the theme before first paint;
// "system" is stored as no entry, so the OS setting applies
const STORAGE_KEY = 'theme'

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

const getStoredPreference = (): ThemePreference => {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

export const useTheme = () => {
  const [preference, setPreferenceState] = useState<ThemePreference>(getStoredPreference)
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches)
  const isDark = preference === 'dark' || (preference === 'system' && systemDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  }, [isDark])

  useEffect(() => {
    const media = darkQuery()
    const onChange = () => setSystemDark(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const setPreference = useCallback((next: ThemePreference) => {
    if (next === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, next)
    setPreferenceState(next)
  }, [])

  return { preference, setPreference }
}
