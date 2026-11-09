<?php

namespace App\Support;

use App\Traits\HandlesFileUploads;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Picture fields (food photos, payment QR codes) hold the stored path of a private file. The API shows a short-lived
 * link instead, and the form sends that link back on save, so this turns links into paths again. Values that are not
 * our files (old data URLs, pictures hosted elsewhere) pass through unchanged.
 */
final class StoredFile
{
    use HandlesFileUploads;

    public const FOLDERS = ['foods', 'payments'];

    /** Link minutes, and how long one link is reused: screens refetch every few seconds, and a new link each time would reload the picture. */
    private const LINK_MINUTES = 60;

    private const REUSE_MINUTES = 50;

    public static function url(?string $value): ?string
    {
        if (! self::isPath($value)) {
            return $value;
        }

        return Cache::remember(self::cacheKey($value), now()->addMinutes(self::REUSE_MINUTES), fn () => self::fileUrl($value, self::LINK_MINUTES));
    }

    /** The stored path behind a submitted value: a path, one of our links, or something else that is kept as is. */
    public static function toPath(?string $value): ?string
    {
        if ($value === null || $value === '' || self::isPath($value)) {
            return $value ?: null;
        }
        if (! preg_match('#^https?://#i', $value) && ! str_starts_with($value, '/')) {
            return $value;
        }
        $p = ltrim(rawurldecode((string) parse_url($value, PHP_URL_PATH)), '/');
        $bucket = (string) config('filesystems.disks.'.config('filesystems.default').'.bucket');
        foreach ([$p, preg_replace('#^storage/#', '', $p), $bucket !== '' ? preg_replace('#^'.preg_quote($bucket, '#').'/#', '', $p) : $p] as $candidate) {
            if (self::isPath($candidate)) {
                return $candidate;
            }
        }

        return $value;
    }

    /**
     * Deletes these files once the transaction commits. Values that are not our files are skipped.
     *
     * @param  iterable<?string>  $values
     */
    public static function forget(iterable $values): void
    {
        $paths = collect($values)->filter(fn ($v) => self::isPath($v))->values()->all();
        if ($paths) {
            DB::afterCommit(function () use ($paths) {
                $self = new self;
                foreach ($paths as $path) {
                    Cache::forget(self::cacheKey($path));
                    rescue(fn () => $self->deleteStoredFile($path), report: true);
                }
            });
        }
    }

    public static function isPath(?string $value): bool
    {
        if (! is_string($value) || $value === '' || str_contains($value, '://') || str_starts_with($value, 'data:')) {
            return false;
        }
        $root = (string) config('filesystems.disks.'.config('filesystems.default').'.folder', '');
        foreach (self::FOLDERS as $folder) {
            if (str_starts_with($value, trim($root.'/'.$folder, '/').'/')) {
                return true;
            }
        }

        return false;
    }

    private static function cacheKey(string $path): string
    {
        return 'file-url:'.config('filesystems.default').':'.$path;
    }
}
