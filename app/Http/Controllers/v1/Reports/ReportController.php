<?php

namespace App\Http\Controllers\v1\Reports;

use App\Http\Controllers\Controller;
use App\Support\SalesReport;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Reports for managers and the owner. Days are the restaurant's days (RESTAURANT_TIMEZONE), not UTC. */
class ReportController extends Controller
{
    private const MAX_DAYS = 366;

    /**
     * GET /api/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD&group=auto|day|week|month[&compare_from=...&compare_to=...]
     * The comparison is the period right before by default; pass compare_from and compare_to for another one, such as the same
     * days last week.
     */
    public function sales(Request $request): JsonResponse
    {
        $v = $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            'group' => ['sometimes', 'in:auto,day,week,month'],
            'compare_from' => ['required_with:compare_to', 'date_format:Y-m-d'],
            'compare_to' => ['required_with:compare_from', 'date_format:Y-m-d', 'after_or_equal:compare_from'],
        ], ['to.after_or_equal' => 'The end date must be the same as or after the start date.', 'compare_to.after_or_equal' => 'The comparison end date must be the same as or after its start date.']);
        $tz = config('app.restaurant_timezone');
        $from = CarbonImmutable::createFromFormat('Y-m-d', $v['from'], $tz)->startOfDay();
        $to = CarbonImmutable::createFromFormat('Y-m-d', $v['to'], $tz)->startOfDay();
        $days = (int) $from->diffInDays($to) + 1;
        if ($days > self::MAX_DAYS) {
            return response()->json(['success' => false, 'message' => 'Pick a range of '.self::MAX_DAYS.' days or fewer.', 'errors' => ['to' => ['The range is too long.']]], 422);
        }
        $group = ($v['group'] ?? 'auto') === 'auto' ? SalesReport::autoGroup($days) : $v['group'];
        $compare = null;
        if (isset($v['compare_from'])) {
            $compare = [CarbonImmutable::createFromFormat('Y-m-d', $v['compare_from'], $tz)->startOfDay(), CarbonImmutable::createFromFormat('Y-m-d', $v['compare_to'], $tz)->startOfDay()];
            if ($compare[0]->diffInDays($compare[1]) + 1 > self::MAX_DAYS) {
                return response()->json(['success' => false, 'message' => 'Pick a comparison of '.self::MAX_DAYS.' days or fewer.', 'errors' => ['compare_to' => ['The range is too long.']]], 422);
            }
        }

        return response()->json(['success' => true, 'message' => '', 'data' => SalesReport::build($from, $to, $group, $compare)]);
    }
}
