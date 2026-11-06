<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/** A business-rule failure with a message the UI shows in a toast. Rendered as `{ success: false, message, errors? }`. */
class ApiException extends RuntimeException
{
    public function __construct(string $message, public readonly int $status = 422, public readonly array $errors = [])
    {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json(array_filter([
            'success' => false,
            'message' => $this->getMessage(),
            'errors' => $this->errors ?: null,
        ], fn ($v) => $v !== null), $this->status);
    }
}
