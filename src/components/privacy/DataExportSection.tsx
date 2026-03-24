'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { requestDataExport } from '@/app/(app)/settings/privacy/actions'
import type { DataExportJobRow } from '@/server/db/schema'

type Props = {
  job: DataExportJobRow | null
  downloadUrl: string | null
}

export function DataExportSection({ job, downloadUrl }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [requested, setRequested] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleRequest() {
    startTransition(async () => {
      const result = await requestDataExport()
      if (result.error) {
        if (result.error.code === 'EXPORT_IN_PROGRESS') {
          setError('Your export is already being processed. You will receive an email when it is ready.')
        } else {
          setError(result.error.message)
        }
      } else {
        setRequested(true)
        setError(null)
      }
    })
  }

  // Show success state after user just requested
  if (requested) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Export requested. You will receive an email acknowledgment shortly, and another email
          with your download link when the export is ready (within 72 hours).
        </p>
      </div>
    )
  }

  // Job is in progress
  if (job?.status === 'pending' || job?.status === 'processing') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Export in progress — you will receive an email when it is ready (within 72 hours).
        </p>
      </div>
    )
  }

  // Job is ready but signed URL generation failed (storage misconfiguration)
  if (job?.status === 'ready' && !downloadUrl) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Your export is ready but the download link could not be generated. Please refresh the page to try again.
        </p>
      </div>
    )
  }

  // Job is ready and download URL is available
  if (job?.status === 'ready' && downloadUrl) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Your export is ready. The download link expires 48 hours after the export was generated.
        </p>
        <a
          href={downloadUrl}
          download="flashcards-data-export.json"
          className="inline-flex h-9 w-fit items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Download export (JSON)
        </a>
      </div>
    )
  }

  // Job failed — show retry
  if (job?.status === 'failed') {
    return (
      <div className="flex flex-col gap-3">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Your previous export failed. You can request a new one.
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={handleRequest}
          className="w-fit"
        >
          {isPending ? 'Requesting…' : 'Try again'}
        </Button>
      </div>
    )
  }

  // No job, or expired — show initial request button
  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={handleRequest}
        className="w-fit"
      >
        {isPending ? 'Requesting…' : 'Request data export'}
      </Button>
    </div>
  )
}
