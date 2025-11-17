import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Users, Trash2, Lock, Unlock, MapPin, Calendar, Briefcase, Filter } from 'lucide-react'

type Job = {
  id: number
  title: string
  location: string
  salary_range?: string
  job_type?: string
  created_at: string
  applications_closed?: boolean
}

export default function CompanyMyJobs() {
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<Job[]>([])
  const [filterType, setFilterType] = useState<string>('All')

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/company/my-jobs')
      if (res.data?.status === 'success') {
        setJobs(res.data.jobs || [])
      } else {
        toast.error('Failed to load jobs')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggleApplications = async (jobId: number, close: boolean) => {
    if (!confirm(close ? 'Close applications?' : 'Reopen applications?')) return
    try {
      const res = await api.put('/api/company/close-applications', { job_id: jobId, close })
      if (res.data?.status === 'success') {
        toast.success('Updated')
        load()
      } else toast.error('Failed')
    } catch (err) { console.error(err); toast.error('Failed') }
  }

  const deleteJob = async (jobId: number) => {
    if (!confirm('Delete job? This cannot be undone.')) return
    try {
      const res = await api.delete(`/api/company/delete-job/${jobId}`)
      if (res.data?.status === 'success') {
        toast.success('Job deleted')
        load()
      } else toast.error('Failed')
    } catch (err) { console.error(err); toast.error('Failed') }
  }

  // Filter jobs by type
  const filteredJobs = filterType === 'All' 
    ? jobs 
    : jobs.filter(job => job.job_type === filterType)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold">My Job Postings</h2>
          <p className="text-muted-foreground mt-1">Manage all your job listings</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Positions</SelectItem>
                <SelectItem value="Full-time Job">Full-time Jobs</SelectItem>
                <SelectItem value="Part-time Job">Part-time Jobs</SelectItem>
                <SelectItem value="Internship">Internships</SelectItem>
                <SelectItem value="Contract">Contracts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? <div>Loading...</div> : (
        filteredJobs.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <h3 className="text-lg font-medium">
              {filterType === 'All' ? 'No job postings yet' : `No ${filterType.toLowerCase()}s found`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filterType === 'All' 
                ? 'Create your first job posting to start receiving applications!'
                : 'Try changing the filter or create a new posting.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredJobs.map(job => (
              <Card className="p-6" key={job.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4" />
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">{job.job_type}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        Posted {new Date(job.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {job.applications_closed ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          Applications Closed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <Unlock className="h-3 w-3" />
                          Accepting Applications
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <Link to={`/company/my-jobs/${job.id}/applicants`}>
                        <Users className="h-4 w-4" />
                        View Applicants
                      </Link>
                    </Button>
                    {job.applications_closed ? (
                      <Button variant="outline" size="sm" onClick={() => toggleApplications(job.id, false)} className="gap-2">
                        <Unlock className="h-4 w-4" />
                        Reopen
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => toggleApplications(job.id, true)} className="gap-2">
                        <Lock className="h-4 w-4" />
                        Close
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={() => deleteJob(job.id)} className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  )
}
