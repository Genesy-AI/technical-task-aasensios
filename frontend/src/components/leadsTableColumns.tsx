import { FC } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import type { DataTableFeatures } from '@/lib/data-table-features'
import type { FilterOption } from '@/lib/data-table-types'
import { countryName } from '../utils/countryCodes'
import { LeadsGetManyOutput, PhoneSource } from '../api/types/leads/getMany'

export type Lead = LeadsGetManyOutput[number]

const PHONE_SOURCE_LABELS: Record<PhoneSource, string> = {
  csv: 'CSV import',
  orion: 'Orion Connect',
  astra: 'Astra Dialer',
  nimbus: 'Nimbus Lookup',
}

type EmailStatus = 'verified' | 'invalid' | 'unverified'

const EMAIL_STATUS_OPTIONS: FilterOption[] = [
  { label: 'Verified', value: 'verified' },
  { label: 'Invalid', value: 'invalid' },
  { label: 'Not verified', value: 'unverified' },
]

const emailStatus = (lead: Lead): EmailStatus => {
  if (lead.emailVerified === null) return 'unverified'
  return lead.emailVerified ? 'verified' : 'invalid'
}

export const isPhoneSearchInProgress = (lead: Lead) =>
  lead.phoneEnrichmentStatus === 'pending' || lead.phoneEnrichmentStatus === 'running'

const fullName = (lead: Lead) => `${lead.firstName} ${lead.lastName || ''}`.trim()

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

const EmailStatusBadge: FC<{ status: EmailStatus }> = ({ status }) => {
  if (status === 'unverified') {
    return <span className="text-muted-foreground">Not verified</span>
  }
  return status === 'verified' ? (
    <Badge className="bg-green-100 text-green-800">Verified</Badge>
  ) : (
    <Badge variant="destructive">Invalid</Badge>
  )
}

const PhoneCell: FC<{ lead: Lead }> = ({ lead }) => {
  if (lead.phone) {
    return (
      // Tight line heights keep the two lines inside the fixed table row height
      <>
        <div className="leading-4">{lead.phone}</div>
        {lead.phoneSource && (
          <div className="text-xs leading-4 text-muted-foreground">
            via {PHONE_SOURCE_LABELS[lead.phoneSource] ?? lead.phoneSource}
          </div>
        )}
      </>
    )
  }

  if (isPhoneSearchInProgress(lead)) {
    return (
      <span className="inline-flex items-center text-muted-foreground">
        <svg
          className="animate-spin mr-2 h-3 w-3"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          ></path>
        </svg>
        Searching…
      </span>
    )
  }

  if (lead.phoneEnrichmentStatus === 'not_found') {
    return <span className="text-muted-foreground">No data found</span>
  }

  if (lead.phoneEnrichmentStatus === 'failed') {
    return <span className="text-destructive">Search failed</span>
  }

  return <span>-</span>
}

export const getLeadsTableColumns = (
  countryOptions: FilterOption[]
): ColumnDef<DataTableFeatures, Lead>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all leads"
        checked={table.getIsAllRowsSelected()}
        indeterminate={table.getIsSomeRowsSelected()}
        onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select ${fullName(row.original)}`}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    size: 40,
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'name',
    accessorFn: fullName,
    header: ({ column }) => <DataTableColumnHeader column={column} label="Name" />,
    cell: ({ row }) => <div className="font-medium truncate">{fullName(row.original)}</div>,
    meta: { label: 'Name', placeholder: 'Search names...', variant: 'text' },
    enableColumnFilter: true,
    size: 180,
  },
  {
    id: 'email',
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Email" />,
    cell: ({ row }) => <div className="truncate">{row.original.email || '-'}</div>,
    meta: { label: 'Email' },
    size: 240,
  },
  {
    id: 'emailStatus',
    accessorFn: emailStatus,
    header: ({ column }) => <DataTableColumnHeader column={column} label="Email Status" />,
    cell: ({ row }) => <EmailStatusBadge status={emailStatus(row.original)} />,
    meta: { label: 'Email Status', variant: 'multiSelect', options: EMAIL_STATUS_OPTIONS },
    enableColumnFilter: true,
    size: 140,
  },
  {
    id: 'phone',
    accessorKey: 'phone',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Phone" />,
    cell: ({ row }) => <PhoneCell lead={row.original} />,
    meta: { label: 'Phone' },
    size: 170,
  },
  {
    id: 'jobTitle',
    accessorKey: 'jobTitle',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Job Title" />,
    cell: ({ row }) => <div className="truncate">{row.original.jobTitle || '-'}</div>,
    meta: { label: 'Job Title' },
    size: 180,
  },
  {
    id: 'companyName',
    accessorKey: 'companyName',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Company" />,
    cell: ({ row }) => <div className="truncate">{row.original.companyName || '-'}</div>,
    meta: { label: 'Company', placeholder: 'Search companies...', variant: 'text' },
    enableColumnFilter: true,
    size: 180,
  },
  {
    id: 'yearsAtCompany',
    accessorKey: 'yearsAtCompany',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Years at Company" />,
    cell: ({ row }) => row.original.yearsAtCompany ?? '-',
    meta: { label: 'Years at Company' },
    size: 170,
  },
  {
    id: 'linkedinUrl',
    accessorKey: 'linkedinUrl',
    header: ({ column }) => <DataTableColumnHeader column={column} label="LinkedIn" />,
    cell: ({ row }) => {
      const lead = row.original
      if (!lead.linkedinUrl) return '-'
      return (
        <a
          href={lead.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={lead.linkedinUrl}
          aria-label={`LinkedIn profile of ${fullName(lead)}`}
          className="inline-flex text-blue-600 hover:text-blue-800"
        >
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
          </svg>
        </a>
      )
    },
    meta: { label: 'LinkedIn' },
    enableSorting: false,
    size: 110,
  },
  {
    id: 'countryCode',
    accessorKey: 'countryCode',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Country" />,
    cell: ({ row }) => {
      const { countryCode } = row.original
      if (!countryCode) return '-'
      return (
        <div className="truncate" title={countryCode}>
          {countryName(countryCode)}
        </div>
      )
    },
    meta: { label: 'Country', variant: 'multiSelect', options: countryOptions },
    enableColumnFilter: true,
    size: 160,
  },
  {
    id: 'message',
    accessorKey: 'message',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Message" />,
    cell: ({ row }) => (
      <div className="truncate" title={row.original.message || ''}>
        {row.original.message || '-'}
      </div>
    ),
    meta: { label: 'Message' },
    enableSorting: false,
    size: 280,
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} label="Created" />,
    cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
    meta: { label: 'Created', variant: 'dateRange' },
    enableColumnFilter: true,
    size: 130,
  },
]

// Joined into a string so the columns only rebuild when the set of countries changes, not on every poll
export const getCountryCodesKey = (leads: Lead[]) =>
  [...new Set(leads.map((lead) => lead.countryCode).filter((code): code is string => !!code))]
    .sort()
    .join(',')

export const getCountryOptions = (countryCodesKey: string): FilterOption[] =>
  (countryCodesKey ? countryCodesKey.split(',') : [])
    .map((code) => ({ label: countryName(code), value: code }))
    .sort((a, b) => a.label.localeCompare(b.label))
