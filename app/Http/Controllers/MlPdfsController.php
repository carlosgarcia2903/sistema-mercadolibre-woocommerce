<?php

namespace App\Http\Controllers;

use App\Models\MlPdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Inertia\Inertia;

class MlPdfsController extends Controller
{
    public function index()
    {
        $pdfs = MlPdf::query()
            ->with('order')
            ->orderByDesc('downloaded_at')
            ->paginate(20);

        return Inertia::render('Pdfs/Index', [
            'pdfs' => $pdfs,
        ]);
    }

    public function download(MlPdf $mlPdf): StreamedResponse
    {
        if (!$mlPdf->pdf_path || !Storage::disk('local')->exists($mlPdf->pdf_path)) {
            abort(404);
        }

        return Storage::disk('local')->download($mlPdf->pdf_path, basename($mlPdf->pdf_path));
    }
}
