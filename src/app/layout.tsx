import type { Metadata } from 'next';
import './globals.css';
import { ShellLayout } from '../shell/ShellLayout';
import { ModuleLoader } from '../core/module-loader';
import { MycoManifest } from '../modules/myco-os/manifest';

// Register modules at boot
ModuleLoader.register(MycoManifest);

export const metadata: Metadata = {
  title: 'HutchStack Forge',
  description: 'Forge UI Runtime',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) { console.log('SW registered:', registration.scope); },
                    function(err) { console.log('SW registration failed:', err); }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <ShellLayout>
          {children}
        </ShellLayout>
      </body>
    </html>
  );
}
