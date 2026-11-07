import type { Metadata } from 'next';
import '@fontsource-variable/geist';
import '@/styles/globals.css';
import { Providers } from '@/components/providers';
export const metadata: Metadata = {
  title: { default: 'ATOPSY · Forensic Investigation', template: '%s · ATOPSY' },
  description: 'A focused workspace for evidence, examinations and forensic investigations.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
