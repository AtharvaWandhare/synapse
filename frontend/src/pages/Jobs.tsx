import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

type Job = {
  jobId: number
  title: string
  company: string
  location: string
  description: string
  jobType: string
  salaryRange: string
  applyUrl: string
  matchScore?: number
}

type FilterState = {
  jobTypes: Set<string>
  location: string
  skills: string
}

export default function Jobs() {
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noMore, setNoMore] = useState(false)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    jobTypes: new Set(['Full-time', 'Part-time', 'Internship', 'Contract', 'Remote']),
    location: '',
    skills: ''
  })

  const loadNext = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/get-next-job')
      setJob(res.data)
      setNoMore(false)
    } catch (err: any) {
      if (err.response?.status === 404) {
        setNoMore(true)
        setJob(null)
      } else {
        setError('Failed to load job')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const swipe = async (isLike: boolean) => {
    if (!job) return
    
    // Visual feedback
    setSwipeDirection(isLike ? 'right' : 'left')
    
    try {
      await api.post('/api/swipe', { jobId: job.jobId, isLike })
      
      // Wait for animation
      setTimeout(() => {
        setSwipeDirection(null)
        loadNext()
      }, 300)
    } catch (err) {
      setError('Swipe failed')
      setSwipeDirection(null)
    }
  }

  const saveJob = async () => {
    if (!job) return
    
    try {
      await api.post('/api/swipe', { jobId: job.jobId, isLike: true })
      toast.success('Job saved! Check your Matches page.')
    } catch (err) {
      setError('Failed to save job')
      toast.error('Failed to save job')
    }
  }

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (loading || !job) return
    if (e.key === 'ArrowLeft') swipe(false)
    if (e.key === 'ArrowRight') swipe(true)
  }, [loading, job])

  useEffect(() => {
    loadNext()
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  const toggleJobType = (type: string) => {
    const newTypes = new Set(filters.jobTypes)
    if (newTypes.has(type)) newTypes.delete(type)
    else newTypes.add(type)
    setFilters({ ...filters, jobTypes: newTypes })
  }

  const resetFilters = () => {
    setFilters({
      jobTypes: new Set(['Full-time', 'Part-time', 'Internship', 'Contract', 'Remote']),
      location: '',
      skills: ''
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold">Discover Your Next Opportunity</h2>
          <p className="text-muted-foreground mt-1">Swipe right to like, left to pass. Use arrow keys for quick navigation.</p>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">🔍 Filters</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Customize your job search preferences</SheetDescription>
            </SheetHeader>
            <div className="space-y-6 mt-6">
              <div>
                <Label className="text-base font-semibold mb-3 block">Job Type</Label>
                <div className="space-y-3">
                  {['Full-time', 'Part-time', 'Internship', 'Contract', 'Remote'].map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={filters.jobTypes.has(type)}
                        onCheckedChange={() => toggleJobType(type)}
                      />
                      <label htmlFor={type} className="text-sm cursor-pointer">{type}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="location-filter">Location</Label>
                <Input
                  id="location-filter"
                  placeholder="e.g., Mumbai, Remote"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="skills-filter">Skills</Label>
                <Input
                  id="skills-filter"
                  placeholder="e.g., Python, React"
                  value={filters.skills}
                  onChange={(e) => setFilters({ ...filters, skills: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Comma-separated keywords</p>
              </div>
              <div className="space-y-2 pt-4">
                <Button className="w-full">Apply Filters</Button>
                <Button variant="outline" className="w-full" onClick={resetFilters}>Reset</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-col items-center">
          <div 
          className={`w-full max-w-2xl transition-all duration-300 ${
            swipeDirection === 'left' ? '-translate-x-full opacity-0' : 
            swipeDirection === 'right' ? 'translate-x-full opacity-0' : 
            'translate-x-0 opacity-100'
          }`}
        >
          <Card className="min-h-[500px] border-2 rounded-lg shadow-sm">
            {loading && (
              <div className="flex items-center justify-center h-[500px]">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="mt-4 text-muted-foreground">Loading amazing opportunities...</p>
                </div>
              </div>
            )}
            {error && (
              <CardContent className="pt-6">
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </CardContent>
            )}
            {noMore && (
              <div className="flex items-center justify-center h-[500px]">
                <div className="text-center">
                  <p className="text-4xl mb-4">🎉</p>
                  <p className="text-xl font-semibold">You've seen all available jobs!</p>
                  <p className="text-muted-foreground mt-2">Check back later for new opportunities</p>
                </div>
              </div>
            )}
            {job && !loading && (
              <>
                <CardHeader className="pb-2 pl-4 border-l-4 border-primary">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 text-left">
                      {/* Title */}
                      <CardTitle className="text-2xl font-semibold leading-tight text-left truncate">{job.title}</CardTitle>
                      {/* Company & Location */}
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="font-medium text-sm text-foreground">{job.company}</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">{job.location}</span>
                      </div>
                      {/* Badge + Salary + Match Score - moved under title for left alignment */}
                      <div className="mt-3 flex items-center gap-3 flex-wrap">
                        <Badge variant="secondary" className="text-sm">{job.jobType}</Badge>
                        {job.salaryRange && (
                          <div className="text-sm text-muted-foreground">{job.salaryRange}</div>
                        )}
                        {job.matchScore !== undefined && job.matchScore !== null && (
                          <Badge 
                            variant={job.matchScore >= 70 ? "default" : "outline"} 
                            className="text-sm"
                          >
                            {job.matchScore}% Match
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 pb-4">
                  <div className="text-left text-base text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-[260px] overflow-y-auto job-scrollbar">
                    {job.description}
                  </div>

                  {/* Key skills / tags */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {job.description?.match(/\b(JavaScript|React|Python|Django|Flask|SQL|PostgreSQL|Node|TypeScript|AWS|Docker)\b/g)?.slice(0,6).map((t, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-3 pb-4 border-t flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => swipe(false)} title="Pass">Skip</Button>
                    <Button size="sm" variant="outline" onClick={saveJob} title="Save">Save</Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => window.open(job.applyUrl || '#', '_blank')}>
                      Apply
                    </Button>
                  </div>
                </CardFooter>
              </>
            )}
          </Card>
        </div>
      </div>

      <Card className="mt-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>💡</span>
            <span>Pro Tips</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-3">
              <span className="text-lg shrink-0">✨</span>
              <span className="text-sm">Like jobs that match your skills and interests</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-lg shrink-0">🎯</span>
              <span className="text-sm">Check your <strong>Matches</strong> page to see all liked jobs</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-lg shrink-0">📝</span>
              <span className="text-sm">Update your profile for better recommendations</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-lg shrink-0">⌨️</span>
              <span className="text-sm">Use arrow keys (← →) for faster swiping</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-lg shrink-0">🔍</span>
              <span className="text-sm">Use filters to narrow down job listings</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
