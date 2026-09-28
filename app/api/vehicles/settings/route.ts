import { prisma } from "@/lib/prisma";
import { vehicleAdmin } from "@/lib/vehicles/access";
import { sameOrigin } from "@/lib/vehicles/http";
import { validVehicleMarkup } from "@/lib/vehicles/policy";

export async function POST(request: Request) {
  if (!(await vehicleAdmin(true, true)))
    return Response.json(
      { message: "Invoice editing permission is required." },
      { status: 403 },
    );
  try {
    sameOrigin(request);
    const { markupPercent } = await request.json();
    if (!validVehicleMarkup(markupPercent))
      return Response.json(
        {
          message:
            "Enter a non-negative markup with up to two decimal places (maximum 99,999,999.99%).",
        },
        { status: 400 },
      );
    await prisma.exchange_rate.update({
      where: { id: 1 },
      data: { vehicleMarkupPercent: markupPercent },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { message: (error as Error).message },
      { status: 400 },
    );
  }
}
