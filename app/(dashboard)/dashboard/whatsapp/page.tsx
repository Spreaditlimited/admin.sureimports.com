import { redirect } from "next/navigation";
import { requireAdminServiceAccess } from "@/app/api/_lib/adminAccess";
import WhatsAppReport from "./WhatsAppReport";

export default async function Page() {
  const access = await requireAdminServiceAccess(
    "whatsapp_performance",
    "view",
  );
  if (!access.ok) redirect("/dashboard");
  const edit = await requireAdminServiceAccess("whatsapp_performance", "edit");
  return <WhatsAppReport canEdit={edit.ok} />;
}
