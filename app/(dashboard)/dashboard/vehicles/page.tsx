import { redirect } from "next/navigation";
import { vehicleAdmin } from "@/lib/vehicles/access";
import VehicleAdminWorkspace from "./VehicleAdminWorkspace";
export default async function VehicleAdminPage() {
  if (!(await vehicleAdmin())) redirect("/dashboard");
  return <VehicleAdminWorkspace />;
}
