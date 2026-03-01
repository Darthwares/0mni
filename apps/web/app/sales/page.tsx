'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { useSpacetimeDB } from 'spacetimedb/react'
import { useState } from 'react'
import Link from 'next/link'

export default function SalesPage() {
  const { db } = useSpacetimeDB()
  const [activeTab, setActiveTab] = useState<'leads' | 'deals'>('leads')
  const [selectedId, setSelectedId] = useState<bigint | null>(null)

  // Get all leads and deals
  const leads = db ? Array.from(db.Lead.iter()).sort((a, b) =>
    Number(b.createdAt) - Number(a.createdAt)
  ) : []

  const deals = db ? Array.from(db.Deal.iter()).sort((a, b) =>
    Number(b.createdAt) - Number(a.createdAt)
  ) : []

  // Deal stages for pipeline
  const dealStages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed', 'Lost']

  const getLeadStatusColor = (status: { tag: string }) => {
    switch (status.tag) {
      case 'New': return 'bg-blue-500'
      case 'Contacted': return 'bg-yellow-500'
      case 'Qualified': return 'bg-green-500'
      case 'Unqualified': return 'bg-red-500'
      case 'Converted': return 'bg-purple-500'
      default: return 'bg-gray-400'
    }
  }

  const getDealStageColor = (stage: { tag: string }) => {
    switch (stage.tag) {
      case 'Prospecting': return 'bg-blue-500'
      case 'Qualification': return 'bg-cyan-500'
      case 'Proposal': return 'bg-yellow-500'
      case 'Negotiation': return 'bg-orange-500'
      case 'Closed': return 'bg-green-500'
      case 'Lost': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  const getPriorityColor = (priority: { tag: string }) => {
    switch (priority.tag) {
      case 'Critical': return 'text-red-600'
      case 'High': return 'text-orange-600'
      case 'Medium': return 'text-yellow-600'
      case 'Low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const selectedLead = leads.find(l => l.id === selectedId) || null
  const selectedDeal = deals.find(d => d.id === selectedId) || null

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
                <h1 className="text-2xl font-bold">Sales</h1>
                <p className="text-sm text-muted-foreground">Lead qualification & deal management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Active Leads: </span>
                <span className="font-semibold">{leads.filter(l => l.status.tag !== 'Converted' && l.status.tag !== 'Unqualified').length}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Open Deals: </span>
                <span className="font-semibold text-green-600">
                  {deals.filter(d => d.stage.tag !== 'Closed' && d.stage.tag !== 'Lost').length}
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
                onClick={() => { setActiveTab('leads'); setSelectedId(null); }}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'leads'
                    ? 'border-blue-500 text-blue-600 font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Leads ({leads.length})
              </button>
              <button
                onClick={() => { setActiveTab('deals'); setSelectedId(null); }}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'deals'
                    ? 'border-blue-500 text-blue-600 font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Deal Pipeline ({deals.length})
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6">
          {activeTab === 'leads' ? (
            <div className="grid grid-cols-3 gap-6">
              {/* Lead List */}
              <div className="col-span-2 space-y-4">
                {leads.map((lead) => (
                  <div
                    key={lead.id.toString()}
                    onClick={() => setSelectedId(lead.id)}
                    className={`p-4 rounded-lg border bg-white cursor-pointer hover:shadow-md transition-all ${
                      selectedId === lead.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${getLeadStatusColor(lead.status)}`} />
                          <h3 className="font-semibold">{lead.name || 'Unnamed Lead'}</h3>
                        </div>
                        {lead.company && (
                          <p className="text-sm text-muted-foreground mt-1">{lead.company}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(lead.priority)}`}>
                        {lead.priority.tag}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{lead.email}</span>
                      {lead.phone && (
                        <>
                          <span>•</span>
                          <span>{lead.phone}</span>
                        </>
                      )}
                    </div>
                    {lead.estimatedValue !== undefined && lead.estimatedValue !== null && (
                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">Est. Value: </span>
                        <span className="font-medium">${lead.estimatedValue.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${getLeadStatusColor(lead.status)}`}>
                        {lead.status.tag}
                      </span>
                      {lead.aiScored && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          AI Scored: {lead.score ? `${Math.round(lead.score * 100)}%` : 'N/A'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {leads.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground bg-white rounded-lg border">
                    <p className="text-lg">No leads yet</p>
                    <p className="text-sm mt-1">Leads will appear here when they're created</p>
                  </div>
                )}
              </div>

              {/* Lead Detail Sidebar */}
              <div className="col-span-1">
                {selectedLead ? (
                  <div className="bg-white rounded-lg border p-4 sticky top-4">
                    <h3 className="font-semibold mb-4">Lead Details</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{selectedLead.name || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="text-sm">{selectedLead.email}</p>
                      </div>
                      {selectedLead.phone && (
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="text-sm">{selectedLead.phone}</p>
                        </div>
                      )}
                      {selectedLead.company && (
                        <div>
                          <p className="text-sm text-muted-foreground">Company</p>
                          <p className="text-sm">{selectedLead.company}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <span className={`inline-block mt-1 text-xs px-2 py-1 rounded ${getLeadStatusColor(selectedLead.status)}`}>
                          {selectedLead.status.tag}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Priority</p>
                        <p className={`text-sm ${getPriorityColor(selectedLead.priority)}`}>
                          {selectedLead.priority.tag}
                        </p>
                      </div>
                      {selectedLead.source && (
                        <div>
                          <p className="text-sm text-muted-foreground">Source</p>
                          <p className="text-sm">{selectedLead.source}</p>
                        </div>
                      )}
                      {selectedLead.estimatedValue !== undefined && selectedLead.estimatedValue !== null && (
                        <div>
                          <p className="text-sm text-muted-foreground">Estimated Value</p>
                          <p className="text-sm font-medium">${selectedLead.estimatedValue.toLocaleString()}</p>
                        </div>
                      )}
                      {selectedLead.aiScored && selectedLead.score !== undefined && selectedLead.score !== null && (
                        <div>
                          <p className="text-sm text-muted-foreground">AI Lead Score</p>
                          <div className="mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full"
                                style={{ width: `${selectedLead.score * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {Math.round(selectedLead.score * 100)}% match
                            </p>
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">Created</p>
                        <p className="text-sm">
                          {new Date(Number(selectedLead.createdAt) / 1000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border p-8 text-center text-muted-foreground">
                    <p>Select a lead to view details</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Deal Pipeline */
            <div className="grid grid-cols-6 gap-4">
              {dealStages.map((stage) => {
                const stageDeals = deals.filter(d => d.stage.tag === stage)
                const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)

                return (
                  <div key={stage} className="bg-gray-50 rounded-lg p-4">
                    <div className="mb-4">
                      <h3 className="font-semibold">{stage}</h3>
                      <p className="text-xs text-muted-foreground">
                        {stageDeals.length} deals • ${stageValue.toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {stageDeals.map((deal) => (
                        <div
                          key={deal.id.toString()}
                          onClick={() => setSelectedId(deal.id)}
                          className={`p-3 rounded-lg bg-white border cursor-pointer hover:shadow-md transition-all ${
                            selectedId === deal.id ? 'ring-2 ring-blue-500' : ''
                          }`}
                        >
                          <h4 className="font-medium text-sm">{deal.name}</h4>
                          {deal.company && (
                            <p className="text-xs text-muted-foreground mt-1">{deal.company}</p>
                          )}
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm font-semibold">
                              ${deal.value?.toLocaleString() || '0'}
                            </span>
                            {deal.probability !== undefined && deal.probability !== null && (
                              <span className="text-xs text-muted-foreground">
                                {Math.round(deal.probability * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
