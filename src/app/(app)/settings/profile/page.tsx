import { createUserClient } from '@/lib/supabase/user'
import { getUserProfile } from '@/server/db/queries/users'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { DisplayNameForm } from '@/components/profile/DisplayNameForm'

export const metadata = { title: 'Profile Settings' }

export default async function ProfileSettingsPage() {
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  // (app) layout guarantees user is authenticated — null path is unreachable
  if (!user) return null

  const profileResult = await getUserProfile(user.id)
  const profile = profileResult.data

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-8 text-2xl font-semibold">Profile Settings</h1>

      <section className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2">
          <AvatarUpload
            currentAvatarUrl={profile?.avatarUrl ?? null}
            userId={user.id}
            displayName={profile?.displayName ?? null}
          />
        </div>

        <div>
          <h2 className="mb-4 text-base font-medium">Display name</h2>
          <DisplayNameForm currentDisplayName={profile?.displayName ?? null} />
        </div>
      </section>
    </main>
  )
}
