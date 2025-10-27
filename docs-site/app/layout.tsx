import './globals.css'

export const metadata = {
  title: 'Minimact Documentation',
  description: 'Server-side React for ASP.NET Core with predictive rendering',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
