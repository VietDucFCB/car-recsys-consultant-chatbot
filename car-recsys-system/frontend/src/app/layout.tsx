import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'CarMarket - Sàn thương mại điện tử bán xe ô tô',
  description: 'Mua bán xe ô tô trực tuyến',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <div className="min-h-screen flex flex-col bg-gray-50">
          <Header />
          <main className="flex-grow relative">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
