import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Office of the Municipal Engineer · Bayan ng Mabini',
  description: 'Municipal infrastructure monitoring portal for Bayan ng Mabini, Batangas.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
