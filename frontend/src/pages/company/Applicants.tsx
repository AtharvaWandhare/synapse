import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Mail, User, CheckCircle2, XCircle, Clock, RefreshCw, MessageCircle } from 'lucide-react'
import { createOrGetConversation } from '@/utils/chat'

type Applicant = {
  match_id: number
  user_id: number
  full_name: string
  job_id: number
  job_title: string
  status: string
  matched_at: string
  resume?: any
  email?: string
  match_score?: number
}

export default function CompanyApplicants() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [applicants, setApplicants] = useState<Applicant[]>([])

  const handleStartChat = async (matchId: number) => {
    const conversationId = await createOrGetConversation(matchId)
    if (conversationId) {
      navigate(`/chat?conversation=${conversationId}`)
    } else {
      toast.error('Failed to start chat')
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const url = jobId ? `/api/company/applicants?job_id=${jobId}` : '/api/company/applicants'
      const res = await api.get(url)
      if (res.data?.status === 'success') {
        const apps = res.data.applicants || []
        setApplicants(apps)
        if (apps.length > 0) {
            // preserve job title if needed in future
          }
      } else {
        toast.error('Failed to load applicants')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load applicants')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [jobId])

  const updateStatus = async (matchId: number, status: 'accepted' | 'rejected') => {
    try {
      const res = await api.put('/api/company/update-application-status', { match_id: matchId, status })
      if (res.data?.status === 'success') {
        toast.success(`Application ${status}`, {
          description: `The candidate has been ${status}.`
        })
        load()
      } else {
        toast.error('Failed to update')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to update')
    }
  }

  const recomputeMatch = async (matchId: number) => {
    try {
      const res = await api.post('/api/company/recompute-match-score', { match_id: matchId })
      if (res.data?.status === 'success') {
        toast.success('Match score recomputed')
        // Update the single match in the state with new match_score
        const newScore = res.data.match_score
        setApplicants(applicants.map(a => a.match_id === matchId ? { ...a, match_score: newScore } : a))
      } else {
        toast.error('Failed to recompute match score')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to recompute match score')
    }
  }

  const recomputeJobMatches = async () => {
    if (!jobId) return
    try {
      const res = await api.post('/api/company/recompute-job-match-scores', { job_id: parseInt(jobId) })
      if (res.data?.status === 'success') {
        toast.success(`Recomputed ${res.data.updated} matches`)
        // Reload applicants to reflect new scores
        load()
      } else {
        toast.error('Failed to recompute job matches')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to recompute job matches')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="h-3 w-3" /> Accepted</Badge>
      case 'rejected':
        return <Badge className="gap-1 bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="h-3 w-3" /> Rejected</Badge>
      default:
        return <Badge className="gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="h-3 w-3" /> Pending</Badge>
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-3xl font-bold">Job Applicants</h2>
        <p className="text-muted-foreground mt-1">Candidates who liked your job postings</p>
        {jobId && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={recomputeJobMatches} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Recompute All
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading applicants...</div>
      ) : applicants.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No applicants yet</h3>
          <p className="text-muted-foreground mb-6">
            Once job seekers start applying to this position, they'll appear here
          </p>
          <Button asChild>
            <Link to="/company/my-jobs">Back to My Jobs</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {applicants.map(a => (
            <Card key={a.match_id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-6">
                {/* Left: Avatar and basic info */}
                <div className="shrink-0">
                  <div className="w-20 h-20 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold">
                    {a.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="mt-3 text-center">
                    {getStatusBadge(a.status || 'pending')}
                  </div>
                </div>

                {/* Middle: Candidate details */}
                <div className="flex-1 min-w-0 space-y-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{a.full_name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {a.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Applied on {new Date(a.matched_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>

                  {a.resume ? (
                    <div className="space-y-3">
                      {/* Profile Summary */}
                      {a.resume.profile_summary_text && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">PROFILE SUMMARY</p>
                          <p className="text-sm leading-relaxed line-clamp-2">
                            {a.resume.profile_summary_text}
                          </p>
                        </div>
                      )}

                      {/* Skills */}
                      {a.resume.skills && Array.isArray(a.resume.skills) && a.resume.skills.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">KEY SKILLS</p>
                          <div className="flex flex-wrap gap-1.5">
                            {a.resume.skills.slice(0, 8).map((s: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs font-normal">{s}</Badge>
                            ))}
                            {a.resume.skills.length > 8 && (
                              <Badge variant="outline" className="text-xs">+{a.resume.skills.length - 8}</Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Education */}
                      {a.resume.education && Array.isArray(a.resume.education) && a.resume.education.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">EDUCATION</p>
                          <div className="text-sm">
                            <p className="font-medium">{a.resume.education[0].degree}</p>
                            <p className="text-xs text-muted-foreground">{a.resume.education[0].institution}</p>
                          </div>
                        </div>
                      )}

                      {/* Work Experience */}
                      {a.resume.work_experience && Array.isArray(a.resume.work_experience) && a.resume.work_experience.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">EXPERIENCE</p>
                          <div className="text-sm">
                            <p className="font-medium">{a.resume.work_experience[0].title}</p>
                            <p className="text-xs text-muted-foreground">{a.resume.work_experience[0].company}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
                      <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No resume data available</p>
                    </div>
                  )}
                </div>

                {/* Right: Resume score and actions */}
                <div className="shrink-0 w-48 space-y-4">
                  {a.resume?.analysis_score && (
                    <div className="bg-muted/30 rounded-lg p-4 text-center">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Resume Score</p>
                      <div className="relative w-24 h-24 mx-auto mb-2">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted" />
                          <circle 
                            cx="48" 
                            cy="48" 
                            r="40" 
                            stroke="currentColor" 
                            strokeWidth="8" 
                            fill="none" 
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - a.resume.analysis_score / 100)}`}
                            className="text-primary"
                            style={{ transition: 'stroke-dashoffset 800ms ease' }}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold">{a.resume.analysis_score}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">out of 100</p>
                    </div>
                  )}

                  {a.match_score !== undefined && a.match_score !== null && (
                    <div className="bg-muted/20 rounded-lg p-4 text-center">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Compatibility</p>
                      <div className="relative w-20 h-20 mx-auto mb-2">
                        <svg className="w-20 h-20 transform -rotate-90">
                          <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted" />
                          <circle
                            cx="40"
                            cy="40"
                            r="34"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 34}`}
                            strokeDashoffset={`${2 * Math.PI * 34 * (1 - a.match_score / 100)}`}
                            className="text-purple-600"
                            style={{ transition: 'stroke-dashoffset 800ms ease' }}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold text-purple-600">{a.match_score}%</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Compatibility with this job</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Button asChild className="w-full" size="sm">
                      <Link to={`/company/candidate/${a.user_id}`}>
                        <User className="h-4 w-4 mr-2" />
                        View Profile
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full" size="sm">
                      <a href={`mailto:${a.email}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </a>
                    </Button>
                    {a.status === 'accepted' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="w-full"
                        onClick={() => handleStartChat(a.match_id)}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Chat
                      </Button>
                    )}
                    {(!a.status || a.status === 'pending') && (
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => updateStatus(a.match_id, 'accepted')}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="flex-1"
                          onClick={() => updateStatus(a.match_id, 'rejected')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => recomputeMatch(a.match_id)} className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Recompute
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
