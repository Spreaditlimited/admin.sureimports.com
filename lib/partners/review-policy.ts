import { z } from "zod";

export const reviewSchema = z
  .object({
    revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    decision: z.enum(["VERIFIED", "REQUEST_CHANGES", "REJECTED"]),
    message: z.string().trim().min(10).max(2000),
    evidenceReference: z.string().trim().max(500).default(""),
    checkedRegistration: z.boolean().default(false),
    checkedIdentity: z.boolean().default(false),
    checkedOwnership: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.decision === "VERIFIED" &&
      (!value.checkedRegistration ||
        !value.checkedIdentity ||
        !value.checkedOwnership ||
        value.evidenceReference.length < 5)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Record registration, identity and ownership checks and an evidence reference before accepting KYC.",
      });
    }
  });

export function reviewTarget(status: string, decision: string) {
  if (status !== "SUBMITTED")
    throw new Error("Only submitted cases can be reviewed.");
  if (decision === "REQUEST_CHANGES") return "DRAFT";
  if (decision === "VERIFIED" || decision === "REJECTED") return decision;
  throw new Error("Invalid decision.");
}
