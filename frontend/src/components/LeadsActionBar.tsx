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
  ActionBarSelection,
  ActionBarSeparator,
} from '@/components/ui/action-bar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
      <ActionBarSelection className="whitespace-nowrap ps-1.5">
        {selectedCount} selected
        <ActionBarSeparator />
        <TooltipProvider delay={300}>
          <Tooltip>
            <TooltipTrigger render={<ActionBarClose aria-label="Clear selection" />}>
              <IconX />
            </TooltipTrigger>
            <TooltipContent>Clear selection</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ActionBarSelection>
      <ActionBarGroup className="ms-auto">
        <DropdownMenu open={isEnrichMenuOpen} onOpenChange={setIsEnrichMenuOpen}>
          <DropdownMenuTrigger
            render={<ActionBarItem variant="brand-secondary" size="default" onSelect={keepSelection} />}
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
