import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Match = {
  id: number
  job_id: number
  job_title: string
  company_name: string
  location: string
  salary_range: string
  job_type: string
  description: string
  requirements: string
  apply_url: string
  application_status: string
  is_match: boolean
  is_hidden_by_user: boolean
  match_score?: number
}

type TabType = 'all' | 'saved' | 'applied' | 'accepted' | 'skipped'

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('high-low')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)

  useEffect(() => {
    loadMatches()
  }, [])

  const loadMatches = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/matches')
      setMatches(res.data.matches || [])
    } catch (e) {
      setError('Failed to load matches')
    } finally {
      setLoading(false)
    }
  }

  const filteredMatches = matches.filter(m => {
    // Filter by tab
    if (activeTab === 'all' && (!m.is_match || m.is_hidden_by_user)) return false
    if (activeTab === 'saved' && (m.application_status !== 'pending' || !m.is_match || m.is_hidden_by_user)) return false
    if (activeTab === 'applied' && m.application_status !== 'applied') return false
    if (activeTab === 'accepted' && m.application_status !== 'accepted') return false
    if (activeTab === 'skipped' && (m.is_match || m.is_hidden_by_user)) return false

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        m.job_title?.toLowerCase().includes(q) ||
        m.company_name?.toLowerCase().includes(q) ||
        m.location?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const getTabCounts = () => {
    const all = matches.filter(m => m.is_match && !m.is_hidden_by_user).length
    const saved = matches.filter(m => m.is_match && m.application_status === 'pending' && !m.is_hidden_by_user).length
    const skipped = matches.filter(m => !m.is_match && !m.is_hidden_by_user).length
    const applied = matches.filter(m => m.application_status === 'applied').length
    const accepted = matches.filter(m => m.application_status === 'accepted').length
    return { all, saved, skipped, applied, accepted }
  }

  const counts = getTabCounts()

  const extractSkills = (text: string): string[] => {
    if (!text) return []
    const keywords = ['Python', 'React', 'JavaScript', 'TypeScript', 'Flask', 'SQL', 'Tailwind', 'K8s', 'Go', 'Cloud', 'ETL', 'Django']
    return keywords.filter(k => text.includes(k)).slice(0, 3)
  }

  const hideMatch = async (matchId: number) => {
    try {
      await api.put(`/api/jwt/hide-match/${matchId}`)
      toast.success('Job hidden from matches')
      loadMatches()
      setDialogOpen(false)
    } catch (e) {
      toast.error('Failed to hide job')
    }
  }

  const unhideMatch = async (matchId: number) => {
    try {
      await api.put(`/api/jwt/unhide-match/${matchId}`)
      toast.success('Job restored to matches')
      loadMatches()
      setDialogOpen(false)
    } catch (e) {
      toast.error('Failed to restore job')
    }
  }

  const reapplyJob = async (jobId: number | undefined) => {
    if (!jobId) return
    try {
      await api.post(`/api/jwt/reapply/${jobId}`)
      toast.success('Re-applied successfully')
      loadMatches()
      setDialogOpen(false)
    } catch (e) {
      toast.error('Failed to re-apply')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading matches...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Your Matches</h2>
        <p className="text-muted-foreground mt-1">Saved roles and where you are in the process.</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {/* Details dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setSelectedMatch(null); setDialogOpen(open); }}>
        <DialogContent>
          {selectedMatch && (
            <div>
              <DialogTitle className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold">{selectedMatch.job_title}</div>
                  <div className="text-sm text-muted-foreground mt-1">{selectedMatch.company_name} • {selectedMatch.location}</div>
                </div>
                <div className="text-sm font-semibold">{selectedMatch.match_score ?? (Math.floor(Math.random() * 30) + 70)}%</div>
              </DialogTitle>
              <div className="mt-4 space-y-4">
                {selectedMatch.job_type && <Badge variant="outline">{selectedMatch.job_type}</Badge>}
                {selectedMatch.salary_range && <div className="text-sm text-muted-foreground">{selectedMatch.salary_range}</div>}
                <div className="pt-2">
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedMatch.description}</p>
                </div>
                {selectedMatch.requirements && (
                  <div className="pt-2">
                    <p className="text-sm font-medium mb-1">Requirements</p>
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedMatch.requirements}</pre>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-4">
                  {(!selectedMatch.is_hidden_by_user) ? (
                    <Button variant="outline" onClick={() => hideMatch(selectedMatch.id)}>Hide</Button>
                  ) : (
                    <Button variant="outline" onClick={() => unhideMatch(selectedMatch.id)}>Unhide</Button>
                  )}

                  {!selectedMatch.is_match && (
                    <Button onClick={() => reapplyJob(selectedMatch.job_id)}>Re-apply</Button>
                  )}

                  <Button asChild>
                    <a href={selectedMatch.apply_url || '#'} target="_blank" rel="noopener noreferrer">Apply</a>
                  </Button>
                  <Button variant="ghost" onClick={() => setDialogOpen(false)}>Close</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Summary counts */}
      <div className="flex items-center gap-6 mb-6 text-sm">
        <span className="font-medium">All {counts.all}</span>
        <span className="text-muted-foreground">Saved {counts.saved}</span>
        <span className="text-muted-foreground">Skipped {counts.skipped}</span>
        <span className="text-muted-foreground">Applied {counts.applied}</span>
        <span className="text-muted-foreground">Accepted {counts.accepted}</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'all' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'saved' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Saved
        </button>
        <button
          onClick={() => setActiveTab('applied')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'applied' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Applied
        </button>
        <button
          onClick={() => setActiveTab('accepted')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'accepted' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Accepted
        </button>
        <button
          onClick={() => setActiveTab('skipped')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'skipped' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Skipped
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4 mb-6">
        <Input
          placeholder="Search title, company, skill..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="high-low">Match score (high→low)</SelectItem>
            <SelectItem value="low-high">Match score (low→high)</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 text-sm border rounded ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-sm border rounded ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
          >
            List
          </button>
        </div>
      </div>

      {/* Job cards */}
      {filteredMatches.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <p className="text-xl font-semibold">No matches found</p>
              <p className="text-muted-foreground mt-2">
                {activeTab === 'all' && "Start swiping on jobs in Discover to see your matches here"}
                {activeTab === 'saved' && "Save jobs from Discover to see them here"}
                {activeTab === 'applied' && "Applied jobs will appear here"}
                {activeTab === 'accepted' && "Accepted applications will appear here"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredMatches.map((match) => {
            const skills = extractSkills(match.description + ' ' + match.requirements)
            // Mock match score for demo
            const matchScore = match.match_score ?? Math.floor(Math.random() * 30) + 70
            
            return (
              <Card key={match.id} onClick={() => { setSelectedMatch(match); setDialogOpen(true); }} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <CardTitle className="text-lg font-bold leading-tight">{match.job_title || 'Untitled Job'}</CardTitle>
                    <span className="text-sm font-semibold shrink-0">{matchScore}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{match.company_name || 'Company'} • {match.location || 'Location'}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Skills badges */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-2">
                    <Badge variant="ghost" className="text-xs">{match.application_status === 'pending' ? 'Saved' : match.application_status}</Badge>
                  </div>

                  {/* Status and Apply button */}
                  <div className="flex items-center justify-between pt-3">
                    <span className="text-sm text-muted-foreground capitalize">
                      {match.application_status === 'pending' ? 'Saved' : match.application_status}
                    </span>
                    <Button size="sm" asChild>
                      <a href={match.apply_url || '#'} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                        Apply
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
