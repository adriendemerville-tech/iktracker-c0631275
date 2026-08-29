import * as React from "npm:react@18.3.1";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";
import type { TemplateEntry } from "./registry.ts";

interface Props {
  firstName?: string;
  excerpt?: string;
  conversationUrl?: string;
}

const Email = ({
  firstName = "",
  excerpt = "",
  conversationUrl = "https://iktracker.fr/app/messages",
}: Props) => (
  <Html lang="fr">
    <Head />
    <Preview>Adrien vous a répondu sur IKtracker</Preview>
    <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif", margin: 0 }}>
      <Container style={{ maxWidth: "560px", padding: "24px", backgroundColor: "#ffffff" }}>
        <Heading style={{ fontSize: "20px", margin: "0 0 12px" }}>
          Vous avez une réponse sur IKtracker
        </Heading>
        <Text style={{ fontSize: "15px", color: "#333" }}>
          {firstName ? `Bonjour ${firstName},` : "Bonjour,"} Adrien a répondu à votre message.
        </Text>
        {excerpt ? (
          <Section
            style={{
              borderLeft: "3px solid #6366f1",
              padding: "8px 12px",
              margin: "16px 0",
              color: "#555",
              fontSize: "14px",
              whiteSpace: "pre-wrap",
            }}
          >
            <Text style={{ margin: 0 }}>{excerpt}</Text>
          </Section>
        ) : null}
        <Button
          href={conversationUrl}
          style={{
            backgroundColor: "#4f46e5",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "8px",
            fontSize: "14px",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Lire et répondre
        </Button>
        <Text style={{ fontSize: "12px", color: "#888", marginTop: "24px" }}>
          IKtracker — outil communautaire de suivi des indemnités kilométriques.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template: TemplateEntry = {
  component: Email,
  subject: "Adrien vous a répondu — IKtracker",
  displayName: "Admin — réponse à un message",
  previewData: {
    firstName: "Camille",
    excerpt: "Merci pour ton retour, la fonctionnalité arrive la semaine prochaine…",
    conversationUrl: "https://iktracker.fr/app/messages",
  },
};
