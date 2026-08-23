import {
  BOOKABLE_CATEGORIES,
  BOOKABLE_SUB_SERVICES,
  SLUG_TO_CATEGORY_ID,
  type BookableCategoryId,
} from '../../src/constants/bookableCategories';

// tsconfig sets `types: ["jest"]` and the project has no @types/node — adding
// it would put Node's globals in scope for React Native code, where they do not
// belong. Declaring the two things this file needs keeps that blast radius at
// zero.
declare const require: (id: string) => any;
declare const __dirname: string;

const fs = require('fs') as { readFileSync: (p: string, enc: string) => string };
const path = require('path') as { join: (...parts: string[]) => string };

const MIGRATION = path.join(
  __dirname,
  '../../supabase/migrations/20260813000000_025_service_catalog.sql'
);

/**
 * The booking form quoted a hardcoded price while `create_booking` charged
 * `services.base_rate`, and fifteen sub-services collapsed onto three catalog
 * rows — so a 350 touch-up billed at 2000. These tests exist so the app's list
 * and the catalog cannot drift apart again unnoticed.
 */
describe('catalog pricing', () => {
  const sql = fs.readFileSync(MIGRATION, 'utf8');

  // ('slug', 'Name', 'Category', 'Description', 1234.00, interval '1 hour')
  const rows = new Map<string, number>();
  for (const line of sql.split('\n')) {
    const match = line.match(/^\s*\('([a-z-]+)',.*?([0-9]+\.[0-9]{2}),\s*interval\s+'[^']+'\)/);
    if (match) rows.set(match[1], Number(match[2]));
  }

  it('parses every seeded row from the migration', () => {
    expect(rows.size).toBe(Object.keys(SLUG_TO_CATEGORY_ID).length);
  });

  it('gives every bookable sub-service a catalog row', () => {
    const missing = Object.keys(SLUG_TO_CATEGORY_ID).filter((slug) => !rows.has(slug));
    expect(missing).toEqual([]);
  });

  it('seeds no catalog row the app cannot offer', () => {
    const orphans = [...rows.keys()].filter((slug) => !(slug in SLUG_TO_CATEGORY_ID));
    expect(orphans).toEqual([]);
  });

  it('matches the fallback price to the seeded base_rate for every sub-service', () => {
    const mismatches: string[] = [];

    for (const categoryId of Object.keys(BOOKABLE_SUB_SERVICES) as BookableCategoryId[]) {
      for (const sub of BOOKABLE_SUB_SERVICES[categoryId]) {
        const seeded = rows.get(sub.slug);
        if (seeded !== sub.fallbackPrice) {
          mismatches.push(`${sub.slug}: app ${sub.fallbackPrice} vs catalog ${seeded}`);
        }
      }
    }

    // A mismatch means mock mode quotes a price live mode will not charge.
    expect(mismatches).toEqual([]);
  });

  it('keys every sub-service to a real bookable category', () => {
    const ids = BOOKABLE_CATEGORIES.map((c) => c.id);
    for (const categoryId of Object.values(SLUG_TO_CATEGORY_ID)) {
      expect(ids).toContain(categoryId);
    }
  });

  it('has no duplicate slugs across categories', () => {
    const all = (Object.keys(BOOKABLE_SUB_SERVICES) as BookableCategoryId[]).flatMap((id) =>
      BOOKABLE_SUB_SERVICES[id].map((sub) => sub.slug)
    );
    expect(all.length).toBe(new Set(all).size);
  });
});
