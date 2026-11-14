<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\DiningTable;
use App\Models\Discount;
use App\Models\Floor;
use App\Models\Food;
use App\Models\Ingredient;
use App\Models\PaymentMethod;
use App\Models\RecipeLine;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\StockMovement;
use App\Models\User;
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

        $this->seedStaff();
        $this->seedReservations();
        $this->seedInventory();

        // One table already seated, so the guest QR (#t=<id>&k=abc123) works right after seeding.
        $t4 = DiningTable::query()->where('name', 'Table 4')->first();
        if ($t4 && $t4->sessions()->doesntExist()) {
            $t4->sessions()->create(['token' => 'abc123', 'code' => '1234', 'guests' => 3, 'opened_at' => now()]);
            $t4->update(['status' => 'active']);
        }
    }

    /** The demo roles and accounts of the login page. There is no password login yet, so the accounts have none. */
    private function seedStaff(): void
    {
        $all = ['dashboard', 'orders', 'reservations', 'kitchen', 'foods', 'tables', 'settings', 'guide'];
        $roles = [];
        foreach ([
            ['Admin', $all, true],
            ['Manager', ['dashboard', 'orders', 'reservations', 'foods', 'tables', 'guide'], false],
            ['Waiter', ['orders', 'reservations', 'kitchen', 'tables', 'guide'], false],
            ['Kitchen staff', ['kitchen', 'guide'], false],
            ['Cashier', ['dashboard', 'orders', 'reservations', 'tables', 'guide'], false],
        ] as [$name, $modules, $admin]) {
            $roles[$name] = Role::query()->updateOrCreate(['name' => $name], ['modules' => $modules, 'is_admin' => $admin])->id;
        }
        foreach ([
            ['Maria Santos', 'maria', 'Admin', true],
            ['Jun Reyes', 'jun', 'Waiter', true],
            ['Carla dela Cruz', 'carla', 'Waiter', true],
            ['Ben Ramos', 'ben', 'Kitchen staff', true],
            ['Liza Mendoza', 'liza', 'Cashier', false],
        ] as [$name, $username, $role, $active]) {
            User::query()->updateOrCreate(['username' => $username], ['name' => $name, 'role_id' => $roles[$role], 'active' => $active]);
        }
    }

    /** A few bookings around "now" so the Reservations screen and the reminders have something to show. Only when there are none. */
    /** Demo stock and recipes for a few best sellers, only when no ingredient exists yet. Other dishes are not tracked until they get a recipe. */
    private function seedInventory(): void
    {
        if (Ingredient::query()->exists()) {
            return;
        }
        // name => [unit, opening stock, reorder level, cost per unit]
        $stock = [
            'Rice' => ['g', 20000, 5000, 0.06], 'Garlic' => ['g', 1500, 300, 0.12], 'Cooking oil' => ['ml', 12000, 3000, 0.09],
            'Pork' => ['g', 15000, 4000, 0.32], 'Beef' => ['g', 9000, 2500, 0.55], 'Chicken' => ['g', 12000, 3000, 0.22],
            'Squid' => ['g', 5000, 1200, 0.35], 'Spring roll wrapper' => ['pc', 400, 100, 2.5], 'Peanut sauce' => ['ml', 4000, 800, 0.1],
            'Pizza dough' => ['g', 8000, 2000, 0.08], 'Cheese' => ['g', 5000, 1000, 0.45], 'Coffee beans' => ['g', 3000, 600, 0.9],
            'Ube halaya' => ['g', 3000, 600, 0.3], 'Shaved ice' => ['g', 20000, 4000, 0.02],
        ];
        $id = [];
        foreach ($stock as $name => [$unit, $open, $reorder, $cost]) {
            $i = Ingredient::query()->create(['name' => $name, 'unit' => $unit, 'on_hand' => $open, 'reorder_level' => $reorder, 'cost' => $cost]);
            StockMovement::query()->create(['ingredient_id' => $i->id, 'type' => 'received', 'qty' => $open, 'balance' => $open, 'note' => 'Opening stock', 'by' => 'Seeder']);
            $id[$name] = $i->id;
        }
        // dish => [[ingredient, qty per portion, size name or null for every size]]
        $recipes = [
            'Garlic Rice' => [['Rice', 180], ['Garlic', 8], ['Cooking oil', 10]],
            'Java Rice' => [['Rice', 180], ['Cooking oil', 10]],
            'Lumpiang Shanghai' => [['Pork', 120], ['Spring roll wrapper', 8], ['Cooking oil', 60]],
            'Calamares' => [['Squid', 200], ['Cooking oil', 80]],
            'Kare-Kare' => [['Beef', 300], ['Peanut sauce', 120]],
            'Chicken Inasal' => [['Chicken', 280], ['Garlic', 6]],
            'Classic Pizza' => [['Pizza dough', 160, 'Small'], ['Pizza dough', 240, 'Medium'], ['Pizza dough', 320, 'Large'], ['Cheese', 80, 'Small'], ['Cheese', 120, 'Medium'], ['Cheese', 160, 'Large']],
            'Sizzling Sisig' => [['Pork', 180, 'Solo'], ['Pork', 340, 'Good for 2'], ['Pork', 700, 'Platter']],
            'Iced Coffee' => [['Coffee beans', 12, '12 oz'], ['Coffee beans', 16, '16 oz'], ['Coffee beans', 22, '22 oz']],
            'Halo-Halo' => [['Shaved ice', 250], ['Ube halaya', 40]],
        ];
        foreach ($recipes as $dish => $lines) {
            $food = Food::query()->with('variants')->where('name', $dish)->first();
            foreach ($food ? $lines : [] as $l) {
                $variant = isset($l[2]) ? $food->variants->firstWhere('name', $l[2])?->id : null;
                if (! isset($l[2]) || $variant) {
                    RecipeLine::query()->create(['food_id' => $food->id, 'variant_id' => $variant, 'ingredient_id' => $id[$l[0]], 'qty' => $l[1]]);
                }
            }
        }
    }

    private function seedReservations(): void
    {
        if (Reservation::query()->exists()) {
            return;
        }
        $table = fn (string $n) => DiningTable::query()->where('name', "Table {$n}")->value('id');
        $in = fn (int $days, int $h, int $m = 0) => now()->addDays($days)->setTime($h, $m);
        foreach ([
            ['Santos family', '0917 555 0142', 4, now()->addMinutes(18), '15', 'booked', 'Birthday. Bring a candle.'],
            ['Reyes', '0918 555 0177', 2, now()->addMinutes(50), '11', 'booked', ''],
            ['Garcia', '0920 555 0108', 2, now()->subMinutes(190), '9', 'arrived', ''],
            ['Lim', '0917 555 0123', 6, $in(1, 19), '8', 'booked', ''],
            ['Ramos', '0919 555 0166', 5, $in(1, 12), '9', 'booked', ''],
            ['Dela Cruz', '0921 555 0190', 8, $in(2, 12, 30), '14', 'booked', 'Company lunch. Needs a receipt.'],
            ['Tan', '0922 555 0135', 3, $in(3, 18, 30), null, 'booked', ''],
            ['Bautista', '0916 555 0172', 2, $in(5, 20), null, 'cancelled', ''],
            ['Mendoza', '0916 555 0150', 4, $in(-1, 19), '5', 'noshow', ''],
        ] as [$name, $phone, $pax, $at, $t, $status, $note]) {
            $r = Reservation::query()->create([
                'name' => $name, 'phone' => $phone, 'pax' => $pax, 'starts_at' => $at, 'table_id' => $t ? $table($t) : null,
                'note' => $note, 'status' => $status, 'cancel_reason' => $status === 'cancelled' ? 'Changed plans' : null, 'dismissed' => in_array($status, ['cancelled', 'noshow'], true),
            ]);
            $r->history()->create(['at' => now()->subDays(2), 'text' => 'Booked']);
        }
    }
}
