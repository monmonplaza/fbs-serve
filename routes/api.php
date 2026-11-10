<?php

use App\Http\Controllers\Public\GuestController;
use App\Http\Controllers\v1\Files\UploadController;
use App\Http\Controllers\v1\Kitchen\KitchenController;
use App\Http\Controllers\v1\Menu\CategoryController;
use App\Http\Controllers\v1\Menu\FoodController;
use App\Http\Controllers\v1\Orders\DiscountController;
use App\Http\Controllers\v1\Orders\OrderController;
use App\Http\Controllers\v1\Orders\PaymentMethodController;
use App\Http\Controllers\v1\Reservations\ReservationController;
use App\Http\Controllers\v1\Settings\SettingsController;
use App\Http\Controllers\v1\Staff\ProfileController;
use App\Http\Controllers\v1\Staff\RoleController;
use App\Http\Controllers\v1\Staff\UserController;
use App\Http\Controllers\v1\Tables\FloorController;
use App\Http\Controllers\v1\Tables\TableController;
use Illuminate\Support\Facades\Route;

/*
| Staff API. Local and testing only until authentication exists (see App\Http\Middleware\DevOpen and docs/BACKEND.md).
| Custom POST routes are registered BEFORE Route::crudModule (docs/reusable-components-in-all-projects.md, section 6.1).
*/
Route::middleware('dev.open')->group(function () {
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders/{code}/pay', [OrderController::class, 'pay']);
    Route::post('/orders/{code}/pickup', [OrderController::class, 'pickup']);
    Route::post('/orders/{code}/handover', [OrderController::class, 'handover']);
    Route::post('/takeout', [OrderController::class, 'takeout']);

    Route::get('/kitchen/queue', [KitchenController::class, 'queue']);
    Route::patch('/orders/{code}/advance', [KitchenController::class, 'advance']);
    Route::patch('/orders/{code}/ready', [KitchenController::class, 'ready']);
    Route::patch('/orders/{code}/serve', [KitchenController::class, 'serve']);

    Route::post('/tables/{id}/activate', [TableController::class, 'activate'])->whereNumber('id');
    Route::post('/tables/{id}/clean', [TableController::class, 'clean'])->whereNumber('id');
    Route::post('/tables/{id}/order', [TableController::class, 'order'])->whereNumber('id');
    Route::post('/tables/{id}/pay', [TableController::class, 'pay'])->whereNumber('id');
    Route::patch('/tables/{id}/position', [TableController::class, 'position'])->whereNumber('id');

    Route::get('/settings', [SettingsController::class, 'show']);
    Route::patch('/settings', [SettingsController::class, 'update']);
    Route::post('/uploads', [UploadController::class, 'store']);

    Route::patch('/reservations/{id}/move', [ReservationController::class, 'move'])->whereNumber('id');
    Route::patch('/reservations/{id}/move-day', [ReservationController::class, 'moveToDay'])->whereNumber('id');
    Route::patch('/reservations/{id}/cancel', [ReservationController::class, 'cancel'])->whereNumber('id');
    Route::patch('/reservations/{id}/no-show', [ReservationController::class, 'noShow'])->whereNumber('id');
    Route::patch('/reservations/{id}/restore', [ReservationController::class, 'restore'])->whereNumber('id');
    Route::patch('/reservations/{id}/dismiss', [ReservationController::class, 'dismiss'])->whereNumber('id');
    Route::post('/reservations/{id}/seat', [ReservationController::class, 'seat'])->whereNumber('id');
    Route::crudModule('/reservations', ReservationController::class, 'reservations', ['index', 'store', 'update', 'destroy']);
    Route::crudModule('/roles', RoleController::class, 'roles', ['index', 'store', 'update', 'destroy']);
    Route::post('/users/{id}/profile', [ProfileController::class, 'update'])->whereNumber('id');
    Route::post('/users/{id}/password', [ProfileController::class, 'password'])->whereNumber('id');
    Route::crudModule('/users', UserController::class, 'users', ['index', 'store', 'update', 'destroy']);

    Route::crudModule('/foods', FoodController::class, 'foods');
    Route::crudModule('/categories', CategoryController::class, 'categories');
    Route::crudModule('/tables', TableController::class, 'tables');
    Route::crudModule('/floors', FloorController::class, 'floors');
    Route::crudModule('/payment-methods', PaymentMethodController::class, 'payment-methods', ['index', 'store', 'update', 'destroy']);
    Route::crudModule('/discounts', DiscountController::class, 'discounts', ['index', 'store', 'update', 'destroy']);
});

/*
| Guest phone. Token-scoped (`k` = the table session's QR token) and rate limited. `__takeout` is the Takeout QR's pseudo table.
*/
Route::prefix('public')->middleware(['dev.open', 'throttle:120,1'])->group(function () {
    // A wrong table code costs an attempt: 10 tries a minute per device (AppServiceProvider), so 4 digits cannot be guessed quickly.
    Route::post('/tables/{table}/join', [GuestController::class, 'joinWithCode'])->middleware('throttle:table-code');
    Route::get('/tables/{table}/session', [GuestController::class, 'join']);
    Route::get('/tables/{table}/plate', [GuestController::class, 'plate']);
    Route::post('/tables/{table}/plate-lines', [GuestController::class, 'addLine']);
    Route::patch('/tables/{table}/plate-lines/{line}', [GuestController::class, 'updateLine'])->whereNumber('line');
    Route::post('/tables/{table}/send', [GuestController::class, 'send']);
    Route::post('/tables/{table}/bill-out', [GuestController::class, 'billOut']);
    Route::post('/takeout', [GuestController::class, 'placeTakeout']);
});
