import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

type Props = {
  userName: string | null
}

export function AccountDeletionEmail({ userName }: Props) {
  const greeting = userName ? `Hi ${userName},` : 'Hi,'

  return (
    <Html>
      <Head />
      <Preview>Your Flashcards account has been deleted — data erasure within 30 days</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>
            Your account has been deleted
          </Heading>

          <Section>
            <Text style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6' }}>
              {greeting}
            </Text>
            <Text style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6' }}>
              Your Flashcards account has been successfully deleted. Your profile, decks, cards,
              and study history will be fully erased within 30 days.
            </Text>
            <Text style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6' }}>
              Payment information is managed by Stripe and is not stored by Flashcards — no action
              is required on your part for payment data.
            </Text>
            <Text style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6' }}>
              If you did not request this deletion, please contact support immediately.
            </Text>
          </Section>

          <Section style={{ marginTop: '32px', borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
            <Text style={{ fontSize: '13px', color: '#6b7280' }}>
              This email was sent because an account deletion was requested from Flashcards.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
