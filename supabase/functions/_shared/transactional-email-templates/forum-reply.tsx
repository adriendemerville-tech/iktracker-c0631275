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
  discussionTitle?: string;
  discussionUrl?: string;
  actorName?: string;
  excerpt?: string;
}

const Email = ({
  discussionTitle = "Votre discussion",
  discussionUrl = "https://iktracker.fr/forum",
  actorName = "Un membre",
  excerpt = "",
}: Props) => (
  <Html lang="fr">
    <Head />
    <Preview>{`${actorName} a répondu : ${discussionTitle}`}</Preview>
    <Body style={{ backgroundColor: "#f6f5f2", fontFamily: "Arial, sans-serif", margin: 0 }}>
      <Container style={{ maxWidth: "560px", padding: "24px", backgroundColor: "#ffffff" }}>
        <Heading style={{ fontSize: "20px", margin: "0 0 12px" }}>
          Nouvelle réponse sur le forum IKtracker
        </Heading>
        <Text style={{ fontSize: "15px", color: "#333" }}>
          {actorName} a répondu à « {discussionTitle} ».
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
          href={discussionUrl}
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
          Lire la réponse
        </Button>
        <Text style={{ fontSize: "12px", color: "#888", marginTop: "24px" }}>
          IKtracker — forum communautaire des indépendants.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template: TemplateEntry = {
  component: Email,
  subject: (data: Props) =>
    `Nouvelle réponse : ${data?.discussionTitle ?? "votre discussion"} — Forum IKtracker`,
  displayName: "Forum — nouvelle réponse",
  previewData: {
    discussionTitle: "Barème IK 2026 : quel véhicule électrique ?",
    discussionUrl: "https://iktracker.fr/forum",
    actorName: "Camille",
    excerpt: "J'ai fait le calcul avec le bonus de 20 %…",
  },
};
