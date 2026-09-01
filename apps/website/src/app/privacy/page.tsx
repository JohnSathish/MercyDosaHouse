import { BRAND } from '@mdh/utils';
import { buildPageMetadata } from '@/lib/seo';

export const generateMetadata = () =>
  buildPageMetadata('privacy', '/privacy', { title: 'Privacy Policy' });

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold text-primary mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last updated: 12 August 2026 · Applies to the {BRAND.name} website and Android apps
      </p>

      <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">Who we are</h2>
          <p>
            {BRAND.name} (&quot;we&quot;, &quot;us&quot;) operates the website{' '}
            <a href="https://mercydosahouse.com">mercydosahouse.com</a> and the Mercy Dosa House
            customer and admin Android applications. Contact:{' '}
            <a href="mailto:info@mercydosahouse.com">info@mercydosahouse.com</a> · Phone:{' '}
            <a href="tel:+919563636365">+91 95636 36365</a> · Tura, Meghalaya, India.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Information we collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Account details: name, phone number, email (when provided)</li>
            <li>Delivery addresses and order history</li>
            <li>Device and app diagnostics needed to keep the service reliable</li>
            <li>
              Payment confirmation status from our payment partners (we do not store full card
              numbers in the app)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">How we use information</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Create and manage your account</li>
            <li>Process, prepare, and deliver food orders</li>
            <li>Send order status updates and customer support replies</li>
            <li>Improve menu availability, delivery operations, and app reliability</li>
            <li>Comply with legal and tax requirements</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Sharing</h2>
          <p>
            We share data only with service providers needed to run the restaurant (hosting,
            messaging/OTP, and payment gateways) and when required by law. We do not sell personal
            information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Retention &amp; security</h2>
          <p>
            Order and account records are kept as long as needed for operations, support, and legal
            obligations. We use industry-standard safeguards (HTTPS, access controls) to protect
            your data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Your choices</h2>
          <p>
            You may request access, correction, or deletion of your account data by emailing{' '}
            <a href="mailto:info@mercydosahouse.com">info@mercydosahouse.com</a>. You can also stop
            using the app and uninstall it at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Children</h2>
          <p>
            Our services are intended for general audiences. We do not knowingly collect personal
            information from children under 13.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Changes</h2>
          <p>
            We may update this policy from time to time. The &quot;Last updated&quot; date at the
            top will change when we do. Continued use of the app or website after an update means
            you accept the revised policy.
          </p>
        </section>
      </div>
    </div>
  );
}
