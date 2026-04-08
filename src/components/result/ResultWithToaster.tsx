'use client'

import { Toaster } from '@/components/ui/sonner'
import { MatchResultView } from './MatchResultView'
import type { MatchSet, MatchStats } from '@/types'

interface ResultWithToasterProps {
  teamName: string
  opponentName: string
  matchDate: string
  location: string | null
  sets: MatchSet[]
  stats: MatchStats
  shareUuid: string
  showSharePanel?: boolean
}

export function ResultWithToaster(props: ResultWithToasterProps) {
  return (
    <>
      <Toaster />
      <MatchResultView {...props} />
    </>
  )
}
