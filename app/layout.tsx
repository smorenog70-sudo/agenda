import type { Metadata, Viewport } from "next";
import { OWNER_NAME } from "@/config";
import "./globals.css";
import ServiceWorkerRegister from "./_components/ServiceWorkerRegister";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
