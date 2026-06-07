<?php

namespace App\Http\Controllers;

use App\Models\MlPdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Inertia\Inertia;

class MlPdfsController extends Controller
{
    public function index(Request $request)
    {
        $type = $request->get('type', 'all');

        $query = MlPdf::query()->with('order');

        if ($type === 'flex') {
            $query->where('logistic_type', 'self_service');
        } elseif ($type === 'ml') {
            $query->where(function ($q) {
                $q->whereNull('logistic_type')
                  ->orWhere('logistic_type', '!=', 'self_service');
            });
        }

        $pdfs = $query->orderByDesc('downloaded_at')->paginate(20)->withQueryString();

        return Inertia::render('Pdfs/Index', [
            'pdfs' => $pdfs,
            'type' => $type,
            'counts' => [
                'all' => MlPdf::count(),
                'flex' => MlPdf::where('logistic_type', 'self_service')->count(),
                'ml' => MlPdf::where(function ($q) {
                    $q->whereNull('logistic_type')
                      ->orWhere('logistic_type', '!=', 'self_service');
                })->count(),
            ],
        ]);
    }

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
