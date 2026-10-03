import "@/styles/globals.css";
import { type Metadata } from 'next'

export const metadata: Metadata = {
  title: "ClientFlow - CRM y Seguimiento",
  description: "Plataforma de seguimiento de clientes y CRM",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (<>{children}</>);
}
