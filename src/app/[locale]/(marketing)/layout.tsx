import React from "react";
import Navbar from "@/components/common/Navbar";
import Footer from '@/components/common/Footer';

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Navbar />
            {children}
            <Footer />
        </>
    );
}
