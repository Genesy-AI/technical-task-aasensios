import { FC } from 'react'
import { IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ThemePreference, useTheme } from '../hooks/useTheme'

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof IconSun }[] = [
  { value: 'light', label: 'Light theme', Icon: IconSun },
  { value: 'dark', label: 'Dark theme', Icon: IconMoon },
  { value: 'system', label: 'System theme', Icon: IconDeviceDesktop },
]

export const ThemeToggle: FC = () => {
  const { preference, setPreference } = useTheme()

  return (
    <div role="group" aria-label="Theme" className="flex items-center gap-0.5 rounded-lg border p-px">
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = preference === value
        return (
          <Button
            key={value}
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            onClick={() => setPreference(value)}
            className={cn(!isActive && 'text-muted-foreground', isActive && 'bg-muted text-foreground')}
          >
            <Icon />
          </Button>
        )
      })}
    </div>
  )
}
