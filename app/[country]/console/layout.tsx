import type { Metadata } from 'next';
import { Outfit, Geist_Mono, Inter } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import { ConsoleThemeProvider } from '@/components/console/ThemeProvider';
import { ConsoleShell } from '@/components/console/shell/ConsoleShell';
import './console.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Kabisa Console',
};

export default function ConsoleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${outfit.variable} ${geistMono.variable} ${inter.variable}`}>
      <ConsoleThemeProvider>
        {/* Blue top-loading bar on every navigation (nav clicks, row clicks,
            programmatic router.push). */}
        <NextTopLoader color="#08294f" height={3} showSpinner={false} shadow="0 0 10px #08294f,0 0 5px #08294f" />
        <a href="#kc-main" className="kc-skip-link">
          Skip to main content
        </a>
        <ConsoleShell>{children}</ConsoleShell>
      </ConsoleThemeProvider>
    </div>
  );
}
