import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Torium — Smart Links & QR Codes',
  description: 'Create short links and QR codes with powerful analytics. Know exactly how your content performs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg font-sans">
        {children}
      </body>
    </html>
  );
}
