import LegalPage from '../legal/[slug]/page';

export default function TermsPage() {
  return <LegalPage params={{ slug: 'terms' }} />;
}
