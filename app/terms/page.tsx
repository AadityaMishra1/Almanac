import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal-page-layout";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="February 16, 2026">
      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Acceptance of Terms
        </h2>
        <p>
          Welcome to Almanac. By accessing or using our service, you agree to be
          bound by these Terms of Service (&quot;Terms&quot;). If you do not
          agree to these Terms, you may not use Almanac.
        </p>
        <p className="mt-4">
          These Terms constitute a legally binding agreement between you and
          Almanac. Please read them carefully before using our service.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Eligibility
        </h2>
        <p>To use Almanac, you must:</p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>Be at least 18 years old</li>
          <li>
            Be a college or university student, or use the service for academic
            purposes
          </li>
          <li>Have a valid Google account for authentication</li>
          <li>
            Agree to comply with all applicable laws and regulations in your
            jurisdiction
          </li>
        </ul>
        <p className="mt-4">
          By using Almanac, you represent and warrant that you meet these
          eligibility requirements.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Description of Service
        </h2>
        <p>
          Almanac is an AI-powered calendar application that helps students
          manage their academic schedules. Our service includes:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>
            <strong>Syllabus parsing</strong> - Upload course syllabi (PDFs) and
            extract deadlines, assignments, and exam dates automatically using
            AI
          </li>
          <li>
            <strong>Calendar management</strong> - Create, edit, and delete
            academic events
          </li>
          <li>
            <strong>Google Calendar integration</strong> - Two-way sync between
            Almanac and your Google Calendar
          </li>
          <li>
            <strong>AI chat assistant</strong> - Natural language interface to
            manage events and get study recommendations
          </li>
        </ul>
        <p className="mt-4 font-semibold text-[var(--brand-600)]">
          Important: Almanac uses AI technology, which may make mistakes. Always
          verify extracted dates and events for accuracy.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          User Accounts
        </h2>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Account Creation
        </h3>
        <p>
          You create an account by signing in with your Google account. You are
          responsible for:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>Maintaining the security of your Google account</li>
          <li>All activities that occur under your account</li>
          <li>
            Notifying us immediately of any unauthorized use of your account
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Account Restrictions
        </h3>
        <p>You agree to:</p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>Maintain one account per Google account</li>
          <li>Not share your account with others</li>
          <li>Not create accounts for fraudulent or illegal purposes</li>
          <li>Not impersonate others or misrepresent your identity</li>
        </ul>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Account Deletion
        </h3>
        <p>
          You may delete your account at any time through the Settings page.
          Account deletion is permanent and will result in the loss of all your
          data (events, courses, calendar history). We cannot recover deleted
          accounts or data.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Acceptable Use Policy
        </h2>
        <p>
          You agree to use Almanac only for lawful purposes and in accordance
          with these Terms. You agree NOT to:
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Prohibited Activities
        </h3>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>
            <strong>Abuse or harassment</strong> - Use the service to harass,
            abuse, or harm others
          </li>
          <li>
            <strong>Spam or unsolicited content</strong> - Send spam or
            unsolicited messages through our service
          </li>
          <li>
            <strong>Unauthorized access</strong> - Attempt to access accounts,
            data, or systems you&apos;re not authorized to access
          </li>
          <li>
            <strong>Security circumvention</strong> - Bypass, disable, or
            interfere with security features
          </li>
          <li>
            <strong>Malicious uploads</strong> - Upload files containing
            viruses, malware, or other harmful code
          </li>
          <li>
            <strong>Scraping or automation</strong> - Use bots, scrapers, or
            automated tools without permission
          </li>
          <li>
            <strong>Reverse engineering</strong> - Decompile, disassemble, or
            reverse engineer the service
          </li>
          <li>
            <strong>Copyright infringement</strong> - Upload syllabi or content
            you don&apos;t have permission to share
          </li>
          <li>
            <strong>Resource abuse</strong> - Overload our systems or interfere
            with other users&apos; access
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Content Guidelines
        </h3>
        <p>When uploading syllabi or creating events, you agree to:</p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>Only upload syllabi you have the right to use</li>
          <li>
            Not upload content that violates copyright or intellectual property
            laws
          </li>
          <li>
            Not upload content containing personal information of others without
            consent
          </li>
          <li>Not upload inappropriate, offensive, or illegal content</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          License and Permissions
        </h2>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          License to Use Almanac
        </h3>
        <p>
          We grant you a limited, non-exclusive, non-transferable, revocable
          license to use Almanac for your personal academic purposes, subject to
          these Terms.
        </p>
        <p className="mt-4">This license is:</p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>
            <strong>Personal use only</strong> - Not for commercial or
            organizational use
          </li>
          <li>
            <strong>Non-transferable</strong> - You cannot transfer or assign
            your rights to others
          </li>
          <li>
            <strong>Revocable</strong> - We may terminate your access if you
            violate these Terms
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          License You Grant to Us
        </h3>
        <p>
          By uploading syllabi or creating content in Almanac, you grant us a
          limited license to:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>Process your syllabi using AI to extract event information</li>
          <li>Store your events and course data in our database</li>
          <li>Sync your events to Google Calendar on your behalf</li>
          <li>Process your chat queries to provide AI assistance</li>
        </ul>
        <p className="mt-4">
          This license is solely for the purpose of providing and improving our
          service. We do not claim ownership of your content.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Intellectual Property Rights
        </h2>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Our Property
        </h3>
        <p>
          Almanac and its contents are protected by intellectual property laws.
          We own all rights to:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>The Almanac application, website, and user interface</li>
          <li>Almanac branding, logos, and design elements</li>
          <li>Source code, algorithms, and technical implementations</li>
          <li>Documentation and support materials</li>
        </ul>
        <p className="mt-4">
          You may not copy, modify, distribute, sell, or create derivative works
          based on Almanac without our express written permission.
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Your Content
        </h3>
        <p>
          You retain ownership of the syllabi and content you upload. However,
          you are responsible for ensuring you have the right to upload and
          share that content.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Third-Party Services
        </h2>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Google Calendar Integration
        </h3>
        <p>
          Almanac integrates with Google Calendar through the Google Calendar
          API. Your use of Google services is governed by{" "}
          <a
            href="https://policies.google.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--brand-600)] hover:underline"
          >
            Google&apos;s Terms of Service
          </a>{" "}
          and{" "}
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
          We are not responsible for Google service outages, API changes, or
          issues with your Google account. You are responsible for maintaining
          your Google account in good standing.
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          AI Services
        </h3>
        <p>
          We use third-party AI services (Google Gemini, Groq) to process your
          syllabi and chat queries. These services may have their own terms and
          privacy policies. We are not responsible for the accuracy,
          reliability, or availability of these third-party AI services.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Disclaimers and Limitations
        </h2>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Service Provided &quot;AS IS&quot;
        </h3>
        <p className="font-semibold text-[var(--brand-600)]">
          Almanac is provided &quot;as is&quot; and &quot;as available&quot;
          without warranties of any kind, either express or implied.
        </p>
        <p className="mt-4">We specifically disclaim warranties regarding:</p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>
            <strong>Accuracy</strong> - AI-extracted events may contain errors
          </li>
          <li>
            <strong>Completeness</strong> - Not all syllabus information may be
            extracted
          </li>
          <li>
            <strong>Reliability</strong> - The service may experience downtime
            or interruptions
          </li>
          <li>
            <strong>Availability</strong> - We do not guarantee 24/7 uptime
          </li>
          <li>
            <strong>Security</strong> - No system is 100% secure from breaches
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Your Responsibility
        </h3>
        <p className="font-semibold">
          You are solely responsible for verifying the accuracy of extracted
          events and meeting your academic deadlines.
        </p>
        <p className="mt-4">Almanac is a tool to assist you, but:</p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>
            AI parsing may miss deadlines or extract incorrect dates - always
            verify against the original syllabus
          </li>
          <li>
            Technical issues may prevent calendar sync - check your Google
            Calendar regularly
          </li>
          <li>
            You should maintain backup copies of important syllabi and deadlines
          </li>
          <li>
            We are not responsible for missed assignments, exams, or other
            academic deadlines
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Limitation of Liability
        </h2>
        <p>
          To the maximum extent permitted by law, Almanac and its creators shall
          not be liable for:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>
            <strong>Indirect or consequential damages</strong> - Including lost
            grades, academic penalties, or missed opportunities
          </li>
          <li>
            <strong>Data loss</strong> - Loss of events, syllabi, or other
            content
          </li>
          <li>
            <strong>Service interruptions</strong> - Downtime, errors, or
            unavailability
          </li>
          <li>
            <strong>Third-party actions</strong> - Actions or failures of
            Google, AI providers, or other third parties
          </li>
          <li>
            <strong>Unauthorized access</strong> - Security breaches or
            unauthorized account access
          </li>
        </ul>
        <p className="mt-4">
          In any case, our total liability shall not exceed the greater of (a)
          $100 USD or (b) the amount you paid for the service in the past 12
          months (currently $0, as Almanac is free).
        </p>
        <p className="mt-4">
          Some jurisdictions do not allow limitations on implied warranties or
          limitation of liability for incidental damages. In such jurisdictions,
          our liability is limited to the maximum extent permitted by law.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Indemnification
        </h2>
        <p>
          You agree to indemnify, defend, and hold harmless Almanac and its
          creators from any claims, damages, losses, liabilities, and expenses
          (including legal fees) arising from:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>Your use or misuse of the service</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of any laws or regulations</li>
          <li>Content you upload or create in the service</li>
          <li>
            Your violation of third-party rights (copyright, privacy, etc.)
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Termination
        </h2>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Termination by You
        </h3>
        <p>
          You may terminate your account at any time by deleting your account
          through the Settings page. Upon termination:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>Your license to use Almanac ends immediately</li>
          <li>All your data (events, courses) will be permanently deleted</li>
          <li>You will be signed out and cannot access the service</li>
          <li>Any pending calendar syncs will be cancelled</li>
        </ul>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Termination by Us
        </h3>
        <p>We reserve the right to suspend or terminate your account if you:</p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>Violate these Terms</li>
          <li>Engage in prohibited activities</li>
          <li>Abuse the service or harm other users</li>
          <li>Use the service for illegal purposes</li>
          <li>Fail to respond to our communications regarding violations</li>
        </ul>
        <p className="mt-4">
          We will make reasonable efforts to notify you before terminating your
          account, but we reserve the right to terminate immediately for serious
          violations.
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Effect of Termination
        </h3>
        <p>
          Upon termination by either party, all provisions of these Terms that
          should reasonably survive termination will continue to apply,
          including intellectual property rights, disclaimers, limitations of
          liability, and indemnification.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Modifications to Service and Terms
        </h2>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Service Changes
        </h3>
        <p>
          We reserve the right to modify, suspend, or discontinue any part of
          Almanac at any time, with or without notice. We are not liable for any
          modification, suspension, or discontinuation of the service.
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Changes to Terms
        </h3>
        <p>We may update these Terms from time to time. When we do, we will:</p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>
            Update the &quot;Last updated&quot; date at the top of this page
          </li>
          <li>
            Notify you via email or in-app notification for material changes
          </li>
          <li>Provide a reasonable notice period before changes take effect</li>
        </ul>
        <p className="mt-4">
          Your continued use of Almanac after changes become effective
          constitutes acceptance of the updated Terms. If you do not agree with
          the changes, you must stop using the service and delete your account.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Governing Law and Dispute Resolution
        </h2>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Governing Law
        </h3>
        <p>
          These Terms are governed by the laws of the State of California,
          United States, without regard to conflict of law principles.
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Dispute Resolution
        </h3>
        <p>
          If you have a dispute with Almanac, you agree to first contact us at{" "}
          <a
            href="mailto:almanac123@googlegroups.com"
            className="text-[var(--brand-600)] hover:underline"
          >
            almanac123@googlegroups.com
          </a>{" "}
          to attempt to resolve the dispute informally.
        </p>
        <p className="mt-4">
          If we cannot resolve the dispute informally within 30 days, any legal
          action or proceeding arising from these Terms shall be brought
          exclusively in the state or federal courts located in California, and
          you consent to the jurisdiction of such courts.
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Class Action Waiver
        </h3>
        <p>
          You agree that any dispute resolution proceedings will be conducted
          only on an individual basis and not in a class, consolidated, or
          representative action.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Miscellaneous
        </h2>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Entire Agreement
        </h3>
        <p>
          These Terms, together with our Privacy Policy, constitute the entire
          agreement between you and Almanac regarding the service.
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Severability
        </h3>
        <p>
          If any provision of these Terms is found to be invalid or
          unenforceable, the remaining provisions will remain in full force and
          effect.
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Waiver
        </h3>
        <p>
          Our failure to enforce any provision of these Terms does not
          constitute a waiver of that provision or any other provision.
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          Assignment
        </h3>
        <p>
          You may not assign or transfer these Terms or your account without our
          written consent. We may assign these Terms without restriction.
        </p>

        <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">
          No Agency
        </h3>
        <p>
          Nothing in these Terms creates a partnership, joint venture,
          employment, or agency relationship between you and Almanac.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Contact Information
        </h2>
        <p>
          If you have questions about these Terms or need to contact us for
          legal matters, please reach out:
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
            <strong>Response time:</strong> We aim to respond to all inquiries
            within 7 business days.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Acknowledgment
        </h2>
        <p>By using Almanac, you acknowledge that:</p>
        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>You have read and understood these Terms of Service</li>
          <li>You agree to be bound by these Terms</li>
          <li>
            You understand that AI parsing may make mistakes and you are
            responsible for verifying extracted information
          </li>
          <li>
            You are responsible for meeting your academic deadlines and
            commitments
          </li>
          <li>You accept the risks and limitations described in these Terms</li>
        </ul>
        <p className="mt-4">
          Thank you for using Almanac! We hope our service helps you stay
          organized and succeed academically.
        </p>
      </section>
    </LegalPageLayout>
  );
}
