import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useParams, useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import RoadmapFlowchart from '@/components/RoadmapFlowchart'

export default function RoadmapDetail() {
  const { id } = useParams<{ id: string }>()
  const [roadmap, setRoadmap] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    if (id) loadRoadmap(Number(id))
  }, [id])

  const loadRoadmap = async (roadmapId: number) => {
    setLoading(true)
    try {
      const res = await api.get(`/api/roadmap/${roadmapId}`)
      setRoadmap(res.data.roadmap)
    } catch (e) {
      console.error('Failed to load roadmap', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading roadmap...</p>
        </div>
      </div>
    )
  }

  if (!roadmap) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">Roadmap not found</p>
        <Button onClick={() => nav('/roadmap')}>Back to Roadmaps</Button>
      </div>
    )
  }

  // Check if it's new flowchart format (object with tracks) or old format (array)
  const isFlowchartFormat = roadmap?.roadmap && typeof roadmap.roadmap === 'object' && !Array.isArray(roadmap.roadmap) && 'tracks' in roadmap.roadmap
  const phasesCount = Array.isArray(roadmap?.roadmap) ? roadmap.roadmap.length : 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{roadmap.target_job}</h2>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {!isFlowchartFormat && (
              <>
                <span>{phasesCount} {phasesCount === 1 ? 'phase' : 'phases'}</span>
                <span className="text-muted">•</span>
              </>
            )}
            <span>Generated on {new Date(roadmap.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => nav('/roadmap')}>Back</Button>
          <Button variant="default" size="sm" onClick={() => {
            try {
              const jsonStr = JSON.stringify(roadmap, null, 2)
              navigator.clipboard.writeText(jsonStr)
              toast.success('Roadmap JSON copied to clipboard')
            } catch (e) {
              toast.error('Failed to copy roadmap')
            }
          }}>Export JSON</Button>
          <Button variant="destructive" onClick={async () => {
            if (!roadmap || !roadmap.id) return
            const confirmed = window.confirm('Delete this roadmap? This action cannot be undone.')
            if (!confirmed) return
            try {
              await api.delete(`/api/roadmap/${roadmap.id}`)
              toast.success('Roadmap deleted')
              nav('/roadmap')
            } catch (e) {
              console.error('Failed to delete roadmap', e)
              toast.error('Failed to delete roadmap')
            }
          }}>Delete Roadmap</Button>
        </div>
      </div>

      {/* Render flowchart format */}
      {isFlowchartFormat && (
        <RoadmapFlowchart data={roadmap.roadmap} />
      )}

      {/* Render legacy phase-based format */}
      {!isFlowchartFormat && Array.isArray(roadmap.roadmap) && (
        <div className="relative pl-8 space-y-8">
          <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />

        {Array.isArray(roadmap.roadmap) && roadmap.roadmap.map((step: any, i: number) => (
          <div key={i} className="relative">
            <div className="absolute -left-11 top-0 w-10 h-10 rounded-full bg-primary text-white border-4 border-background z-10 flex items-center justify-center">
              <span className="font-bold">{i + 1}</span>
            </div>
            <Card className="pl-6 overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <Badge className="mb-2">Phase {i + 1}</Badge>
                      <div className="text-sm text-muted-foreground">{typeof step.title !== 'undefined' && step.title ? step.title : (typeof step.phase !== 'undefined' ? `Phase ${step.phase}` : `Step ${i + 1}`)}</div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">{step.duration ?? ''}</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(
                  step.description || step.summary
                ) && (
                  <p className="text-sm text-muted-foreground">{step.description || step.summary}</p>
                )}

                {(step.skills && step.skills.length > 0) || (step.steps && step.steps.length > 0) && (
                  <div>
                    <p className="text-sm font-semibold mb-2">📚 Skills to Learn</p>
                    <div className="flex flex-wrap gap-2">
                      {step.skills && step.skills.map((s: string, j: number) => (
                        <Badge key={j} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                      {step.steps && step.steps.map((st: any, j: number) => (
                        <Badge key={`step-${j}`} variant="outline" className="text-xs">{st.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {step.milestones && step.milestones.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">🎯 Milestones</p>
                    <ul className="space-y-1">
                      {step.milestones.map((m: string, j: number) => (
                        <li key={j} className="text-sm text-muted-foreground">• {m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {step.resources && step.resources.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">🔗 Resources</p>
                    <ul className="space-y-1">
                      {step.resources.map((r: string, j: number) => (
                        <li key={j} className="text-sm text-muted-foreground">• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}

        {!isFlowchartFormat && (
          <div className="relative">
            <div className="absolute left-[-31px] top-2 w-6 h-6 rounded-full bg-green-500 border-4 border-background z-10 flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <Card className="bg-green-50 dark:bg-green-950">
              <CardContent className="pt-6">
                <p className="font-semibold text-green-700 dark:text-green-300">🎉 Goal Achieved: {roadmap.target_job}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      )}
    </div>
  )
}
