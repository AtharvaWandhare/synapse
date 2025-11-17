import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Briefcase, Heart, Target, Sparkles, FileText, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Synapse</h1>
            <Badge variant="secondary">Tech Careers</Badge>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link to="/register/jobseeker">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI-Powered Job Matching</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Your Next Tech Role,{' '}
            <span className="text-primary">Intelligently Matched</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A focused, curated feed of internships and entry-level roles for students and 
            graduates. Stop searching. Start connecting with high-potential opportunities.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Link to="/register/jobseeker">
              <Button size="lg" className="gap-2">
                Explore roles
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                View matches
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Create your career snapshot</CardTitle>
              <CardDescription className="text-base">
                Skills, projects, and experience in one place.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Build a dynamic profile that powers personalized recommendations.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Discover with a swipe</CardTitle>
              <CardDescription className="text-base">
                Fast, focused, card-based discovery.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                See one role at a time with a clear match score. Swipe right to save, left to refine.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Track your opportunities</CardTitle>
              <CardDescription className="text-base">
                All your saved roles, organized.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Every right swipe lands in your Matches list with direct links to apply.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Beyond keywords: semantic matching
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Our AI analyzes your complete profile to surface roles that truly fit your skills and aspirations.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="font-bold text-primary">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Upload your resume</h3>
                    <p className="text-muted-foreground">
                      Our AI extracts your skills, experience, and achievements to build your profile.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="font-bold text-primary">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Get matched to roles</h3>
                    <p className="text-muted-foreground">
                      Swipe through personalized job recommendations with compatibility scores.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="font-bold text-primary">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Track and apply</h3>
                    <p className="text-muted-foreground">
                      Save roles you love and apply directly through your matches dashboard.
                    </p>
                  </div>
                </div>
              </div>

              <Card className="p-8 bg-gradient-to-br from-primary/5 to-primary/10 border-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Match Score</span>
                    <Badge className="bg-green-500 hover:bg-green-600">92% Match</Badge>
                  </div>
                  <div>
                    <h3 className="font-bold text-2xl mb-2">Software Engineer Intern</h3>
                    <p className="text-muted-foreground">TechCorp • Remote</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">React</Badge>
                    <Badge variant="secondary">TypeScript</Badge>
                    <Badge variant="secondary">Node.js</Badge>
                    <Badge variant="secondary">AWS</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground pt-4">
                    Based on your skills in full-stack development and cloud technologies.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 bg-gradient-to-r from-primary/10 via-primary/5 to-background">
            <CardContent className="p-12 text-center">
              <Briefcase className="h-16 w-16 text-primary mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to find your perfect match?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of students and graduates landing their dream tech roles through intelligent matching.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link to="/register/jobseeker">
                  <Button size="lg" className="gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/register/company">
                  <Button size="lg" variant="outline">
                    I'm hiring
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Synapse</h3>
              <p className="text-sm text-muted-foreground">
                Intelligent job matching for tech careers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Job Seekers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/register/jobseeker" className="hover:text-foreground">Sign up</Link></li>
                <li><Link to="/discover" className="hover:text-foreground">Explore jobs</Link></li>
                <li><Link to="/matches" className="hover:text-foreground">My matches</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Companies</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/register/company" className="hover:text-foreground">Post jobs</Link></li>
                <li><Link to="/company/dashboard" className="hover:text-foreground">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© 2025 Synapse. Built with ❤️ for tech careers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
