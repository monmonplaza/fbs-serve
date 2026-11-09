<?php

namespace App\Http\Controllers\v1\Settings;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Restaurant-wide settings (one record, so no crudModule): GET /settings and PATCH /settings. */
class SettingsController extends Controller
{
    public function show(): JsonResponse
    {
        return $this->respond(AppSetting::current());
    }

    public function update(Request $request): JsonResponse
    {
        $v = $request->validate([
            'tableTimerOn' => ['sometimes', 'boolean'],
            'tableTimerMins' => ['sometimes', 'integer', 'min:1', 'max:600'],
        ]);
        $s = AppSetting::current();
        $s->update(array_filter([
            'table_timer_on' => $v['tableTimerOn'] ?? null,
            'table_timer_mins' => $v['tableTimerMins'] ?? null,
        ], fn ($x) => $x !== null));

        return $this->respond($s->refresh(), 'Saved');
    }

    private function respond(AppSetting $s, string $message = ''): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => ['tableTimerOn' => $s->table_timer_on, 'tableTimerMins' => $s->table_timer_mins],
        ]);
    }
}
