# AI Operating Platform - Complete SpacetimeDB Schema

## Core Identity & Access

### Employee (Humans + AI Agents)
```rust
#[table(accessor = employee, public)]
pub struct Employee {
    #[primary_key]
    pub id: Identity,

    pub employee_type: EmployeeType,  // Human | AIAgent
    pub name: String,
    pub email: Option<String>,
    pub avatar_url: Option<String>,

    // Role & Permissions
    pub role: String,  // "Support Agent", "Sales Rep", "AI Recruiter", etc.
    pub department: Department,  // Support, Sales, Engineering, etc.
    pub permissions: Vec<Permission>,

    // AI-Specific Fields
    pub ai_config: Option<AIConfig>,

    // Status
    pub status: EmployeeStatus,  // Online | Busy | Offline | InCall
    pub current_task: Option<u64>,  // What they're working on

    // Metrics
    pub tasks_completed: u64,
    pub avg_confidence_score: Option<f32>,
    pub cost_incurred: Option<f32>,  // For AI agents

    pub created_at: Timestamp,
    pub last_active: Timestamp,
}

#[derive(SpacetimeType, Clone)]
pub enum EmployeeType {
    Human,
    AIAgent,
}

#[derive(SpacetimeType, Clone)]
pub enum Department {
    Support,
    Sales,
    Recruitment,
    Engineering,
    Operations,
    Marketing,
    Finance,
}

#[derive(SpacetimeType, Clone)]
pub struct AIConfig {
    pub model: String,  // "claude-opus-4.6", "gemini-3.1-pro", etc.
    pub capabilities: Vec<String>,  // ["customer_support", "voice_calls", etc.]
    pub supervisor_id: Option<Identity>,  // Which supervisor manages this agent
    pub max_task_duration_minutes: u32,
    pub self_verification_threshold: f32,  // Confidence threshold
}
```

### Workspace
```rust
#[table(accessor = workspace, public)]
pub struct Workspace {
    #[primary_key]
    pub id: u64,

    pub name: String,
    pub slug: String,  // URL-friendly name

    pub owner: Identity,
    pub plan: Plan,  // Free, Growth, Enterprise

    pub settings: WorkspaceSettings,

    pub created_at: Timestamp,
}

#[derive(SpacetimeType, Clone)]
pub enum Plan {
    Free,
    Growth,
    Enterprise,
}

#[derive(SpacetimeType, Clone)]
pub struct WorkspaceSettings {
    pub ai_agents_enabled: bool,
    pub max_ai_agents: u32,
    pub modules_enabled: Vec<Module>,
    pub voice_enabled: bool,
    pub video_enabled: bool,
}

#[derive(SpacetimeType, Clone)]
pub enum Module {
    Support,
    Sales,
    Recruitment,
    Collaboration,
    Engineering,
}
```

---

## Unified Communication

### Message (Replaces Slack + Email + Comments)
```rust
#[table(accessor = message, public)]
pub struct Message {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub sender: Identity,  // Human or AI

    // Context - what is this message about?
    pub context_type: ContextType,
    pub context_id: u64,

    // Message Details
    pub message_type: MessageType,
    pub content: String,
    pub attachments: Vec<Attachment>,

    // Threading
    pub thread_id: Option<u64>,  // Root message in thread
    pub in_reply_to: Option<u64>,

    // Metadata
    pub ai_generated: bool,
    pub ai_confidence: Option<f32>,
    pub read_by: Vec<Identity>,

    #[index(btree)]
    pub sent_at: Timestamp,
}

#[derive(SpacetimeType, Clone)]
pub enum ContextType {
    Channel,       // Slack-like chat
    Customer,      // Customer conversation
    Candidate,     // Recruitment conversation
    Deal,          // Sales conversation
    Task,          // Task comments
    Meeting,       // Meeting chat/transcript
    CodeReview,    // PR comments
    Document,      // Doc comments
}

#[derive(SpacetimeType, Clone)]
pub enum MessageType {
    Chat,
    Email,
    Comment,
    VoiceTranscript,
    SystemNotification,
    AIThought,  // Agent reasoning trace
}

#[derive(SpacetimeType, Clone)]
pub struct Attachment {
    pub file_name: String,
    pub file_url: String,
    pub file_type: String,
    pub file_size: u64,
}
```

### Channel (Slack Replacement)
```rust
#[table(accessor = channel, public)]
pub struct Channel {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub name: String,
    pub description: Option<String>,
    pub is_private: bool,

    pub members: Vec<Identity>,  // Humans AND AI agents!
    pub ai_participants: Vec<AIParticipant>,

    pub created_by: Identity,
    pub created_at: Timestamp,
}

#[derive(SpacetimeType, Clone)]
pub struct AIParticipant {
    pub agent_id: Identity,
    pub role: AIChannelRole,  // Observer, Participant, Moderator
    pub auto_respond: bool,  // Should it respond to @mentions?
}
```

---

## Task Management (Universal Work Queue)

### Task
```rust
#[table(accessor = task, public)]
pub struct Task {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    // What needs to be done
    pub task_type: TaskType,
    pub title: String,
    pub description: String,
    pub priority: Priority,

    // Context - what is this task about?
    pub context_type: ContextType,
    pub context_id: u64,

    // Assignment
    #[index(btree)]
    pub assignee: Option<Identity>,  // Human or AI
    pub assigned_by: Option<Identity>,
    pub supervisor_id: Option<Identity>,  // If routed by supervisor

    // Status & Workflow
    pub status: TaskStatus,
    pub workflow_stage: Option<String>,

    // AI-Specific
    pub ai_confidence: Option<f32>,
    pub self_verification_passed: Option<bool>,
    pub thought_trace: Vec<String>,  // Agent reasoning
    pub retry_count: u8,
    pub escalation_reason: Option<String>,

    // Output
    pub result: Option<String>,
    pub result_data: Option<String>,  // JSON blob for structured output

    // Timestamps
    pub created_at: Timestamp,
    pub claimed_at: Option<Timestamp>,
    pub started_at: Option<Timestamp>,
    pub completed_at: Option<Timestamp>,
    pub due_at: Option<Timestamp>,
}

#[derive(SpacetimeType, Clone)]
pub enum TaskType {
    // Support
    CustomerSupport,
    TechnicalSupport,
    BugReport,
    FeatureRequest,

    // Sales
    LeadQualification,
    Outreach,
    DemoPrep,
    ProposalGeneration,
    FollowUp,

    // Recruitment
    CandidateSourcing,
    ResumeReview,
    ScreeningCall,
    InterviewScheduling,
    OfferGeneration,

    // Engineering
    CodeReview,
    BugTriage,
    TestGeneration,
    Documentation,
    DeploymentReview,

    // Operations
    DataEntry,
    ReportGeneration,
    Approval,

    // Generic
    Custom(String),
}

#[derive(SpacetimeType, Clone)]
pub enum TaskStatus {
    Unclaimed,
    Claimed,
    InProgress,
    SelfChecking,      // AI verifying its work
    NeedsReview,       // Medium confidence, needs human check
    Completed,
    Escalated,
    Blocked,
    Cancelled,
}

#[derive(SpacetimeType, Clone)]
pub enum Priority {
    Urgent,
    High,
    Medium,
    Low,
}
```

### AgentSupervisor (Orchestration)
```rust
#[table(accessor = agent_supervisor, public)]
pub struct AgentSupervisor {
    #[primary_key]
    pub id: Identity,

    pub name: String,
    pub specialization: Department,  // Which domain it manages

    pub supervised_agents: Vec<Identity>,
    pub routing_strategy: RoutingStrategy,

    pub active: bool,

    // Metrics
    pub tasks_routed: u64,
    pub avg_routing_accuracy: f32,
}

#[derive(SpacetimeType, Clone)]
pub enum RoutingStrategy {
    Sequential,     // Try agents one by one
    Concurrent,     // Multiple agents work in parallel
    Auction,        // Agents bid based on confidence
    LoadBalanced,   // Distribute evenly
}
```

---

## Customer Support Module

### Customer
```rust
#[table(accessor = customer, public)]
pub struct Customer {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub external_id: Option<String>,  // Their ID in external system

    pub name: Option<String>,
    pub email: String,
    pub phone: Option<String>,
    pub company: Option<String>,

    // Segments
    pub plan: Option<String>,  // "Free", "Pro", "Enterprise"
    pub lifetime_value: Option<f32>,
    pub health_score: Option<f32>,

    // AI Context
    pub summary: Option<String>,  // AI-generated customer summary
    pub sentiment: Option<Sentiment>,
    pub preferred_agent: Option<Identity>,  // Human or AI they work well with

    pub created_at: Timestamp,
    pub last_contact: Option<Timestamp>,
}

#[derive(SpacetimeType, Clone)]
pub enum Sentiment {
    Happy,
    Neutral,
    Frustrated,
    Angry,
}
```

### Ticket
```rust
#[table(accessor = ticket, public)]
pub struct Ticket {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    #[index(btree)]
    pub customer_id: u64,

    pub subject: String,
    pub status: TicketStatus,
    pub priority: Priority,
    pub category: Option<String>,

    #[index(btree)]
    pub assigned_to: Option<Identity>,  // Human or AI

    // SLA
    pub sla_due: Option<Timestamp>,
    pub first_response_at: Option<Timestamp>,
    pub resolved_at: Option<Timestamp>,

    // AI Handling
    pub ai_auto_resolved: bool,
    pub escalation_count: u8,

    pub created_at: Timestamp,
}

#[derive(SpacetimeType, Clone)]
pub enum TicketStatus {
    New,
    Open,
    Pending,
    Resolved,
    Closed,
}
```

---

## Sales/CRM Module

### Lead
```rust
#[table(accessor = lead, public)]
pub struct Lead {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub company: Option<String>,
    pub title: Option<String>,

    // Qualification
    pub score: Option<f32>,  // AI-generated lead score
    pub source: LeadSource,
    pub status: LeadStatus,

    #[index(btree)]
    pub assigned_to: Option<Identity>,  // Human or AI

    // AI Enrichment
    pub enriched_data: Option<String>,  // JSON from AI research
    pub icp_match_score: Option<f32>,

    pub created_at: Timestamp,
    pub last_contacted: Option<Timestamp>,
}

#[derive(SpacetimeType, Clone)]
pub enum LeadSource {
    Inbound,
    Outbound,
    Referral,
    AIProspecting,
}

#[derive(SpacetimeType, Clone)]
pub enum LeadStatus {
    New,
    Contacted,
    Qualified,
    Unqualified,
    Converted,
    Lost,
}
```

### Deal
```rust
#[table(accessor = deal, public)]
pub struct Deal {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub name: String,
    pub lead_id: Option<u64>,
    pub account_id: Option<u64>,

    pub value: f32,
    pub stage: DealStage,
    pub probability: f32,  // AI-predicted win probability

    #[index(btree)]
    pub owner: Identity,  // Human or AI

    pub expected_close: Option<Timestamp>,
    pub closed_at: Option<Timestamp>,

    // AI Insights
    pub next_best_action: Option<String>,  // AI suggestion
    pub risk_factors: Vec<String>,
}

#[derive(SpacetimeType, Clone)]
pub enum DealStage {
    Discovery,
    Demo,
    Proposal,
    Negotiation,
    ClosedWon,
    ClosedLost,
}
```

---

## Recruitment Module

### Candidate
```rust
#[table(accessor = candidate, public)]
pub struct Candidate {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub linkedin_url: Option<String>,
    pub github_url: Option<String>,
    pub resume_url: Option<String>,

    pub current_company: Option<String>,
    pub current_title: Option<String>,

    // Evaluation
    pub overall_score: Option<f32>,  // AI assessment
    pub skills: Vec<String>,
    pub experience_years: Option<f32>,

    #[index(btree)]
    pub recruiter: Option<Identity>,  // Human or AI

    pub status: CandidateStatus,

    pub created_at: Timestamp,
}

#[derive(SpacetimeType, Clone)]
pub enum CandidateStatus {
    Sourced,
    Contacted,
    Screening,
    Interview,
    Offer,
    Hired,
    Rejected,
}
```

### JobPosting
```rust
#[table(accessor = job_posting, public)]
pub struct JobPosting {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub title: String,
    pub description: String,
    pub department: Department,
    pub location: Option<String>,

    pub requirements: Vec<String>,
    pub nice_to_have: Vec<String>,

    pub status: JobStatus,

    // AI Sourcing
    pub ai_sourcing_enabled: bool,
    pub ideal_candidate_profile: Option<String>,  // AI prompt

    pub posted_at: Timestamp,
}

#[derive(SpacetimeType, Clone)]
pub enum JobStatus {
    Draft,
    Open,
    OnHold,
    Filled,
    Closed,
}
```

### Interview
```rust
#[table(accessor = interview, public)]
pub struct Interview {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    #[index(btree)]
    pub candidate_id: u64,

    #[index(btree)]
    pub job_posting_id: u64,

    pub interview_type: InterviewType,
    pub scheduled_at: Timestamp,
    pub duration_minutes: u32,

    pub interviewers: Vec<Identity>,  // Can include AI!
    pub meeting_id: Option<u64>,  // Links to Meeting table

    // Results
    pub completed: bool,
    pub notes: Option<String>,
    pub ai_transcript: Option<String>,
    pub ai_summary: Option<String>,
    pub recommendation: Option<Recommendation>,
}

#[derive(SpacetimeType, Clone)]
pub enum InterviewType {
    Screening,
    Technical,
    Behavioral,
    Final,
}

#[derive(SpacetimeType, Clone)]
pub enum Recommendation {
    StrongYes,
    Yes,
    Maybe,
    No,
    StrongNo,
}
```

---

## Collaboration Module

### Document
```rust
#[table(accessor = document, public)]
pub struct Document {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub title: String,
    pub content: String,  // Markdown
    pub doc_type: DocumentType,

    pub parent_id: Option<u64>,  // For hierarchical docs

    pub created_by: Identity,
    pub editors: Vec<Identity>,  // Humans and AI!

    // AI Features
    pub ai_generated: bool,
    pub ai_maintained: bool,  // Does AI keep it updated?
    pub auto_sync_with: Option<AutoSyncSource>,

    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

#[derive(SpacetimeType, Clone)]
pub enum DocumentType {
    Wiki,
    Runbook,
    OnboardingGuide,
    PolicyDocument,
    MeetingNotes,
    TechnicalSpec,
}

#[derive(SpacetimeType, Clone)]
pub enum AutoSyncSource {
    Codebase,
    APISchema,
    DatabaseSchema,
}
```

### Meeting
```rust
#[table(accessor = meeting, public)]
pub struct Meeting {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub title: String,
    pub meeting_type: MeetingType,

    pub scheduled_at: Timestamp,
    pub duration_minutes: u32,

    pub participants: Vec<Identity>,  // Humans and AI
    pub ai_notetaker: Option<Identity>,  // AI agent taking notes

    // Call Details (links to your voice/video system)
    pub call_session_id: Option<String>,

    // Recording & Transcription
    pub recording_url: Option<String>,
    pub transcript: Option<String>,
    pub ai_summary: Option<String>,
    pub action_items: Vec<ActionItem>,

    pub status: MeetingStatus,

    pub created_at: Timestamp,
}

#[derive(SpacetimeType, Clone)]
pub enum MeetingType {
    OneOnOne,
    TeamSync,
    CustomerCall,
    Interview,
    SalesDemo,
    AllHands,
}

#[derive(SpacetimeType, Clone)]
pub struct ActionItem {
    pub description: String,
    pub assignee: Option<Identity>,
    pub due_at: Option<Timestamp>,
    pub completed: bool,
}

#[derive(SpacetimeType, Clone)]
pub enum MeetingStatus {
    Scheduled,
    InProgress,
    Completed,
    Cancelled,
}
```

---

## Engineering Module

### CodeRepository
```rust
#[table(accessor = code_repository, public)]
pub struct CodeRepository {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub name: String,
    pub url: String,  // GitHub, GitLab, etc.
    pub platform: CodePlatform,

    // AI Analysis
    pub ai_indexed: bool,
    pub last_indexed: Option<Timestamp>,
    pub primary_languages: Vec<String>,

    pub created_at: Timestamp,
}

#[derive(SpacetimeType, Clone)]
pub enum CodePlatform {
    GitHub,
    GitLab,
    Bitbucket,
}
```

### PullRequest
```rust
#[table(accessor = pull_request, public)]
pub struct PullRequest {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    #[index(btree)]
    pub repository_id: u64,

    pub external_id: String,  // PR number in GitHub/GitLab
    pub title: String,
    pub description: String,

    pub author: Identity,
    pub reviewers: Vec<Identity>,  // Can include AI!

    pub status: PRStatus,

    // AI Review
    pub ai_reviewed: bool,
    pub ai_review_summary: Option<String>,
    pub ai_suggested_reviewers: Vec<Identity>,
    pub security_issues: Vec<String>,
    pub performance_issues: Vec<String>,

    pub created_at: Timestamp,
    pub merged_at: Option<Timestamp>,
}

#[derive(SpacetimeType, Clone)]
pub enum PRStatus {
    Open,
    UnderReview,
    ChangesRequested,
    Approved,
    Merged,
    Closed,
}
```

### Bug
```rust
#[table(accessor = bug, public)]
pub struct Bug {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub title: String,
    pub description: String,

    pub severity: BugSeverity,
    pub priority: Priority,
    pub status: BugStatus,

    #[index(btree)]
    pub assigned_to: Option<Identity>,  // Human or AI

    // AI Triage
    pub ai_triaged: bool,
    pub ai_severity_confidence: Option<f32>,
    pub ai_suggested_fix: Option<String>,
    pub related_prs: Vec<u64>,

    pub reported_at: Timestamp,
    pub resolved_at: Option<Timestamp>,
}

#[derive(SpacetimeType, Clone)]
pub enum BugSeverity {
    Critical,
    High,
    Medium,
    Low,
}

#[derive(SpacetimeType, Clone)]
pub enum BugStatus {
    New,
    Triaged,
    InProgress,
    FixInReview,
    Resolved,
    Verified,
    Closed,
}
```

---

## Real-Time Communication (Your Proven Tech!)

### CallSession (From your SpaceChat)
```rust
#[table(accessor = call_session, public)]
pub struct CallSession {
    #[primary_key]
    pub session_id: String,  // UUID

    pub call_type: CallType,
    pub state: CallState,

    // Participants (humans AND AI!)
    pub participants: Vec<Identity>,
    pub ai_participants: Vec<AICallParticipant>,

    // Context - what is this call about?
    pub context_type: Option<ContextType>,
    pub context_id: Option<u64>,

    // Meeting link
    pub meeting_id: Option<u64>,

    pub created_at: Timestamp,
    pub started_at: Option<Timestamp>,
    pub ended_at: Option<Timestamp>,
}

#[derive(SpacetimeType, Clone)]
pub enum CallType {
    Voice,
    Video,
    ScreenShare,
}

#[derive(SpacetimeType, Clone)]
pub struct AICallParticipant {
    pub agent_id: Identity,
    pub role: AICallRole,
    pub auto_transcribe: bool,
    pub auto_summarize: bool,
}

#[derive(SpacetimeType, Clone)]
pub enum AICallRole {
    Notetaker,      // Just listens and takes notes
    Participant,    // Can speak/respond
    Support,        // Assists human (whispers suggestions)
}
```

### AudioFrameEvent, VideoFrameEvent (Your existing code!)
```rust
#[table(accessor = audio_frame_event, public, event)]
pub struct AudioFrameEvent {
    pub session_id: String,
    pub from: Identity,
    pub to: Vec<Identity>,  // Can broadcast to multiple
    pub seq: u32,
    pub sample_rate: u32,
    pub channels: u8,
    pub rms: f32,
    pub pcm16le: Vec<u8>,
}

#[table(accessor = video_frame_event, public, event)]
pub struct VideoFrameEvent {
    pub session_id: String,
    pub from: Identity,
    pub to: Vec<Identity>,
    pub seq: u32,
    pub width: u16,
    pub height: u16,
    pub jpeg: Vec<u8>,
}
```

---

## Observability & Analytics

### AgentThoughtEvent (Real-time observability)
```rust
#[table(accessor = agent_thought_event, public, event)]
pub struct AgentThoughtEvent {
    pub task_id: u64,
    pub agent_id: Identity,
    pub thought_type: ThoughtType,
    pub content: String,
    pub confidence: Option<f32>,
    pub timestamp: Timestamp,
}

#[derive(SpacetimeType, Clone)]
pub enum ThoughtType {
    Planning,
    Reasoning,
    SelfCheck,
    Escalation,
    Completion,
}
```

### ActivityLog
```rust
#[table(accessor = activity_log, public)]
pub struct ActivityLog {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub actor: Identity,  // Human or AI
    pub action: Action,

    pub entity_type: String,
    pub entity_id: u64,

    pub metadata: Option<String>,  // JSON

    #[index(btree)]
    pub timestamp: Timestamp,
}

#[derive(SpacetimeType, Clone)]
pub enum Action {
    Created,
    Updated,
    Deleted,
    Assigned,
    Completed,
    Escalated,
    Commented,
    Called,
    Emailed,
}
```

---

## Configuration

### MediaSettings (Your existing table)
```rust
#[table(accessor = media_settings, public)]
pub struct MediaSettings {
    #[primary_key]
    pub id: u32,  // Always 1 (singleton)

    // Audio
    pub audio_target_sample_rate: u32,
    pub audio_frame_ms: u16,
    pub audio_max_frame_bytes: u32,
    pub audio_talking_rms_threshold: f32,

    // Video
    pub video_width: u16,
    pub video_height: u16,
    pub video_fps: u8,
    pub video_jpeg_quality: f32,
    pub video_max_frame_bytes: u32,
}
```

### AIModelConfig
```rust
#[table(accessor = ai_model_config, public)]
pub struct AIModelConfig {
    #[primary_key]
    pub model_name: String,  // "claude-opus-4.6"

    pub provider: AIProvider,
    pub api_endpoint: String,

    pub capabilities: Vec<String>,
    pub max_context_tokens: u64,
    pub cost_per_million_input: f32,
    pub cost_per_million_output: f32,

    pub enabled: bool,
}

#[derive(SpacetimeType, Clone)]
pub enum AIProvider {
    Anthropic,
    OpenAI,
    Google,
}
```
