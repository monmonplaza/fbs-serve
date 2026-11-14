<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Vite;
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
        // The Wi-Fi server (phones) must always load the built files. A running Vite dev server writes public/hot, which points
        // the pages at [::1]:5173, an address a phone cannot reach. With VITE_USE_BUILD=true the hot file is ignored.
        if (env('VITE_USE_BUILD', false)) {
            Vite::useHotFile(storage_path('framework/vite-disabled.hot'));
        }

        // The envelope is added by BaseController::sendResponse, so a Resource must not wrap itself in `data`.
        JsonResource::withoutWrapping();

        // Table codes are 4 digits: 10 tries a minute per device and table, counted apart from the general guest limit.
        RateLimiter::for('table-code', fn (Request $request) => Limit::perMinute(10)->by('table-code|'.$request->ip().'|'.$request->route('table')));

        // Section 6.1. Register any custom POST route BEFORE calling this, or `POST /{id}` captures it.
        Route::macro('crudModule', function (string $prefix, string $controller, string $name, ?array $only = null) {
            Route::prefix($prefix)->name($name.'.')->group(function () use ($controller, $only) {
                $has = fn (string $action) => $only === null || in_array($action, $only, true);
                if ($has('index')) {
                    Route::get('/', [$controller, 'index'])->name('index');
                }
                if ($has('paginationSearch')) {
                    Route::get('/pagination-search', [$controller, 'paginationSearch'])->name('pagination-search');
                }
                if ($has('searchActive')) {
                    Route::get('/search-active', [$controller, 'searchActive'])->name('search-active');
                }
                if ($has('lookup')) {
                    Route::get('/lookup', [$controller, 'lookup'])->name('lookup');
                }
                if ($has('inUse')) {
                    Route::get('/{id}/in-use', [$controller, 'inUse'])->whereNumber('id')->name('in-use');
                }
                if ($has('store')) {
                    Route::post('/', [$controller, 'store'])->name('store');
                }
                if ($has('update')) {
                    Route::post('/{id}', [$controller, 'update'])->whereNumber('id')->name('update');
                }
                if ($has('archive')) {
                    Route::patch('/{id}/archive', [$controller, 'archive'])->whereNumber('id')->name('archive');
                }
                if ($has('restore')) {
                    Route::patch('/{id}/restore', [$controller, 'restore'])->whereNumber('id')->name('restore');
                }
                if ($has('destroy')) {
                    Route::delete('/{id}', [$controller, 'destroy'])->whereNumber('id')->name('destroy');
                }
            });
        });
    }
}
