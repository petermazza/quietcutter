import './globals.css'

export const metadata = {
  metadataBase: new URL('https://quietcutter.com'),
  title: {
    default: 'QuietCutter - Remove Silence from Videos Automatically',
    template: '%s | QuietCutter',
  },
  description: 'Free online tool to automatically detect and remove silent sections from your videos. Perfect for podcasts, lectures, and screen recordings. Make every second count.',
  keywords: ['remove silence from video', 'video silence remover', 'remove dead air', 'video editing', 'podcast editing', 'lecture editing', 'screen recording', 'free video tool'],
  authors: [{ name: 'QuietCutter' }],
  creator: 'QuietCutter',
  publisher: 'QuietCutter',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'QuietCutter - Remove Silence from Videos Automatically',
    description: 'Free online tool to automatically detect and remove silent sections from your videos. Make every second count.',
    url: 'https://quietcutter.com',
    siteName: 'QuietCutter',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QuietCutter - Remove Silence from Videos',
    description: 'Free online tool to automatically remove silent sections from your videos.',
  },
  alternates: {
    canonical: 'https://quietcutter.com',
  },
  verification: {
    // Add your Google Search Console verification code here when you have one
    // google: 'your-verification-code',
  },
}

// Structured data for SEO
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'QuietCutter',
  description: 'Automatically detect and remove silent sections from your videos.',
  url: 'https://quietcutter.com',
  applicationCategory: 'Multimedia',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free tier with 3 videos per day',
  },
  featureList: [
    'Automatic silence detection',
    'Customizable threshold settings',
    'Support for MP4, MOV, AVI, MKV formats',
    'No software installation required',
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
