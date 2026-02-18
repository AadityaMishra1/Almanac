import { LegalPageLayout } from "@/components/legal-page-layout";

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="February 16, 2026">
      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Introduction
        </h2>
        <p>
          Welcome to Almanac. We&apos;re an AI-powered calendar app designed to help
          college students manage their academic schedules. This Privacy Policy
          explains how we collect, use, protect, and share your information when
          you use our service.
        </p>
        <p className="mt-4">
          By using Almanac, you agree to the collection and use of information
          in accordance with this policy. We take your privacy seriously and are
          committed to transparency about our data practices.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Information We Collect
        </h2>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Google Account Information
        </h3>
        <p>When you sign in with Google, we collect:</p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>Your email address</li>
          <li>Your name</li>
          <li>Your profile picture</li>
          <li>
            Google OAuth tokens (access and refresh tokens) to authenticate your
            account
          </li>
        </ul>
        <p className="mt-4">
          We request the following Google API scopes:
          <code className="px-2 py-1 bg-[var(--surface-secondary)] rounded text-sm ml-2">
            openid email profile calendar.events
          </code>
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Google Calendar Data
        </h3>
        <p>
          With your explicit permission, we access your Google Calendar to:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>Read existing calendar events</li>
          <li>
            Create new events based on deadlines extracted from your syllabi
          </li>
          <li>Sync changes between Almanac and your Google Calendar</li>
        </ul>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Syllabus and Course Data
        </h3>
        <p>When you upload a syllabus PDF, we collect:</p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>The PDF file you upload</li>
          <li>
            Text content extracted from the PDF for processing (course name,
            deadlines, assignments, exam dates)
          </li>
          <li>Events and courses you create or modify through the app</li>
        </ul>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Chat and Interaction Data
        </h3>
        <p>When you use our AI chat assistant, we collect:</p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>Your queries and messages to the AI assistant</li>
          <li>Actions you take through the chat (creating, editing, deleting events)</li>
          <li>Usage patterns to improve the service</li>
        </ul>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Automatically Collected Information
        </h3>
        <p>We automatically collect:</p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>Browser type and version</li>
          <li>Device information</li>
          <li>Timestamps of your interactions</li>
          <li>Session data managed by NextAuth</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          How We Use Your Information
        </h2>
        <p>We use the information we collect to:</p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>
            <strong>Authenticate your account</strong> - Verify your identity
            and maintain secure sessions
          </li>
          <li>
            <strong>Extract academic deadlines</strong> - Use AI to parse your
            syllabus PDFs and identify important dates
          </li>
          <li>
            <strong>Sync with Google Calendar</strong> - Create, update, and
            delete events in your Google Calendar
          </li>
          <li>
            <strong>Provide AI assistance</strong> - Answer questions and help
            you manage events through natural language
          </li>
          <li>
            <strong>Improve our service</strong> - Analyze usage patterns to fix
            bugs and add features
          </li>
          <li>
            <strong>Communicate with you</strong> - Send service-related
            notifications and respond to support requests
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Data Sharing and Third-Party Services
        </h2>
        <p className="font-semibold text-[var(--brand-600)]">
          We never sell your personal data to third parties.
        </p>
        <p className="mt-4">
          However, we share your data with the following service providers to
          operate Almanac:
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Google APIs
        </h3>
        <p>
          We use Google OAuth for authentication and Google Calendar API for
          calendar synchronization. Your use of these services is governed by{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--brand-600)] hover:underline"
          >
            Google&apos;s Privacy Policy
          </a>
          .
        </p>
        <p className="mt-4">
          Almanac&apos;s use and transfer of information received from Google APIs
          adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--brand-600)] hover:underline"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Google Gemini AI
        </h3>
        <p className="font-semibold">
          Important: When you upload a syllabus PDF, the text content is sent to
          Google&apos;s Gemini AI for processing.
        </p>
        <p className="mt-2">
          We use Gemini Vision API to extract course information, deadlines, and
          assignments from your syllabi. This data is processed by Google&apos;s AI
          infrastructure. For more information, see{" "}
          <a
            href="https://ai.google.dev/gemini-api/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--brand-600)] hover:underline"
          >
            Gemini API Terms of Service
          </a>
          .
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Groq AI
        </h3>
        <p className="font-semibold">
          Important: Chat queries you send to our AI assistant are processed by
          Groq&apos;s infrastructure.
        </p>
        <p className="mt-2">
          We use Groq&apos;s API with the Llama 3.3 model to power our chat
          assistant. Your queries and calendar data may be sent to Groq for
          processing natural language requests. For more information, see{" "}
          <a
            href="https://groq.com/privacy-policy/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--brand-600)] hover:underline"
          >
            Groq Privacy Policy
          </a>
          .
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Supabase (Database Hosting)
        </h3>
        <p>
          We use Supabase to host our PostgreSQL database. Your account
          information, events, and courses are stored on Supabase&apos;s secure
          infrastructure. Data is encrypted in transit and at rest. See{" "}
          <a
            href="https://supabase.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--brand-600)] hover:underline"
          >
            Supabase Privacy Policy
          </a>
          .
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Vercel (Application Hosting)
        </h3>
        <p>
          Our application is hosted on Vercel&apos;s platform. Vercel may collect
          anonymous analytics and performance data. See{" "}
          <a
            href="https://vercel.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--brand-600)] hover:underline"
          >
            Vercel Privacy Policy
          </a>
          .
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Legal Requirements
        </h3>
        <p>
          We may disclose your information if required by law, court order, or
          government regulation, or if we believe disclosure is necessary to:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>Comply with legal obligations</li>
          <li>Protect our rights or property</li>
          <li>Prevent fraud or abuse</li>
          <li>Protect the safety of users or the public</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Data Retention
        </h2>
        <p>We retain your data as follows:</p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>
            <strong>Account data</strong> - Stored until you delete your account
          </li>
          <li>
            <strong>Events and courses</strong> - Stored until you delete them
            or delete your account
          </li>
          <li>
            <strong>OAuth tokens</strong> - Refreshed automatically and stored
            until you revoke access or delete your account
          </li>
          <li>
            <strong>Uploaded PDFs</strong> - Processed in memory and not stored
            permanently (only extracted event data is saved)
          </li>
          <li>
            <strong>Chat history</strong> - Not permanently stored; processed
            in real-time
          </li>
        </ul>
        <p className="mt-4">
          When you delete your account, all associated data is permanently
          removed from our database within 30 days.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Your Rights (GDPR & CCPA)
        </h2>
        <p>You have the following rights regarding your personal data:</p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Right to Access
        </h3>
        <p>
          You can view all your data within the app (events, courses, profile).
          You can also request a complete export of your data by visiting the
          Settings page.
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Right to Deletion
        </h3>
        <p>
          You can delete your account and all associated data at any time
          through the Settings page. This action is permanent and cannot be
          undone.
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Right to Export (Data Portability)
        </h3>
        <p>
          You can export your data as a JSON file from the Settings page. This
          includes your profile, events, and courses.
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Right to Opt-Out (CCPA)
        </h3>
        <p>
          California residents have the right to opt-out of the &quot;sale&quot; of
          personal information. We do not sell your personal information.
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Right to Rectification
        </h3>
        <p>
          You can edit your events, courses, and profile information at any time
          through the app interface.
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          How to Exercise Your Rights
        </h3>
        <p>
          To exercise any of these rights or if you have privacy concerns,
          contact us at:{" "}
          <a
            href="mailto:almanac123@googlegroups.com"
            className="text-[var(--brand-600)] hover:underline"
          >
            almanac123@googlegroups.com
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Security Measures
        </h2>
        <p>We protect your data through:</p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>
            <strong>Encrypted connections</strong> - All data transmitted over
            HTTPS
          </li>
          <li>
            <strong>Secure authentication</strong> - OAuth 2.0 tokens managed by
            NextAuth
          </li>
          <li>
            <strong>User-scoped data</strong> - All database queries are scoped
            by user ID to prevent unauthorized access
          </li>
          <li>
            <strong>Token encryption</strong> - OAuth tokens are encrypted
            before storage
          </li>
          <li>
            <strong>Regular security updates</strong> - We keep dependencies and
            infrastructure up to date
          </li>
        </ul>
        <p className="mt-4">
          However, no method of transmission over the internet is 100% secure.
          While we strive to protect your data, we cannot guarantee absolute
          security.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Children&apos;s Privacy
        </h2>
        <p>
          Almanac is designed for college students aged 18 and older. We do not
          knowingly collect personal information from anyone under 18. If you
          are under 18, please do not use this service.
        </p>
        <p className="mt-4">
          If we discover that we have collected personal information from a
          child under 18, we will delete that information immediately. If you
          believe we have collected information from a minor, please contact us
          at{" "}
          <a
            href="mailto:almanac123@googlegroups.com"
            className="text-[var(--brand-600)] hover:underline"
          >
            almanac123@googlegroups.com
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          International Data Transfers
        </h2>
        <p>
          Your data may be transferred to and processed in countries other than
          your country of residence. These countries may have different data
          protection laws.
        </p>
        <p className="mt-4">
          By using Almanac, you consent to the transfer of your data to:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>United States (Vercel, Supabase, Google, Groq)</li>
          <li>
            Other countries where our service providers operate their
            infrastructure
          </li>
        </ul>
        <p className="mt-4">
          We ensure that such transfers comply with applicable data protection
          laws and use appropriate safeguards.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Changes to This Privacy Policy
        </h2>
        <p>
          We may update this Privacy Policy from time to time. When we make
          changes, we will:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>Update the &quot;Last updated&quot; date at the top of this page</li>
          <li>
            Notify you via email for material changes (if you have provided an
            email address)
          </li>
          <li>
            Display a notice in the app for significant changes that affect your
            rights
          </li>
        </ul>
        <p className="mt-4">
          Your continued use of Almanac after changes become effective
          constitutes acceptance of the updated Privacy Policy. If you do not
          agree with the changes, please stop using the service and delete your
          account.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Cookie Policy
        </h2>
        <p>
          Almanac uses minimal cookies for essential functionality only. We use
          NextAuth session cookies to maintain your login state. These cookies
          are:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>
            <strong>Strictly necessary</strong> - Required for authentication
          </li>
          <li>
            <strong>Secure</strong> - Transmitted only over HTTPS
          </li>
          <li>
            <strong>HttpOnly</strong> - Not accessible via JavaScript
          </li>
          <li>
            <strong>Session-based</strong> - Expire when you close your browser
            or log out
          </li>
        </ul>
        <p className="mt-4">
          We do not use tracking cookies, advertising cookies, or third-party
          analytics cookies.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Contact Us
        </h2>
        <p>
          If you have questions, concerns, or requests regarding this Privacy
          Policy or our data practices, please contact us:
        </p>
        <div className="mt-4 p-4 bg-[var(--surface-secondary)] rounded-lg border border-[var(--border)]">
          <p>
            <strong>Email:</strong>{" "}
            <a
              href="mailto:almanac123@googlegroups.com"
              className="text-[var(--brand-600)] hover:underline"
            >
              almanac123@googlegroups.com
            </a>
          </p>
          <p className="mt-2">
            <strong>Response time:</strong> We aim to respond to all privacy
            inquiries within 7 business days.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Your Consent
        </h2>
        <p>
          By using Almanac, you acknowledge that you have read and understood
          this Privacy Policy and agree to its terms. You consent to our
          collection, use, and sharing of your information as described in this
          policy.
        </p>
        <p className="mt-4">
          If you do not agree with this policy, please do not use Almanac and
          delete your account if you have already created one.
        </p>
      </section>
    </LegalPageLayout>
  );
}
