import { AnonymousSessionInitializer } from '@/components/shared/AnonymousSessionInitializer'

export default function ColdStartLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnonymousSessionInitializer />
      {children}
    </>
  )
}
