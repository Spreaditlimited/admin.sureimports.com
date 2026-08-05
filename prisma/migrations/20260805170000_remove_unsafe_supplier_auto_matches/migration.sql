-- Automatic single-token category matching allowed unrelated suppliers to be
-- associated with a niche. Only primary, research-suggested and admin-curated
-- supplier/category associations are retained.
DELETE FROM `intelligence_supplier_categories`
WHERE `source` = 'auto_match';
