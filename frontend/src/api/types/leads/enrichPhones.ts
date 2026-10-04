export type LeadsEnrichPhonesInput = {
  leadIds: number[]
}

export type LeadsEnrichPhonesOutput = {
  success: boolean
  started: number[]
  skipped: number[]
  alreadyRunning: number[]
  errors: Array<{
    leadId: number
    leadName: string
    error: string
  }>
}
