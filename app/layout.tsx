import type { Metadata, Viewport } from "next";
import { OWNER_NAME } from "@/config";
import { getSettings } from "@/lib/settings";
import "./globals.css";
import ServiceWorkerRegister from "./_components/ServiceWorkerRegister";
import SignupFooter from "./_components/SignupFooter";

export const metadata: Metadata = {
  title: `Agenda con ${OWNER_NAME}`,
  description: `Reserva un horario con ${OWNER_NAME}.`,
  applicationName: "SMG-Calendar",
  appleWebApp: {
    capable: true,
    title: "SMG-Calendar",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let signupUrl = "";
  try {
    signupUrl = (await getSettings()).signupUrl;
  } catch {
    signupUrl = "";
  }

  return (
    <html lang="es">
      <body>
        {children}
        <SignupFooter url={signupUrl} />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
