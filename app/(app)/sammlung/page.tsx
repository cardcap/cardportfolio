import { redirect } from "next/navigation";

/** Legacy URL — Assets → Karten */
export default function SammlungRedirectPage() {
  redirect("/assets/karten");
}
