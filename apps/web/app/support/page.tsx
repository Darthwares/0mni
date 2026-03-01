'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { useSpacetimeDB } from 'spacetimedb/react'
import { useState } from 'react'
import Link from 'next/link'
import type { ContextType } from '@/generated'

export default function SupportPage() {
  const { db } = useSpacetimeDB()
  const [selectedTicketId, setSelectedTicketId] = useState<bigint | null>(null)

  // Get all tickets sorted by created date
  const tickets = db ? Array.from(db.Ticket.iter()).sort((a, b) =>
    Number(b.createdAt) - Number(a.createdAt)
  ) : []

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null

  // Get customers map for quick lookup
  const customersMap = db ? new Map(
    Array.from(db.Customer.iter()).map(c => [c.id, c])
  ) : new Map()

  // Get messages for selected ticket (using Customer context type and ticket.id as contextId)
  const messages = selectedTicket && db ?
    Array.from(db.Message.iter())
      .filter(m => {
        // Messages for Customer context with contextId = ticket.id
        return m.contextType.tag === 'Customer' && m.contextId === selectedTicket.id
      })
      .sort((a, b) => Number(a.sentAt) - Number(b.sentAt))
    : []

  const getCustomerForTicket = (ticket: typeof tickets[0]) => {
    return customersMap.get(ticket.customerId)
  }

  const getTicketStatusColor = (status: { tag: string }) => {
    switch (status.tag) {
      case 'Open': return 'bg-green-500'
      case 'InProgress': return 'bg-blue-500'
      case 'WaitingCustomer': return 'bg-yellow-500'
      case 'Resolved': return 'bg-gray-500'
      case 'Closed': return 'bg-gray-700'
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
                <h1 className="text-2xl font-bold">Support</h1>
                <p className="text-sm text-muted-foreground">AI-powered customer support</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Active Tickets: </span>
                <span className="font-semibold">{tickets.filter(t => t.status.tag !== 'Closed').length}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">AI Auto-Resolved: </span>
                <span className="font-semibold text-green-600">
                  {tickets.filter(t => t.aiAutoResolved && t.status.tag !== 'Closed').length}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex h-[calc(100vh-73px)]">
          {/* Ticket List */}
          <div className="w-96 border-r bg-white overflow-y-auto">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Tickets</h2>
              <p className="text-xs text-muted-foreground">{tickets.length} total</p>
            </div>
            <div className="divide-y">
              {tickets.map((ticket) => {
                const customer = getCustomerForTicket(ticket)
                return (
                  <button
                    key={ticket.id.toString()}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      selectedTicket?.id === ticket.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${getTicketStatusColor(ticket.status)}`} />
                          <span className="font-medium truncate">{customer?.name || 'Unknown Customer'}</span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">{ticket.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className={getPriorityColor(ticket.priority)}>{ticket.priority.tag}</span>
                      {ticket.aiAutoResolved && (
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">AI Resolved</span>
                      )}
                      {!ticket.aiAutoResolved && ticket.assignedTo && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Assigned</span>
                      )}
                      {!ticket.aiAutoResolved && !ticket.assignedTo && (
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Unassigned</span>
                      )}
                    </div>
                  </button>
                )
              })}
              {tickets.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No tickets yet</p>
                  <p className="text-xs mt-1">Tickets will appear here when customers reach out</p>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Detail */}
          <div className="flex-1 flex flex-col">
            {selectedTicket ? (
              <>
                {/* Ticket Header */}
                <div className="border-b bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold">{selectedTicket.subject}</h2>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Ticket #{selectedTicket.id.toString()}</span>
                        <span>•</span>
                        <span className={getPriorityColor(selectedTicket.priority)}>{selectedTicket.priority.tag} priority</span>
                        <span>•</span>
                        <span>{selectedTicket.status.tag}</span>
                      </div>
                    </div>
                    {selectedTicket.aiAutoResolved ? (
                      <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm font-medium">AI Auto-Resolved</span>
                      </div>
                    ) : selectedTicket.assignedTo ? (
                      <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-sm font-medium">Assigned to Agent</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-gray-50 text-gray-700 px-3 py-1.5 rounded">
                        <div className="h-2 w-2 rounded-full bg-gray-500" />
                        <span className="text-sm font-medium">Unassigned</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map((message) => {
                    const customer = getCustomerForTicket(selectedTicket)
                    // Check if sender is the customer by comparing identities
                    const senderIsCustomer = customer?.preferredAgent ?
                      message.sender.toHexString() !== customer.preferredAgent.toHexString()
                      : false
                    const isAgent = !senderIsCustomer

                    return (
                      <div
                        key={message.id.toString()}
                        className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-2xl ${isAgent ? 'bg-blue-500 text-white' : 'bg-white'} rounded-lg p-4 shadow-sm`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium">
                              {isAgent ? (message.aiGenerated ? '🤖 AI Agent' : '👤 Support Agent') : '👤 Customer'}
                            </span>
                            <span className={`text-xs ${isAgent ? 'text-blue-100' : 'text-muted-foreground'}`}>
                              {new Date(Number(message.sentAt) / 1000).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    )
                  })}
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <p>No messages yet</p>
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="border-t bg-white p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg">Select a ticket to view details</p>
                  <p className="text-sm mt-1">Choose from the list on the left</p>
                </div>
              </div>
            )}
          </div>

          {/* Customer Sidebar */}
          {selectedTicket && (
            <div className="w-80 border-l bg-white overflow-y-auto">
              <div className="p-4">
                <h3 className="font-semibold mb-4">Customer Details</h3>
                {(() => {
                  const customer = getCustomerForTicket(selectedTicket)
                  if (!customer) return <p className="text-muted-foreground text-sm">Customer not found</p>

                  return (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{customer.name || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="text-sm">{customer.email}</p>
                      </div>
                      {customer.phone && (
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="text-sm">{customer.phone}</p>
                        </div>
                      )}
                      {customer.company && (
                        <div>
                          <p className="text-sm text-muted-foreground">Company</p>
                          <p className="text-sm">{customer.company}</p>
                        </div>
                      )}
                      {customer.plan && (
                        <div>
                          <p className="text-sm text-muted-foreground">Plan</p>
                          <p className="text-sm">{customer.plan}</p>
                        </div>
                      )}
                      {customer.sentiment && (
                        <div>
                          <p className="text-sm text-muted-foreground">Sentiment</p>
                          <p className="text-sm capitalize">{customer.sentiment.tag}</p>
                        </div>
                      )}
                      {customer.lifetimeValue !== undefined && customer.lifetimeValue !== null && (
                        <div>
                          <p className="text-sm text-muted-foreground">Lifetime Value</p>
                          <p className="text-sm">${customer.lifetimeValue.toFixed(2)}</p>
                        </div>
                      )}
                      {customer.healthScore !== undefined && customer.healthScore !== null && (
                        <div>
                          <p className="text-sm text-muted-foreground">Health Score</p>
                          <p className="text-sm">{(customer.healthScore * 100).toFixed(0)}%</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">Member Since</p>
                        <p className="text-sm">{new Date(Number(customer.createdAt) / 1000).toLocaleDateString()}</p>
                      </div>
                      {customer.lastContact && (
                        <div>
                          <p className="text-sm text-muted-foreground">Last Contact</p>
                          <p className="text-sm">{new Date(Number(customer.lastContact) / 1000).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
