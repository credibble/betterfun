import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | BetterFun" },
      {
        name: "description",
        content:
          "How BetterFun collects, uses, and protects your personal data across our prediction markets, trader profiles, and copy-trading features.",
      },
      { property: "og:title", content: "Privacy Policy | BetterFun" },
      {
        property: "og:description",
        content: "How BetterFun collects, uses, and protects your data.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PrivacyPage,
});

const sections: LegalSection[] = [
  {
    heading: "Overview",
    body: (
      <p>
        This Privacy Policy explains what information BetterFun collects, how we use it, and the
        choices you have. We aim to collect only what we need to run the platform and to keep
        your information secure.
      </p>
    ),
  },
  {
    heading: "Information we collect",
    body: (
      <>
        <p>We may collect the following categories of information:</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Account details such as your handle, email, and profile information.</li>
          <li>Activity data including trades, stakes, streams, and chat messages.</li>
          <li>Technical data such as device, browser, and approximate location.</li>
          <li>Communications you send to our support team.</li>
        </ul>
      </>
    ),
  },
  {
    heading: "How we use your information",
    body: (
      <p>
        We use your information to operate and improve the platform, calculate performance and
        reputation, personalize your experience, provide support, prevent fraud and abuse, and
        comply with legal obligations.
      </p>
    ),
  },
  {
    heading: "Public trader information",
    body: (
      <p>
        If you participate as a trader, certain information — such as your handle, PnL,
        reputation, followers, and public streams or chat — is visible to other users. Do not
        share anything in public areas that you consider private.
      </p>
    ),
  },
  {
    heading: "Sharing your information",
    body: (
      <p>
        We do not sell your personal data. We may share information with service providers who
        help us run the platform, with authorities where required by law, and in connection with
        a business transfer. These parties are bound to protect your data.
      </p>
    ),
  },
  {
    heading: "Cookies and analytics",
    body: (
      <p>
        We use cookies and similar technologies to keep you signed in, remember preferences, and
        understand how the platform is used. You can control cookies through your browser
        settings, though some features may not work without them.
      </p>
    ),
  },
  {
    heading: "Data retention",
    body: (
      <p>
        We retain your information for as long as your account is active or as needed to provide
        the service, resolve disputes, and meet legal requirements. When no longer needed, we
        delete or anonymize it.
      </p>
    ),
  },
  {
    heading: "Your rights",
    body: (
      <p>
        Depending on where you live, you may have rights to access, correct, delete, or export
        your personal data, and to object to certain processing. You can exercise these rights by
        contacting us through the Help Center.
      </p>
    ),
  },
  {
    heading: "Security",
    body: (
      <p>
        We use technical and organizational measures to protect your information. No system is
        completely secure, so we cannot guarantee absolute security, but we work continuously to
        safeguard your data.
      </p>
    ),
  },
  {
    heading: "Contact",
    body: (
      <p>
        For questions about this policy or your data, reach our team through the Help Center. This
        is a demo experience and no real personal data is processed.
      </p>
    ),
  },
];

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="July 13, 2026"
      intro="Your privacy matters. This policy describes how BetterFun collects, uses, and protects your information when you use our prediction markets and trader features."
      sections={sections}
    />
  );
}
