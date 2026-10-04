import * as React from 'react'
import { cn } from '@/lib/utils'

const SCROLL_FADE_WIDTH = '2.5rem'

// Tracks whether there is hidden content to either side, so the edges can fade out as a scroll hint
function useHorizontalOverflow(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [overflow, setOverflow] = React.useState({ start: false, end: false })

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container
      const start = scrollLeft > 1
      const end = scrollLeft + clientWidth < scrollWidth - 1
      setOverflow((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    }

    update()
    container.addEventListener('scroll', update, { passive: true })
    // Column visibility and data changes resize the table without resizing the container
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    resizeObserver?.observe(container)
    if (container.firstElementChild) resizeObserver?.observe(container.firstElementChild)

    return () => {
      container.removeEventListener('scroll', update)
      resizeObserver?.disconnect()
    }
  }, [containerRef])

  return overflow
}

function Table({
  className,
  scrollFadeStart = 0,
  ...props
}: React.ComponentProps<'table'> & {
  // Width in px of the columns pinned to the start; the start fade begins after them
  scrollFadeStart?: number
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const overflow = useHorizontalOverflow(containerRef)
  const fadeStart = overflow.start ? scrollFadeStart : 0
  const maskImage =
    overflow.start || overflow.end
      ? `linear-gradient(to right, #000 ${fadeStart}px, transparent ${fadeStart}px, #000 calc(${fadeStart}px + ${overflow.start ? SCROLL_FADE_WIDTH : '0px'}), #000 calc(100% - ${overflow.end ? SCROLL_FADE_WIDTH : '0px'}), transparent)`
      : undefined

  return (
    <div
      ref={containerRef}
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
      style={{ maskImage, WebkitMaskImage: maskImage }}
    >
      <table data-slot="table" className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted',
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:ps-3 [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:ps-3 [&:has([role=checkbox])]:pr-0', className)}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
