import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ArrowLeft, Download, ExternalLink } from 'lucide-react'

export default function CandidateProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any | null>(null)
  const [analysis, setAnalysis] = useState<any | null>(null)
  const [match, setMatch] = useState<any | null>(null)

  const handleDownloadResume = async () => {
    if (!analysis?.filename) return
    try {
      const res = await api.get(`/api/download-resume/${analysis.filename}`, {
        responseType: 'blob',
      })
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', analysis.filename.split('_').slice(1).join('_') || 'resume.pdf')
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Resume downloaded')
    } catch (err) {
      console.error(err)
      toast.error('Failed to download resume')
    }
  }

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      try {
        const res = await api.get(`/api/company/candidate/${id}`)
        if (res.data?.status === 'success') {
          setUser(res.data.user)
          setAnalysis(res.data.analysis)
          setMatch(res.data.match)
        } else {
          toast.error('Failed to load profile')
        }
      } catch (err) {
        console.error(err)
        toast.error('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <div className="p-6">Loading...</div>
  if (!user) return <div className="p-6">Profile not found</div>

  const safeParse = (s: any) => {
    if (!s) return null
    try { return JSON.parse(s) } catch { return s }
  }

  const projects = safeParse(user.projects) || []
  const courses = safeParse(user.training_courses) || []
  const samples = safeParse(user.work_samples) || []

  // Extract data from parsed resume
  const resumeData = analysis?.extracted_json || {}
  const personalDetails = resumeData.personal_details || {}
  const professionalSummary = resumeData.professional_summary || ''
  const skills = resumeData.skills || []
  const workExperience = resumeData.work_experience || []
  const education = resumeData.education || []
  const certifications = resumeData.certifications || []
  const resumeProjects = resumeData.projects || []
  const achievements = resumeData.achievements || []
  const languages = resumeData.languages || []
  const volunteering = resumeData.volunteering || []
  const publications = resumeData.publications || []
  // Prefer ATS score (if available) over analysis_score for visual display
  const displayScore = (analysis?.ats_score ?? analysis?.analysis_score ?? 0)
  // Circle radius is 56, circumference = 2 * pi * r
  const CIRCLE_R = 56
  const CIRCLE_C = Math.round(2 * Math.PI * CIRCLE_R)
  const strokeDash = `${Math.round(CIRCLE_C * (displayScore / 100))} ${CIRCLE_C}`

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Candidate Profile</h1>
          </div>
          {analysis?.filename && (
            <Button onClick={handleDownloadResume} className="gap-2">
              <Download className="h-4 w-4" />
              Download Resume
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">{user.full_name?.[0]?.toUpperCase()}</div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">{user.full_name}</h2>
                  <p className="text-muted-foreground mt-1">{user.email}</p>
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                    {user.phone && <div className="flex items-center gap-1">{user.phone}</div>}
                    {user.location && <div className="flex items-center gap-1">{user.location}</div>}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {user.linkedin_url && <a href={user.linkedin_url} rel="noreferrer" target="_blank" className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium">LinkedIn</a>}
                    {user.github_url && <a href={user.github_url} rel="noreferrer" target="_blank" className="px-3 py-1 bg-gray-50 text-gray-700 rounded-md text-sm font-medium">GitHub</a>}
                    {user.portfolio_url && <a href={user.portfolio_url} rel="noreferrer" target="_blank" className="px-3 py-1 bg-purple-50 text-purple-700 rounded-md text-sm font-medium">Portfolio</a>}
                  </div>
                </div>
              </div>
            </Card>

            {professionalSummary && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3">Professional Summary</h3>
                <p className="text-gray-700 leading-relaxed">{professionalSummary}</p>
              </Card>
            )}

            {user.career_objective && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3">Career Objective</h3>
                <p className="text-gray-700 leading-relaxed">{user.career_objective}</p>
              </Card>
            )}

            {workExperience.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Work Experience</h3>
                <div className="space-y-5">
                  {workExperience.map((exp: any, i: number) => (
                    <div key={i} className="border-l-4 border-blue-500 pl-4">
                      <h4 className="font-semibold text-base text-gray-900">{exp.position || exp.title}</h4>
                      <p className="text-sm text-gray-700 font-medium mt-1">{exp.company}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        {(exp.duration || exp.dates) && <span>{exp.duration || exp.dates}</span>}
                        {exp.location && <span>• {exp.location}</span>}
                      </div>
                      {exp.responsibilities && Array.isArray(exp.responsibilities) && exp.responsibilities.length > 0 && (
                        <ul className="mt-2 space-y-1 list-disc list-inside text-sm text-gray-700">
                          {exp.responsibilities.map((resp: string, idx: number) => (
                            <li key={idx}>{resp}</li>
                          ))}
                        </ul>
                      )}
                      {exp.description && !Array.isArray(exp.responsibilities) && (
                        <p className="mt-2 text-sm text-gray-700">{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {education.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Education</h3>
                <div className="space-y-4">
                  {education.map((edu: any, i: number) => (
                    <div key={i} className="border-l-4 border-green-500 pl-4">
                      <h4 className="font-semibold text-base text-gray-900">{edu.degree}</h4>
                      <p className="text-sm text-gray-700 font-medium mt-1">{edu.institution}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        {(edu.year || edu.duration) && <span>{edu.year || edu.duration}</span>}
                        {edu.gpa && <span>• GPA: {edu.gpa}</span>}
                        {edu.location && <span>• {edu.location}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {certifications.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Certifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {certifications.map((cert: any, i: number) => (
                    <div key={i} className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                      <h4 className="font-semibold text-sm text-gray-900">{cert.name || cert.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{cert.issuer || cert.organization}</p>
                      {cert.date && <p className="text-xs text-gray-500 mt-1">{cert.date}</p>}
                      {cert.credential_id && <p className="text-xs text-gray-500 mt-1">ID: {cert.credential_id}</p>}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {resumeProjects.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Projects (from Resume)</h3>
                <div className="space-y-4">
                  {resumeProjects.map((proj: any, i: number) => (
                    <div key={i} className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-base text-gray-900">{proj.title || proj.name}</h4>
                        {proj.link && (
                          <a href={proj.link} target="_blank" rel="noreferrer" className="text-purple-600 hover:text-purple-700">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-2">{proj.description}</p>
                      {proj.technologies && Array.isArray(proj.technologies) && proj.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {proj.technologies.map((tech: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {projects.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Projects (User Profile)</h3>
                <div className="space-y-4">
                  {projects.map((p: any, i: number) => (
                    <div key={i} className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-base text-gray-900">{p.title}</h4>
                        {p.link && (
                          <a href={p.link} target="_blank" rel="noreferrer" className="text-green-600 hover:text-green-700">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-2">{p.description}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {achievements.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Achievements & Awards</h3>
                <ul className="space-y-2">
                  {achievements.map((ach: any, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-yellow-500 mt-0.5">🏆</span>
                      <span className="text-sm text-gray-700">{typeof ach === 'string' ? ach : ach.title || ach.name}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {publications.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Publications</h3>
                <div className="space-y-3">
                  {publications.map((pub: any, i: number) => (
                    <div key={i} className="bg-amber-50 p-3 rounded border border-amber-200">
                      <h4 className="font-semibold text-sm text-gray-900">{typeof pub === 'string' ? pub : pub.title}</h4>
                      {typeof pub !== 'string' && pub.journal && <p className="text-xs text-gray-600 mt-1">{pub.journal}</p>}
                      {typeof pub !== 'string' && pub.date && <p className="text-xs text-gray-500 mt-1">{pub.date}</p>}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {volunteering.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Volunteering</h3>
                <div className="space-y-3">
                  {volunteering.map((vol: any, i: number) => (
                    <div key={i} className="border-l-4 border-pink-500 pl-3">
                      <h4 className="font-semibold text-sm text-gray-900">{typeof vol === 'string' ? vol : vol.role || vol.title}</h4>
                      {typeof vol !== 'string' && vol.organization && <p className="text-sm text-gray-600">{vol.organization}</p>}
                      {typeof vol !== 'string' && vol.duration && <p className="text-xs text-gray-500 mt-1">{vol.duration}</p>}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {courses.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3">Training & Courses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {courses.map((c: any, i: number) => (
                    <div key={i} className="bg-teal-50 p-3 rounded border border-teal-200">
                      <h4 className="text-sm font-semibold text-gray-900">{c.name}</h4>
                      <p className="text-xs text-gray-600">{c.issuer}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {samples.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3">Work Samples</h3>
                <div className="space-y-2">
                  {samples.map((s: any, i: number) => (
                    <a key={i} href={s.link} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-orange-50 p-3 rounded border border-orange-200 hover:bg-orange-100 transition-colors">
                      <span className="text-sm font-medium text-gray-900">{s.title}</span>
                      <ExternalLink className="h-4 w-4 text-orange-600" />
                    </a>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {analysis ? (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Resume Score</h3>
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="8" fill="none"/>
                      <circle cx="64" cy="64" r="56" stroke="#059669" strokeWidth="8" fill="none" strokeDasharray={`${CIRCLE_C} ${CIRCLE_C}`} strokeDashoffset={Math.round(CIRCLE_C * (1 - (displayScore / 100)))} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 800ms ease' }}/> 
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center"><span className="text-3xl font-bold">{displayScore}</span></div>
                  </div>
                </div>
                {analysis.ats_score !== undefined && analysis.ats_score !== null && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600 text-center">ATS Score</p>
                    <p className="text-2xl font-bold text-center text-blue-600">{analysis.ats_score}</p>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-6">
                <p className="text-gray-600 text-center">No resume uploaded yet</p>
              </Card>
            )}

            {skills.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.map((s: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {languages.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3">Languages</h3>
                <div className="space-y-2">
                  {languages.map((lang: any, i: number) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">{typeof lang === 'string' ? lang : lang.name}</span>
                      {typeof lang !== 'string' && lang.proficiency && (
                        <span className="text-xs text-gray-500">{lang.proficiency}</span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {match && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3">Application Status</h3>
                <div className="text-center">
                  <div className="text-xl font-semibold text-gray-800 mb-1">{match.application_status || 'pending'}</div>
                  <p className="text-sm text-gray-600">Status of this candidate for the job</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
