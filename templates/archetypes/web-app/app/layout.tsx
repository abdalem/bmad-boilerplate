import type { ReactNode } from 'react';

export const metadata = {
  title: '__PROJECT_NAME__',
  description: 'Generic Next.js application starter',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
