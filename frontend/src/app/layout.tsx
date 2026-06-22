import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import LeaderboardPanel from '@/components/LeaderboardPanel';
import RulesPanel from '@/components/RulesPanel';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'World Cup 2026 - Dự đoán kết quả',
  description: 'Tham gia dự đoán kết quả các trận đấu World Cup 2026 và tranh tài trên bảng xếp hạng',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <Navbar />
        <div className="flex">
          <main className="flex-1 min-w-0 min-h-screen">
            {children}
          </main>
          <LeaderboardPanel />
          <RulesPanel />
        </div>
        <footer className="bg-blue-900 text-blue-200 text-center py-6 mt-12 text-sm">
          <p>World Cup 2026 Predictor &copy; {new Date().getFullYear()}</p>
        </footer>
      </body>
    </html>
  );
}
