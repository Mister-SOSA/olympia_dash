import "../styles/globals.css";

export const metadata = {
  title: "Olympia Dash",
  description: "Customizable Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}