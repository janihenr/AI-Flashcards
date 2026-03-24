'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { logout } from '@/app/(app)/actions'
import { Button } from '@/components/ui/button'

export default function AppNav() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
      // refresh() clears RSC cache before navigation lands on /
      router.refresh()
      router.push('/')
    } catch {
      // Network/Server Action failure — still redirect to force re-auth
      router.push('/')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <nav className="border-b bg-background px-4 py-3 flex items-center justify-between">
      <Link href="/decks" className="font-semibold text-foreground hover:opacity-80">
        Flashcards
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/settings/profile"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Settings
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Logging out…' : 'Log out'}
        </Button>
      </div>
    </nav>
  )
}
