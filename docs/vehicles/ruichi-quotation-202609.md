# Ruichi September 2026 quotation update

Source: `Quotation for RUICHI(2026.09) 2.pdf` in Downloads. The document is dated 28 August 2026 and headed September 2026. Its SHA-256 and per-configuration page/row references are recorded in `ruichi-quotation-202609.json`.

Applied to the shared catalogue on 29 September 2026: 10 existing Ruichi models, 54 configurations. Both repositories' seed catalogues reflect the same update. Original configuration IDs are retained; images, model descriptions, publication settings, other makes and existing order/invoice snapshots are unchanged.

## Pricing

Use the **1–10 units USD EXW Guangzhou** column, not the RMB MSRP column. Customer vehicle price uses the current admin USD-to-Naira rate and vehicle markup. Shipping uses exterior length × width × height / 1e9 × the admin CBM rate, including clearing, duties and taxes. The quoted RMB 6.7 conversion is supplier context and is not used to override admin rates.

Bulk-column prices are retained in the audit manifest only. The supplier labels both “1–10” and “10+”, so exactly 10 units is ambiguous; do not automatically apply the bulk tier. Nine-seat EC75/R5 configurations include the quoted USD 300 option and only use 61.94 kWh batteries.

C9 `pioneer` remains a boxed truck: USD 22,710 chassis + USD 1,500 standard box = USD 24,210. New 100/120 kWh chassis configurations are explicitly named “Chassis only”. C9 boxed exterior dimensions and three-seat layout retain prior manufacturer specification support. Confirm the ordered body and final transport dimensions before issuing a binding quote.

## Specification interpretation

- Quotation ranges supersede older sheets; no test cycle is claimed because this quotation does not name one.
- EC75/R5 50 kWh freight range is now 306 km. The supplier lists CATL 50.1/50.18 kWh alternatives; retain 50.18 as the nominal catalogue configuration and confirm the actual pack at quotation.
- R5's six-seat base configuration is updated from the older 58.24 kWh / 403 km sheet to the quoted 61.94 kWh / 430 km configuration.
- EC35 uses quoted 38 kWh / 275 km; EC31S uses 38 kWh / 245 km.
- C5 box and C3 box dimensions/ranges, ED71S box dimensions, and all C5L dimensions use this quotation. C5L lists identical exterior dimensions for all bodies, which need confirmation for the actual ordered body.
- Enclosed cargo volumes are calculated from quoted internal dimensions and rounded to 0.001 m³. They are estimates, distinct from exterior shipping CBM. Open-body cargo volumes remain unknown.
- C9 100 kWh range remains unknown; do not reuse the 120 kWh range.
- English/Chinese Beyond trim numerals disagree, so display “Beyond Zhixing” without assigning a conflicting numeral.
- Quoted 11/14-seat upgrades, optional electronics, driver-assistance upgrades and alternative C9 bodies require configuration confirmation rather than invented combinations. Upcoming C5 RV/C9 RV range-extender vehicles are not added to the existing EV catalogue.

## Applying again

Admin repository: `node --experimental-strip-types scripts/vehicles/apply-ruichi-quotation-202609.mjs` produces a read-only plan. `--apply` writes a private backup and updates only matching Ruichi variants in one transaction, rejecting concurrent changes. It preserves any extra variants created in admin and verifies unchanged model metadata after saving.

Validation: all 18 vehicle-commerce/search tests passed; both seed catalogues match; all 10 live detail pages returned HTTP 200 with all 54 configurations present and supplier-cost fields absent from public payloads. The live EC75 nine-seat selector showed its updated configuration and calculated landed price.
