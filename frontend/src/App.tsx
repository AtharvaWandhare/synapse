import React from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import './App.css'
import { useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from './components/ui/navigation-menu'
import { Toaster } from '@/components/ui/sonner'

import Home from './pages/Home'
import Login from './pages/Login'
import RegisterJobSeeker from './pages/RegisterJobSeeker'
import RegisterCompany from './pages/RegisterCompany'
import Profile from './pages/Profile'
import UploadResume from './pages/UploadResume'
import Jobs from './pages/Jobs'
import Matches from './pages/Matches'
import Chat from './pages/Chat'
import Roadmap from './pages/Roadmap'
import RoadmapDetail from './pages/RoadmapDetail'
import ResumeList from './pages/ResumeList'
import ResumeBuilder from './pages/ResumeBuilder'
import CompanyDashboard from './pages/company/Dashboard'
import CompanyMyJobs from './pages/company/MyJobs'
import CompanyPostJob from './pages/company/PostJob'
import CompanyApplicants from './pages/company/Applicants'
import CompanyCandidateProfile from './pages/company/CandidateProfile'

// Protected route wrapper
const ProtectedRoute = ({ children, allowedTypes }: { children: React.ReactNode; allowedTypes: ('jobseeker' | 'company')[] }) => {
  const { isAuthenticated, userType } = useAuth()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  if (!userType || !allowedTypes.includes(userType)) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  const { isAuthenticated, userType, logout } = useAuth()
  
  function HeaderNav({ isAuthenticated, userType, logout }: { isAuthenticated: boolean; userType?: string | null; logout: () => void }) {
    const location = useLocation()
    const pathname = location.pathname

    // Don't show header on landing or registration pages
    if (pathname === '/' || pathname === '/home' || pathname.startsWith('/register')) {
      return null
    }

    if (!isAuthenticated) return null

    return (
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <div className="flex items-center gap-4">
              <Link to="/" className="text-2xl font-bold">Synapse</Link>
            </div>

            {/* Center: navigation menu */}
            <div className="flex-1 flex justify-center">
              <NavigationMenu>
                <NavigationMenuList>
                  {userType === 'jobseeker' && (
                    <>
                      <NavigationMenuItem>
                        <NavigationMenuLink asChild data-active={pathname.startsWith('/discover')}>
                          <Link to="/discover" className="px-4 py-2 rounded-md text-sm font-medium hover:bg-muted">Discover</Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                      <NavigationMenuItem>
                        <NavigationMenuLink asChild data-active={pathname.startsWith('/matches')}>
                          <Link to="/matches" className="px-4 py-2 rounded-md text-sm font-medium hover:bg-muted">Matches</Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                      <NavigationMenuItem>
                        <NavigationMenuLink asChild data-active={pathname.startsWith('/chat')}>
                          <Link to="/chat" className="px-4 py-2 rounded-md text-sm font-medium hover:bg-muted">Chat</Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                      <NavigationMenuItem>
                        <NavigationMenuLink asChild data-active={pathname.startsWith('/resume-builder')}>
                          <Link to="/resume-builder" className="px-4 py-2 rounded-md text-sm font-medium hover:bg-muted">Resume Builder</Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                      <NavigationMenuItem>
                        <NavigationMenuLink asChild data-active={pathname.startsWith('/profile')}>
                          <Link to="/profile" className="px-4 py-2 rounded-md text-sm font-medium hover:bg-muted">Profile</Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                      <NavigationMenuItem>
                        <NavigationMenuLink asChild data-active={pathname.startsWith('/roadmap')}>
                          <Link to="/roadmap" className="px-4 py-2 rounded-md text-sm font-medium hover:bg-muted">Roadmap</Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    </>
                  )}
                  {userType === 'company' && (
                    <>
                      <NavigationMenuItem>
                        <NavigationMenuLink asChild data-active={pathname.startsWith('/company/dashboard')}>
                          <Link to="/company/dashboard" className="px-4 py-2 rounded-md text-sm font-medium hover:bg-muted">Dashboard</Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                      <NavigationMenuItem>
                        <NavigationMenuLink asChild data-active={pathname.startsWith('/company/post-job')}>
                          <Link to="/company/post-job" className="px-4 py-2 rounded-md text-sm font-medium hover:bg-muted">Post Job</Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                      <NavigationMenuItem>
                        <NavigationMenuLink asChild data-active={pathname.startsWith('/company/my-jobs')}>
                          <Link to="/company/my-jobs" className="px-4 py-2 rounded-md text-sm font-medium hover:bg-muted">My Jobs</Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                      <NavigationMenuItem>
                        <NavigationMenuLink asChild data-active={pathname.startsWith('/company/applicants')}>
                          <Link to="/company/applicants" className="px-4 py-2 rounded-md text-sm font-medium hover:bg-muted">Applicants</Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                      <NavigationMenuItem>
                        <NavigationMenuLink asChild data-active={pathname.startsWith('/chat')}>
                          <Link to="/chat" className="px-4 py-2 rounded-md text-sm font-medium hover:bg-muted">Chat</Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    </>
                  )}
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-4">
              <button onClick={logout} className="text-sm font-medium hover:text-primary">Logout</button>
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <BrowserRouter>
      <SocketProvider>
        <div className="min-h-screen bg-background">
          {/* Navigation */}
          <HeaderNav isAuthenticated={isAuthenticated} userType={userType} logout={logout} />

          <Routes>
            {/* Public Routes */}
            <Route path="/home" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register/jobseeker" element={<RegisterJobSeeker />} />
            <Route path="/register/company" element={<RegisterCompany />} />
            
            {/* Job Seeker Routes */}
            <Route path="/discover" element={<ProtectedRoute allowedTypes={['jobseeker']}><Jobs /></ProtectedRoute>} />
            <Route path="/matches" element={<ProtectedRoute allowedTypes={['jobseeker']}><Matches /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute allowedTypes={['jobseeker', 'company']}><Chat /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute allowedTypes={['jobseeker']}><Profile /></ProtectedRoute>} />
          <Route path="/roadmap" element={<ProtectedRoute allowedTypes={['jobseeker']}><Roadmap /></ProtectedRoute>} />
          <Route path="/roadmap/:id" element={<ProtectedRoute allowedTypes={['jobseeker']}><RoadmapDetail /></ProtectedRoute>} />
          <Route path="/resume-builder" element={<ProtectedRoute allowedTypes={['jobseeker']}><ResumeList /></ProtectedRoute>} />
          <Route path="/resume-builder/:id" element={<ProtectedRoute allowedTypes={['jobseeker']}><ResumeBuilder /></ProtectedRoute>} />
          
          {/* Company Routes - placeholders for now */}
          <Route path="/company/dashboard" element={<ProtectedRoute allowedTypes={['company']}><CompanyDashboard /></ProtectedRoute>} />
          <Route path="/company/post-job" element={<ProtectedRoute allowedTypes={['company']}><CompanyPostJob /></ProtectedRoute>} />
          <Route path="/company/my-jobs" element={<ProtectedRoute allowedTypes={['company']}><CompanyMyJobs /></ProtectedRoute>} />
          <Route path="/company/my-jobs/:jobId/applicants" element={<ProtectedRoute allowedTypes={['company']}><CompanyApplicants /></ProtectedRoute>} />
          <Route path="/company/applicants" element={<ProtectedRoute allowedTypes={['company']}><CompanyApplicants /></ProtectedRoute>} />
          <Route path="/company/candidate/:id" element={<ProtectedRoute allowedTypes={['company']}><CompanyCandidateProfile /></ProtectedRoute>} />
          
          {/* Default redirect */}
          <Route path="/" element={isAuthenticated ? (userType === 'jobseeker' ? <Navigate to="/discover" replace /> : <Navigate to="/company/dashboard" replace />) : <Navigate to="/home" replace />} />
        </Routes>
      </div>
      <Toaster />
      </SocketProvider>
    </BrowserRouter>
  )
}

export default App
