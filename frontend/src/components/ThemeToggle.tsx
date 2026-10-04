import { FC } from 'react'
import { IconMoon, IconSun } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '../hooks/useTheme'

export const ThemeToggle: FC = () => {
  const { theme, toggleTheme } = useTheme()
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={label} title={label}>
      {theme === 'dark' ? <IconSun /> : <IconMoon />}
    </Button>
  )
}
