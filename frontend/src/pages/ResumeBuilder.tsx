import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Split from 'react-split';
import { LatexEditor } from '@/components/latex/LatexEditor';
import { PdfViewer } from '@/components/latex/PdfViewer';
import { LatexToolbar } from '@/components/latex/LatexToolbar';
import api from '@/lib/api';
import { toast } from 'sonner';
import axios from 'axios';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from 'react-router-dom';

const LATEX_SERVICE_URL = 'http://localhost:5001';
const AUTO_SAVE_DELAY = 3000; // 3 seconds

export default function ResumeBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [latexCode, setLatexCode] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('Resume');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Auto-save timer
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      fetchResume();
    }
  }, [id]);

  // Auto-save when code changes
  useEffect(() => {
    if (!latexCode || !id) return;

    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    const timer = setTimeout(() => {
      handleSave(true);
    }, AUTO_SAVE_DELAY);

    setSaveTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [latexCode]);

  const fetchResume = async () => {
    try {
      const response = await api.get(`/api/latex-resumes/${id}`);
      setLatexCode(response.data.latex_code);
      setTitle(response.data.title);
      
      // If there's a compiled PDF URL, set it
      if (response.data.compiled_pdf_url) {
        setPdfUrl(response.data.compiled_pdf_url);
      }
    } catch (error) {
      console.error('Error fetching resume:', error);
      toast.error('Failed to load resume');
    }
  };

  const handleCompile = async () => {
    if (!latexCode) {
      toast.error('Please write some LaTeX code first');
      return;
    }

    setIsCompiling(true);
    try {
      const response = await axios.post(`${LATEX_SERVICE_URL}/compile`, {
        latex_code: latexCode,
      });

      if (response.data.success && response.data.pdf_base64) {
        // Convert base64 to blob URL
        const byteCharacters = atob(response.data.pdf_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        setPdfUrl(url);
        toast.success('PDF compiled successfully');
      }
    } catch (error: any) {
      console.error('Compilation error:', error);
      
      if (error.response?.data?.details) {
        toast.error(`Compilation failed: ${error.response.data.details}`);
      } else if (error.code === 'ECONNREFUSED') {
        toast.error('LaTeX service is not running. Please start it first.');
      } else {
        toast.error('Failed to compile PDF');
      }
    } finally {
      setIsCompiling(false);
    }
  };

  const handleSave = async (silent = false) => {
    if (!id) return;

    setIsSaving(true);
    try {
      await api.put(`/api/latex-resumes/${id}`, {
        latex_code: latexCode,
      });
      
      setLastSaved(new Date());
      if (!silent) {
        toast.success('Resume saved');
      }
    } catch (error) {
      console.error('Error saving resume:', error);
      if (!silent) {
        toast.error('Failed to save resume');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) {
      toast.error('Please compile the PDF first');
      return;
    }

    // Create download link
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${title.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('PDF downloaded');
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/latex-resumes/${id}`);
      toast.success('Resume deleted');
      navigate('/resume-builder');
    } catch (error) {
      console.error('Error deleting resume:', error);
      toast.error('Failed to delete resume');
    }
  };

  const handleCodeChange = useCallback((value: string | undefined) => {
    setLatexCode(value || '');
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <LatexToolbar
        title={title}
        onCompile={handleCompile}
        onSave={() => handleSave(false)}
        onDownload={handleDownload}
        onDelete={() => setShowDeleteDialog(true)}
        isCompiling={isCompiling}
        isSaving={isSaving}
        canDownload={!!pdfUrl}
      />

      <div className="flex-1 overflow-hidden">
        <Split
          className="flex h-full"
          sizes={[50, 50]}
          minSize={300}
          gutterSize={8}
          snapOffset={0}
        >
          <div className="h-full overflow-hidden">
            <LatexEditor value={latexCode} onChange={handleCodeChange} />
          </div>

          <div className="h-full overflow-hidden">
            <PdfViewer pdfUrl={pdfUrl} isLoading={isCompiling} />
          </div>
        </Split>
      </div>

      <div className="border-t bg-white dark:bg-gray-950 px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center justify-between">
          <div>
            {lastSaved && (
              <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
            )}
          </div>
          <div>
            {isSaving && <span className="text-blue-600">Saving...</span>}
            {isCompiling && <span className="text-blue-600">Compiling...</span>}
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your resume "{title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
