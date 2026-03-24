import Link from 'next/link'

export const metadata = { title: 'Account Deleted' }

export default function AccountDeletedPage() {
  return (
    <div className="max-w-sm w-full text-center flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Account deleted</h1>
        <p className="text-sm text-muted-foreground">
          This account has been deleted. Your personal data will be fully erased within 30 days.
        </p>
        <p className="text-sm text-muted-foreground">
          Payment information managed by Stripe is not affected.
        </p>
        <Link href="/" className="text-sm underline text-foreground">
          Return to home
        </Link>
    </div>
  )
}
