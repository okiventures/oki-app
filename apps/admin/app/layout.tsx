import "./globals.css";
import BottomNav from "./components/BottomNav";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <div className="flex flex-col h-screen">
          <main className="flex-1 overflow-y-auto pb-16">
            <div className="max-w-6xl mx-auto px-6 py-6">{children}</div>
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
