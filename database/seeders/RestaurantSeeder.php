<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\DiningTable;
use App\Models\Discount;
use App\Models\Floor;
use App\Models\Food;
use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;

/**
 * Starter menu, payment methods, discounts and floor plan, taken from the prototype data (menu.json, exported from src/api/seedData.ts).
 * Idempotent: running it again updates rows by name instead of duplicating them.
 */
class RestaurantSeeder extends Seeder
{
    public function run(): void
    {
        $d = json_decode(file_get_contents(__DIR__.'/menu.json'), true, flags: JSON_THROW_ON_ERROR);

        $cats = [];
        foreach ($d['categories'] as $c) {
            $cats[$c['id']] = Category::query()->updateOrCreate(['name' => $c['name']], ['description' => $c['desc']])->id;
        }

        foreach ($d['foods'] as $f) {
            $food = Food::query()->updateOrCreate(['name' => $f['name'], 'category_id' => $cats[$f['cat']]], [
                'price' => $f['price'], 'description' => $f['desc'], 'status' => $f['status'], 'eta_minutes' => $f['eta'], 'tags' => $f['tags'],
            ]);
            if (! empty($f['variants']) && $food->variants()->doesntExist()) {
                foreach ($f['variants'] as $i => $v) {
                    $food->variants()->create(['name' => $v['name'], 'price' => $v['price'], 'position' => $i]);
                }
            }
        }

        foreach ($d['payments'] as $p) {
            PaymentMethod::query()->updateOrCreate(['name' => $p['name']], ['details' => $p['details'], 'active' => $p['active'], 'needs_ref' => $p['name'] !== 'Cash']);
        }
        foreach ($d['discounts'] as $x) {
            Discount::query()->updateOrCreate(['name' => $x['name']], ['pct' => $x['pct'], 'note' => $x['note'], 'active' => $x['active']]);
        }

        $floors = [];
        foreach ($d['floors'] as $f) {
            $floors[$f['id']] = Floor::query()->updateOrCreate(['name' => $f['name']])->id;
        }
        foreach ($d['tables'] as $t) {
            DiningTable::query()->updateOrCreate(['floor_id' => $floors[$t['floor']], 'name' => $t['name']], ['seats' => $t['seats'], 'x' => $t['x'], 'y' => $t['y']]);
        }

        // One table already seated, so the guest QR (#t=<id>&k=abc123) works right after seeding.
        $t4 = DiningTable::query()->where('name', 'Table 4')->first();
        if ($t4 && $t4->sessions()->doesntExist()) {
            $t4->sessions()->create(['token' => 'abc123', 'guests' => 3, 'opened_at' => now()]);
            $t4->update(['status' => 'active']);
        }
    }
}
