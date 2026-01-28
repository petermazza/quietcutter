import './globals.css'

export const metadata = {
  title: 'QuietCutter - Remove Silence from Videos',
  description: 'Automatically detect and remove silent sections from your videos. Make every second count.',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'QuietCutter - Remove Silence from Videos',
    description: 'Automatically detect and remove silent sections from your videos. Make every second count.',
    url: 'https://quietcutter.com',
    siteName: 'QuietCutter',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'QuietCutter - Remove Silence from Videos',
    description: 'Automatically detect and remove silent sections from your videos.',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
