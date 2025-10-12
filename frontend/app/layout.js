import HeaderClient from "./components/HeaderClient";
import Footer from "./components/Footer";
import "./styles/global.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <HeaderClient />
        {children}
        <Footer />
      </body>
    </html>
  );
}
