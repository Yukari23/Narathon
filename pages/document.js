// /pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    // ✅ แก้คำเตือน scroll-behavior
    <Html lang="th" data-scroll-behavior="smooth">
      <Head>
        {/* ✅ ย้าย link ฟอนต์มาไว้ที่นี่ที่เดียว */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap"
        />
        {/* ใส่ meta อื่น ๆ ได้ เช่น <meta name="theme-color" content="#ffffff" /> */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
