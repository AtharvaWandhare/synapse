import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
// Accordion removed in favor of card grid list

type RoadmapStep = {
  phase?: string
  title?: string
  description?: string
  duration?: string
  skills?: string[]
  resources?: string[]
  milestones?: string[]
}

type Roadmap = {
  id: number
  target_job: string
  created_at: string
  roadmap: RoadmapStep[]
}

export default function Roadmap() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([])
  const [targetJob, setTargetJob] = useState('Software Engineer')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedRoadmap, setExpandedRoadmap] = useState<string | null>(null)
  const nav = useNavigate()

  useEffect(() => {
    loadRoadmaps()
  }, [])

  const loadRoadmaps = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/roadmaps')
      setRoadmaps(res.data.roadmaps || [])
      // Expand the most recent roadmap by default
      if (res.data.roadmaps && res.data.roadmaps.length > 0) {
        setExpandedRoadmap(`roadmap-${res.data.roadmaps[0].id}`)
      }
    } catch (e: any) {
      console.error('Failed to load roadmaps', e)
    } finally {
      setLoading(false)
    }
  }

  const generateRoadmap = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await api.post('/api/jwt/generate-career-roadmap', { target_job: targetJob })
      setError(null)
      await loadRoadmaps()
      // Expand the newly created roadmap
      if (res.data.roadmap_id) {
        setExpandedRoadmap(`roadmap-${res.data.roadmap_id}`)
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to generate roadmap. Please upload a resume first.')
    } finally {
      setGenerating(false)
    }
  }

  const deleteRoadmap = async (id: number) => {
    try {
      await api.delete(`/api/roadmap/${id}`)
      await loadRoadmaps()
    } catch (e) {
      console.error('Failed to delete roadmap', e)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading roadmaps...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Career Roadmaps</h2>
            <p className="text-muted-foreground mt-1">Personalized plans to reach your next role — generated from your resume.</p>
          </div>
          <div className="flex items-center gap-3">
            <Input placeholder="Search roadmaps..." value={targetJob} onChange={(e) => setTargetJob(e.target.value)} className="w-64" />
            <Button onClick={generateRoadmap} disabled={generating}>{generating ? 'Generating...' : 'Generate Roadmap'}</Button>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate New Roadmap</CardTitle>
          <CardDescription>Create a roadmap for your target job role</CardDescription>
        </CardHeader>
          <CardContent className="space-y-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <Label htmlFor="target_job">Target Job Role</Label>
            <Input
              id="target_job"
              placeholder="e.g., Software Engineer, Data Scientist"
              value={targetJob}
              onChange={(e) => setTargetJob(e.target.value)}
            />
          </div>
          <Button onClick={generateRoadmap} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Roadmap'}
          </Button>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          </CardContent>
      </Card>

      {roadmaps.length === 0 ? (
        <div className="flex items-center justify-center min-h-[260px]">
          <div className="text-left">
            <p className="text-2xl font-semibold">No roadmaps yet</p>
            <p className="text-muted-foreground mt-2">Generate a roadmap for a target job role using the button above to get started.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Your Roadmaps ({roadmaps.length})</h3>
            <div className="text-sm text-muted-foreground">Click a roadmap to view details</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {roadmaps.map((rm) => {
              const isFlowchart = rm.roadmap && typeof rm.roadmap === 'object' && !Array.isArray(rm.roadmap) && 'tracks' in rm.roadmap
              const phaseCount = Array.isArray(rm.roadmap) ? rm.roadmap.length : 0
              const trackCount = isFlowchart && rm.roadmap.tracks ? rm.roadmap.tracks.length : 0
              const totalNodes = isFlowchart && rm.roadmap.tracks 
                ? rm.roadmap.tracks.reduce((sum: number, t: any) => sum + (t.nodes?.length || 0), 0)
                : 0
              
              return (
                <Card key={rm.id} className="hover:shadow-lg transition-shadow cursor-pointer" role="button" onClick={() => nav(`/roadmap/${rm.id}`)}>
                  <CardContent>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <Badge variant="outline" className="mb-2">{rm.target_job}</Badge>
                        {isFlowchart ? (
                          <>
                            <p className="text-sm text-muted-foreground">{trackCount} tracks • {totalNodes} skills</p>
                            {rm.roadmap.description && (
                              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{rm.roadmap.description}</p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">{phaseCount ? `${phaseCount} phases` : '—'}</p>
                            {rm.roadmap && Array.isArray(rm.roadmap) && rm.roadmap.length > 0 && (
                              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                                {rm.roadmap[0].summary || rm.roadmap[0].description || rm.roadmap[0].title || (typeof rm.roadmap[0].phase !== 'undefined' ? `Phase ${rm.roadmap[0].phase}` : '')}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-sm text-muted-foreground">{new Date(rm.created_at).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={(e) => {e.stopPropagation(); nav(`/roadmap/${rm.id}`)}}>View</Button>
                          <Button size="sm" variant="destructive" onClick={(e) => {e.stopPropagation(); if (confirm('Delete this roadmap?')) deleteRoadmap(rm.id)}}>Delete</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
