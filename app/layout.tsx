import type { Metadata } from 'next';
import './globals.css';
import './brand.css';
import './mockup.css';
import './typography.css';
import './cms.css';
import './refine.css';
import './cine.css';
import './motion.css';

export const metadata: Metadata = {
  title: '1718 CLUB — More than coffee.',
  description: 'The private membership experience of 1718 Café.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/></head><body>{children}</body></html>;
}
