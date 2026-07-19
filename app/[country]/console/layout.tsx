import type { Metadata } from 'next';
import { Space_Grotesk, Geist_Mono, Inter } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import { ConsoleThemeProvider } from '@/components/console/ThemeProvider';
import { ConsoleShell } from '@/components/console/shell/ConsoleShell';
import './console.css';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Sana Console',
};

export default function ConsoleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${spaceGrotesk.variable} ${geistMono.variable} ${inter.variable}`}>
      <ConsoleThemeProvider>
        {/* Teal top-loading bar on every navigation (nav clicks, row clicks,
            programmatic router.push). */}
        <NextTopLoader color="#00C2A8" height={3} showSpinner={false} shadow="0 0 10px #00C2A8,0 0 5px #00C2A8" />
        <a href="#kc-main" className="kc-skip-link">
          Skip to main content
        </a>
        <ConsoleShell>{children}</ConsoleShell>
      </ConsoleThemeProvider>
    </div>
  );
}
