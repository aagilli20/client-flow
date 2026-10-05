import { Suspense } from "react";
import ProspectsView from "@/components/prospects/ProspectsView";

export const metadata = { title: "Prospectos · ClientFlow" };

export default function ProspectsPage() {
    return (
        <Suspense>
            <ProspectsView />
        </Suspense>
    );
}
