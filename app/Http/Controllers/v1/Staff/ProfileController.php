<?php

namespace App\Http\Controllers\v1\Staff;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\StoredFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/** A user's own profile page: photo, name, email, contact number, address and password. */
class ProfileController extends Controller
{
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::query()->findOrFail($id);
        $v = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+()\\-\\s]*$/'],
            'address' => ['nullable', 'string', 'max:255'],
            'avatar' => ['nullable', 'string', 'max:2000'],
        ], ['phone.regex' => 'The contact number can only have numbers, spaces, +, - and brackets.', 'email.unique' => 'Another user already has that email.']);

        DB::transaction(function () use ($user, $v) {
            $avatar = StoredFile::toPath($v['avatar'] ?? null);
            if ($avatar !== $user->avatar) {
                StoredFile::forget([$user->avatar]); // the old photo is replaced or removed
            }
            $clean = fn (?string $s) => ($s = trim((string) $s)) === '' ? null : $s;
            $user->update([
                'name' => trim($v['name']), 'email' => $clean($v['email'] ?? null), 'phone' => $clean($v['phone'] ?? null),
                'address' => $clean($v['address'] ?? null), 'avatar' => $avatar,
            ]);
        });

        return $this->respond($user->refresh(), 'Profile saved');
    }

    /** Sets a new password. Once a password exists, the current one is needed to change it. */
    public function password(Request $request, int $id): JsonResponse
    {
        $user = User::query()->findOrFail($id);
        $v = $request->validate([
            'currentPassword' => [$user->password !== null ? 'required' : 'nullable', 'string'],
            'password' => ['required', 'string', 'min:8', 'max:100', 'confirmed'],
        ], ['password.confirmed' => 'The new passwords do not match.', 'password.min' => 'Use at least 8 characters.']);
        if ($user->password !== null && ! Hash::check($v['currentPassword'], $user->password)) {
            throw new ApiException('The current password is not correct.', 422, ['currentPassword' => ['The current password is not correct.']]);
        }
        $user->update(['password' => $v['password']]);

        return $this->respond($user->refresh(), 'Password changed');
    }

    private function respond(User $user, string $message): JsonResponse
    {
        return response()->json(['success' => true, 'message' => $message, 'data' => (new UserResource($user))->resolve()]);
    }
}
