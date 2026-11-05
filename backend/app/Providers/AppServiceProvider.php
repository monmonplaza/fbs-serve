<?php

namespace App\Providers;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // The envelope is added by BaseController::sendResponse, so a Resource must not wrap itself in `data`.
        JsonResource::withoutWrapping();

        // Section 6.1. Register any custom POST route BEFORE calling this, or `POST /{id}` captures it.
        Route::macro('crudModule', function (string $prefix, string $controller, string $name, ?array $only = null) {
            Route::prefix($prefix)->name($name.'.')->group(function () use ($controller, $only) {
                $has = fn (string $action) => $only === null || in_array($action, $only, true);
                if ($has('index')) Route::get('/', [$controller, 'index'])->name('index');
                if ($has('paginationSearch')) Route::get('/pagination-search', [$controller, 'paginationSearch'])->name('pagination-search');
                if ($has('searchActive')) Route::get('/search-active', [$controller, 'searchActive'])->name('search-active');
                if ($has('lookup')) Route::get('/lookup', [$controller, 'lookup'])->name('lookup');
                if ($has('inUse')) Route::get('/{id}/in-use', [$controller, 'inUse'])->whereNumber('id')->name('in-use');
                if ($has('store')) Route::post('/', [$controller, 'store'])->name('store');
                if ($has('update')) Route::post('/{id}', [$controller, 'update'])->whereNumber('id')->name('update');
                if ($has('archive')) Route::patch('/{id}/archive', [$controller, 'archive'])->whereNumber('id')->name('archive');
                if ($has('restore')) Route::patch('/{id}/restore', [$controller, 'restore'])->whereNumber('id')->name('restore');
                if ($has('destroy')) Route::delete('/{id}', [$controller, 'destroy'])->whereNumber('id')->name('destroy');
            });
        });
    }
}
