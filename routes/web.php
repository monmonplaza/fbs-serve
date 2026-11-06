<?php

use Illuminate\Support\Facades\Route;

/*
| Pages. Each staff module is one Inertia page (resources/js/pages/<module>/<Module>Page.tsx) inside the AppShell layout.
| The JSON the pages read lives in routes/api.php under /api.
*/
Route::redirect('/', '/dashboard');
Route::inertia('/login', 'auth/LoginPage')->name('login');
Route::inertia('/guest', 'guest/GuestPage')->name('guest');

foreach (['dashboard', 'orders', 'kitchen', 'foods', 'tables', 'reservations', 'settings', 'guide'] as $module) {
    Route::inertia("/{$module}", "{$module}/".ucfirst($module).'Page')->name($module);
}
