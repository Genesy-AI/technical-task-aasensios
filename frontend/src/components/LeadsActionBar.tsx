import { FC, ReactNode } from 'react'
import {
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

type LeadsActionBarProps = {
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
  destructive?: boolean
}> = ({ icon, label, onClick, disabled, destructive }) => (
  <ActionBarItem
    variant={destructive ? 'destructive' : 'secondary'}
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
}) => (
  <ActionBar
    open={selectedCount > 0}
    onOpenChange={(open) => {
      if (!open) onClearSelection()
    }}
  >
    <ActionBarSelection className="whitespace-nowrap">
      {selectedCount} selected
      <ActionBarSeparator />
      <ActionBarClose aria-label="Clear selection">
        <IconX />
      </ActionBarClose>
    </ActionBarSelection>
    <ActionBarSeparator />
    <ActionBarGroup>
      <Action
        icon={isVerifyingEmails ? <Spinner /> : <IconMailCheck />}
        label="Verify email"
        onClick={onVerifyEmails}
        disabled={isVerifyingEmails}
      />
      <Action
        icon={isFindingPhones ? <Spinner /> : <IconPhoneCall />}
        label="Find phone"
        onClick={onFindPhones}
        disabled={isFindingPhones}
      />
      <Action icon={<IconUserQuestion />} label="Guess gender" onClick={onGuessGender} />
      <Action icon={<IconMessage2 />} label="Generate messages" onClick={onGenerateMessages} />
      <Action
        icon={isDeleting ? <Spinner /> : <IconTrash />}
        label={isDeleting ? 'Deleting...' : 'Delete'}
        onClick={onDelete}
        disabled={isDeleting}
        destructive
      />
    </ActionBarGroup>
  </ActionBar>
)
