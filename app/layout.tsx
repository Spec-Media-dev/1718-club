import type { Metadata } from 'next';
import './globals.css';
import './brand.css';

export const metadata: Metadata = {
  title: '1718 CLUB — More than coffee.',
  description: 'The private membership experience of 1718 Café.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
