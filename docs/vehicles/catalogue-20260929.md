# Tormays EV catalogue — 29 September 2026

Prepared from `Tormays car export_West_Africa_LHD_Vehicle_Catalog_English Final 2.xlsx` in Downloads. Only its ten fully battery-electric model entries are included. PHEVs, range-extender versions and combustion vehicles are excluded.

| Model | Supplier reference USD range | Reference exterior dimensions (mm) |
| --- | ---: | --- |
| BYD Han EV | 31,313–44,746 | 4,995 × 1,910 × 1,495 |
| BYD Tang EV | 37,284–46,239 | 4,970 × 1,955 × 1,745 |
| BYD E2 | 13,403–16,388 | 4,260 × 1,760 × 1,530 |
| BYD Yuan Plus / Atto 3 | 17,284–22,373 | 4,455 × 1,875 × 1,615 |
| BYD Yuan Up | 11,164–17,881 | 4,310 × 1,830 × 1,675 |
| GAC Aion Y | 15,610–22,180 | 4,535 × 1,870 × 1,650 (Y Plus reference) |
| Changan Lumin | 7,448–10,433 | 3,270 × 1,700 × 1,545 |
| Chery QQ Ice Cream | 7,448–9,985 | 3,030 × 1,496 × 1,637 |
| Avatr 11 | 38,776–59,672 | 4,880 × 1,970 × 1,601 |
| Avatr 12 | 43,254–65,642 | 5,020 × 1,999 × 1,460 |

The adjacent `catalogue-20260929-sources.json` records dimension URLs, model-year caveats, photo origins, file hashes and Cloudinary assets. Dimensions come from manufacturer brochures/websites or regional distributors. The catalogue does not identify exact trims or model years: the dimensions are explicitly labelled references, not verified shipping dimensions for a purchased unit. In particular Aion Y vs Y Plus, newer Avatr bodies, export BYD specifications and QQ Ice Cream styling require supplier confirmation. Gallery photos illustrate the model family; they do not promise a particular trim or colour. Range figures are supplier catalogue claims with an unspecified test cycle, not real-world Nigerian range guarantees.

## Pricing and quotation

- USD vehicle estimate = supplier USD reference × admin `exNairaToDollar` × (1 + `vehicleMarkupPercent` / 100).
- Existing RMB vehicles retain `exNairaToYuan` conversion and the same markup setting.
- CBM = exterior length × width × height in millimetres / 1,000,000,000. Shipping = CBM × admin `quotationSeaRateNgnPerCbm`; no additional markup.
- Landed range adds the same estimated shipping to each vehicle-price endpoint. Shipping includes clearing, duties and taxes. All arrivals are Lagos; customers arrange collection and onward delivery.
- Reference ranges cannot generate invoices, even if confirmation flags are accidentally enabled. Admin must select the exact configuration, turn off “Indicative supplier range”, enter its exact USD price, and confirm specifications/price before quoting. Existing issued quotations retain their saved price and rate snapshots.
- Missing USD rates hide estimates instead of silently using RMB rates. Missing dimensions/CBM rate leave shipping and landed prices unpriced.
- The workbook's MOQ is 3 for Han, Tang, Yuan Plus, Aion Y and both Avatrs; 5 for E2 and Yuan Up; 10 for Lumin and QQ Ice Cream. These are supplier conditions to resolve before confirming individual orders, not assumed retail minimums. No supplier lead time, warranty, tax exemption or stock promise has been imported.

## Galleries

All 20 catalogue entries have at least five distinct image URLs hosted on Cloudinary. Existing Ruichi cover images remain in place; seven undersupplied galleries gain additional photos. New-model photos come from manufacturer/regional manufacturer galleries. Where official Ruichi pages provided only small thumbnails or promotional posters, supplied originals were preferred. Some EC35 supplier photos and Lumin detail images remain limited by source resolution; they were not artificially upscaled. Assets are web-optimised, with original aspect ratios and orientation preserved.

## Release and import

This change is prepared locally. Do not expose new USD entries to the old production pricing code.

1. Deploy both repositories with the USD-aware pricing changes after explicit deployment instruction.
2. From the admin repository, run `node scripts/vehicles/sync-catalogue.mjs` for a read-only plan.
3. Run `node scripts/vehicles/sync-catalogue.mjs --apply` to take a protected timestamped backup and import atomically. It creates missing models and appends missing gallery URLs, preserving all existing configuration, pricing, publication and order data. Concurrent edits abort the transaction; the default mode never writes.
4. Alternatively, after both deployments, the existing Vehicles admin “Import supplied vehicle catalogue” action creates missing entries and appends photos while preserving existing prices/settings. The script additionally provides a backup.
5. Verify catalogue cards, a USD detail page, comparison, social image metadata and admin quotation confirmation controls against the live records.

No Prisma migration is needed: variant currency/reference fields use the existing JSON column; rates and configurable markup already exist.
