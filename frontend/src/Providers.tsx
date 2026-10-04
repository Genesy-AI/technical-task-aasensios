import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { NuqsAdapter } from 'nuqs/adapters/react'
import { FC, PropsWithChildren } from 'react'
import { Toaster } from 'react-hot-toast'
import { TooltipProvider } from '@/components/ui/tooltip'

const queryClient = new QueryClient()

export const Providers: FC<PropsWithChildren> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      <Toaster
        position="top-right"
        gutter={8}
        containerClassName="!top-5 !right-5"
        toastOptions={{
          // The color classes are marked important (!) to beat react-hot-toast's inline background and color
          duration: 4000,
          className:
            'bg-popover/95! text-popover-foreground! border border-border rounded-xl shadow-xl backdrop-blur-md text-sm font-medium px-4 py-3 max-w-sm',
          success: {
            duration: 3000,
            className:
              'bg-green-50/95! text-emerald-700! border border-emerald-200/20 dark:bg-emerald-950/90! dark:text-emerald-300! dark:border-emerald-900 rounded-xl shadow-xl backdrop-blur-md text-sm font-medium px-4 py-3 max-w-sm',
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            duration: 5000,
            className:
              'bg-red-50/95! text-red-700! border border-red-200/20 dark:bg-red-950/90! dark:text-red-300! dark:border-red-900 rounded-xl shadow-xl backdrop-blur-md text-sm font-medium px-4 py-3 max-w-sm',
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
          loading: {
            className:
              'bg-popover/95! text-muted-foreground! border border-border rounded-xl shadow-xl backdrop-blur-md text-sm font-medium px-4 py-3 max-w-sm',
            iconTheme: {
              primary: '#6b7280',
              secondary: '#ffffff',
            },
          },
        }}
      />
      <NuqsAdapter>
        <TooltipProvider delay={300}>{children}</TooltipProvider>
      </NuqsAdapter>
    </QueryClientProvider>
  )
}
