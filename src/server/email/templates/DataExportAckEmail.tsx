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

export function DataExportAckEmail({ userName }: Props) {
  const greeting = userName ? `Hi ${userName},` : 'Hi,'

  return (
    <Html>
      <Head />
      <Preview>Your data export request has been received — export ready within 72 hours</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>
            Your data export request has been received
          </Heading>

          <Section>
            <Text style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6' }}>
              {greeting}
            </Text>
            <Text style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6' }}>
              We have received your request to export your personal data. Your export will be
              ready within 72 hours.
            </Text>
            <Text style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6' }}>
              When it is ready, you will receive another email with instructions to download
              your data from your Privacy Settings page.
            </Text>
            <Text style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6' }}>
              Your export will include: profile information, decks, notes, cards, study history,
              and learning preferences in JSON format. Payment data is managed by Stripe and is
              not included.
            </Text>
          </Section>

          <Section style={{ marginTop: '32px', borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
            <Text style={{ fontSize: '13px', color: '#6b7280' }}>
              This email was sent because you requested a data export from Flashcards.
              If you did not make this request, you can ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
