import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "スタジオONCE 空き枠確認",
  description: "ご希望店舗の空き枠を確認し、LINEで希望日時を送信できます。",
  openGraph: {
    title: "スタジオONCE 空き枠確認",
    description: "ご希望店舗の空き枠を確認し、LINEで希望日時を送信できます。",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "スタジオONCE 空き枠確認",
    description: "ご希望店舗の空き枠を確認し、LINEで希望日時を送信できます。",
  },
};

const gtmId = "GTM-WFLSD4F2";
const ga4MeasurementId = "G-460Z0PYTE3";
const clarityProjectId = "xdlo3x2qaj";

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
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({
                event: 'ga4_measurement_ready',
                ga4_measurement_id: '${ga4MeasurementId}'
              });
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${gtmId}');
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                t.onload=function(){console.log("clarity loaded");};
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${clarityProjectId}");
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
        {children}
      </body>
    </html>
  );
}
