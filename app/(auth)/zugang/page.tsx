import { Suspense } from "react";
import { SiteGateForm } from "@/components/auth/site-gate-form";

export default function ZugangPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Laden…</p>}>
      <SiteGateForm />
    </Suspense>
  );
}