'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { useSpacetimeDB } from 'spacetimedb/react'
import { useState } from 'react'
import Link from 'next/link'

export default function RecruitmentPage() {
  const { db } = useSpacetimeDB()
  const [activeTab, setActiveTab] = useState<'candidates' | 'jobs' | 'interviews'>('candidates')
  const [selectedId, setSelectedId] = useState<bigint | null>(null)

  // Get all candidates, jobs, and interviews
  const candidates = db ? Array.from(db.Candidate.iter()).sort((a, b) =>
    Number(b.appliedAt) - Number(a.appliedAt)
  ) : []

  const jobs = db ? Array.from(db.JobPosting.iter()).sort((a, b) =>
    Number(b.postedAt) - Number(a.postedAt)
  ) : []

  const interviews = db ? Array.from(db.Interview.iter()).sort((a, b) =>
    Number(a.scheduledAt) - Number(b.scheduledAt)
  ) : []

  const getCandidateStatusColor = (status: { tag: string }) => {
    switch (status.tag) {
      case 'Applied': return 'bg-blue-500'
      case 'Screening': return 'bg-yellow-500'
      case 'Interviewing': return 'bg-purple-500'
      case 'Offered': return 'bg-green-500'
      case 'Hired': return 'bg-emerald-500'
      case 'Rejected': return 'bg-red-500'
      case 'Withdrawn': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const getJobStatusColor = (status: { tag: string }) => {
    switch (status.tag) {
      case 'Draft': return 'bg-gray-500'
      case 'Open': return 'bg-green-500'
      case 'Paused': return 'bg-yellow-500'
      case 'Closed': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  const getInterviewStatusColor = (status: { tag: string }) => {
    switch (status.tag) {
      case 'Scheduled': return 'bg-blue-500'
      case 'InProgress': return 'bg-purple-500'
      case 'Completed': return 'bg-green-500'
      case 'Cancelled': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  const selectedCandidate = candidates.find(c => c.id === selectedId) || null
  const selectedJob = jobs.find(j => j.id === selectedId) || null
  const selectedInterview = interviews.find(i => i.id === selectedId) || null

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-white">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                ← Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Recruitment</h1>
                <p className="text-sm text-muted-foreground">Candidate screening & interview scheduling</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Active Candidates: </span>
                <span className="font-semibold">
                  {candidates.filter(c => !['Hired', 'Rejected', 'Withdrawn'].includes(c.status.tag)).length}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Open Positions: </span>
                <span className="font-semibold text-green-600">
                  {jobs.filter(j => j.status.tag === 'Open').length}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="border-b bg-white">
          <div className="container mx-auto px-4">
            <div className="flex gap-4">
              <button
                onClick={() => { setActiveTab('candidates'); setSelectedId(null); }}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'candidates'
                    ? 'border-blue-500 text-blue-600 font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Candidates ({candidates.length})
              </button>
              <button
                onClick={() => { setActiveTab('jobs'); setSelectedId(null); }}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'jobs'
                    ? 'border-blue-500 text-blue-600 font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Job Postings ({jobs.length})
              </button>
              <button
                onClick={() => { setActiveTab('interviews'); setSelectedId(null); }}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'interviews'
                    ? 'border-blue-500 text-blue-600 font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Interviews ({interviews.length})
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6">
          {activeTab === 'candidates' ? (
            <div className="grid grid-cols-3 gap-6">
              {/* Candidate List */}
              <div className="col-span-2 space-y-4">
                {candidates.map((candidate) => {
                  const job = jobs.find(j => j.id === candidate.positionId)
                  return (
                    <div
                      key={candidate.id.toString()}
                      onClick={() => setSelectedId(candidate.id)}
                      className={`p-4 rounded-lg border bg-white cursor-pointer hover:shadow-md transition-all ${
                        selectedId === candidate.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${getCandidateStatusColor(candidate.status)}`} />
                            <h3 className="font-semibold">{candidate.name}</h3>
                          </div>
                          {job && (
                            <p className="text-sm text-muted-foreground mt-1">{job.title}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded text-white ${getCandidateStatusColor(candidate.status)}`}>
                          {candidate.status.tag}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{candidate.email}</span>
                        {candidate.phone && (
                          <>
                            <span>•</span>
                            <span>{candidate.phone}</span>
                          </>
                        )}
                      </div>
                      {candidate.aiScreened && candidate.matchScore !== undefined && candidate.matchScore !== null && (
                        <div className="mt-2">
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            AI Match: {Math.round(candidate.matchScore * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
                {candidates.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground bg-white rounded-lg border">
                    <p className="text-lg">No candidates yet</p>
                    <p className="text-sm mt-1">Candidates will appear here when they apply</p>
                  </div>
                )}
              </div>

              {/* Candidate Detail Sidebar */}
              <div className="col-span-1">
                {selectedCandidate ? (
                  <div className="bg-white rounded-lg border p-4 sticky top-4">
                    <h3 className="font-semibold mb-4">Candidate Details</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{selectedCandidate.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="text-sm">{selectedCandidate.email}</p>
                      </div>
                      {selectedCandidate.phone && (
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="text-sm">{selectedCandidate.phone}</p>
                        </div>
                      )}
                      {selectedCandidate.linkedinUrl && (
                        <div>
                          <p className="text-sm text-muted-foreground">LinkedIn</p>
                          <a
                            href={selectedCandidate.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View Profile
                          </a>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <span className={`inline-block mt-1 text-xs px-2 py-1 rounded text-white ${getCandidateStatusColor(selectedCandidate.status)}`}>
                          {selectedCandidate.status.tag}
                        </span>
                      </div>
                      {selectedCandidate.aiScreened && selectedCandidate.matchScore !== undefined && selectedCandidate.matchScore !== null && (
                        <div>
                          <p className="text-sm text-muted-foreground">AI Match Score</p>
                          <div className="mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full"
                                style={{ width: `${selectedCandidate.matchScore * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {Math.round(selectedCandidate.matchScore * 100)}% match
                            </p>
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">Applied</p>
                        <p className="text-sm">
                          {new Date(Number(selectedCandidate.appliedAt) / 1000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border p-8 text-center text-muted-foreground">
                    <p>Select a candidate to view details</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'jobs' ? (
            /* Job Postings */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => {
                const jobCandidates = candidates.filter(c => c.positionId === job.id)
                return (
                  <div
                    key={job.id.toString()}
                    onClick={() => setSelectedId(job.id)}
                    className={`p-6 rounded-lg border bg-white cursor-pointer hover:shadow-md transition-all ${
                      selectedId === job.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg">{job.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded text-white ${getJobStatusColor(job.status)}`}>
                        {job.status.tag}
                      </span>
                    </div>
                    {job.department && (
                      <p className="text-sm text-muted-foreground mb-2">{job.department}</p>
                    )}
                    {job.location && (
                      <p className="text-sm text-muted-foreground mb-4">📍 {job.location}</p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{jobCandidates.length} candidates</span>
                      {job.aiAssisted && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          AI Screening
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              {jobs.length === 0 && (
                <div className="col-span-full p-12 text-center text-muted-foreground bg-white rounded-lg border">
                  <p className="text-lg">No job postings yet</p>
                  <p className="text-sm mt-1">Create a job posting to start recruiting</p>
                </div>
              )}
            </div>
          ) : (
            /* Interviews */
            <div className="space-y-4">
              {interviews.map((interview) => {
                const candidate = candidates.find(c => c.id === interview.candidateId)
                const job = candidate ? jobs.find(j => j.id === candidate.positionId) : null
                return (
                  <div
                    key={interview.id.toString()}
                    onClick={() => setSelectedId(interview.id)}
                    className={`p-4 rounded-lg border bg-white cursor-pointer hover:shadow-md transition-all ${
                      selectedId === interview.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`h-2 w-2 rounded-full ${getInterviewStatusColor(interview.status)}`} />
                          <h3 className="font-semibold">{candidate?.name || 'Unknown Candidate'}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded text-white ${getInterviewStatusColor(interview.status)}`}>
                            {interview.status.tag}
                          </span>
                        </div>
                        {job && (
                          <p className="text-sm text-muted-foreground mb-2">{job.title}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>📅 {new Date(Number(interview.scheduledAt) / 1000).toLocaleString()}</span>
                          {interview.duration && (
                            <>
                              <span>•</span>
                              <span>⏱️ {interview.duration} min</span>
                            </>
                          )}
                          {interview.location && (
                            <>
                              <span>•</span>
                              <span>📍 {interview.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {interviews.length === 0 && (
                <div className="p-12 text-center text-muted-foreground bg-white rounded-lg border">
                  <p className="text-lg">No interviews scheduled</p>
                  <p className="text-sm mt-1">Schedule interviews with candidates</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
