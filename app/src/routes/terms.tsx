import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use | BetterFun" },
      {
        name: "description",
        content:
          "The terms and conditions governing your use of BetterFun's prediction markets, trader program, and copy-trading features.",
      },
      { property: "og:title", content: "Terms of Use | BetterFun" },
      {
        property: "og:description",
        content: "The rules governing your use of the BetterFun platform.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: TermsPage,
});

const sections: LegalSection[] = [
  {
    heading: "Acceptance of terms",
    body: (
      <p>
        By accessing or using BetterFun you agree to be bound by these Terms of Use and all
        policies referenced here. If you do not agree, do not use the platform. We may update
        these terms from time to time, and continued use after changes means you accept the
        revised terms.
      </p>
    ),
  },
  {
    heading: "Eligibility",
    body: (
      <p>
        You must be at least 18 years old and legally permitted to use prediction markets in
        your jurisdiction. You are responsible for ensuring your use of BetterFun complies with
        the laws that apply to you. Access may be restricted in certain regions.
      </p>
    ),
  },
  {
    heading: "Accounts and security",
    body: (
      <p>
        You are responsible for safeguarding your account credentials and for all activity that
        occurs under your account. Notify us immediately of any unauthorized access. We are not
        liable for losses arising from your failure to protect your account.
      </p>
    ),
  },
  {
    heading: "Trading and market risk",
    body: (
      <>
        <p>
          Prediction markets and trading involve substantial risk of loss and are not suitable
          for everyone. Prices can move quickly and you may lose the full value of any position.
        </p>
        <p>
          Nothing on BetterFun constitutes financial, investment, or legal advice. You are
          solely responsible for your own decisions.
        </p>
      </>
    ),
  },
  {
    heading: "Traders and copy-trading",
    body: (
      <>
        <p>
          Traders who broadcast or publish positions do not guarantee results. Past performance,
          reputation scores, and PnL figures are informational and do not predict future
          outcomes.
        </p>
        <p>
          When you stake to copy a trader, you accept the risk of that trader's strategy. You
          may unstake according to the rules shown at the time of staking.
        </p>
      </>
    ),
  },
  {
    heading: "Prohibited conduct",
    body: (
      <p>
        You agree not to manipulate markets, use bots to gain unfair advantage, misrepresent
        your identity or performance, infringe others' rights, or use the platform for any
        unlawful purpose. We may suspend or terminate accounts that violate these terms.
      </p>
    ),
  },
  {
    heading: "Intellectual property",
    body: (
      <p>
        All content, branding, and software on BetterFun are owned by us or our licensors and
        are protected by intellectual property laws. You may not copy, modify, or redistribute
        any part of the platform without permission.
      </p>
    ),
  },
  {
    heading: "Limitation of liability",
    body: (
      <p>
        To the maximum extent permitted by law, BetterFun and its affiliates are not liable for
        any indirect, incidental, or consequential damages, or for any loss of profits or funds,
        arising from your use of the platform. The platform is provided "as is" without
        warranties of any kind.
      </p>
    ),
  },
  {
    heading: "Contact",
    body: (
      <p>
        Questions about these terms can be sent to our support team through the Help Center. This
        is a demo experience and no real transactions are processed.
      </p>
    ),
  },
];

function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      updated="July 13, 2026"
      intro="These terms govern your access to and use of BetterFun, including our prediction markets, trader program, and copy-trading features. Please read them carefully."
      sections={sections}
    />
  );
}
