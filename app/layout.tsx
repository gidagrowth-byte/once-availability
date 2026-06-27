import type { Metadata } from "next";
import { Analytics } from "@/components/Analytics";
import { env } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "江戸川橋・護国寺店 空き枠確認",
  description: "江戸川橋・護国寺店の空き枠を確認し、LINEで希望日時を送信できます。",
};

const gtmId = "GTM-WFLSD4F2";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${gtmId}');
            `,
          }}
        />
      </head>
      <body>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <Analytics measurementId={env.ga4MeasurementId} />
        {children}
      </body>
    </html>
  );
}
