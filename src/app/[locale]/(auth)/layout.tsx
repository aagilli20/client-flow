import React from "react";

export const metadata = {
    title: "Entrar · ClientFlow",
    robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
