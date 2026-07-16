"use client";

import { usePathname } from 'next/navigation';
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import WhatsAppButton from '@/components/shared/WhatsAppButton';

export default function ClientLayout(
    { children }: Readonly<{ children: React.ReactNode }>) {
    const pathname = usePathname();

    const pathChecks = {
        isDashboard: pathname.includes("/dashboard") || pathname.includes("/console"),
        isVehicleOrder: pathname.includes("/shop") && pathname.includes("/order"),
        isShopRelated: pathname.includes("/shop") || pathname.includes("/charge") || pathname.includes("/forms"),
        isMarketing: pathname.includes("/forms"),
        isAuth: pathname.includes("/auth"),
        // The invite-accept flow is a self-contained full-screen card (like the
        // auth screens) — no marketing nav, so there's nothing to click away to
        // that would drop the ?token= from the URL.
        isInvite: pathname.includes("/invite"),
        isHomepage: pathname.endsWith("/rw") || pathname.endsWith("/ke") || pathname === "/", // Updated for country routing
    };

    const shouldHideNavbar = pathChecks.isDashboard || pathChecks.isMarketing || pathChecks.isAuth || pathChecks.isInvite;
    const shouldHideFooter = pathChecks.isShopRelated || pathChecks.isVehicleOrder || shouldHideNavbar;

    return (
        <>
            {!shouldHideNavbar && <Navbar />}
            {children}
            {!shouldHideFooter && <Footer />}
            {pathChecks.isHomepage && ( // Conditionally render the WhatsApp button
                <WhatsAppButton
                    phoneNumber="+250798219566"
                    message="Hello Kabisa!"
                    text="How can we help you?"
                />
            )}
        </>
    );
}