<?php

namespace App\Http\Controllers;

use App\Models\MlPdf;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MlPdfsController extends Controller
{
    public function download(MlPdf $mlPdf): StreamedResponse
    {
        if (!$mlPdf->pdf_path) {
            abort(404);
        }

        $path = $mlPdf->pdf_path;
        $storage = Storage::disk('local');

        if (!$storage->exists($path)) {
            $altPath = 'private/' . ltrim($path, '/');
            if (!$storage->exists($altPath)) {
                abort(404);
            }
            $path = $altPath;
        }

        return $storage->download($path, basename($path));
    }
}
