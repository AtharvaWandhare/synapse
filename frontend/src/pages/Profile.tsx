import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

type Project = {
    name: string
    description?: string
    start_date?: string
    end_date?: string
    technologies?: string
    link?: string
}

type Course = {
    name: string
    provider?: string
    completion_date?: string
    certificate_url?: string
}

type WorkSample = {
    title: string
    url: string
    description?: string
}

type ResumeData = {
    filename: string
    ats_score: number
    target_job_role: string
    has_enhancement: boolean
    updated_at: string
}

type ProfileData = {
    id: number
    email: string
    full_name: string
    career_objective: string
    projects: Project[]
    training_courses: Course[]
    portfolio_url: string
    work_samples: WorkSample[]
    accomplishments: string
    phone: string
    location: string
    linkedin_url: string
    github_url: string
    resume?: ResumeData
}

type EnhancementData = {
    overall_rating: number
    key_strengths: string[]
    critical_improvements: Array<{
        category: string
        current_issue: string
        recommendation: string
        example?: string
    }>
    content_gaps?: Array<{
        missing_element: string
        importance: string
        how_to_add: string
    }>
    keyword_optimization?: {
        missing_keywords: string[]
        overused_keywords: string[]
        recommended_additions: string[]
    }
    formatting_tips: string[]
}

export default function Profile() {
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [enhancing, setEnhancing] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [enhancement, setEnhancement] = useState<EnhancementData | null>(null)
    const nav = useNavigate()

    const [formData, setFormData] = useState({
        full_name: '',
        career_objective: '',
        phone: '',
        location: '',
        linkedin_url: '',
        github_url: '',
        portfolio_url: '',
        accomplishments: '',
        projects: [] as Project[],
        training_courses: [] as Course[],
        work_samples: [] as WorkSample[]
    })

    const [projectForm, setProjectForm] = useState<Project>({ name: '' })
    const [courseForm, setCourseForm] = useState<Course>({ name: '' })
    const [sampleForm, setSampleForm] = useState<WorkSample>({ title: '', url: '' })

    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = async () => {
        setLoading(true)
        try {
            const res = await api.get('/api/profile')
            const profileData = res.data.profile || res.data
            setProfile(profileData)
            setFormData({
                full_name: profileData.full_name || '',
                career_objective: profileData.career_objective || '',
                phone: profileData.phone || '',
                location: profileData.location || '',
                linkedin_url: profileData.linkedin_url || '',
                github_url: profileData.github_url || '',
                portfolio_url: profileData.portfolio_url || '',
                accomplishments: profileData.accomplishments || '',
                projects: profileData.projects || [],
                training_courses: profileData.training_courses || [],
                work_samples: profileData.work_samples || []
            })
            if (profileData.resume?.has_enhancement) {
                loadEnhancement()
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to load profile' })
        } finally {
            setLoading(false)
        }
    }

    const saveProfile = async () => {
        setSaving(true)
        setMessage(null)
        try {
            await api.post('/api/profile', formData)
            setMessage({ type: 'success', text: 'Profile updated successfully!' })
            await loadProfile()
        } catch (e: any) {
            setMessage({ type: 'error', text: e.response?.data?.error || 'Failed to update profile' })
        } finally {
            setSaving(false)
        }
    }

    const uploadResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        setMessage(null)
        const fd = new FormData()
        fd.append('resume_file', file)

        try {
            const res = await api.post('/api/upload-resume', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setMessage({
                type: 'success',
                text: `Resume uploaded! ATS Score: ${res.data.ats_score}/100`
            })
            await loadProfile()
        } catch (e: any) {
            setMessage({ type: 'error', text: e.response?.data?.error || 'Failed to upload resume' })
        } finally {
            setUploading(false)
        }
    }

    const loadEnhancement = async () => {
        try {
            const res = await api.get('/api/resume-analysis')
            const analysis = res.data.analysis || res.data
            if (analysis && analysis.enhancement_recommendations) {
                // If it's already parsed (object), use directly; if string, parse it
                const enhancement = typeof analysis.enhancement_recommendations === 'string'
                    ? JSON.parse(analysis.enhancement_recommendations)
                    : analysis.enhancement_recommendations
                setEnhancement(enhancement)
            }
        } catch (e) {
            console.error('Failed to load enhancement', e)
        }
    }

    const generateEnhancement = async () => {
        setEnhancing(true)
        setMessage(null)
        try {
            const res = await api.post('/api/profile-enhancement')
            setEnhancement(res.data.enhancement)
            setMessage({ type: 'success', text: 'Profile enhancement recommendations generated!' })
        } catch (e: any) {
            setMessage({ type: 'error', text: e.response?.data?.error || 'Failed to generate enhancement' })
        } finally {
            setEnhancing(false)
        }
    }

    const addProject = () => {
        if (projectForm.name.trim()) {
            setFormData({ ...formData, projects: [...formData.projects, projectForm] })
            setProjectForm({ name: '' })
        }
    }

    const removeProject = (idx: number) => {
        setFormData({ ...formData, projects: formData.projects.filter((_, i) => i !== idx) })
    }

    const addCourse = () => {
        if (courseForm.name.trim()) {
            setFormData({ ...formData, training_courses: [...formData.training_courses, courseForm] })
            setCourseForm({ name: '' })
        }
    }

    const removeCourse = (idx: number) => {
        setFormData({ ...formData, training_courses: formData.training_courses.filter((_, i) => i !== idx) })
    }

    const addSample = () => {
        if (sampleForm.title.trim() && sampleForm.url.trim()) {
            setFormData({ ...formData, work_samples: [...formData.work_samples, sampleForm] })
            setSampleForm({ title: '', url: '' })
        }
    }

    const removeSample = (idx: number) => {
        setFormData({ ...formData, work_samples: formData.work_samples.filter((_, i) => i !== idx) })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="mt-4 text-muted-foreground">Loading profile...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
            <div className="mb-6">
                <h2 className="text-3xl font-bold">My Profile</h2>
                <p className="text-muted-foreground mt-1">Manage your resume and professional information</p>
            </div>

            {message && (
                <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
                    <AlertDescription>{message.text}</AlertDescription>
                </Alert>
            )}

            {/* Floating Save Button */}
            <Button
                onClick={saveProfile}
                disabled={saving}
                className="fixed bottom-6 right-6 z-50 shadow-lg h-12 px-6"
                size="lg"
            >
                {saving ? 'Saving...' : '💾 Save Changes'}
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Resume Upload Section - Always Visible */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span>📄</span>
                            Upload Your Resume
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-left">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <div className="space-y-2">
                                <Label htmlFor="resume_file" className="cursor-pointer inline-block">
                                    <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors inline-block">
                                        Choose File
                                    </div>
                                </Label>
                                <Input
                                    id="resume_file"
                                    type="file"
                                    accept=".pdf,.doc,.docx,.txt"
                                    onChange={uploadResume}
                                    disabled={uploading}
                                    className="sr-only"
                                />
                                <div className="text-sm text-muted-foreground">
                                    {uploading ? (
                                        <p className="text-sm text-muted-foreground">Analyzing resume...</p>
                                    ) : profile?.resume ? (
                                        <div className="text-sm">
                                            <p className="font-medium">📎 {profile.resume.filename}</p>
                                            {profile.resume.updated_at && (
                                                <p className="text-muted-foreground text-xs">Updated: {new Date(profile.resume.updated_at).toLocaleDateString()}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No file chosen</p>
                                    )}
                                </div>
                                <div className="flex items-start gap-2 mt-2">
                                    {profile?.resume && (
                                        <>
                                            <Button variant="outline" size="sm" onClick={() => profile?.resume?.filename && window.open(`/uploads/${profile.resume.filename}`, '_blank')}>
                                                View
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={async () => {
                                                // Quick action to re-run analysis if needed
                                                setUploading(true)
                                                try {
                                                    await api.post('/api/profile-enhancement')
                                                } catch (e) {
                                                    // ignore
                                                } finally {
                                                    setUploading(false)
                                                }
                                            }}>
                                                Re-Analyze
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-1 md:pl-4">
                                <div className="text-left">
                                    <p className="text-sm font-medium mb-2">Resume Details</p>
                                    <div className="text-sm text-muted-foreground">
                                        <p>Target role: {profile?.resume?.target_job_role || '—'}</p>
                                        <p>ATS Score: {profile?.resume?.ats_score ?? '—'}/100</p>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <p className="text-sm font-medium mb-1">Tips</p>
                                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                                        <li>Use a concise title and bullet points</li>
                                        <li>Include relevant keywords and skills</li>
                                        <li>Prefer simple layouts without images</li>
                                        <li>Keep it under 2 pages</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">Supported formats: PDF, DOC, DOCX, TXT</p>
                    </CardContent>
                </Card>

                {/* Resume Score - Always Visible */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span>📊</span>
                            Resume Analysis
                        </CardTitle>
                        <CardDescription>Your Resume Score</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-left">
                        <div className="flex items-start gap-4">
                            <div className="relative w-28 h-28 shrink-0">
                                <svg className="w-28 h-28 transform -rotate-90">
                                    <circle
                                        cx="56"
                                        cy="56"
                                        r="48"
                                        stroke="currentColor"
                                        strokeWidth="6"
                                        fill="none"
                                        className="text-muted"
                                    />
                                    <circle
                                        cx="56"
                                        cy="56"
                                        r="48"
                                        stroke="currentColor"
                                        strokeWidth="6"
                                        fill="none"
                                        strokeDasharray={`${2 * Math.PI * 48}`}
                                        strokeDashoffset={`${2 * Math.PI * 48 * (1 - (Number(profile?.resume?.ats_score ?? 0) / 100))}`}
                                        className="text-primary transition-all duration-500"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-bold">{profile?.resume?.ats_score ?? 0}</span>
                                </div>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">ATS Score</p>
                                <p className="text-sm text-muted-foreground">Up-to-date analysis of your resume matching ATS expectations</p>
                                <div className="pt-2">
                                    <Progress value={profile?.resume?.ats_score ?? 0} className="h-2" />
                                </div>
                                <div className="mt-2">
                                    {Number(profile?.resume?.ats_score ?? 0) < 70 && (
                                        <p className="text-sm text-orange-600">⚠️ Your ATS score is below recommended threshold</p>
                                    )}
                                    {Number(profile?.resume?.ats_score ?? 0) >= 70 && Number(profile?.resume?.ats_score ?? 0) < 85 && (
                                        <p className="text-sm text-blue-600">✓ Good ATS score, room for improvement</p>
                                    )}
                                    {Number(profile?.resume?.ats_score ?? 0) >= 85 && (
                                        <p className="text-sm text-green-600">✅ Excellent ATS score!</p>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-3">Last updated: {profile?.resume?.updated_at ? new Date(profile.resume.updated_at).toLocaleDateString() : '—'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="basic" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="professional">Professional</TabsTrigger>
                    <TabsTrigger value="resume">Resume & ATS</TabsTrigger>
                </TabsList>

                <TabsContent value="basic">
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                            <CardDescription>Update your personal details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name</Label>
                                <Input
                                    id="full_name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email (read-only)</Label>
                                <Input id="email" value={profile?.email || ''} disabled />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location">Location</Label>
                                    <Input
                                        id="location"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                                <Input
                                    id="linkedin_url"
                                    placeholder="https://linkedin.com/in/yourprofile"
                                    value={formData.linkedin_url}
                                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="github_url">GitHub URL</Label>
                                <Input
                                    id="github_url"
                                    placeholder="https://github.com/yourusername"
                                    value={formData.github_url}
                                    onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                                />
                            </div>
                            <Button onClick={saveProfile} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="professional">
                    <Card>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className='flex flex-col items-start gap-2'>
                                    <CardTitle>Professional Details</CardTitle>
                                    <CardDescription>Showcase your experience and achievements</CardDescription>
                                </div>
                                <Button onClick={saveProfile} disabled={saving} variant="outline">
                                    {saving ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="career_objective">Career Objective</Label>
                                <Textarea
                                    id="career_objective"
                                    rows={3}
                                    placeholder="Describe your career goals..."
                                    value={formData.career_objective}
                                    onChange={(e) => setFormData({ ...formData, career_objective: e.target.value })}
                                />
                            </div>

                            {/* Projects Section */}
                            <div className="space-y-4">
                                <Label className="text-base font-semibold">Projects</Label>
                                <div className="grid gap-3 p-4 border rounded-lg bg-muted/30">
                                    <Input
                                        placeholder="Project name *"
                                        value={projectForm.name}
                                        onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                                    />
                                    <Textarea
                                        placeholder="Description"
                                        rows={2}
                                        value={projectForm.description || ''}
                                        onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            type="date"
                                            placeholder="Start date"
                                            value={projectForm.start_date || ''}
                                            onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                                        />
                                        <Input
                                            type="date"
                                            placeholder="End date"
                                            value={projectForm.end_date || ''}
                                            onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })}
                                        />
                                    </div>
                                    <Input
                                        placeholder="Technologies (e.g., React, Node.js, MongoDB)"
                                        value={projectForm.technologies || ''}
                                        onChange={(e) => setProjectForm({ ...projectForm, technologies: e.target.value })}
                                    />
                                    <Input
                                        placeholder="Project link (optional)"
                                        value={projectForm.link || ''}
                                        onChange={(e) => setProjectForm({ ...projectForm, link: e.target.value })}
                                    />
                                    <Button onClick={addProject} size="sm" className="w-full">+ Add Project</Button>
                                </div>

                                <div className="space-y-3">
                                    {formData.projects.map((p, i) => (
                                        <Card key={i} className="border-l-4 border-l-primary">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <CardTitle className="text-base font-semibold">{p.name}</CardTitle>
                                                        {p.description && (
                                                            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{p.description}</p>
                                                        )}
                                                    </div>
                                                    <Button size="sm" variant="ghost" onClick={() => removeProject(i)} className="shrink-0">
                                                        ×
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-2 text-sm">
                                                {(p.start_date || p.end_date) && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-muted-foreground">📅</span>
                                                        <span>{p.start_date || 'N/A'} — {p.end_date || 'Present'}</span>
                                                    </div>
                                                )}
                                                {p.technologies && (
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-muted-foreground shrink-0">🛠️</span>
                                                        <span className="flex-1">{p.technologies}</span>
                                                    </div>
                                                )}
                                                {p.link && (
                                                    <Button
                                                        variant="link"
                                                        size="sm"
                                                        className="h-auto p-0 text-primary"
                                                        onClick={() => window.open(p.link, '_blank')}
                                                    >
                                                        🔗 View Project →
                                                    </Button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            {/* Courses Section */}
                            <div className="space-y-4">
                                <Label className="text-base font-semibold">Training Courses</Label>
                                <div className="grid gap-3 p-4 border rounded-lg bg-muted/30">
                                    <Input
                                        placeholder="Course name *"
                                        value={courseForm.name}
                                        onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                                    />
                                    <Input
                                        placeholder="Provider (e.g., Coursera, Udemy)"
                                        value={courseForm.provider || ''}
                                        onChange={(e) => setCourseForm({ ...courseForm, provider: e.target.value })}
                                    />
                                    <Input
                                        type="date"
                                        placeholder="Completion date"
                                        value={courseForm.completion_date || ''}
                                        onChange={(e) => setCourseForm({ ...courseForm, completion_date: e.target.value })}
                                    />
                                    <Input
                                        placeholder="Certificate URL (optional)"
                                        value={courseForm.certificate_url || ''}
                                        onChange={(e) => setCourseForm({ ...courseForm, certificate_url: e.target.value })}
                                    />
                                    <Button onClick={addCourse} size="sm" className="w-full">+ Add Course</Button>
                                </div>

                                <div className="space-y-3">
                                    {formData.training_courses.map((c, i) => (
                                        <Card key={i} className="border-l-4 border-l-blue-500">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <CardTitle className="text-base font-semibold">{c.name}</CardTitle>
                                                        {c.provider && <p className="text-sm text-muted-foreground mt-1">{c.provider}</p>}
                                                    </div>
                                                    <Button size="sm" variant="ghost" onClick={() => removeCourse(i)} className="shrink-0">
                                                        ×
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-2 text-sm">
                                                {c.completion_date && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-muted-foreground">📅</span>
                                                        <span>Completed: {c.completion_date}</span>
                                                    </div>
                                                )}
                                                {c.certificate_url && (
                                                    <Button
                                                        variant="link"
                                                        size="sm"
                                                        className="h-auto p-0 text-primary"
                                                        onClick={() => window.open(c.certificate_url, '_blank')}
                                                    >
                                                        🏆 View Certificate →
                                                    </Button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="portfolio_url">Portfolio URL</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="portfolio_url"
                                        placeholder="https://yourportfolio.com"
                                        value={formData.portfolio_url}
                                        onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                                        className="flex-1"
                                    />
                                    {formData.portfolio_url && (
                                        <Button
                                            variant="outline"
                                            onClick={() => window.open(formData.portfolio_url, '_blank')}
                                        >
                                            Open
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Work Samples Section */}
                            <div className="space-y-4">
                                <Label className="text-base font-semibold">Work Samples</Label>
                                <div className="grid gap-3 p-4 border rounded-lg bg-muted/30">
                                    <Input
                                        placeholder="Sample title *"
                                        value={sampleForm.title}
                                        onChange={(e) => setSampleForm({ ...sampleForm, title: e.target.value })}
                                    />
                                    <Input
                                        placeholder="URL *"
                                        value={sampleForm.url}
                                        onChange={(e) => setSampleForm({ ...sampleForm, url: e.target.value })}
                                    />
                                    <Textarea
                                        placeholder="Description (optional)"
                                        rows={2}
                                        value={sampleForm.description || ''}
                                        onChange={(e) => setSampleForm({ ...sampleForm, description: e.target.value })}
                                    />
                                    <Button onClick={addSample} size="sm" className="w-full">+ Add Work Sample</Button>
                                </div>

                                <div className="space-y-3">
                                    {formData.work_samples.map((s, i) => (
                                        <Card key={i} className="border-l-4 border-l-green-500">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <CardTitle className="text-base font-semibold">{s.title}</CardTitle>
                                                        {s.description && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{s.description}</p>}
                                                    </div>
                                                    <Button size="sm" variant="ghost" onClick={() => removeSample(i)} className="shrink-0">
                                                        ×
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    className="h-auto p-0 text-primary"
                                                    onClick={() => window.open(s.url, '_blank')}
                                                >
                                                    🔗 Open Sample →
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="accomplishments">Accomplishments</Label>
                                <Textarea
                                    id="accomplishments"
                                    rows={4}
                                    placeholder="List your key accomplishments..."
                                    value={formData.accomplishments}
                                    onChange={(e) => setFormData({ ...formData, accomplishments: e.target.value })}
                                />
                            </div>

                            <Button onClick={saveProfile} disabled={saving} className="w-full">
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="resume">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Resume Upload</CardTitle>
                                <CardDescription>Upload your resume for AI-powered ATS analysis</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-left">
                                <div className="space-y-2">
                                    <Label htmlFor="resume_file">Upload Resume (PDF)</Label>
                                    <Input
                                        id="resume_file"
                                        type="file"
                                        accept=".pdf"
                                        onChange={uploadResume}
                                        disabled={uploading}
                                    />
                                    {uploading && <p className="text-sm text-muted-foreground">Analyzing resume...</p>}
                                </div>

                                {profile?.resume && (
                                    <div className="border rounded-lg p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold">Current Resume</p>
                                                <p className="text-sm text-muted-foreground">{profile.resume.filename}</p>
                                            </div>
                                            <Badge variant="secondary">{profile.resume.target_job_role}</Badge>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium">ATS Score</span>
                                                <span className="font-bold text-lg">{profile.resume.ats_score}/100</span>
                                            </div>
                                            <Progress value={profile.resume.ats_score} className="h-2" />
                                            {profile.resume.ats_score < 70 && (
                                                <p className="text-sm text-orange-600">⚠️ Your ATS score is below recommended threshold</p>
                                            )}
                                            {profile.resume.ats_score >= 70 && profile.resume.ats_score < 85 && (
                                                <p className="text-sm text-blue-600">✓ Good ATS score, room for improvement</p>
                                            )}
                                            {profile.resume.ats_score >= 85 && (
                                                <p className="text-sm text-green-600">✅ Excellent ATS score!</p>
                                            )}
                                        </div>

                                        <p className="text-xs text-muted-foreground">
                                            Last updated: {new Date(profile.resume.updated_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Profile Enhancement</CardTitle>
                                <CardDescription>Get AI-powered recommendations to improve your profile</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Button onClick={generateEnhancement} disabled={enhancing || !profile?.resume}>
                                    {enhancing ? 'Generating...' : 'Generate Profile Enhancement'}
                                </Button>
                                {!profile?.resume && (
                                    <p className="text-sm text-muted-foreground">Upload a resume first to generate enhancement recommendations</p>
                                )}

                                {enhancement && (
                                    <div className="space-y-6 mt-4 text-left">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-medium">Overall Rating</p>
                                                <p className="text-2xl font-bold">{enhancement.overall_rating}/10</p>
                                            </div>
                                            <div className="flex-1">
                                                <Progress value={enhancement.overall_rating * 10} className="h-2" />
                                            </div>
                                        </div>

                                        {enhancement.key_strengths && enhancement.key_strengths.length > 0 && (
                                            <div className="space-y-3">
                                                <h4 className="font-semibold text-base flex items-start gap-2">
                                                    <span>✨</span>
                                                    <span>Key Strengths</span>
                                                </h4>
                                                <ul className="space-y-2">
                                                    {enhancement.key_strengths.map((s, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm">
                                                            <span className="text-green-600 mt-0.5">•</span>
                                                            <span>{s}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {enhancement.critical_improvements && enhancement.critical_improvements.length > 0 && (
                                            <div className="space-y-3">
                                                <h4 className="font-semibold text-base flex items-start gap-2">
                                                    <span>🎯</span>
                                                    <span>Critical Improvements</span>
                                                </h4>
                                                <div className="space-y-3">
                                                    {enhancement.critical_improvements.map((imp, i) => (
                                                        <Card key={i} className="border-l-4 border-l-orange-500">
                                                            <CardHeader className="pb-2">
                                                                <CardTitle className="text-sm font-semibold">{imp.category}</CardTitle>
                                                            </CardHeader>
                                                            <CardContent className="space-y-3 text-sm text-left">
                                                                <div>
                                                                    <p className="font-medium text-muted-foreground mb-1">Issue:</p>
                                                                    <p>{imp.current_issue}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-muted-foreground mb-1">Recommendation:</p>
                                                                    <p>{imp.recommendation}</p>
                                                                </div>
                                                                {imp.example && (
                                                                    <div>
                                                                        <p className="font-medium text-muted-foreground mb-1">Example:</p>
                                                                        <div className="bg-green-100 p-3 rounded-sm text-sm italic">
                                                                            {imp.example}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {enhancement.keyword_optimization && (
                                            <div className="space-y-3">
                                                <h4 className="font-semibold text-base flex items-start gap-2">
                                                    <span>🔑</span>
                                                    <span>Keyword Optimization</span>
                                                </h4>
                                                <div className="space-y-3 text-sm">
                                                    {enhancement.keyword_optimization.missing_keywords?.length > 0 && (
                                                        <div>
                                                            <p className="font-medium mb-2">Missing Keywords:</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {enhancement.keyword_optimization.missing_keywords.map((kw, i) => (
                                                                    <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {enhancement.keyword_optimization.recommended_additions?.length > 0 && (
                                                        <div>
                                                            <p className="font-medium mb-2">Recommended Additions:</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {enhancement.keyword_optimization.recommended_additions.map((kw, i) => (
                                                                    <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {enhancement.formatting_tips && enhancement.formatting_tips.length > 0 && (
                                            <div className="space-y-3">
                                                <h4 className="font-semibold text-base flex items-start gap-2">
                                                    <span>📝</span>
                                                    <span>Formatting Tips</span>
                                                </h4>
                                                <ul className="space-y-2">
                                                    {enhancement.formatting_tips.map((tip, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm">
                                                            <span className="text-blue-600 mt-0.5">•</span>
                                                            <span>{tip}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Career Roadmap</CardTitle>
                                <CardDescription>Generate a personalized career development plan</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={() => nav('/roadmap')} variant="outline">
                                    View Career Roadmap
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
