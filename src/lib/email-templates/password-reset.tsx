import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface PasswordResetEmailProps {
  resetUrl?: string
  validityHours?: number
}

export const PasswordResetEmail = ({
  resetUrl,
  validityHours = 28,
}: PasswordResetEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Choisissez un nouveau mot de passe IKtracker</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>IKtracker</Text>
        <Heading style={h1}>Nouveau mot de passe</Heading>
        <Text style={text}>
          Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le
          bouton ci-dessous pour en choisir un nouveau.
        </Text>
        {resetUrl ? (
          <Button style={button} href={resetUrl}>
            Choisir mon nouveau mot de passe
          </Button>
        ) : (
          <Text style={text}>Lien de réinitialisation indisponible.</Text>
        )}
        <Text style={muted}>
          Ce lien est valable {validityHours} heures et ne peut être utilisé
          qu'une seule fois.
        </Text>
        <Text style={footer}>
          Si vous n'êtes pas à l'origine de cette demande, ignorez cet email :
          votre mot de passe ne sera pas modifié.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default PasswordResetEmail

export const template = {
  component: PasswordResetEmail,
  subject: 'Nouveau mot de passe — IKtracker',
  displayName: 'Réinitialisation du mot de passe',
  previewData: { resetUrl: 'https://iktracker.fr/reset-mot-de-passe?token=exemple' },
} satisfies import('./registry').TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const brand = {
  fontSize: '16px',
  fontWeight: 700 as const,
  color: '#1e1b4b',
  letterSpacing: '-0.5px',
  margin: '0 0 16px',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#1e1b4b',
  margin: '0 0 16px',
}
const text = {
  fontSize: '14px',
  color: '#3f3f46',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const muted = {
  fontSize: '13px',
  color: '#52525b',
  lineHeight: '1.5',
  margin: '16px 0 0',
}
const button = {
  backgroundColor: '#4f46e5',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #4f46e5',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
