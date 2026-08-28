-- Restore English category names that were stored as random tokens (e.g. "onaovj").
UPDATE "categories" SET name = 'Dosa' WHERE slug = 'dosa';
UPDATE "categories" SET name = 'Idly' WHERE slug = 'idly';
UPDATE "categories" SET name = 'Vada' WHERE slug = 'vada';
UPDATE "categories" SET name = 'Biryani' WHERE slug = 'biryani';
UPDATE "categories" SET name = 'Rice' WHERE slug = 'rice';
UPDATE "categories" SET name = 'Meals' WHERE slug = 'meals';
UPDATE "categories" SET name = 'Beverages' WHERE slug = 'beverages';
UPDATE "categories" SET name = 'Combos' WHERE slug = 'combos';
