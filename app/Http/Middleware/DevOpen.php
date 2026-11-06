<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Staff routes have no authentication yet. Until Sanctum login and the role policies exist (docs/BACKEND.md, "Not covered yet"),
 * refuse them anywhere except local and testing, so a deploy can never expose them by accident.
 */
class DevOpen
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! app()->environment('local', 'testing')) {
            return response()->json(['success' => false, 'message' => 'Staff authentication is not set up yet.'], 403);
        }

        return $next($request);
    }
}
