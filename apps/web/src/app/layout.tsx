import { Providers } from '../components/Providers';
import '../index.css';

export const metadata = {
  metadataBase: new URL('https://v19-plus.web.app'),
  title: {
    default: 'V19Plus | Official Streaming Platform',
    template: '%s | V19Plus',
  },
  description: 'V19Plus is the official premium streaming platform offering thousands of movies, TV series, live sports, and original productions in 4K Ultra HD.',
  keywords: ['V19Plus', 'V19 Plus', 'V19', 'streaming', 'movies', 'TV shows', 'cinema', '4K streaming', 'OTT'],
  alternates: {
    canonical: 'https://v19-plus.web.app',
  },
  openGraph: {
    title: 'V19Plus | Official Streaming Platform',
    description: 'Stream unlimited movies, TV shows, live sports, and documentaries in 4K Ultra HD on V19Plus.',
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
      description: 'Stream unlimited movies, TV shows, and documentaries in 4K Ultra HD.',
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
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
