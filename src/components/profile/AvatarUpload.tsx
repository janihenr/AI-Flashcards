'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { updateAvatarUrl } from '@/app/(app)/settings/profile/actions'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

type Props = {
  currentAvatarUrl: string | null
  userId: string
  displayName: string | null
}

export function AvatarUpload({ currentAvatarUrl, userId, displayName }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initials = displayName
    ? displayName
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Please upload a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('Image must be 2 MB or smaller.')
      return
    }

    const ext = MIME_TO_EXT[file.type] ?? 'jpg'
    const storagePath = `${userId}/avatar.${ext}`

    setUploading(true)
    try {
      const supabase = createSupabaseBrowserClient()

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(storagePath, file, { upsert: true })

      if (uploadError) {
        setError('Upload failed. Please try again.')
        return
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(storagePath)

      const result = await updateAvatarUrl(data.publicUrl)
      if (result.error) {
        setError('Failed to save avatar. Please try again.')
        return
      }

      // Append cache-busting timestamp so the browser re-fetches after upsert
      setPreview(`${data.publicUrl}?t=${Date.now()}`)
    } finally {
      setUploading(false)
      // Reset input so selecting the same file again triggers onChange
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* aria-live region announces upload progress and errors to screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {uploading ? 'Uploading avatar…' : error ?? ''}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-border bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        aria-label="Change avatar"
      >
        {preview ? (
          <Image
            src={preview}
            alt="Your avatar"
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
            {initials}
          </span>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-xs text-white">Uploading…</span>
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="sr-only"
        onChange={handleFileChange}
        aria-hidden="true"
      />

      <p className="text-xs text-muted-foreground">
        Click to change avatar · JPEG, PNG, WebP · max 2 MB
      </p>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
