import { Loader2 } from 'lucide-react';

interface PdfViewerProps {
  pdfUrl: string | null;
  isLoading?: boolean;
}

export function PdfViewer({ pdfUrl, isLoading = false }: PdfViewerProps) {
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Compiling LaTeX...</p>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center p-8">
          <svg
            className="h-24 w-24 text-gray-400 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
            No PDF preview available
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            Click "Compile PDF" to generate preview
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-100 dark:bg-gray-900">
      <iframe
        src={pdfUrl}
        className="w-full h-full border-0"
        title="PDF Preview"
      />
    </div>
  );
}
