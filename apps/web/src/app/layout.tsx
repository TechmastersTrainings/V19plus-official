import { Plus_Jakarta_Sans, Outfit } from 'next/font/google';
import { Providers } from '../components/Providers';
import '../index.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata = {
  metadataBase: new URL('https://v19-plus.web.app'),
  title: {
    default: 'V19Plus | Official Streaming Platform',
    template: '%s | V19Plus',
  },
  description: 'V19Plus is the official streaming platform offering movies, TV series, masterclasses, and original productions.',
  keywords: ['V19Plus', 'V19 Plus', 'V19', 'streaming', 'movies', 'TV shows', 'cinema', 'masterclasses', 'OTT'],
  alternates: {
    canonical: 'https://v19-plus.web.app',
  },
  openGraph: {
    title: 'V19Plus | Official Streaming Platform',
    description: 'Stream unlimited movies, TV shows, masterclasses, and documentaries on V19Plus.',
    url: 'https://v19-plus.web.app',
    siteName: 'V19Plus',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 600,
        alt: 'V19Plus Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'V19Plus | Official Streaming Platform',
    description: 'Stream unlimited movies, TV shows, and documentaries on V19Plus.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'V19Plus',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: '/logo-icon.png',
    shortcut: '/favicon.ico',
    apple: '/logo-icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://v19-plus.web.app/#website',
      url: 'https://v19-plus.web.app/',
      name: 'V19Plus',
      description: 'Stream unlimited movies, TV shows, and documentaries on V19Plus.',
      publisher: {
        '@id': 'https://v19-plus.web.app/#organization',
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://v19-plus.web.app/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': 'https://v19-plus.web.app/#organization',
      name: 'V19Plus',
      url: 'https://v19-plus.web.app/',
      logo: 'https://v19-plus.web.app/logo.png',
      email: 'support@v19plus.app',
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'support@v19plus.app',
        contactType: 'customer support',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${outfit.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-[#070605] text-[#FAF6EF] font-sans antialiased selection:bg-[#FF5C00]/30 selection:text-white">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
