import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Intent Review — AI-Powered Code Review',
  description: 'Review AI-generated PRs by semantic intent, not by file path.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
