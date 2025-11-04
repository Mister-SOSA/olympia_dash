import "../styles/globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // Specify weights
  display: "swap", // Optimizes font loading
});


export const metadata = {
  title: "OlyDash",
  description: "Customizable Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <Providers>
          {children}
          <Toaster position="top-center" theme="dark" richColors className="preset-toast" />
        </Providers>
      </body>
    </html>
  );
}