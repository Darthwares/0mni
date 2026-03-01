'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { useSpacetimeDB } from 'spacetimedb/react'
import { useState } from 'react'
import Link from 'next/link'

export default function CollaborationPage() {
  const { db } = useSpacetimeDB()
  const [activeTab, setActiveTab] = useState<'channels' | 'documents' | 'meetings'>('channels')
  const [selectedChannelId, setSelectedChannelId] = useState<bigint | null>(null)
  const [selectedId, setSelectedId] = useState<bigint | null>(null)

  // Get all channels, documents, and meetings
  const channels = db ? Array.from(db.Channel.iter()).sort((a, b) =>
    a.name.localeCompare(b.name)
  ) : []

  const documents = db ? Array.from(db.Document.iter()).sort((a, b) =>
    Number(b.createdAt) - Number(a.createdAt)
  ) : []

  const meetings = db ? Array.from(db.Meeting.iter()).sort((a, b) =>
    Number(a.scheduledAt) - Number(b.scheduledAt)
  ) : []

  const selectedChannel = channels.find(c => c.id === selectedChannelId) || null

  // Get messages for selected channel
  const messages = selectedChannel && db ?
    Array.from(db.Message.iter())
      .filter(m => m.contextType.tag === 'Channel' && m.contextId === selectedChannel.id)
      .sort((a, b) => Number(a.sentAt) - Number(b.sentAt))
    : []

  const getMeetingStatusColor = (status: { tag: string }) => {
    switch (status.tag) {
      case 'Scheduled': return 'bg-blue-500'
      case 'InProgress': return 'bg-purple-500'
      case 'Completed': return 'bg-green-500'
      case 'Cancelled': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  const selectedDocument = documents.find(d => d.id === selectedId) || null
  const selectedMeeting = meetings.find(m => m.id === selectedId) || null

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
                <h1 className="text-2xl font-bold">Collaboration</h1>
                <p className="text-sm text-muted-foreground">Unified workspace for teams and AI agents</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Active Channels: </span>
                <span className="font-semibold">{channels.length}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Upcoming Meetings: </span>
                <span className="font-semibold text-green-600">
                  {meetings.filter(m => m.status.tag === 'Scheduled').length}
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
                onClick={() => { setActiveTab('channels'); setSelectedId(null); }}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'channels'
                    ? 'border-blue-500 text-blue-600 font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Channels ({channels.length})
              </button>
              <button
                onClick={() => { setActiveTab('documents'); setSelectedId(null); }}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'documents'
                    ? 'border-blue-500 text-blue-600 font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Documents ({documents.length})
              </button>
              <button
                onClick={() => { setActiveTab('meetings'); setSelectedId(null); }}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'meetings'
                    ? 'border-blue-500 text-blue-600 font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Meetings ({meetings.length})
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'channels' ? (
          <div className="flex h-[calc(100vh-145px)]">
            {/* Channel List */}
            <div className="w-64 border-r bg-white overflow-y-auto">
              <div className="p-4">
                <h3 className="font-semibold mb-4">Channels</h3>
                <div className="space-y-1">
                  {channels.map((channel) => (
                    <button
                      key={channel.id.toString()}
                      onClick={() => setSelectedChannelId(channel.id)}
                      className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors ${
                        selectedChannelId === channel.id ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">#</span>
                        <span className="font-medium">{channel.name}</span>
                      </div>
                      {channel.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {channel.description}
                        </p>
                      )}
                    </button>
                  ))}
                  {channels.length === 0 && (
                    <p className="text-sm text-muted-foreground p-3">No channels yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            {selectedChannel ? (
              <div className="flex-1 flex flex-col">
                {/* Channel Header */}
                <div className="border-b bg-white p-4">
                  <h2 className="text-xl font-semibold">#{selectedChannel.name}</h2>
                  {selectedChannel.description && (
                    <p className="text-sm text-muted-foreground">{selectedChannel.description}</p>
                  )}
                </div>

                {/* Message List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map((message) => (
                    <div key={message.id.toString()} className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {message.aiGenerated ? '🤖' : '👤'}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-semibold">
                            {message.aiGenerated ? 'AI Agent' : 'Team Member'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(Number(message.sentAt) / 1000).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {message.aiConfidence !== undefined && message.aiConfidence !== null && (
                          <span className="text-xs text-muted-foreground mt-1 inline-block">
                            Confidence: {Math.round(message.aiConfidence * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                      <p>No messages yet</p>
                      <p className="text-sm mt-1">Start a conversation in this channel</p>
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="border-t bg-white p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Message #${selectedChannel.name}`}
                      className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                      Send
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg">Select a channel to view messages</p>
                  <p className="text-sm mt-1">Choose from the list on the left</p>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'documents' ? (
          /* Documents */
          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <div
                  key={doc.id.toString()}
                  onClick={() => setSelectedId(doc.id)}
                  className={`p-6 rounded-lg border bg-white cursor-pointer hover:shadow-md transition-all ${
                    selectedId === doc.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-3xl">📄</div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{doc.title}</h3>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(Number(doc.createdAt) / 1000).toLocaleDateString()}</span>
                    {doc.aiGenerated && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        AI Generated
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="col-span-full p-12 text-center text-muted-foreground bg-white rounded-lg border">
                  <p className="text-lg">No documents yet</p>
                  <p className="text-sm mt-1">Create or upload documents to share with your team</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Meetings */
          <div className="container mx-auto px-4 py-6">
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id.toString()}
                  onClick={() => setSelectedId(meeting.id)}
                  className={`p-4 rounded-lg border bg-white cursor-pointer hover:shadow-md transition-all ${
                    selectedId === meeting.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`h-2 w-2 rounded-full ${getMeetingStatusColor(meeting.status)}`} />
                        <h3 className="font-semibold">{meeting.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded text-white ${getMeetingStatusColor(meeting.status)}`}>
                          {meeting.status.tag}
                        </span>
                      </div>
                      {meeting.description && (
                        <p className="text-sm text-muted-foreground mb-3">{meeting.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>📅 {new Date(Number(meeting.scheduledAt) / 1000).toLocaleString()}</span>
                        {meeting.duration && (
                          <>
                            <span>•</span>
                            <span>⏱️ {meeting.duration} min</span>
                          </>
                        )}
                        {meeting.location && (
                          <>
                            <span>•</span>
                            <span>📍 {meeting.location}</span>
                          </>
                        )}
                      </div>
                      {meeting.aiNotetaker && (
                        <div className="mt-2">
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            AI Notetaker Enabled
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {meetings.length === 0 && (
                <div className="p-12 text-center text-muted-foreground bg-white rounded-lg border">
                  <p className="text-lg">No meetings scheduled</p>
                  <p className="text-sm mt-1">Schedule a meeting to collaborate with your team</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
