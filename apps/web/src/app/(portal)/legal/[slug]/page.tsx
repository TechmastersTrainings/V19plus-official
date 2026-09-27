import React from 'react';

export function generateStaticParams() {
  return [
    { slug: 'privacy' },
    { slug: 'terms' },
    { slug: 'refund' },
    { slug: 'cookies' },
    { slug: 'delete-account' },
  ];
}

export default function LegalPage({ params }: { params: { slug: string } }) {
  const titles: Record<string, string> = {
    terms: 'Terms and Conditions',
    privacy: 'Privacy Policy',
    refund: 'Refund Policy',
    cookies: 'Cookie Policy',
    'delete-account': 'Account Deletion Request',
  };

  const title = titles[params.slug] || 'Legal Document';
  const slug = params.slug;

  const renderContent = () => {
    switch (slug) {
      case 'delete-account':
        return (
          <>
            <p className="mb-6 leading-relaxed">
              At <strong>V19Plus</strong>, we value your privacy and give you full control over your personal data. You can request the deletion of your account and all associated data at any time.
            </p>
            <h2 className="text-xl font-bold text-white mb-4 mt-6">How to Request Deletion:</h2>
            <ol className="list-decimal list-inside space-y-3 mb-6">
              <li>Send an email to our support team at <a href="mailto:support@v19plus.app" className="text-n-red hover:underline font-semibold">support@v19plus.app</a>.</li>
              <li>Use the subject line: <strong>"Account Deletion Request - V19Plus"</strong>.</li>
              <li>Provide your registered account email address.</li>
            </ol>
            <h2 className="text-xl font-bold text-white mb-4 mt-6">Data Deletion Details:</h2>
            <ul className="list-disc list-inside space-y-2 mb-6">
              <li><strong>What is deleted:</strong> Your email address, profile names, watchlist items, watch history logs, and subscription metadata will be permanently deleted from our active database.</li>
              <li><strong>Retention period:</strong> Upon receiving your request, our support team will verify your identity and process the deletion within <strong>7 business days</strong>. Backup logs may take up to 30 days to be fully cleared.</li>
            </ul>
          </>
        );
      case 'privacy':
        return (
          <>
            <p className="mb-4"><strong>Effective Date: August 18, 2026</strong></p>
            <p className="mb-6 leading-relaxed">
              V19Plus ("we", "us", or "our") operates the V19Plus movie, series, and live TV streaming service across our web application, smart TVs, and mobile clients (including Google Play Android distribution). This Privacy Policy explains how we collect, use, store, share, and protect your personal information in compliance with Google Play Developer Policies, GDPR, and CCPA standards.
            </p>

            <h2 className="text-xl font-bold text-white mb-4 mt-6">1. Categories of Data We Collect</h2>
            <p className="mb-4 leading-relaxed">
              To deliver high-quality OTT video playback and account features, we collect the following data types:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-6">
              <li><strong>Personal Identifiers:</strong> Account email address, user display name, profile avatars, and encrypted authentication tokens.</li>
              <li><strong>App Activity & Streaming Data:</strong> Video watch history, playback progress timestamps, watchlists, search queries, favorite titles, and user profile preferences.</li>
              <li><strong>Device & Network Identifiers:</strong> IP address, device model, operating system version, browser type, unique device identifiers, and Firebase Cloud Messaging push notification tokens.</li>
              <li><strong>Diagnostics & Performance:</strong> Video buffer rates, playback error logs, system performance metrics, and crash telemetry.</li>
              <li><strong>Financial & Subscription Information:</strong> Active plan status, renewal dates, and payment history handled securely via Stripe or Google Play Billing. (We never store raw credit card numbers on our servers).</li>
            </ul>

            <h2 className="text-xl font-bold text-white mb-4 mt-6">2. Purpose of Processing & Usage</h2>
            <p className="mb-4 leading-relaxed">
              We process your data exclusively for the following operational purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-6">
              <li>Providing, maintaining, and synchronizing video streaming across your authorized devices.</li>
              <li>Managing user authentication, active profiles, and subscription entitlements.</li>
              <li>Personalizing title recommendations based on your viewing history and watchlist.</li>
              <li>Sending transactional alerts, service notifications, and push updates.</li>
              <li>Detecting, preventing, and combating security vulnerabilities, fraudulent access, or DRM violations.</li>
            </ul>

            <h2 className="text-xl font-bold text-white mb-4 mt-6">3. Cloud Infrastructure & Third-Party Service Providers</h2>
            <p className="mb-4 leading-relaxed">
              We partner with industry-leading enterprise cloud providers to host our data securely. We <strong>do NOT sell, rent, or trade</strong> your personal information to data brokers or third-party advertisers:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-6">
              <li><strong>Google Firebase (Google Cloud Platform):</strong>
                <ul className="list-circle list-inside ml-6 mt-1 space-y-1 text-n-text/80">
                  <li><em>Firestore Database:</em> Primary database storing account records, watch history, subscriptions, and watchlists.</li>
                  <li><em>Firebase Authentication:</em> Identity verification, secure password hashing, and Google OAuth single sign-on.</li>
                  <li><em>Firebase Cloud Storage:</em> Secure media asset, poster image, and video stream distribution.</li>
                  <li><em>Firebase Push Notifications (FCM):</em> Opt-in service notifications.</li>
                </ul>
              </li>
              <li><strong>Stripe & Google Play Billing:</strong> Secure PCI-DSS compliant subscription payment processing.</li>
            </ul>

            <h2 className="text-xl font-bold text-white mb-4 mt-6">4. Data Security & Encryption</h2>
            <p className="mb-4 leading-relaxed">
              We enforce strict technical and organizational safeguards to protect your personal data:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-6">
              <li><strong>Data in Transit:</strong> All communications between the V19Plus app and our servers are encrypted using Transport Layer Security (TLS 1.3 / HTTPS).</li>
              <li><strong>Data at Rest:</strong> Database records and media assets stored within Firebase Cloud infrastructure are encrypted at rest using AES-256 standard encryption.</li>
            </ul>

            <h2 className="text-xl font-bold text-white mb-4 mt-6">5. Google Play Account Deletion & Data Retention</h2>
            <p className="mb-4 leading-relaxed">
              In accordance with Google Play Developer Policy and user privacy regulations, you have full control over your personal data and account lifecycle:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-6">
              <li><strong>How to Delete Your Account:</strong> You can submit an account deletion request at any time directly through our web portal at <a href="/delete-account" className="text-n-red hover:underline font-semibold">https://v19plus-web.web.app/delete-account</a> or by emailing <a href="mailto:privacy@v19plus.app" className="text-n-red hover:underline font-semibold">privacy@v19plus.app</a>.</li>
              <li><strong>What is Erased:</strong> Upon verification, your account record, email address, profile names, watch history, watchlists, payment metadata, and push notification tokens will be permanently deleted from our active Firebase Firestore database and Firebase Authentication service.</li>
              <li><strong>Retention Timeline:</strong> Active account data deletion is completed within <strong>7 business days</strong>. Any residual encrypted backup snapshots are automatically purged within 30 days.</li>
            </ul>

            <h2 className="text-xl font-bold text-white mb-4 mt-6">6. Children's Privacy (COPPA)</h2>
            <p className="mb-4 leading-relaxed">
              V19Plus is designed for general adult and family audiences. Account registration requires users to be at least 18 years of age (or the age of majority in their jurisdiction). We do not knowingly collect personal information from children under the age of 13. If you believe a child under 13 has submitted personal data to us, please contact us immediately at <a href="mailto:privacy@v19plus.app" className="text-n-red hover:underline">privacy@v19plus.app</a> for immediate removal.
            </p>

            <h2 className="text-xl font-bold text-white mb-4 mt-6">7. User Data Rights (GDPR & CCPA)</h2>
            <p className="mb-4 leading-relaxed">
              Depending on your location, you hold rights to:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-6">
              <li>Access and receive a copy of your personal data stored on our platform.</li>
              <li>Request correction or updating of inaccurate profile information.</li>
              <li>Object to or restrict certain data processing activities.</li>
              <li>Request permanent erasure of your account and personal data (Right to be Forgotten).</li>
            </ul>

            <h2 className="text-xl font-bold text-white mb-4 mt-6">8. Contact Data Controller</h2>
            <p className="mb-4 leading-relaxed">
              If you have any questions, complaints, or data privacy requests, please contact our Data Protection Officer at:
            </p>
            <p className="mb-4 leading-relaxed font-mono text-sm bg-white/5 p-4 rounded-xl border border-white/10">
              V19Plus Privacy & Legal Team<br />
              Email: <a href="mailto:privacy@v19plus.app" className="text-n-red hover:underline">privacy@v19plus.app</a><br />
              Support: <a href="mailto:support@v19plus.app" className="text-n-red hover:underline">support@v19plus.app</a>
            </p>
          </>
        );
      case 'terms':
        return (
          <>
            <p className="mb-4"><strong>Last Updated: August 18, 2026</strong></p>
            <p className="mb-6 leading-relaxed">
              These Terms and Conditions govern your access to and use of the V19Plus streaming platform. By accessing or using V19Plus, you agree to be bound by these Terms.
            </p>
            <h2 className="text-xl font-bold text-white mb-4 mt-6">1. Eligibility and Accounts</h2>
            <p className="mb-4 leading-relaxed">
              You must be at least 18 years old, or the age of majority in your jurisdiction, to register for a V19Plus account. You are solely responsible for protecting your account credentials and maintaining control over the devices used to access the service.
            </p>
            <h2 className="text-xl font-bold text-white mb-4 mt-6">2. Content Licensing</h2>
            <p className="mb-4 leading-relaxed">
              The content available on V19Plus is for personal, non-commercial use only. We grant you a limited, non-exclusive, non-transferable license to access V19Plus content and stream movies, TV shows, and documentaries. Any unauthorized copying, distribution, or public performance of our content is strictly prohibited.
            </p>
            <h2 className="text-xl font-bold text-white mb-4 mt-6">3. Acceptable Use and Safety</h2>
            <p className="mb-4 leading-relaxed">
              You agree not to bypass, disable, or tamper with any content protection mechanisms or digital rights management (DRM) technologies on the platform. You may not use automated bots to scrape content or compromise the security of our backend services.
            </p>
            <h2 className="text-xl font-bold text-white mb-4 mt-6">4. Limitation of Liability</h2>
            <p className="mb-4 leading-relaxed">
              V19Plus is provided on an "as-is" and "as-available" basis. We make no guarantees that streaming services will be uninterrupted or error-free. To the fullest extent permitted by law, V19Plus shall not be held liable for any indirect, incidental, or consequential damages resulting from your use of the service.
            </p>
          </>
        );
      case 'refund':
        return (
          <>
            <p className="mb-4"><strong>Effective Date: August 18, 2026</strong></p>
            <p className="mb-6 leading-relaxed">
              This Refund Policy applies to any billing or paid tiers introduced on the V19Plus platform.
            </p>
            <h2 className="text-xl font-bold text-white mb-4 mt-6">1. Subscription Plans</h2>
            <p className="mb-4 leading-relaxed">
              V19Plus offers both free preview tiers and paid subscription plans. The payment terms, cancellation procedures, and refund guidelines below govern paid subscriptions.
            </p>
            <h2 className="text-xl font-bold text-white mb-4 mt-6">2. Non-Refundable Payments</h2>
            <p className="mb-4 leading-relaxed">
              All subscription charges, transaction fees, and payments processed through Stripe are non-refundable. We do not provide refunds or credits for any partial-month subscription periods or unwatched content.
            </p>
            <h2 className="text-xl font-bold text-white mb-4 mt-6">3. Cancellations</h2>
            <p className="mb-4 leading-relaxed">
              You may cancel your paid subscription at any time. Your access to paid content tiers will continue through the end of your current active billing cycle. To cancel your plan, go to your Account Settings and manage your subscription.
            </p>
            <h2 className="text-xl font-bold text-white mb-4 mt-6">4. Exceptions</h2>
            <p className="mb-4 leading-relaxed">
              If a system error, double-billing event, or technical failure occurs directly attributable to V19Plus, our support team will investigate the issue. Refund exceptions may be evaluated on a case-by-case basis. Please email support at <a href="mailto:billing@v19plus.app" className="text-n-red hover:underline">billing@v19plus.app</a> for billing assistance.
            </p>
          </>
        );
      case 'cookies':
        return (
          <>
            <p className="mb-4"><strong>Effective Date: August 18, 2026</strong></p>
            <p className="mb-6 leading-relaxed">
              This Cookie Policy explains how V19Plus uses cookies and similar tracking technologies to customize and improve your streaming experience.
            </p>
            <h2 className="text-xl font-bold text-white mb-4 mt-6">1. What are Cookies?</h2>
            <p className="mb-4 leading-relaxed">
              Cookies are small text files stored on your browser or device when you visit a website. They help us remember your login session, active profiles, streaming preferences, and search queries.
            </p>
            <h2 className="text-xl font-bold text-white mb-4 mt-6">2. Types of Cookies We Use</h2>
            <ul className="list-disc list-inside space-y-2 mb-6">
              <li><strong>Essential Cookies:</strong> Critical for core application functionalities, such as maintaining user authentication sessions (Firebase Auth) and active profile states.</li>
              <li><strong>Preference Cookies:</strong> Used to store settings like video playback quality, audio volume, and theme modes.</li>
              <li><strong>Analytics Cookies:</strong> Help us aggregate user patterns and monitor website performance to optimize streaming load speeds.</li>
            </ul>
            <h2 className="text-xl font-bold text-white mb-4 mt-6">3. Managing Cookies</h2>
            <p className="mb-4 leading-relaxed">
              Most web browsers allow you to control cookies through their settings menus. If you choose to reject essential cookies, some parts of the V19Plus streaming service and video player may not function properly.
            </p>
          </>
        );
      default:
        return (
          <p className="mb-4 leading-relaxed">
            Please check back shortly, or contact our legal team at <a href="mailto:legal@v19plus.app" className="text-n-red hover:underline">legal@v19plus.app</a> if you have immediate inquiries regarding our policies, data protection, or service terms.
          </p>
        );
    }
  };

  return (
    <div className="min-h-screen bg-n-black text-n-text pt-24 pb-16 px-4 md:px-8">
      <div className="max-w-4xl mx-auto bg-[#111] border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl">
        <h1 className="text-3xl md:text-5xl font-black text-white mb-8 border-b border-white/10 pb-6">{title}</h1>
        <div className="prose prose-invert max-w-none text-n-text/90">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
