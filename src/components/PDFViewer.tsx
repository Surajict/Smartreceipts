import React, { useState, useEffect } from 'react';
import { FileText, Loader2 } from 'lucide-react';

interface PDFViewerProps {
  url: string;
  alt: string;
  className?: string;
}

/**
 * Enhanced PDF viewer component that generates thumbnails and provides a preview overlay
 * similar to the design shown in the application screenshots.
 * 
 * Features:
 * - Generates PDF thumbnail using PDF.js
 * - Shows loading state while generating preview
 * - Displays overlay with PDF icon and "Open PDF" button on hover
 * - Falls back to original placeholder design if thumbnail generation fails
 * - Handles PDF fetching and rendering with proper error handling
 */
const PDFViewer: React.FC<PDFViewerProps> = ({ url, alt, className }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const generateThumbnail = async () => {
      try {
        setIsLoading(true);
        setError(false);

        // Fetch the PDF
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();

        // Load PDF using PDF.js
        const pdf = await import('pdfjs-dist').then(pdfjsLib => {
          // Set worker source if not already set
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
          }
          return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        });

        // Get first page
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Failed to get canvas context');

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render PDF page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        // Convert canvas to data URL with optimized quality
        const dataUrl = canvas.toDataURL('image/png', 0.8);
        setThumbnailUrl(dataUrl);
      } catch (err) {
        console.error('Error generating PDF thumbnail:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (url) {
      generateThumbnail();
    }
  }, [url]);

  if (error) {
    // Fallback to original design when thumbnail generation fails
    return (
      <div className={`bg-gradient-to-br from-red-50 to-red-100 rounded-lg flex flex-col items-center justify-center p-4 border-2 border-red-200 ${className}`}>
        <FileText className="h-12 w-12 text-red-500 mb-2" />
        <span className="text-sm text-gray-700 text-center font-medium mb-2">{alt}</span>
        <span className="text-xs text-gray-600 mb-3">PDF Document</span>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-xs bg-red-500 text-white px-3 py-1 rounded-full hover:bg-red-600 transition-colors duration-200"
        >
          Open PDF
        </a>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      {isLoading ? (
        // Loading state while generating thumbnail
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg flex flex-col items-center justify-center p-4 border-2 border-red-200 w-full h-full">
          <Loader2 className="h-8 w-8 text-red-500 mb-2 animate-spin" />
          <span className="text-sm text-gray-700 text-center font-medium mb-2">Loading PDF...</span>
          <span className="text-xs text-gray-600">Generating preview</span>
        </div>
      ) : (
        // PDF thumbnail with interactive overlay
        <div className="relative w-full h-full">
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt={alt}
              className="w-full h-full object-cover object-center"
              onError={() => {
                console.error('Failed to display PDF thumbnail');
                setError(true);
              }}
            />
          )}
          
                      {/* Interactive PDF overlay similar to screenshots */}
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center group">
              {/* PDF Document Label */}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-medium shadow-lg">
                PDF Document
              </div>
              
              {/* Open PDF Button - appears on hover */}
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 shadow-lg flex items-center space-x-2"
                onClick={(e) => e.stopPropagation()}
              >
                <FileText className="h-4 w-4" />
                <span>Open PDF</span>
              </a>
            </div>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
