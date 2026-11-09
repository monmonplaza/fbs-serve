<?php

namespace App\Http\Controllers\v1\Files;

use App\Http\Controllers\Controller;
use App\Support\StoredFile;
use App\Traits\HandlesFileUploads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Receives one picture, stores it privately on the default disk (DigitalOcean Spaces) and returns a short-lived link to it. */
class UploadController extends Controller
{
    use HandlesFileUploads;

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'file' => ['required', 'file', 'mimes:png,jpg,jpeg,webp,gif', 'max:4096'],
            'folder' => ['required', Rule::in(StoredFile::FOLDERS)],
        ], ['file.mimes' => 'Choose a PNG, JPG, WEBP or GIF picture.', 'file.max' => 'The picture must be 4 MB or smaller.']);

        $path = $this->storeUploadedFile($request, 'file', $v['folder']);

        return response()->json(['success' => true, 'message' => 'Uploaded', 'data' => ['path' => $path, 'url' => StoredFile::url($path)]], 201);
    }
}
