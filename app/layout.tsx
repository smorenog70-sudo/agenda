import type { Metadata } from "next";
import { OWNER_NAME } from "@/config";
import "./globals.css";

export const metadata: Metadata = {
  title: `Agenda con ${OWNER_NAME}`,
  description: `Reserva un horario con ${OWNER_NAME}.`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
