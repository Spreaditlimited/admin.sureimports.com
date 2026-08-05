-- Move the one draft created from an AI-generated diesel specialisation to the
-- proper parent category before the weak category records are removed.
UPDATE intelligence_report_products report
JOIN intelligence_niches parent_niche
  ON parent_niche.slug = 'diesel-generators'
SET
  report.nicheId = parent_niche.pidNiche,
  report.slug = 'diesel-generators',
  report.title = 'Diesel Generators Supplier Intelligence Report',
  report.subtitle = 'A professionally curated shortlist of direct diesel generator manufacturers, built from real sourcing intelligence.',
  report.supplierCount = (
    SELECT COUNT(DISTINCT supplier.pidSupplier)
    FROM intelligence_supplier_categories category_link
    JOIN intelligence_suppliers supplier
      ON supplier.pidSupplier = category_link.supplierId
    WHERE category_link.nicheId = parent_niche.pidNiche
      AND supplier.status = 'published'
      AND supplier.verificationStatus = 'official_site_contact_confirmed'
  ),
  report.updatedAt = NOW(3)
WHERE report.slug = 'brand-engine-diesel-generators'
  AND report.status = 'draft';

-- Suggested product capabilities used to be promoted automatically into
-- catalogue categories. Keep only suggestions with strong standalone buyer
-- intent; the rest remain represented in suppliers.productsMade.
CREATE TEMPORARY TABLE weak_intelligence_niches AS
SELECT n.pidNiche
FROM intelligence_niches n
WHERE EXISTS (
    SELECT 1
    FROM intelligence_supplier_categories suggested
    WHERE suggested.nicheId = n.pidNiche
      AND suggested.source = 'research_suggestion'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM intelligence_supplier_categories primary_link
    WHERE primary_link.nicheId = n.pidNiche
      AND primary_link.source = 'primary'
  )
  AND n.slug NOT IN (
    'electric-motorcycles',
    'electric-tricycles',
    'golf-carts',
    'lace-frontals-and-closures',
    'lace-wigs',
    'phone-chargers',
    'power-banks',
    'raw-hair-bundles',
    'screen-protectors',
    'wireless-chargers'
  );

DELETE category_link
FROM intelligence_supplier_categories category_link
JOIN weak_intelligence_niches weak
  ON weak.pidNiche = category_link.nicheId;

DELETE niche
FROM intelligence_niches niche
JOIN weak_intelligence_niches weak
  ON weak.pidNiche = niche.pidNiche;

DROP TEMPORARY TABLE weak_intelligence_niches;

DELETE FROM intelligence_niches
WHERE slug = 'laptop-accessories'
  AND NOT EXISTS (
    SELECT 1
    FROM intelligence_supplier_categories category_link
    WHERE category_link.nicheId = intelligence_niches.pidNiche
  )
  AND NOT EXISTS (
    SELECT 1
    FROM intelligence_report_products report
    WHERE report.nicheId = intelligence_niches.pidNiche
  );

UPDATE intelligence_niches
SET name = 'Body Cameras', slug = 'body-cameras', updatedAt = NOW(3)
WHERE slug = 'body-cams';

UPDATE intelligence_niches
SET name = 'Electric Vehicles', updatedAt = NOW(3)
WHERE slug = 'electric-vehicles';

UPDATE intelligence_niches SET name = 'Electric Motorcycles', updatedAt = NOW(3) WHERE slug = 'electric-motorcycles';
UPDATE intelligence_niches SET name = 'Electric Tricycles', updatedAt = NOW(3) WHERE slug = 'electric-tricycles';
UPDATE intelligence_niches SET name = 'Golf Carts', updatedAt = NOW(3) WHERE slug = 'golf-carts';
UPDATE intelligence_niches SET name = 'Lace Frontals and Closures', updatedAt = NOW(3) WHERE slug = 'lace-frontals-and-closures';
UPDATE intelligence_niches SET name = 'Lace Wigs', updatedAt = NOW(3) WHERE slug = 'lace-wigs';
UPDATE intelligence_niches SET name = 'Phone Chargers', updatedAt = NOW(3) WHERE slug = 'phone-chargers';
UPDATE intelligence_niches SET name = 'Power Banks', updatedAt = NOW(3) WHERE slug = 'power-banks';
UPDATE intelligence_niches SET name = 'Raw Hair Bundles', updatedAt = NOW(3) WHERE slug = 'raw-hair-bundles';
UPDATE intelligence_niches SET name = 'Screen Protectors', updatedAt = NOW(3) WHERE slug = 'screen-protectors';
UPDATE intelligence_niches SET name = 'Wireless Chargers', updatedAt = NOW(3) WHERE slug = 'wireless-chargers';

UPDATE intelligence_niches
SET name = 'Poultry Battery Cage Systems', slug = 'poultry-battery-cage-systems', updatedAt = NOW(3)
WHERE slug = 'poultry-battery-cages';

UPDATE intelligence_niches
SET name = 'Solar Refrigeration and Ice-Making Equipment', slug = 'solar-refrigeration-and-ice-making-equipment', updatedAt = NOW(3)
WHERE slug = 'solar-powered-commercial-ice-maker-and-freezer';

UPDATE intelligence_niches
SET name = 'Spray Dryers', slug = 'spray-dryers', updatedAt = NOW(3)
WHERE slug = 'spray-dryer';
