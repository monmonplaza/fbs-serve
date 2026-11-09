<?php

namespace App\Traits;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

trait HandlesFileUploads
{
    /** Stores one uploaded file under {AWS_BUCKET_FOLDER}/{folder}; null when none was sent. */
    protected function storeUploadedFile(Request $request, string $key, string $folder): ?string
    {
        $file = $request->file($key);
        if (! $file instanceof UploadedFile) {
            return null;
        }
        $disk = config('filesystems.default');
        // config(), not env(): env() is null once config:cache runs in production.
        $dir = trim(config("filesystems.disks.{$disk}.folder", '').'/'.$folder, '/');

        return $file->store($dir, $disk);
    }

    /** Short-lived link for a private file; plain URL on the local disk. */
    protected static function fileUrl(?string $path, int $minutes = 60): ?string
    {
        if (! $path) {
            return null;
        }
        try {
            return Storage::temporaryUrl($path, now()->addMinutes($minutes));
        } catch (\RuntimeException) {
            return Storage::url($path);
        }
    }

    protected function deleteStoredFile(?string $path): void
    {
        if ($path) {
            Storage::delete($path);
        }
    }
}
