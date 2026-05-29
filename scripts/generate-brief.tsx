import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToFile,
} from "@react-pdf/renderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LOGO = path.join(ROOT, "artifacts/ctl-promo-video/public/ctl-logo.png");
const OUT = path.join(ROOT, "exports/ctl-partner-brief.pdf");

const NAVY = "#0F2D5E";
const BLUE = "#1D4ED8";
const ACCENT = "#3B82F6";
const TEAL = "#0D9488";
const GOLD = "#D97706";
const INK = "#0F172A";
const BODY = "#334155";
const MUTED = "#64748B";
const LINE = "#E2E8F0";
const SOFT = "#F1F5F9";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", color: BODY, fontSize: 10, lineHeight: 1.5 },
  hero: { width: "100%" },
  body: { paddingHorizontal: 40, paddingTop: 24, paddingBottom: 44 },
  eyebrow: { fontFamily: "Helvetica-Bold", fontSize: 9, letterSpacing: 2, color: ACCENT },
  hook: { fontFamily: "Helvetica-Bold", fontSize: 19, color: INK, marginTop: 6, marginBottom: 10, lineHeight: 1.2 },
  lead: { fontSize: 10.5, color: BODY, lineHeight: 1.6 },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 13, color: NAVY, marginBottom: 10 },
  h2wrap: { marginTop: 17, marginBottom: 2, flexDirection: "row", alignItems: "center" },
  h2bar: { width: 4, height: 14, backgroundColor: BLUE, marginRight: 8, borderRadius: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  feat: { width: "50%", paddingRight: 16, marginBottom: 12, flexDirection: "row" },
  dot: { width: 7, height: 7, borderRadius: 2, marginTop: 3, marginRight: 8 },
  featTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.5, color: INK, marginBottom: 1 },
  featDesc: { fontSize: 9, color: MUTED, lineHeight: 1.45 },
  cards: { flexDirection: "row", marginTop: 4 },
  card: { flex: 1, backgroundColor: SOFT, borderRadius: 8, padding: 12, marginRight: 10, borderTopWidth: 3, borderTopColor: BLUE },
  cardTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.5, color: NAVY, marginBottom: 4 },
  cardDesc: { fontSize: 9, color: MUTED, lineHeight: 1.45 },
  stats: { flexDirection: "row", marginTop: 4 },
  stat: { flex: 1, alignItems: "center", paddingVertical: 12, marginRight: 10, borderWidth: 1, borderColor: LINE, borderRadius: 8 },
  statNum: { fontFamily: "Helvetica-Bold", fontSize: 20, color: BLUE },
  statLbl: { fontSize: 8.5, color: MUTED, marginTop: 3, textAlign: "center" },
  tierRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: LINE },
  tierName: { fontFamily: "Helvetica-Bold", fontSize: 10, color: INK },
  tierDesc: { fontSize: 9, color: MUTED, marginTop: 1 },
  tierPrice: { fontFamily: "Helvetica-Bold", fontSize: 10, color: TEAL, textAlign: "right" },
  oppItem: { flexDirection: "row", marginBottom: 9 },
  oppNum: { fontFamily: "Helvetica-Bold", fontSize: 10, color: "#FFFFFF", backgroundColor: NAVY, width: 18, height: 18, borderRadius: 9, textAlign: "center", paddingTop: 3, marginRight: 9 },
  oppTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.5, color: INK },
  oppDesc: { fontSize: 9, color: MUTED, lineHeight: 1.45 },
  cta: { marginTop: 14, backgroundColor: NAVY, borderRadius: 10, padding: 16 },
  ctaTitle: { fontFamily: "Helvetica-Bold", fontSize: 13, color: "#FFFFFF", marginBottom: 5 },
  ctaText: { fontSize: 9.5, color: "#CBD5E1", lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: LINE, paddingTop: 7 },
  footerTxt: { fontSize: 8, color: MUTED },
});

function Feature({ color, title, desc }: { color: string; title: string; desc: string }) {
  return (
    <View style={s.feat}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.featTitle}>{title}</Text>
        <Text style={s.featDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function H2({ children }: { children: string }) {
  return (
    <View style={s.h2wrap}>
      <View style={s.h2bar} />
      <Text style={s.h2}>{children}</Text>
    </View>
  );
}

function Footer({ page }: { page: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerTxt}>CTL · Car Technical Log — Partnership Brief</Text>
      <Text style={s.footerTxt}>{page}</Text>
    </View>
  );
}

const Brief = () => (
  <Document title="CTL — Partnership Brief" author="CTL · Car Technical Log">
    <Page size="A4" style={s.page}>
      <Image src={LOGO} style={s.hero} />
      <View style={s.body}>
        <Text style={s.eyebrow}>PARTNERSHIP BRIEF</Text>
        <Text style={s.hook}>Are you giving your car the attention it needs?</Text>
        <Text style={s.lead}>
          CTL (Car Technical Log) is a mobile app that turns scattered receipts, mental
          notes, and forgotten renewal dates into one organized digital record for every
          vehicle. From a single family car to an entire fleet, CTL keeps a complete,
          exportable service history — so nothing important is ever missed. The app is
          live on the App Store with full English and Arabic (RTL) support.
        </Text>

        <H2>What CTL does</H2>
        <View style={s.grid}>
          <Feature color={GOLD} title="Maintenance & service logging" desc="Repairs, oil changes and scheduled services with cost, mileage, shop details and next-due dates." />
          <Feature color="#DC2626" title="Technical fault log" desc="Log breakdowns and damage with a visual dashboard warning-light selector and message tracking." />
          <Feature color={TEAL} title="Renewal tracking" desc="License (registration) and insurance expiry, with quiet reminders 30, 7 and 1 day ahead." />
          <Feature color={BLUE} title="Fuel & cost analytics" desc="Track fill-ups, efficiency (L/100km or MPG) and total spend per vehicle." />
          <Feature color={ACCENT} title="Reports & export" desc="Generate full vehicle history as a clean PDF or CSV — ideal for resale or audits." />
          <Feature color={NAVY} title="Fleet management" desc="Unlimited vehicles under one dashboard, with a nearby service locator and document storage." />
        </View>

        <H2>Why it matters</H2>
        <Text style={s.lead}>
          Missed services and lapsed registrations cost money, reduce resale value, and
          create risk. CTL acts as the "central nervous system" for vehicle health —
          moving car upkeep from paper and memory to a structured, reminder-driven log
          that owners and managers actually keep up with.
        </Text>
      </View>
      <Footer page="1 / 2" />
    </Page>

    <Page size="A4" style={s.page}>
      <View style={[s.body, { paddingTop: 30 }]}>
        <H2>Who it's for</H2>
        <View style={s.cards}>
          <View style={[s.card, { borderTopColor: GOLD }]}>
            <Text style={s.cardTitle}>Car owners</Text>
            <Text style={s.cardDesc}>Enthusiasts and everyday drivers who want a flawless, complete service history for their vehicles.</Text>
          </View>
          <View style={[s.card, { borderTopColor: BLUE }]}>
            <Text style={s.cardTitle}>Fleets & businesses</Text>
            <Text style={s.cardDesc}>Owners and managers tracking many vehicles, due dates and costs from one dashboard.</Text>
          </View>
          <View style={[s.card, { borderTopColor: TEAL, marginRight: 0 }]}>
            <Text style={s.cardTitle}>Workshops & dealers</Text>
            <Text style={s.cardDesc}>Service providers who benefit from organized vehicle records and customer history.</Text>
          </View>
        </View>

        <H2>Where we are</H2>
        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statNum}>Live</Text><Text style={s.statLbl}>On the iOS App Store</Text></View>
          <View style={s.stat}><Text style={s.statNum}>100+</Text><Text style={s.statLbl}>Active users and growing</Text></View>
          <View style={[s.stat, { marginRight: 0 }]}><Text style={s.statNum}>EN / AR</Text><Text style={s.statLbl}>Full RTL localization</Text></View>
        </View>

        <H2>Business model</H2>
        <View style={s.tierRow}>
          <View style={{ flex: 1 }}><Text style={s.tierName}>Free</Text><Text style={s.tierDesc}>Up to 2 vehicles · core logging · reminders · nearby services</Text></View>
          <Text style={s.tierPrice}>$0</Text>
        </View>
        <View style={s.tierRow}>
          <View style={{ flex: 1 }}><Text style={s.tierName}>CTL Fleet (Premium)</Text><Text style={s.tierDesc}>Unlimited vehicles · fuel & cost analytics · PDF/CSV export · all tools</Text></View>
          <Text style={s.tierPrice}>~$2.99/mo · $19.99/yr · $24.99 lifetime</Text>
        </View>
        <View style={[s.tierRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}><Text style={s.tierName}>Enterprise</Text><Text style={s.tierDesc}>Multi-user access and centralized dashboards for dealerships & workshops</Text></View>
          <Text style={s.tierPrice}>Custom</Text>
        </View>
        <Text style={[s.featDesc, { marginTop: 5 }]}>Subscriptions handled in-app; pricing shown is representative and may vary by region.</Text>

        <H2>Partnership opportunities</H2>
        <View style={s.oppItem}>
          <Text style={s.oppNum}>1</Text>
          <View style={{ flex: 1 }}><Text style={s.oppTitle}>Distribution & bundling</Text><Text style={s.oppDesc}>Offer CTL to your customers — insurers, dealerships and auto retailers bundling vehicle care.</Text></View>
        </View>
        <View style={s.oppItem}>
          <Text style={s.oppNum}>2</Text>
          <View style={{ flex: 1 }}><Text style={s.oppTitle}>Fleet & workshop integration</Text><Text style={s.oppDesc}>White-label or co-branded fleet tracking and service-history tools for B2B clients.</Text></View>
        </View>
        <View style={s.oppItem}>
          <Text style={s.oppNum}>3</Text>
          <View style={{ flex: 1 }}><Text style={s.oppTitle}>Regional expansion</Text><Text style={s.oppDesc}>Native Arabic + RTL makes CTL ready to scale across MENA markets with local partners.</Text></View>
        </View>

        <View style={s.cta}>
          <Text style={s.ctaTitle}>Let's build vehicle care together.</Text>
          <Text style={s.ctaText}>We're open to distribution, integration and regional partnerships. Reach out to explore how CTL fits your customers and roadmap.</Text>
        </View>
      </View>
      <Footer page="2 / 2" />
    </Page>
  </Document>
);

await renderToFile(<Brief />, OUT);
console.log("PDF written to", OUT);
