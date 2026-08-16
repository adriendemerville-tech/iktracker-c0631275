import * as React from "npm:react@18.3.1";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";
import type { TemplateEntry } from "./registry.ts";

interface Props {
  userName?: string;
  periodLabel?: string;
  periodTripsCount?: number;
  periodDistanceKm?: number;
  periodIkAmount?: number;
  ytdLabel?: string;
  ytdTripsCount?: number;
  ytdDistanceKm?: number;
  ytdIkAmount?: number;
  periodReportUrl?: string;
  ytdReportUrl?: string;
  expiresLabel?: string;
}

const fmtNum = (n?: number, digits = 0) =>
  typeof n === "number"
    ? n.toLocaleString("fr-FR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : "—";

const fmtEuro = (n?: number) =>
  typeof n === "number"
    ? n.toLocaleString("fr-FR", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
      })
    : "—";

const Email = ({
  userName,
  periodLabel = "Période écoulée",
  periodTripsCount,
  periodDistanceKm,
  periodIkAmount,
  ytdLabel = "Cumul annuel",
  ytdTripsCount,
  ytdDistanceKm,
  ytdIkAmount,
  periodReportUrl,
  ytdReportUrl,
  expiresLabel = "7 jours",
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>
      Relevé kilométrique {periodLabel.toLowerCase()} — {fmtNum(periodDistanceKm, 1)} km
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Relevé kilométrique</Heading>
        <Text style={intro}>
          Bonjour,
          <br />
          Voici le relevé automatique de frais kilométriques
          {userName ? ` de ${userName}` : ""}, généré par IKtracker.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>{periodLabel}</Text>
          <table style={statsTable}>
            <tbody>
              <tr>
                <td style={statLabel}>Trajets</td>
                <td style={statValue}>{fmtNum(periodTripsCount)}</td>
              </tr>
              <tr>
                <td style={statLabel}>Distance</td>
                <td style={statValue}>{fmtNum(periodDistanceKm, 1)} km</td>
              </tr>
              <tr>
                <td style={statLabel}>Indemnité kilométrique</td>
                <td style={statValueStrong}>{fmtEuro(periodIkAmount)}</td>
              </tr>
            </tbody>
          </table>
          {periodReportUrl ? (
            <Button href={periodReportUrl} style={buttonPrimary}>
              Consulter le relevé
            </Button>
          ) : null}
        </Section>

        <Section style={cardAlt}>
          <Text style={cardTitle}>{ytdLabel}</Text>
          <table style={statsTable}>
            <tbody>
              <tr>
                <td style={statLabel}>Trajets</td>
                <td style={statValue}>{fmtNum(ytdTripsCount)}</td>
              </tr>
              <tr>
                <td style={statLabel}>Distance</td>
                <td style={statValue}>{fmtNum(ytdDistanceKm, 1)} km</td>
              </tr>
              <tr>
                <td style={statLabel}>Indemnité kilométrique</td>
                <td style={statValueStrong}>{fmtEuro(ytdIkAmount)}</td>
              </tr>
            </tbody>
          </table>
          {ytdReportUrl ? (
            <Button href={ytdReportUrl} style={buttonSecondary}>
              Consulter le cumul annuel
            </Button>
          ) : null}
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Les liens ci-dessus sont sécurisés et expirent dans {expiresLabel}. Ce relevé est basé sur
          les trajets enregistrés dans IKtracker et calculé selon le barème officiel de
          l'administration fiscale.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Props) => `Relevé kilométrique — ${data?.periodLabel ?? "Période écoulée"}`,
  displayName: "Relevé automatique au comptable",
  previewData: {
    userName: "Adrien de Volontat",
    periodLabel: "Novembre 2026",
    periodTripsCount: 42,
    periodDistanceKm: 638.4,
    periodIkAmount: 312.5,
    ytdLabel: "Cumul 2026",
    ytdTripsCount: 412,
    ytdDistanceKm: 6820.2,
    ytdIkAmount: 3421.9,
    periodReportUrl: "https://iktracker.fr",
    ytdReportUrl: "https://iktracker.fr",
    expiresLabel: "7 jours",
  },
} satisfies TemplateEntry;

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  color: "#1a1a1a",
};
const container = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "32px 24px",
};
const h1 = {
  fontSize: "22px",
  fontWeight: "600",
  color: "#0f172a",
  margin: "0 0 16px",
};
const intro = { fontSize: "15px", lineHeight: "1.6", margin: "0 0 24px" };
const card = {
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "20px",
  margin: "0 0 16px",
  backgroundColor: "#fafaf7",
};
const cardAlt = { ...card, backgroundColor: "#f5f3ff" };
const cardTitle = {
  fontSize: "13px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  color: "#6b7280",
  margin: "0 0 12px",
  fontWeight: "600",
};
const statsTable = {
  width: "100%",
  borderCollapse: "collapse" as const,
  margin: "0 0 16px",
};
const statLabel = {
  fontSize: "14px",
  color: "#4b5563",
  padding: "6px 0",
};
const statValue = {
  fontSize: "14px",
  color: "#111827",
  padding: "6px 0",
  textAlign: "right" as const,
  fontVariantNumeric: "tabular-nums" as const,
};
const statValueStrong = {
  ...statValue,
  fontWeight: "700",
  color: "#4f46e5",
};
const buttonPrimary = {
  backgroundColor: "#4f46e5",
  color: "#ffffff",
  padding: "11px 20px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  display: "inline-block",
};
const buttonSecondary = {
  ...buttonPrimary,
  backgroundColor: "#0f172a",
};
const hr = { borderColor: "#e5e7eb", margin: "24px 0" };
const footer = { fontSize: "12px", color: "#6b7280", lineHeight: "1.5" };
