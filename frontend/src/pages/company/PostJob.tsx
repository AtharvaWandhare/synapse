import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Briefcase, MapPin, DollarSign, FileText, ListChecks, Building2 } from 'lucide-react'

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  location: z.string().min(2, 'Location is required').max(100, 'Location too long'),
  jobType: z.enum(['Full-time Job', 'Part-time Job', 'Internship', 'Contract'], {
    required_error: 'Please select a job type',
  }),
  salaryRange: z.string().optional(),
  description: z.string().min(50, 'Description must be at least 50 characters').max(5000, 'Description too long'),
  requirements: z.string().min(20, 'Requirements must be at least 20 characters').max(3000, 'Requirements too long'),
})

type FormValues = z.infer<typeof formSchema>

export default function PostJob() {
  const navigate = useNavigate()
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      location: '',
      jobType: 'Full-time Job',
      salaryRange: '',
      description: '',
      requirements: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await api.post('/api/company/post-job', {
        title: values.title,
        location: values.location,
        description: values.description,
        requirements: values.requirements,
        salary_range: values.salaryRange,
        job_type: values.jobType,
      })
      
      if (res.status === 201) {
        toast.success('Job posted successfully!', {
          description: `${values.title} has been added to your job listings.`
        })
        navigate('/company/my-jobs')
      } else {
        toast.error('Failed to post job')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to post job', {
        description: 'Please try again or contact support if the issue persists.'
      })
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Post a New Position</h1>
        <p className="text-muted-foreground mt-2">
          Fill in the details below to create a job posting or internship opportunity
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Position Details
          </CardTitle>
          <CardDescription>
            Provide comprehensive information to attract the right candidates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Job Title
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Senior Software Engineer" {...field} />
                    </FormControl>
                    <FormDescription>
                      A clear and specific job title helps candidates understand the role
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. New York, NY or Remote" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jobType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select position type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Full-time Job">Full-time Job</SelectItem>
                          <SelectItem value="Part-time Job">Part-time Job</SelectItem>
                          <SelectItem value="Internship">Internship</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="salaryRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Salary Range (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. $80,000 - $120,000 per year" {...field} />
                    </FormControl>
                    <FormDescription>
                      Including salary information can increase candidate interest
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Job Description
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the role, responsibilities, team, and what makes this opportunity exciting..."
                        className="min-h-[150px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum 50 characters. Be detailed and highlight what makes this role unique.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4" />
                      Requirements & Qualifications
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="List required skills, experience, education, and any preferred qualifications..."
                        className="min-h-[120px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum 20 characters. Include both required and nice-to-have qualifications.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-4">
                <Button 
                  type="submit" 
                  disabled={form.formState.isSubmitting}
                  className="flex-1 sm:flex-none"
                >
                  {form.formState.isSubmitting ? 'Posting...' : 'Post Position'}
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => navigate('/company/my-jobs')}
                  disabled={form.formState.isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
