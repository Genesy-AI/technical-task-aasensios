import { FC, ReactNode, useState } from 'react'
import {
  IconBolt,
  IconChevronDown,
  IconLoader2,
  IconMailCheck,
  IconMessage2,
  IconPhoneCall,
  IconTrash,
  IconUserQuestion,
  IconX,
} from '@tabler/icons-react'
import {
  ActionBar,
  ActionBarClose,
  ActionBarGroup,
  ActionBarItem,
} from '@/components/ui/action-bar'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type LeadsActionBarProps = {
  // Where the bar renders inline, in place of the table toolbar
  container: Element | null
  selectedCount: number
  onClearSelection: () => void
  onVerifyEmails: () => void
  onFindPhones: () => void
  onGuessGender: () => void
  onGenerateMessages: () => void
  onDelete: () => void
  isVerifyingEmails: boolean
  isFindingPhones: boolean
  isDeleting: boolean
}

// ActionBarItem closes the bar (clearing the selection) on select by default; actions keep the selection
const keepSelection = (event: Event) => event.preventDefault()

const Action: FC<{
  icon: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'destructive'
}> = ({ icon, label, onClick, disabled, variant = 'default' }) => (
  <ActionBarItem
    variant={variant}
    size="default"
    // ActionBarItem makes the group a single Tab stop (arrows move within it); let Tab reach every action
    tabIndex={0}
    disabled={disabled}
    onClick={onClick}
    onSelect={keepSelection}
  >
    {icon}
    {label}
  </ActionBarItem>
)

const Spinner = () => <IconLoader2 className="animate-spin" />

export const LeadsActionBar: FC<LeadsActionBarProps> = ({
  container,
  selectedCount,
  onClearSelection,
  onVerifyEmails,
  onFindPhones,
  onGuessGender,
  onGenerateMessages,
  onDelete,
  isVerifyingEmails,
  isFindingPhones,
  isDeleting,
}) => {
  const [isEnrichMenuOpen, setIsEnrichMenuOpen] = useState(false)

  return (
    <ActionBar
      open={selectedCount > 0}
      portalContainer={container}
      className="static w-full border-0 p-0 shadow-none"
      style={{ translate: 'none' }}
      onOpenChange={(open) => {
        if (!open) onClearSelection()
      }}
      // Escape closes the Enrich menu, not the whole selection
      onEscapeKeyDown={(event) => {
        if (isEnrichMenuOpen) event.preventDefault()
      }}
    >
      <div className="flex h-8 items-center gap-1 rounded-lg border border-border bg-background ps-2.5 pe-1 text-sm font-medium tabular-nums whitespace-nowrap dark:border-input dark:bg-input/30">
        {selectedCount} selected
        <TooltipProvider delay={300}>
          <Tooltip>
            <TooltipTrigger
              render={
                <ActionBarClose
                  aria-label="Clear selection"
                  // Concentric with the h-8 rounded-lg box around it
                  className={cn(buttonVariants({ variant: 'ghost', size: 'icon-xs' }), 'rounded-sm opacity-100')}
                />
              }
            >
              <IconX />
            </TooltipTrigger>
            <TooltipContent>Clear selection</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <ActionBarGroup className="ms-auto">
        <DropdownMenu open={isEnrichMenuOpen} onOpenChange={setIsEnrichMenuOpen}>
          <DropdownMenuTrigger
            render={
              <ActionBarItem
                variant="brand-secondary"
                size="default"
                tabIndex={0}
                onSelect={keepSelection}
              />
            }
          >
            {isVerifyingEmails || isFindingPhones ? <Spinner /> : <IconBolt />}
            Enrich
            <IconChevronDown data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto">
            <DropdownMenuItem onClick={onVerifyEmails} disabled={isVerifyingEmails}>
              {isVerifyingEmails ? <Spinner /> : <IconMailCheck />}
              Verify email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onFindPhones} disabled={isFindingPhones}>
              {isFindingPhones ? <Spinner /> : <IconPhoneCall />}
              Find phone
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onGuessGender}>
              <IconUserQuestion />
              Guess gender
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Action icon={<IconMessage2 />} label="Generate messages" onClick={onGenerateMessages} />
        <Action
          icon={isDeleting ? <Spinner /> : <IconTrash />}
          label={isDeleting ? 'Deleting...' : 'Delete leads'}
          onClick={onDelete}
          disabled={isDeleting}
          variant="destructive"
        />
      </ActionBarGroup>
    </ActionBar>
  )
}
