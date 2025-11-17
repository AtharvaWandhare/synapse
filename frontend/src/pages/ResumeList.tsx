import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, Trash2, Star, StarOff } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
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

interface LatexResume {
  id: number;
  title: string;
  template_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ResumeList() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<LatexResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const response = await api.get('/api/latex-resumes');
      setResumes(response.data);
    } catch (error) {
      console.error('Error fetching resumes:', error);
      toast.error('Failed to load resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    try {
      const response = await api.post('/api/latex-resumes', {
        title: `Resume ${resumes.length + 1}`,
        template_name: 'default',
      });
      toast.success('Resume created successfully');
      navigate(`/resume-builder/${response.data.id}`);
    } catch (error) {
      console.error('Error creating resume:', error);
      toast.error('Failed to create resume');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/latex-resumes/${id}`);
      toast.success('Resume deleted successfully');
      fetchResumes();
    } catch (error) {
      console.error('Error deleting resume:', error);
      toast.error('Failed to delete resume');
    } finally {
      setDeleteId(null);
    }
  };

  const handleSetActive = async (id: number) => {
    try {
      await api.post(`/api/latex-resumes/${id}/set-active`);
      toast.success('Active resume updated');
      fetchResumes();
    } catch (error) {
      console.error('Error setting active resume:', error);
      toast.error('Failed to update active resume');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading resumes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">LaTeX Resume Builder</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create and manage professional resumes with LaTeX
          </p>
        </div>
        <Button onClick={handleCreateNew} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          New Resume
        </Button>
      </div>

      {resumes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No resumes yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-center max-w-md">
              Get started by creating your first LaTeX resume. Choose from professional templates
              and customize with live preview.
            </p>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Resume
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((resume) => (
            <Card key={resume.id} className="relative hover:shadow-lg transition-shadow">
              {resume.is_active && (
                <div className="absolute top-4 right-4">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {resume.title}
                </CardTitle>
                <CardDescription>
                  Updated {formatDate(resume.updated_at)}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => navigate(`/resume-builder/${resume.id}`)}
                  >
                    Edit Resume
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleSetActive(resume.id)}
                      disabled={resume.is_active}
                    >
                      {resume.is_active ? (
                        <>
                          <StarOff className="h-4 w-4 mr-2" />
                          Active
                        </>
                      ) : (
                        <>
                          <Star className="h-4 w-4 mr-2" />
                          Set Active
                        </>
                      )}
                    </Button>

                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setDeleteId(resume.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your resume.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
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
