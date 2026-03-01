'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { useSpacetimeDB } from 'spacetimedb/react'
import { useState } from 'react'
import Link from 'next/link'

export default function EngineeringPage() {
  const { db } = useSpacetimeDB()
  const [activeTab, setActiveTab] = useState<'prs' | 'bugs' | 'repos'>('prs')
  const [selectedId, setSelectedId] = useState<bigint | null>(null)

  // Get all PRs, bugs, and repos
  const pullRequests = db ? Array.from(db.PullRequest.iter()).sort((a, b) =>
    Number(b.createdAt) - Number(a.createdAt)
  ) : []

  const bugs = db ? Array.from(db.Bug.iter()).sort((a, b) =>
    Number(b.reportedAt) - Number(a.reportedAt)
  ) : []

  const repos = db ? Array.from(db.CodeRepository.iter()).sort((a, b) =>
    a.name.localeCompare(b.name)
  ) : []

  const getPrStatusColor = (status: { tag: string }) => {
    switch (status.tag) {
      case 'Open': return 'bg-green-500'
      case 'UnderReview': return 'bg-yellow-500'
      case 'ChangesRequested': return 'bg-orange-500'
      case 'Approved': return 'bg-blue-500'
      case 'Merged': return 'bg-purple-500'
      case 'Closed': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const getBugSeverityColor = (severity: { tag: string }) => {
    switch (severity.tag) {
      case 'Critical': return 'text-red-600'
      case 'High': return 'text-orange-600'
      case 'Medium': return 'text-yellow-600'
      case 'Low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const getBugStatusColor = (status: { tag: string }) => {
    switch (status.tag) {
      case 'Open': return 'bg-red-500'
      case 'InProgress': return 'bg-yellow-500'
      case 'ReadyForTesting': return 'bg-blue-500'
      case 'Resolved': return 'bg-green-500'
      case 'Closed': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const selectedPr = pullRequests.find(p => p.id === selectedId) || null
  const selectedBug = bugs.find(b => b.id === selectedId) || null
  const selectedRepo = repos.find(r => r.id === selectedId) || null

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
                <h1 className="text-2xl font-bold">Engineering</h1>
                <p className="text-sm text-muted-foreground">AI code reviews & automated bug triage</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Open PRs: </span>
                <span className="font-semibold">
                  {pullRequests.filter(p => !['Merged', 'Closed'].includes(p.status.tag)).length}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Open Bugs: </span>
                <span className="font-semibold text-red-600">
                  {bugs.filter(b => !['Resolved', 'Closed'].includes(b.status.tag)).length}
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
                onClick={() => { setActiveTab('prs'); setSelectedId(null); }}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'prs'
                    ? 'border-blue-500 text-blue-600 font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Pull Requests ({pullRequests.length})
              </button>
              <button
                onClick={() => { setActiveTab('bugs'); setSelectedId(null); }}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'bugs'
                    ? 'border-blue-500 text-blue-600 font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Bugs ({bugs.length})
              </button>
              <button
                onClick={() => { setActiveTab('repos'); setSelectedId(null); }}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'repos'
                    ? 'border-blue-500 text-blue-600 font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Repositories ({repos.length})
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6">
          {activeTab === 'prs' ? (
            <div className="grid grid-cols-3 gap-6">
              {/* PR List */}
              <div className="col-span-2 space-y-4">
                {pullRequests.map((pr) => {
                  const repo = repos.find(r => r.id === pr.repositoryId)
                  return (
                    <div
                      key={pr.id.toString()}
                      onClick={() => setSelectedId(pr.id)}
                      className={`p-4 rounded-lg border bg-white cursor-pointer hover:shadow-md transition-all ${
                        selectedId === pr.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${getPrStatusColor(pr.status)}`} />
                            <h3 className="font-semibold">{pr.title}</h3>
                          </div>
                          {repo && (
                            <p className="text-sm text-muted-foreground mt-1">{repo.name}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded text-white ${getPrStatusColor(pr.status)}`}>
                          {pr.status.tag}
                        </span>
                      </div>
                      {pr.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{pr.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>#{pr.id.toString()}</span>
                        {pr.branch && (
                          <>
                            <span>•</span>
                            <span>🌿 {pr.branch}</span>
                          </>
                        )}
                      </div>
                      {pr.aiReviewed && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            AI Reviewed
                          </span>
                          {pr.testsPass !== undefined && (
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              pr.testsPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              Tests {pr.testsPass ? 'Pass' : 'Fail'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                {pullRequests.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground bg-white rounded-lg border">
                    <p className="text-lg">No pull requests yet</p>
                    <p className="text-sm mt-1">PRs will appear here when they're created</p>
                  </div>
                )}
              </div>

              {/* PR Detail Sidebar */}
              <div className="col-span-1">
                {selectedPr ? (
                  <div className="bg-white rounded-lg border p-4 sticky top-4">
                    <h3 className="font-semibold mb-4">PR Details</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Title</p>
                        <p className="font-medium">{selectedPr.title}</p>
                      </div>
                      {selectedPr.description && (
                        <div>
                          <p className="text-sm text-muted-foreground">Description</p>
                          <p className="text-sm whitespace-pre-wrap">{selectedPr.description}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <span className={`inline-block mt-1 text-xs px-2 py-1 rounded text-white ${getPrStatusColor(selectedPr.status)}`}>
                          {selectedPr.status.tag}
                        </span>
                      </div>
                      {selectedPr.branch && (
                        <div>
                          <p className="text-sm text-muted-foreground">Branch</p>
                          <p className="text-sm font-mono">{selectedPr.branch}</p>
                        </div>
                      )}
                      {selectedPr.aiReviewed && (
                        <div>
                          <p className="text-sm text-muted-foreground">AI Review</p>
                          <div className="mt-1 space-y-1">
                            <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                              Reviewed by AI
                            </span>
                            {selectedPr.testsPass !== undefined && (
                              <span className={`inline-block text-xs px-2 py-0.5 rounded ml-1 ${
                                selectedPr.testsPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                Tests {selectedPr.testsPass ? '✓' : '✗'}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">Created</p>
                        <p className="text-sm">
                          {new Date(Number(selectedPr.createdAt) / 1000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border p-8 text-center text-muted-foreground">
                    <p>Select a PR to view details</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'bugs' ? (
            /* Bugs */
            <div className="space-y-4">
              {bugs.map((bug) => {
                const repo = repos.find(r => r.id === bug.repositoryId)
                return (
                  <div
                    key={bug.id.toString()}
                    onClick={() => setSelectedId(bug.id)}
                    className={`p-4 rounded-lg border bg-white cursor-pointer hover:shadow-md transition-all ${
                      selectedId === bug.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${getBugStatusColor(bug.status)}`} />
                          <h3 className="font-semibold">{bug.title}</h3>
                          <span className={`text-sm ${getBugSeverityColor(bug.severity)}`}>
                            {bug.severity.tag}
                          </span>
                        </div>
                        {repo && (
                          <p className="text-sm text-muted-foreground mt-1">{repo.name}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded text-white ${getBugStatusColor(bug.status)}`}>
                        {bug.status.tag}
                      </span>
                    </div>
                    {bug.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{bug.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>#{bug.id.toString()}</span>
                      <span>•</span>
                      <span>Reported {new Date(Number(bug.reportedAt) / 1000).toLocaleDateString()}</span>
                    </div>
                    {bug.aiTriaged && (
                      <div className="mt-2">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          AI Triaged
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
              {bugs.length === 0 && (
                <div className="p-12 text-center text-muted-foreground bg-white rounded-lg border">
                  <p className="text-lg">No bugs reported</p>
                  <p className="text-sm mt-1">Bug reports will appear here</p>
                </div>
              )}
            </div>
          ) : (
            /* Repositories */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {repos.map((repo) => {
                const repoPrs = pullRequests.filter(p => p.repositoryId === repo.id)
                const repoBugs = bugs.filter(b => b.repositoryId === repo.id)
                return (
                  <div
                    key={repo.id.toString()}
                    onClick={() => setSelectedId(repo.id)}
                    className={`p-6 rounded-lg border bg-white cursor-pointer hover:shadow-md transition-all ${
                      selectedId === repo.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="mb-4">
                      <h3 className="font-semibold text-lg">{repo.name}</h3>
                      {repo.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                    </div>
                    {repo.url && (
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline mb-3 inline-block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Repository →
                      </a>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span>{repoPrs.length} PRs</span>
                        <span>•</span>
                        <span>{repoBugs.length} bugs</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {repos.length === 0 && (
                <div className="col-span-full p-12 text-center text-muted-foreground bg-white rounded-lg border">
                  <p className="text-lg">No repositories yet</p>
                  <p className="text-sm mt-1">Connect your code repositories to get started</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
