import { FC } from 'react'
import { IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ThemePreference, useTheme } from '../hooks/useTheme'

const OPTIONS: { value: ThemePreference; label: string; tooltip: string; Icon: typeof IconSun }[] = [
  { value: 'light', label: 'Light theme', tooltip: 'Light', Icon: IconSun },
  { value: 'dark', label: 'Dark theme', tooltip: 'Dark', Icon: IconMoon },
  { value: 'system', label: 'System theme', tooltip: 'System (follows your OS)', Icon: IconDeviceDesktop },
]

export const ThemeToggle: FC = () => {
  const { preference, setPreference } = useTheme()

  return (
    <TooltipProvider delay={300}>
      <div role="group" aria-label="Theme" className="flex items-center gap-0.5 rounded-lg border p-px">
        {OPTIONS.map(({ value, label, tooltip, Icon }) => {
          const isActive = preference === value
          return (
            <Tooltip key={value}>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={label}
                    aria-pressed={isActive}
                    onClick={() => setPreference(value)}
                    className={cn(!isActive && 'text-muted-foreground', isActive && 'bg-muted text-foreground')}
                  />
                }
              >
                <Icon className={cn(isActive && 'text-foreground')} />
              </TooltipTrigger>
              <TooltipContent>{tooltip}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
