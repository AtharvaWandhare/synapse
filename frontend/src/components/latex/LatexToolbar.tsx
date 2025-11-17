import { Button } from '@/components/ui/button';
import { Save, FileDown, Play, Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LatexToolbarProps {
  onCompile: () => void;
  onSave: () => void;
  onDownload: () => void;
  onDelete?: () => void;
  isCompiling?: boolean;
  isSaving?: boolean;
  canDownload?: boolean;
  title?: string;
}

export function LatexToolbar({
  onCompile,
  onSave,
  onDownload,
  onDelete,
  isCompiling = false,
  isSaving = false,
  canDownload = false,
  title = 'Resume Builder',
}: LatexToolbarProps) {
  const navigate = useNavigate();

  return (
    <div className="border-b bg-white dark:bg-gray-950 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/resume-builder')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCompile}
            disabled={isCompiling}
          >
            {isCompiling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Compiling...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Compile PDF
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            disabled={!canDownload}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Download PDF
          </Button>

          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
