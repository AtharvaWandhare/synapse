import React, { useState } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

export default function UploadResume() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<any>(null)
  const auth = useAuth()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    const form = new FormData()
    form.append('resume_file', file)
    try {
      const res = await api.post('/api/upload-resume', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl mb-4">Upload Resume</h2>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="submit" className="bg-green-600 text-white p-2">Upload</button>
      </form>
      {result && (
        <div className="mt-4">
          <h3>Analysis</h3>
          <pre className="bg-gray-100 p-2">{JSON.stringify(result.analysis, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
