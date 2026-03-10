// OMNI AI OPERATING PLATFORM - SpacetimeDB Module
// Complete schema for human+AI collaboration across all business functions

use spacetimedb::{Identity, ReducerContext, SpacetimeType, Table, Timestamp, Uuid};
use spacetimedb::rand::RngCore;

// ============================================================================
// CORE IDENTITY & ACCESS
// ============================================================================

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum EmployeeType {
    Human,
    AIAgent,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum EmployeeStatus {
    Online,
    Busy,
    Offline,
    InCall,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
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
    pub model: String,           // "claude-opus-4.6", "gemini-3.1-pro", etc.
    pub capabilities: Vec<String>, // ["customer_support", "voice_calls"]
    pub supervisor_id: Option<String>, // Hex string of supervisor Identity
    pub max_task_duration_minutes: u32,
    pub self_verification_threshold: f32, // 0.9 = 90% confidence needed
}

#[spacetimedb::table(accessor = employee, public)]
#[derive(Clone)]
pub struct Employee {
    #[primary_key]
    pub id: Identity,

    pub employee_type: EmployeeType,
    pub name: String,
    pub email: Option<String>,
    pub avatar_url: Option<String>,

    // Role & Permissions
    pub role: String,       // "Support Agent", "Sales Rep", "AI Recruiter"
    pub department: Department,

    // AI-Specific
    pub ai_config: Option<AIConfig>,

    // Status
    pub status: EmployeeStatus,
    pub current_task_id: Option<u64>,

    // Metrics
    pub tasks_completed: u64,
    pub avg_confidence_score: Option<f32>,
    pub cost_incurred: Option<f32>, // For AI agents

    pub created_at: Timestamp,
    pub last_active: Timestamp,

    // Organization membership
    pub org_id: Option<u64>,
    pub selected_org_id: Option<u64>,

    // Profile / Resume
    pub bio: Option<String>,
    pub skills: Vec<String>,
    pub education: Vec<String>,
    pub certifications: Vec<String>,
    pub employment_history: Vec<String>,
    pub linkedin_url: Option<String>,
    pub github_url: Option<String>,
    pub timezone: Option<String>,
}

// ============================================================================
// ORGANIZATION & INVITES
// ============================================================================

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum OrgMemberRole {
    Owner,
    Admin,
    Member,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum MembershipStatus {
    Active,
    Pending,
    Invited,
}

#[spacetimedb::table(accessor = organization, public)]
#[derive(Clone)]
pub struct Organization {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub name: String,
    pub domain: Option<String>,
    pub auto_approve_domain: bool,
    pub is_global: bool,

    pub created_by: Identity,
    pub created_at: Timestamp,
}

#[spacetimedb::table(accessor = org_membership, public)]
#[derive(Clone)]
pub struct OrgMembership {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub org_id: u64,
    pub identity: Option<Identity>,
    pub email: String,
    pub role: OrgMemberRole,
    pub status: MembershipStatus,

    pub invited_by: Option<Identity>,
    pub created_at: Timestamp,
    pub accepted_at: Option<Timestamp>,
}

#[spacetimedb::table(accessor = org_invite_link, public)]
#[derive(Clone)]
pub struct OrgInviteLink {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub org_id: u64,
    pub code: String,
    pub created_by: Identity,
    pub max_uses: Option<u32>,
    pub use_count: u32,
    pub expires_at: Option<Timestamp>,
    pub active: bool,

    pub created_at: Timestamp,
}

// ============================================================================
// UNIFIED TASK SYSTEM (Heart of Everything!)
// ============================================================================

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
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
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum TaskStatus {
    Unclaimed,
    Claimed,
    InProgress,
    SelfChecking,    // AI verifying its own work
    NeedsReview,     // Medium confidence, needs human check
    Completed,
    Escalated,
    Blocked,
    Cancelled,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum Priority {
    Urgent,
    High,
    Medium,
    Low,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum ContextType {
    Channel,
    Customer,
    Candidate,
    Deal,
    Task,
    Meeting,
    CodeReview,
    Document,
}

#[spacetimedb::table(accessor = task, public)]
#[derive(Clone)]
pub struct Task {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub org_id: u64,

    // What needs to be done
    pub task_type: TaskType,
    pub title: String,
    pub description: String,
    pub priority: Priority,

    // Context - what is this task about?
    pub context_type: ContextType,
    pub context_id: u64,

    // Assignment
    pub assignee: Option<Identity>, // Human or AI
    pub assigned_by: Option<Identity>,
    pub supervisor_id: Option<Identity>,

    // Status & Workflow
    pub status: TaskStatus,

    // AI-Specific (Self-Verification!)
    pub ai_confidence: Option<f32>,
    pub self_verification_passed: Option<bool>,
    pub thought_trace: Vec<String>, // Agent reasoning steps
    pub retry_count: u8,
    pub escalation_reason: Option<String>,

    // Output
    pub result: Option<String>,

    // Timestamps
    pub created_at: Timestamp,
    pub claimed_at: Option<Timestamp>,
    pub completed_at: Option<Timestamp>,
    pub due_at: Option<Timestamp>,
}

// ============================================================================
// UNIFIED MESSAGING (Replaces Slack + Email + Comments)
// ============================================================================

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum MessageType {
    Chat,
    Email,
    Comment,
    VoiceTranscript,
    SystemNotification,
    AIThought, // Agent reasoning trace
}

#[derive(SpacetimeType, Clone)]
pub struct Attachment {
    pub file_name: String,
    pub file_url: String,
    pub file_type: String,
    pub file_size: u64,
}

#[spacetimedb::table(accessor = message, public)]
#[derive(Clone)]
pub struct Message {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub sender: Identity, // Human or AI

    // Context - what is this message about?
    pub context_type: ContextType,
    pub context_id: u64,

    // Message Details
    pub message_type: MessageType,
    pub content: String,
    pub attachments: Vec<Attachment>,

    // Threading
    pub thread_id: Option<u64>,
    pub in_reply_to: Option<u64>,

    // Metadata
    pub ai_generated: bool,
    pub ai_confidence: Option<f32>,

    pub sent_at: Timestamp,

    // Edit / delete support
    pub edited_at: Option<Timestamp>,
    pub deleted: bool,
}

// ============================================================================
// CUSTOMER SUPPORT MODULE
// ============================================================================

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum Sentiment {
    Happy,
    Neutral,
    Frustrated,
    Angry,
}

#[spacetimedb::table(accessor = customer, public)]
#[derive(Clone)]
pub struct Customer {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub org_id: u64,

    pub external_id: Option<String>,

    pub name: Option<String>,
    pub email: String,
    pub phone: Option<String>,
    pub company: Option<String>,

    // Segments
    pub plan: Option<String>, // "Free", "Pro", "Enterprise"
    pub lifetime_value: Option<f32>,
    pub health_score: Option<f32>,

    // AI Context
    pub summary: Option<String>, // AI-generated customer summary
    pub sentiment: Option<Sentiment>,
    pub preferred_agent: Option<Identity>,

    pub created_at: Timestamp,
    pub last_contact: Option<Timestamp>,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum TicketStatus {
    New,
    Open,
    Pending,
    Resolved,
    Closed,
}

#[spacetimedb::table(accessor = ticket, public)]
#[derive(Clone)]
pub struct Ticket {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub org_id: u64,

    pub customer_id: u64,

    pub subject: String,
    pub status: TicketStatus,
    pub priority: Priority,
    pub category: Option<String>,

    pub assigned_to: Option<Identity>, // Human or AI

    // SLA
    pub sla_due: Option<Timestamp>,
    pub first_response_at: Option<Timestamp>,
    pub resolved_at: Option<Timestamp>,

    // AI Handling
    pub ai_auto_resolved: bool,
    pub escalation_count: u8,

    pub created_at: Timestamp,
}

// ============================================================================
// SALES/CRM MODULE
// ============================================================================

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum LeadSource {
    Inbound,
    Outbound,
    Referral,
    AIProspecting,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum LeadStatus {
    New,
    Contacted,
    Qualified,
    Unqualified,
    Converted,
    Lost,
}

#[spacetimedb::table(accessor = lead, public)]
#[derive(Clone)]
pub struct Lead {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub org_id: u64,

    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub company: Option<String>,
    pub title: Option<String>,

    // Qualification
    pub score: Option<f32>,      // AI-generated lead score
    pub source: LeadSource,
    pub status: LeadStatus,

    pub assigned_to: Option<Identity>,

    // AI Enrichment
    pub enriched_data: Option<String>, // JSON from AI research
    pub icp_match_score: Option<f32>,

    pub created_at: Timestamp,
    pub last_contacted: Option<Timestamp>,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum DealStage {
    Discovery,
    Demo,
    Proposal,
    Negotiation,
    ClosedWon,
    ClosedLost,
}

#[spacetimedb::table(accessor = deal, public)]
#[derive(Clone)]
pub struct Deal {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub org_id: u64,

    pub name: String,
    pub lead_id: Option<u64>,

    pub value: f32,
    pub stage: DealStage,
    pub probability: f32, // AI-predicted win probability

    pub owner: Identity,

    // AI Insights
    pub next_best_action: Option<String>,
    pub risk_factors: Vec<String>,

    pub expected_close: Option<Timestamp>,
    pub closed_at: Option<Timestamp>,
}

// ============================================================================
// RECRUITMENT MODULE
// ============================================================================

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum CandidateStatus {
    Sourced,
    Contacted,
    Screening,
    Interview,
    Offer,
    Hired,
    Rejected,
}

#[spacetimedb::table(accessor = candidate, public)]
#[derive(Clone)]
pub struct Candidate {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub org_id: u64,

    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub linkedin_url: Option<String>,
    pub github_url: Option<String>,
    pub resume_url: Option<String>,

    pub current_company: Option<String>,
    pub current_title: Option<String>,

    // Evaluation
    pub overall_score: Option<f32>, // AI assessment
    pub skills: Vec<String>,
    pub experience_years: Option<f32>,

    pub recruiter: Option<Identity>, // Human or AI

    pub status: CandidateStatus,

    pub created_at: Timestamp,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum JobStatus {
    Draft,
    Open,
    OnHold,
    Filled,
    Closed,
}

#[spacetimedb::table(accessor = job_posting, public)]
#[derive(Clone)]
pub struct JobPosting {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub org_id: u64,

    pub title: String,
    pub description: String,
    pub department: Department,
    pub location: Option<String>,

    pub requirements: Vec<String>,
    pub nice_to_have: Vec<String>,

    pub status: JobStatus,

    // AI Sourcing
    pub ai_sourcing_enabled: bool,
    pub ideal_candidate_profile: Option<String>,

    pub posted_at: Timestamp,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum InterviewType {
    Screening,
    Technical,
    Behavioral,
    Final,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum Recommendation {
    StrongYes,
    Yes,
    Maybe,
    No,
    StrongNo,
}

#[spacetimedb::table(accessor = interview, public)]
#[derive(Clone)]
pub struct Interview {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub org_id: u64,

    pub candidate_id: u64,
    pub job_posting_id: u64,

    pub interview_type: InterviewType,
    pub scheduled_at: Timestamp,
    pub duration_minutes: u32,

    pub interviewers: Vec<String>, // Identity hex strings
    pub meeting_id: Option<u64>,

    // Results
    pub completed: bool,
    pub notes: Option<String>,
    pub ai_transcript: Option<String>,
    pub ai_summary: Option<String>,
    pub recommendation: Option<Recommendation>,
}

// ============================================================================
// COLLABORATION MODULE
// ============================================================================

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum AIChannelRole {
    Observer,
    Participant,
    Moderator,
}

#[derive(SpacetimeType, Clone)]
pub struct AIParticipant {
    pub agent_id: String, // Identity hex string
    pub role: AIChannelRole,
    pub auto_respond: bool,
}

#[spacetimedb::table(accessor = channel, public)]
#[derive(Clone)]
pub struct Channel {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub org_id: u64,

    pub name: String,
    pub description: Option<String>,
    pub is_private: bool,

    pub members: Vec<String>, // Identity hex strings (Humans AND AI)
    pub ai_participants: Vec<AIParticipant>,

    pub created_by: Identity,
    pub created_at: Timestamp,
}

// Message Reactions (emoji reactions on messages)
#[spacetimedb::table(accessor = reaction, public)]
#[derive(Clone)]
pub struct Reaction {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub message_id: u64,
    pub user_id: Identity,
    pub emoji: String, // "thumbsup", "heart", "eyes", etc.
    pub created_at: Timestamp,
}

// Pinned messages
#[spacetimedb::table(accessor = pinned_message, public)]
#[derive(Clone)]
pub struct PinnedMessage {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub channel_id: u64,
    pub message_id: u64,
    pub pinned_by: Identity,
    pub pinned_at: Timestamp,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum DocumentType {
    Wiki,
    Runbook,
    OnboardingGuide,
    PolicyDocument,
    MeetingNotes,
    TechnicalSpec,
    Canvas,
    Whiteboard,
    Folder,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum AutoSyncSource {
    Codebase,
    APISchema,
    DatabaseSchema,
}

#[spacetimedb::table(accessor = document, public)]
#[derive(Clone)]
pub struct Document {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub org_id: u64,

    pub title: String,
    pub content: String, // Markdown
    pub doc_type: DocumentType,

    pub parent_id: Option<u64>,

    pub created_by: Identity,
    pub last_edited_by: Option<Identity>,
    pub editors: Vec<String>, // Identity hex strings (Humans and AI)

    // AI Features
    pub ai_generated: bool,
    pub ai_maintained: bool,
    pub auto_sync_with: Option<AutoSyncSource>,

    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum MeetingType {
    OneOnOne,
    TeamSync,
    CustomerCall,
    InterviewCall,
    SalesDemo,
    AllHands,
}

#[derive(SpacetimeType, Clone)]
pub struct ActionItem {
    pub description: String,
    pub assignee: Option<String>, // Identity hex string
    pub due_at: Option<Timestamp>,
    pub completed: bool,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum MeetingStatus {
    Scheduled,
    InProgress,
    Completed,
    Cancelled,
}

#[spacetimedb::table(accessor = meeting, public)]
#[derive(Clone)]
pub struct Meeting {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub org_id: u64,

    pub title: String,
    pub meeting_type: MeetingType,

    pub scheduled_at: Timestamp,
    pub duration_minutes: u32,

    pub participants: Vec<String>, // Identity hex strings (Humans and AI)
    pub ai_notetaker: Option<String>, // Identity hex string

    // Call Details
    pub call_session_id: Option<String>,

    // Recording & Transcription
    pub recording_url: Option<String>,
    pub transcript: Option<String>,
    pub ai_summary: Option<String>,
    pub action_items: Vec<ActionItem>,

    pub status: MeetingStatus,

    pub created_at: Timestamp,
}

// ============================================================================
// ENGINEERING MODULE
// ============================================================================

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum CodePlatform {
    GitHub,
    GitLab,
    Bitbucket,
}

#[spacetimedb::table(accessor = code_repository, public)]
#[derive(Clone)]
pub struct CodeRepository {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub org_id: u64,

    pub name: String,
    pub url: String,
    pub platform: CodePlatform,

    // AI Analysis
    pub ai_indexed: bool,
    pub last_indexed: Option<Timestamp>,
    pub primary_languages: Vec<String>,

    pub created_at: Timestamp,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum PRStatus {
    Open,
    UnderReview,
    ChangesRequested,
    Approved,
    Merged,
    Closed,
}

#[spacetimedb::table(accessor = pull_request, public)]
#[derive(Clone)]
pub struct PullRequest {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub org_id: u64,

    pub repository_id: u64,

    pub external_id: String, // PR number in GitHub/GitLab
    pub title: String,
    pub description: String,

    pub author: Identity,
    pub reviewers: Vec<String>, // Identity hex strings (Can include AI)

    pub status: PRStatus,

    // AI Review
    pub ai_reviewed: bool,
    pub ai_review_summary: Option<String>,
    pub security_issues: Vec<String>,
    pub performance_issues: Vec<String>,

    pub created_at: Timestamp,
    pub merged_at: Option<Timestamp>,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum BugSeverity {
    Critical,
    High,
    Medium,
    Low,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum BugStatus {
    New,
    Triaged,
    InProgress,
    FixInReview,
    Resolved,
    Verified,
    Closed,
}

#[spacetimedb::table(accessor = bug, public)]
#[derive(Clone)]
pub struct Bug {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub org_id: u64,

    pub title: String,
    pub description: String,

    pub severity: BugSeverity,
    pub priority: Priority,
    pub status: BugStatus,

    pub assigned_to: Option<Identity>,

    // AI Triage
    pub ai_triaged: bool,
    pub ai_severity_confidence: Option<f32>,
    pub ai_suggested_fix: Option<String>,
    pub related_prs: Vec<u64>,

    pub reported_at: Timestamp,
    pub resolved_at: Option<Timestamp>,
}

// ============================================================================
// VOICE/VIDEO CALLS (Proven SpaceChat Tech!)
// ============================================================================

#[derive(SpacetimeType, Debug, Copy, Clone, PartialEq, Eq)]
pub enum CallType {
    Voice,
    Video,
    ScreenShare,
}

#[derive(SpacetimeType, Debug, Copy, Clone, PartialEq, Eq)]
pub enum CallState {
    Ringing,
    Active,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum AICallRole {
    Notetaker,    // Just listens and takes notes
    Participant,  // Can speak/respond
    Support,      // Assists human (whispers suggestions)
}

#[derive(SpacetimeType, Clone)]
pub struct AICallParticipant {
    pub agent_id: String, // Identity hex string
    pub role: AICallRole,
    pub auto_transcribe: bool,
    pub auto_summarize: bool,
}

#[spacetimedb::table(accessor = call_session, public)]
#[derive(Clone)]
pub struct CallSession {
    #[primary_key]
    pub session_id: Uuid,

    pub call_type: CallType,
    pub state: CallState,

    pub participants: Vec<String>, // Identity hex strings (Humans AND AI)
    pub ai_participants: Vec<AICallParticipant>,

    // Context - what is this call about?
    pub context_type: Option<ContextType>,
    pub context_id: Option<u64>,

    // Meeting link
    pub meeting_id: Option<u64>,

    pub created_at: Timestamp,
    pub answered_at: Option<Timestamp>,
}

// Media Settings (from SpaceChat)
#[spacetimedb::table(accessor = media_settings, public)]
#[derive(Clone)]
pub struct MediaSettings {
    #[primary_key]
    pub id: u32,

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

// Event tables for real-time audio/video streaming
#[spacetimedb::table(accessor = audio_frame_event, public, event)]
#[derive(Clone)]
pub struct AudioFrameEvent {
    pub session_id: Uuid,
    pub from: Identity,
    pub to: Identity,
    pub seq: u32,
    pub sample_rate: u32,
    pub channels: u8,
    pub rms: f32,
    pub pcm16le: Vec<u8>,
}

#[spacetimedb::table(accessor = video_frame_event, public, event)]
#[derive(Clone)]
pub struct VideoFrameEvent {
    pub session_id: Uuid,
    pub from: Identity,
    pub to: Identity,
    pub seq: u32,
    pub width: u16,
    pub height: u16,
    pub jpeg: Vec<u8>,
}

// ============================================================================
// OBSERVABILITY
// ============================================================================

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum ThoughtType {
    Planning,
    Reasoning,
    SelfCheck,
    Escalation,
    Completion,
}

// Real-time agent thoughts (transparency!)
#[spacetimedb::table(accessor = agent_thought_event, public, event)]
#[derive(Clone)]
pub struct AgentThoughtEvent {
    pub task_id: u64,
    pub agent_id: Identity,
    pub thought_type: ThoughtType,
    pub content: String,
    pub confidence: Option<f32>,
    pub timestamp: Timestamp,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
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

// Full audit trail
#[spacetimedb::table(accessor = activity_log, public)]
#[derive(Clone)]
pub struct ActivityLog {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    pub org_id: u64,

    pub actor: Identity, // Human or AI
    pub action: Action,

    pub entity_type: String,
    pub entity_id: u64,

    pub metadata: Option<String>, // JSON

    pub timestamp: Timestamp,
}

// ============================================================================
// TYPING INDICATORS (ephemeral presence)
// ============================================================================

#[spacetimedb::table(accessor = typing_indicator, public)]
#[derive(Clone)]
pub struct TypingIndicator {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub channel_id: u64,
    pub user_id: Identity,
    pub started_at: Timestamp,
}

// ============================================================================
// TASK WATCHERS (follow/watch)
// ============================================================================

#[spacetimedb::table(accessor = task_watcher, public)]
#[derive(Clone)]
pub struct TaskWatcher {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub task_id: u64,
    pub user_id: Identity,
    pub created_at: Timestamp,
}

// ============================================================================
// REDUCERS - CORE SYSTEM
// ============================================================================

#[spacetimedb::reducer(init)]
pub fn init(ctx: &ReducerContext) {
    // Insert default media settings if missing
    let exists = ctx.db.media_settings().id().find(&1).is_some();
    if !exists {
        ctx.db.media_settings().insert(MediaSettings {
            id: 1,
            audio_target_sample_rate: 16000,
            audio_frame_ms: 50,
            audio_max_frame_bytes: 64000,
            audio_talking_rms_threshold: 0.02,
            video_width: 320,
            video_height: 180,
            video_fps: 5,
            video_jpeg_quality: 0.55,
            video_max_frame_bytes: 512000,
        });
    }

    // Create Global organization if it doesn't exist
    let global_org = if let Some(existing) = ctx.db.organization().iter().find(|o| o.is_global) {
        existing
    } else {
        ctx.db.organization().insert(Organization {
            id: 0,
            name: "Za Warudo".to_string(),
            domain: None,
            auto_approve_domain: false,
            is_global: true,
            created_by: ctx.sender(),
            created_at: ctx.timestamp,
        })
    };
    let global_org_id = global_org.id;

    // Seed default channels if none exist (using Za Warudo's org_id)
    let has_channels = ctx.db.channel().iter().next().is_some();
    if !has_channels {
        let now = ctx.timestamp;
        let system = ctx.sender();

        ctx.db.channel().insert(Channel {
            id: 0, org_id: global_org_id, name: "general".to_string(),
            description: Some("Company-wide announcements and discussion".to_string()),
            is_private: false, members: vec![], ai_participants: vec![],
            created_by: system, created_at: now,
        });
        ctx.db.channel().insert(Channel {
            id: 0, org_id: global_org_id, name: "random".to_string(),
            description: Some("Non-work banter and water cooler conversation".to_string()),
            is_private: false, members: vec![], ai_participants: vec![],
            created_by: system, created_at: now,
        });
        ctx.db.channel().insert(Channel {
            id: 0, org_id: global_org_id, name: "engineering".to_string(),
            description: Some("Engineering team discussions".to_string()),
            is_private: false, members: vec![], ai_participants: vec![],
            created_by: system, created_at: now,
        });
        ctx.db.channel().insert(Channel {
            id: 0, org_id: global_org_id, name: "support".to_string(),
            description: Some("Customer support coordination".to_string()),
            is_private: false, members: vec![], ai_participants: vec![],
            created_by: system, created_at: now,
        });
        ctx.db.channel().insert(Channel {
            id: 0, org_id: global_org_id, name: "sales".to_string(),
            description: Some("Sales team pipeline and updates".to_string()),
            is_private: false, members: vec![], ai_participants: vec![],
            created_by: system, created_at: now,
        });
    }
}

// ============================================================================
// REDUCERS - EMPLOYEE MANAGEMENT
// ============================================================================

#[spacetimedb::reducer(client_connected)]
pub fn client_connected(ctx: &ReducerContext) {
    let who = ctx.sender();
    let now = ctx.timestamp;

    // Find global org id for default selection
    let global_org_id = ctx.db.organization().iter().find(|o| o.is_global).map(|o| o.id);

    // Check if employee exists
    if let Some(existing) = ctx.db.employee().id().find(&who) {
        // Update status to online
        let mut updated = existing.clone();
        updated.status = EmployeeStatus::Online;
        updated.last_active = now;
        ctx.db.employee().id().update(updated);
        log::info!("Client reconnected: {} ({})", existing.name, who.to_abbreviated_hex());
    } else {
        // Create new human employee — default selected org to Za Warudo
        let name = format!("user-{}", who.to_abbreviated_hex());
        log::info!("New client connected, creating employee: {} ({})", name, who.to_abbreviated_hex());
        ctx.db.employee().insert(Employee {
            id: who,
            employee_type: EmployeeType::Human,
            name,
            email: None,
            avatar_url: None,
            role: "Team Member".to_string(),
            department: Department::Operations,
            ai_config: None,
            status: EmployeeStatus::Online,
            current_task_id: None,
            tasks_completed: 0,
            avg_confidence_score: None,
            cost_incurred: None,
            created_at: now,
            last_active: now,
            org_id: None,
            selected_org_id: global_org_id,
            bio: None,
            skills: vec![],
            education: vec![],
            certifications: vec![],
            employment_history: vec![],
            linkedin_url: None,
            github_url: None,
            timezone: None,
        });
    }

    // Auto-join Global organization
    if let Some(global_org) = ctx.db.organization().iter().find(|o| o.is_global) {
        let already_member = ctx.db.org_membership().iter().any(|m|
            m.org_id == global_org.id && m.identity == Some(who) && m.status == MembershipStatus::Active
        );
        if !already_member {
            ctx.db.org_membership().insert(OrgMembership {
                id: 0, org_id: global_org.id, identity: Some(who),
                email: String::new(), role: OrgMemberRole::Member,
                status: MembershipStatus::Active, invited_by: None,
                created_at: now, accepted_at: Some(now),
            });
        }

        // Auto-join user to all Za Warudo public channels
        let hex = who.to_hex().to_string();
        let global_channels: Vec<Channel> = ctx.db.channel().iter()
            .filter(|ch| ch.org_id == global_org.id && !ch.is_private)
            .collect();
        for ch in global_channels {
            if !ch.members.contains(&hex) {
                let mut updated = ch.clone();
                updated.members.push(hex.clone());
                ctx.db.channel().id().update(updated);
            }
        }
    }
}

#[spacetimedb::reducer(client_disconnected)]
pub fn client_disconnected(ctx: &ReducerContext) {
    let who = ctx.sender();

    // Update status to offline
    if let Some(employee) = ctx.db.employee().id().find(&who) {
        let mut updated = employee.clone();
        updated.status = EmployeeStatus::Offline;
        ctx.db.employee().id().update(updated);
    }

    // End any active calls
    let mut to_delete: Vec<Uuid> = Vec::new();
    for session in ctx.db.call_session().iter() {
        let sender_hex = who.to_hex().to_string();
        if session.participants.contains(&sender_hex) {
            to_delete.push(session.session_id);
        }
    }
    for id in to_delete {
        ctx.db.call_session().session_id().delete(&id);
    }
}

#[spacetimedb::reducer]
pub fn update_employee_profile(
    ctx: &ReducerContext,
    name: String,
    email: Option<String>,
    role: String,
    department: Department,
) -> Result<(), String> {
    let who = ctx.sender();

    let employee = ctx.db.employee().id().find(&who)
        .ok_or("Employee not found")?;

    let updated = Employee {
        name,
        email,
        role,
        department,
        last_active: ctx.timestamp,
        ..employee
    };

    ctx.db.employee().id().update(updated);
    Ok(())
}

#[spacetimedb::reducer]
pub fn select_org(
    ctx: &ReducerContext,
    org_id: u64,
) -> Result<(), String> {
    let who = ctx.sender();

    // Verify org exists
    ctx.db.organization().id().find(&org_id)
        .ok_or("Organization not found")?;

    // Verify membership (global orgs allow all)
    require_org_access(ctx, org_id)?;

    let employee = ctx.db.employee().id().find(&who)
        .ok_or("Employee not found")?;

    ctx.db.employee().id().update(Employee {
        selected_org_id: Some(org_id),
        ..employee
    });

    Ok(())
}

// ============================================================================
// REDUCERS - TASK MANAGEMENT (Heart of the System!)
// ============================================================================

#[spacetimedb::reducer]
pub fn create_task(
    ctx: &ReducerContext,
    task_type: TaskType,
    title: String,
    description: String,
    context_type: ContextType,
    context_id: u64,
    assignee: Option<Identity>,
    priority: Priority,
    org_id: u64,
) -> Result<(), String> {
    require_org_access(ctx, org_id)?;
    let now = ctx.timestamp;

    let task = ctx.db.task().insert(Task {
        id: 0,
        org_id,
        task_type,
        title,
        description,
        priority,
        context_type,
        context_id,
        assignee,
        assigned_by: Some(ctx.sender()),
        supervisor_id: None,
        status: TaskStatus::Unclaimed,
        ai_confidence: None,
        self_verification_passed: None,
        thought_trace: vec![],
        retry_count: 0,
        escalation_reason: None,
        result: None,
        created_at: now,
        claimed_at: None,
        completed_at: None,
        due_at: None,
    });

    // Log activity
    ctx.db.activity_log().insert(ActivityLog {
        id: 0,
        org_id,
        actor: ctx.sender(),
        action: Action::Created,
        entity_type: "Task".to_string(),
        entity_id: task.id,
        metadata: None,
        timestamp: now,
    });

    Ok(())
}

#[spacetimedb::reducer]
pub fn claim_task(ctx: &ReducerContext, task_id: u64) -> Result<(), String> {
    let who = ctx.sender();
    let now = ctx.timestamp;

    let task = ctx.db.task().id().find(&task_id)
        .ok_or("Task not found")?;

    require_org_access(ctx, task.org_id)?;

    if task.status != TaskStatus::Unclaimed {
        return Err("Task is not available".to_string());
    }

    let updated = Task {
        assignee: Some(who),
        status: TaskStatus::Claimed,
        claimed_at: Some(now),
        ..task
    };

    ctx.db.task().id().update(updated);

    // Update employee current task
    if let Some(employee) = ctx.db.employee().id().find(&who) {
        let mut emp = employee.clone();
        emp.current_task_id = Some(task_id);
        emp.status = EmployeeStatus::Busy;
        ctx.db.employee().id().update(emp);
    }

    Ok(())
}

#[spacetimedb::reducer]
pub fn complete_task_with_verification(
    ctx: &ReducerContext,
    task_id: u64,
    result: String,
    confidence: f32,
    thought_trace: Vec<String>,
) -> Result<(), String> {
    let who = ctx.sender();
    let now = ctx.timestamp;

    let task = ctx.db.task().id().find(&task_id)
        .ok_or("Task not found")?;

    if task.assignee != Some(who) {
        return Err("You are not assigned to this task".to_string());
    }

    // Self-verification routing
    let status = if confidence >= 0.90 {
        TaskStatus::Completed
    } else if confidence >= 0.70 {
        TaskStatus::NeedsReview
    } else {
        TaskStatus::Escalated
    };

    let updated = Task {
        status,
        ai_confidence: Some(confidence),
        self_verification_passed: Some(confidence >= 0.90),
        result: Some(result),
        thought_trace,
        completed_at: Some(now),
        ..task
    };

    ctx.db.task().id().update(updated);

    // Update employee
    if let Some(employee) = ctx.db.employee().id().find(&who) {
        let mut emp = employee.clone();
        emp.current_task_id = None;
        emp.status = EmployeeStatus::Online;
        emp.tasks_completed += 1;

        // Update average confidence for AI agents
        if emp.employee_type == EmployeeType::AIAgent {
            let avg = emp.avg_confidence_score.unwrap_or(0.0);
            emp.avg_confidence_score = Some((avg + confidence) / 2.0);
        }

        ctx.db.employee().id().update(emp);
    }

    // Emit thought event for observability
    ctx.db.agent_thought_event().insert(AgentThoughtEvent {
        task_id,
        agent_id: who,
        thought_type: ThoughtType::Completion,
        content: format!("Completed with {}% confidence", (confidence * 100.0) as u32),
        confidence: Some(confidence),
        timestamp: now,
    });

    Ok(())
}

#[spacetimedb::reducer]
pub fn escalate_task(
    ctx: &ReducerContext,
    task_id: u64,
    reason: String,
) -> Result<(), String> {
    let who = ctx.sender();

    let task = ctx.db.task().id().find(&task_id)
        .ok_or("Task not found")?;

    if task.assignee != Some(who) {
        return Err("You are not assigned to this task".to_string());
    }

    let updated = Task {
        status: TaskStatus::Escalated,
        escalation_reason: Some(reason.clone()),
        ..task
    };

    ctx.db.task().id().update(updated);

    // Emit thought event
    ctx.db.agent_thought_event().insert(AgentThoughtEvent {
        task_id,
        agent_id: who,
        thought_type: ThoughtType::Escalation,
        content: reason,
        confidence: None,
        timestamp: ctx.timestamp,
    });

    Ok(())
}

#[spacetimedb::reducer]
pub fn update_task_status(
    ctx: &ReducerContext,
    task_id: u64,
    new_status: TaskStatus,
) -> Result<(), String> {
    let now = ctx.timestamp;

    let task = ctx.db.task().id().find(&task_id)
        .ok_or("Task not found")?;

    require_org_access(ctx, task.org_id)?;

    // If moving to Claimed and no assignee, assign to caller
    let assignee = if new_status == TaskStatus::Claimed && task.assignee.is_none() {
        Some(ctx.sender())
    } else {
        task.assignee
    };

    let claimed_at = if new_status == TaskStatus::Claimed && task.claimed_at.is_none() {
        Some(now)
    } else {
        task.claimed_at
    };

    let completed_at = if new_status == TaskStatus::Completed && task.completed_at.is_none() {
        Some(now)
    } else {
        task.completed_at
    };

    ctx.db.task().id().update(Task {
        status: new_status,
        assignee,
        claimed_at,
        completed_at,
        ..task
    });

    Ok(())
}

#[spacetimedb::reducer]
pub fn update_task(
    ctx: &ReducerContext,
    task_id: u64,
    title: String,
    description: String,
    priority: Priority,
) -> Result<(), String> {
    let task = ctx.db.task().id().find(&task_id)
        .ok_or("Task not found")?;

    require_org_access(ctx, task.org_id)?;

    ctx.db.task().id().update(Task {
        title,
        description,
        priority,
        ..task
    });

    Ok(())
}

// ============================================================================
// REDUCERS - MESSAGE EDIT/DELETE/PIN
// ============================================================================

#[spacetimedb::reducer]
pub fn edit_message(ctx: &ReducerContext, message_id: u64, new_content: String) -> Result<(), String> {
    let who = ctx.sender();
    let msg = ctx.db.message().id().find(&message_id).ok_or("Message not found")?;
    if msg.sender != who { return Err("You can only edit your own messages".to_string()); }
    if new_content.trim().is_empty() { return Err("Message cannot be empty".to_string()); }
    ctx.db.message().id().update(Message {
        content: new_content,
        edited_at: Some(ctx.timestamp),
        ..msg
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_message(ctx: &ReducerContext, message_id: u64) -> Result<(), String> {
    let who = ctx.sender();
    let msg = ctx.db.message().id().find(&message_id).ok_or("Message not found")?;
    if msg.sender != who { return Err("You can only delete your own messages".to_string()); }
    ctx.db.message().id().update(Message { content: String::new(), deleted: true, ..msg });
    // Remove any pins for this message
    let pin_ids: Vec<u64> = ctx.db.pinned_message().iter()
        .filter(|p| p.message_id == message_id)
        .map(|p| p.id)
        .collect();
    for pid in pin_ids { ctx.db.pinned_message().id().delete(&pid); }
    Ok(())
}

#[spacetimedb::reducer]
pub fn pin_message(ctx: &ReducerContext, channel_id: u64, message_id: u64) -> Result<(), String> {
    ctx.db.message().id().find(&message_id).ok_or("Message not found")?;
    let channel = ctx.db.channel().id().find(&channel_id).ok_or("Channel not found")?;
    require_org_access(ctx, channel.org_id)?;
    require_channel_member(ctx, &channel)?;
    for p in ctx.db.pinned_message().iter() {
        if p.channel_id == channel_id && p.message_id == message_id {
            return Ok(());
        }
    }
    ctx.db.pinned_message().insert(PinnedMessage {
        id: 0, channel_id, message_id,
        pinned_by: ctx.sender(), pinned_at: ctx.timestamp,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn unpin_message(ctx: &ReducerContext, channel_id: u64, message_id: u64) -> Result<(), String> {
    let channel = ctx.db.channel().id().find(&channel_id).ok_or("Channel not found")?;
    require_org_access(ctx, channel.org_id)?;
    require_channel_member(ctx, &channel)?;
    let to_delete: Vec<u64> = ctx.db.pinned_message().iter()
        .filter(|p| p.channel_id == channel_id && p.message_id == message_id)
        .map(|p| p.id)
        .collect();
    for pid in to_delete { ctx.db.pinned_message().id().delete(&pid); }
    Ok(())
}

// ============================================================================
// REDUCERS - DOCUMENT CRUD (Canvas persistence)
// ============================================================================

#[spacetimedb::reducer]
pub fn create_document(
    ctx: &ReducerContext, title: String, content: String, doc_type: DocumentType, parent_id: Option<u64>,
    org_id: u64,
) -> Result<(), String> {
    require_org_access(ctx, org_id)?;
    let who = ctx.sender();
    let now = ctx.timestamp;
    if title.trim().is_empty() { return Err("Title cannot be empty".to_string()); }
    ctx.db.document().insert(Document {
        id: 0, org_id, title, content, doc_type, parent_id,
        created_by: who, last_edited_by: Some(who),
        editors: vec![who.to_hex().to_string()],
        ai_generated: false, ai_maintained: false, auto_sync_with: None,
        created_at: now, updated_at: now,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn update_document(
    ctx: &ReducerContext, document_id: u64, title: String, content: String,
) -> Result<(), String> {
    let who = ctx.sender();
    let doc = ctx.db.document().id().find(&document_id).ok_or("Document not found")?;
    require_org_access(ctx, doc.org_id)?;
    let hex = who.to_hex().to_string();
    let mut editors = doc.editors.clone();
    if !editors.contains(&hex) { editors.push(hex); }
    ctx.db.document().id().update(Document {
        title, content, editors, last_edited_by: Some(who), updated_at: ctx.timestamp, ..doc
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_document(ctx: &ReducerContext, document_id: u64) -> Result<(), String> {
    let doc = ctx.db.document().id().find(&document_id).ok_or("Document not found")?;
    require_org_access(ctx, doc.org_id)?;
    ctx.db.document().id().delete(&document_id);
    Ok(())
}

// ============================================================================
// REDUCERS - TYPING INDICATORS
// ============================================================================

#[spacetimedb::reducer]
pub fn set_typing_status(ctx: &ReducerContext, channel_id: u64, is_typing: bool) -> Result<(), String> {
    let who = ctx.sender();
    let now = ctx.timestamp;

    // Verify channel access
    let channel = ctx.db.channel().id().find(&channel_id).ok_or("Channel not found")?;
    require_org_access(ctx, channel.org_id)?;
    if channel.is_private {
        require_channel_member(ctx, &channel)?;
    }

    let existing: Option<u64> = ctx.db.typing_indicator().iter()
        .find(|t| t.channel_id == channel_id && t.user_id == who)
        .map(|t| t.id);
    if is_typing {
        if let Some(eid) = existing {
            if let Some(ti) = ctx.db.typing_indicator().id().find(&eid) {
                ctx.db.typing_indicator().id().update(TypingIndicator { started_at: now, ..ti });
            }
        } else {
            ctx.db.typing_indicator().insert(TypingIndicator {
                id: 0, channel_id, user_id: who, started_at: now,
            });
        }
    } else if let Some(eid) = existing {
        ctx.db.typing_indicator().id().delete(&eid);
    }
    Ok(())
}

// ============================================================================
// REDUCERS - EMPLOYEE RESUME
// ============================================================================

#[spacetimedb::reducer]
pub fn update_employee_resume(
    ctx: &ReducerContext,
    bio: Option<String>,
    skills: Vec<String>,
    education: Vec<String>,
    certifications: Vec<String>,
    employment_history: Vec<String>,
    linkedin_url: Option<String>,
    github_url: Option<String>,
    timezone: Option<String>,
) -> Result<(), String> {
    let who = ctx.sender();
    let emp = ctx.db.employee().id().find(&who).ok_or("Employee not found")?;
    ctx.db.employee().id().update(Employee {
        bio, skills, education, certifications, employment_history,
        linkedin_url, github_url, timezone,
        last_active: ctx.timestamp,
        ..emp
    });
    Ok(())
}

// ============================================================================
// REDUCERS - TASK WATCHERS
// ============================================================================

#[spacetimedb::reducer]
pub fn watch_task(ctx: &ReducerContext, task_id: u64) -> Result<(), String> {
    let who = ctx.sender();
    let task = ctx.db.task().id().find(&task_id).ok_or("Task not found")?;
    require_org_access(ctx, task.org_id)?;
    for w in ctx.db.task_watcher().iter() {
        if w.task_id == task_id && w.user_id == who { return Ok(()); }
    }
    ctx.db.task_watcher().insert(TaskWatcher {
        id: 0, task_id, user_id: who, created_at: ctx.timestamp,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn unwatch_task(ctx: &ReducerContext, task_id: u64) -> Result<(), String> {
    let who = ctx.sender();
    let task = ctx.db.task().id().find(&task_id).ok_or("Task not found")?;
    require_org_access(ctx, task.org_id)?;
    let to_del: Vec<u64> = ctx.db.task_watcher().iter()
        .filter(|w| w.task_id == task_id && w.user_id == who)
        .map(|w| w.id)
        .collect();
    for id in to_del { ctx.db.task_watcher().id().delete(&id); }
    Ok(())
}

// ============================================================================
// REDUCERS - ORGANIZATION UPDATE
// ============================================================================

#[spacetimedb::reducer]
pub fn update_organization(
    ctx: &ReducerContext, org_id: u64, name: String, domain: Option<String>,
) -> Result<(), String> {
    if !is_admin_or_owner_for_org(ctx, org_id) {
        return Err("Only admins can update organization settings".to_string());
    }
    let org = ctx.db.organization().id().find(&org_id).ok_or("Org not found")?;
    if org.is_global { return Err("Cannot modify Za Warudo".to_string()); }
    ctx.db.organization().id().update(Organization { name, domain, ..org });
    Ok(())
}

// ============================================================================
// REDUCERS - ORGANIZATION & INVITES
// ============================================================================

fn get_membership_role_for_org(ctx: &ReducerContext, org_id: u64) -> Option<OrgMemberRole> {
    let who = ctx.sender();
    for m in ctx.db.org_membership().iter() {
        if m.org_id == org_id && m.identity == Some(who) && m.status == MembershipStatus::Active {
            return Some(m.role.clone());
        }
    }
    None
}

fn is_admin_or_owner_for_org(ctx: &ReducerContext, org_id: u64) -> bool {
    matches!(get_membership_role_for_org(ctx, org_id), Some(OrgMemberRole::Owner) | Some(OrgMemberRole::Admin))
}

/// Check if caller is a member of the given org (or if org is Global/Za Warudo)
fn require_org_access(ctx: &ReducerContext, org_id: u64) -> Result<(), String> {
    let org = ctx.db.organization().id().find(&org_id)
        .ok_or("Organization not found")?;
    if org.is_global {
        return Ok(()); // Everyone can access Za Warudo
    }
    let who = ctx.sender();
    for m in ctx.db.org_membership().iter() {
        if m.org_id == org_id && m.identity == Some(who) && m.status == MembershipStatus::Active {
            return Ok(());
        }
    }
    Err("You are not a member of this organization".to_string())
}

/// Check if caller is a member of the channel
fn require_channel_member(ctx: &ReducerContext, channel: &Channel) -> Result<(), String> {
    let hex = ctx.sender().to_hex().to_string();
    // Public non-private channels are open to org members (checked separately)
    if !channel.is_private {
        return Ok(());
    }
    if channel.members.contains(&hex) {
        return Ok(());
    }
    Err("You are not a member of this channel".to_string())
}

/// Get the caller's current org_id from their employee record, or error
fn get_caller_org_id(ctx: &ReducerContext) -> Result<u64, String> {
    let emp = ctx.db.employee().id().find(&ctx.sender())
        .ok_or("Employee not found")?;
    emp.org_id.ok_or("You must belong to an organization".to_string())
}

#[spacetimedb::reducer]
pub fn create_organization(
    ctx: &ReducerContext,
    name: String,
    domain: Option<String>,
    email: String,
    display_name: String,
) -> Result<(), String> {
    let who = ctx.sender();
    let now = ctx.timestamp;

    if name.trim().is_empty() {
        return Err("Organization name cannot be empty".to_string());
    }

    let auto_approve = domain.is_some();
    let org = ctx.db.organization().insert(Organization {
        id: 0,
        name: name.trim().to_string(),
        domain: domain.clone(),
        auto_approve_domain: auto_approve,
        is_global: false,
        created_by: who,
        created_at: now,
    });

    // Create owner membership
    ctx.db.org_membership().insert(OrgMembership {
        id: 0,
        org_id: org.id,
        identity: Some(who),
        email: email.clone(),
        role: OrgMemberRole::Owner,
        status: MembershipStatus::Active,
        invited_by: None,
        created_at: now,
        accepted_at: Some(now),
    });

    // Update employee record
    if let Some(emp) = ctx.db.employee().id().find(&who) {
        ctx.db.employee().id().update(Employee {
            name: display_name,
            email: Some(email),
            org_id: Some(org.id),
            ..emp
        });
    }

    log::info!("Organization '{}' created by {}", org.name, who.to_abbreviated_hex());
    Ok(())
}

#[spacetimedb::reducer]
pub fn invite_by_email(
    ctx: &ReducerContext,
    org_id: u64,
    email: String,
) -> Result<(), String> {
    let who = ctx.sender();
    let now = ctx.timestamp;

    if !is_admin_or_owner_for_org(ctx, org_id) {
        return Err("Only admins can invite members".to_string());
    }

    let email = email.trim().to_lowercase();
    if email.is_empty() || !email.contains('@') {
        return Err("Invalid email address".to_string());
    }

    let org = ctx.db.organization().id().find(&org_id)
        .ok_or("Organization not found")?;

    // Check for existing membership with this email
    for m in ctx.db.org_membership().iter() {
        if m.org_id == org.id && m.email == email {
            return Err(format!("{} already has a membership", email));
        }
    }

    ctx.db.org_membership().insert(OrgMembership {
        id: 0,
        org_id: org.id,
        identity: None,
        email: email.clone(),
        role: OrgMemberRole::Member,
        status: MembershipStatus::Invited,
        invited_by: Some(who),
        created_at: now,
        accepted_at: None,
    });

    log::info!("Invited {} by {}", email, who.to_abbreviated_hex());
    Ok(())
}

#[spacetimedb::reducer]
pub fn generate_invite_link(
    ctx: &ReducerContext,
    org_id: u64,
    max_uses: Option<u32>,
) -> Result<(), String> {
    let who = ctx.sender();
    let now = ctx.timestamp;

    if !is_admin_or_owner_for_org(ctx, org_id) {
        return Err("Only admins can generate invite links".to_string());
    }

    let org = ctx.db.organization().id().find(&org_id)
        .ok_or("Organization not found")?;

    // Generate random 8-char code using deterministic RNG
    let mut rng = ctx.rng();
    let chars: Vec<char> = "abcdefghijklmnopqrstuvwxyz0123456789".chars().collect();
    let code: String = (0..8).map(|_| {
        let idx = (rng.next_u32() as usize) % chars.len();
        chars[idx]
    }).collect();

    ctx.db.org_invite_link().insert(OrgInviteLink {
        id: 0,
        org_id: org.id,
        code: code.clone(),
        created_by: who,
        max_uses,
        use_count: 0,
        expires_at: None,
        active: true,
        created_at: now,
    });

    log::info!("Invite link '{}' generated by {}", code, who.to_abbreviated_hex());
    Ok(())
}

#[spacetimedb::reducer]
pub fn join_org_with_email(
    ctx: &ReducerContext,
    org_id: u64,
    email: String,
    display_name: String,
    avatar_url: Option<String>,
) -> Result<(), String> {
    let who = ctx.sender();
    let now = ctx.timestamp;
    let email = email.trim().to_lowercase();

    let org = ctx.db.organization().id().find(&org_id)
        .ok_or("Organization not found")?;

    // Check if already an active member
    for m in ctx.db.org_membership().iter() {
        if m.org_id == org.id && m.identity == Some(who) && m.status == MembershipStatus::Active {
            // Already a member, just update employee info
            if let Some(emp) = ctx.db.employee().id().find(&who) {
                ctx.db.employee().id().update(Employee {
                    name: display_name,
                    email: Some(email),
                    avatar_url,
                    org_id: Some(org.id),
                    ..emp
                });
            }
            return Ok(());
        }
    }

    // Check for existing invite by email
    let mut matched_invite: Option<OrgMembership> = None;
    for m in ctx.db.org_membership().iter() {
        if m.org_id == org.id && m.email == email && m.status == MembershipStatus::Invited {
            matched_invite = Some(m);
            break;
        }
    }

    if let Some(invite) = matched_invite {
        // Accept the invite
        ctx.db.org_membership().id().update(OrgMembership {
            identity: Some(who),
            status: MembershipStatus::Active,
            accepted_at: Some(now),
            ..invite
        });
        log::info!("{} accepted invite, joined org", email);
    } else if org.auto_approve_domain {
        // Check domain match
        let email_domain = email.rsplit('@').next().unwrap_or("");
        let org_domain = org.domain.as_deref().unwrap_or("");
        if !org_domain.is_empty() && email_domain == org_domain {
            ctx.db.org_membership().insert(OrgMembership {
                id: 0,
                org_id: org.id,
                identity: Some(who),
                email: email.clone(),
                role: OrgMemberRole::Member,
                status: MembershipStatus::Active,
                invited_by: None,
                created_at: now,
                accepted_at: Some(now),
            });
            log::info!("{} auto-approved via domain match", email);
        } else {
            // No domain match — create pending request
            ctx.db.org_membership().insert(OrgMembership {
                id: 0,
                org_id: org.id,
                identity: Some(who),
                email: email.clone(),
                role: OrgMemberRole::Member,
                status: MembershipStatus::Pending,
                invited_by: None,
                created_at: now,
                accepted_at: None,
            });
            log::info!("{} requested access (pending)", email);
        }
    } else {
        // No auto-approve — create pending request
        ctx.db.org_membership().insert(OrgMembership {
            id: 0,
            org_id: org.id,
            identity: Some(who),
            email: email.clone(),
            role: OrgMemberRole::Member,
            status: MembershipStatus::Pending,
            invited_by: None,
            created_at: now,
            accepted_at: None,
        });
        log::info!("{} requested access (pending)", email);
    }

    // Update employee record
    if let Some(emp) = ctx.db.employee().id().find(&who) {
        ctx.db.employee().id().update(Employee {
            name: display_name,
            email: Some(email),
            avatar_url,
            org_id: Some(org.id),
            ..emp
        });
    }

    Ok(())
}

#[spacetimedb::reducer]
pub fn join_org_with_invite_code(
    ctx: &ReducerContext,
    code: String,
    email: String,
    display_name: String,
    avatar_url: Option<String>,
) -> Result<(), String> {
    let who = ctx.sender();
    let now = ctx.timestamp;
    let email = email.trim().to_lowercase();

    // Find the invite link
    let mut found_link: Option<OrgInviteLink> = None;
    for link in ctx.db.org_invite_link().iter() {
        if link.code == code && link.active {
            found_link = Some(link);
            break;
        }
    }

    let link = found_link.ok_or("Invalid or expired invite link")?;

    // Check max uses
    if let Some(max) = link.max_uses {
        if link.use_count >= max {
            return Err("This invite link has reached its maximum uses".to_string());
        }
    }

    // Increment use count
    ctx.db.org_invite_link().id().update(OrgInviteLink {
        use_count: link.use_count + 1,
        ..link.clone()
    });

    // Create active membership
    ctx.db.org_membership().insert(OrgMembership {
        id: 0,
        org_id: link.org_id,
        identity: Some(who),
        email: email.clone(),
        role: OrgMemberRole::Member,
        status: MembershipStatus::Active,
        invited_by: Some(link.created_by),
        created_at: now,
        accepted_at: Some(now),
    });

    // Update employee record
    if let Some(emp) = ctx.db.employee().id().find(&who) {
        ctx.db.employee().id().update(Employee {
            name: display_name,
            email: Some(email.clone()),
            avatar_url,
            org_id: Some(link.org_id),
            ..emp
        });
    }

    log::info!("{} joined via invite link '{}'", email, code);
    Ok(())
}

#[spacetimedb::reducer]
pub fn approve_membership(
    ctx: &ReducerContext,
    membership_id: u64,
) -> Result<(), String> {
    let now = ctx.timestamp;
    let membership = ctx.db.org_membership().id().find(&membership_id)
        .ok_or("Membership not found")?;

    if !is_admin_or_owner_for_org(ctx, membership.org_id) {
        return Err("Only admins can approve memberships".to_string());
    }

    if membership.status != MembershipStatus::Pending {
        return Err("Membership is not pending".to_string());
    }

    ctx.db.org_membership().id().update(OrgMembership {
        status: MembershipStatus::Active,
        accepted_at: Some(now),
        ..membership.clone()
    });

    // Update employee org_id if they have an identity
    if let Some(identity) = membership.identity {
        if let Some(emp) = ctx.db.employee().id().find(&identity) {
            ctx.db.employee().id().update(Employee {
                org_id: Some(membership.org_id),
                ..emp
            });
        }
    }

    log::info!("Membership {} approved for {}", membership_id, membership.email);
    Ok(())
}

#[spacetimedb::reducer]
pub fn reject_membership(
    ctx: &ReducerContext,
    membership_id: u64,
) -> Result<(), String> {
    let membership = ctx.db.org_membership().id().find(&membership_id)
        .ok_or("Membership not found")?;

    if !is_admin_or_owner_for_org(ctx, membership.org_id) {
        return Err("Only admins can reject memberships".to_string());
    }

    ctx.db.org_membership().id().delete(&membership_id);
    log::info!("Membership rejected for {}", membership.email);
    Ok(())
}

#[spacetimedb::reducer]
pub fn revoke_invite_link(
    ctx: &ReducerContext,
    link_id: u64,
) -> Result<(), String> {
    let link = ctx.db.org_invite_link().id().find(&link_id)
        .ok_or("Invite link not found")?;

    if !is_admin_or_owner_for_org(ctx, link.org_id) {
        return Err("Only admins can revoke invite links".to_string());
    }

    ctx.db.org_invite_link().id().update(OrgInviteLink {
        active: false,
        ..link
    });

    Ok(())
}

#[spacetimedb::reducer]
pub fn update_member_role(
    ctx: &ReducerContext,
    membership_id: u64,
    new_role: OrgMemberRole,
) -> Result<(), String> {
    let membership = ctx.db.org_membership().id().find(&membership_id)
        .ok_or("Membership not found")?;

    // Only Owner can change roles
    if !matches!(get_membership_role_for_org(ctx, membership.org_id), Some(OrgMemberRole::Owner)) {
        return Err("Only the org owner can change roles".to_string());
    }

    ctx.db.org_membership().id().update(OrgMembership {
        role: new_role,
        ..membership
    });

    Ok(())
}

// ============================================================================
// REDUCERS - MESSAGING
// ============================================================================

#[spacetimedb::reducer]
pub fn send_message(
    ctx: &ReducerContext,
    context_type: ContextType,
    context_id: u64,
    content: String,
    message_type: MessageType,
) -> Result<(), String> {
    let who = ctx.sender();
    let now = ctx.timestamp;

    if content.trim().is_empty() {
        return Err("Message cannot be empty".to_string());
    }

    // If context is a channel, verify org access and channel membership
    if context_type == ContextType::Channel {
        let channel = ctx.db.channel().id().find(&context_id)
            .ok_or("Channel not found")?;
        require_org_access(ctx, channel.org_id)?;
        if channel.is_private {
            require_channel_member(ctx, &channel)?;
        }
    }

    // Check if sender is AI agent
    let is_ai = ctx.db.employee().id().find(&who)
        .map(|e| e.employee_type == EmployeeType::AIAgent)
        .unwrap_or(false);

    let row = ctx.db.message().insert(Message {
        id: 0,
        sender: who,
        context_type,
        context_id,
        message_type,
        content,
        attachments: vec![],
        thread_id: None,
        in_reply_to: None,
        ai_generated: is_ai,
        ai_confidence: None,
        sent_at: now,
        edited_at: None,
        deleted: false,
    });

    log::info!("Message {} sent by {} in context {}", row.id, who.to_abbreviated_hex(), context_id);
    Ok(())
}

#[spacetimedb::reducer]
pub fn send_thread_reply(
    ctx: &ReducerContext,
    context_type: ContextType,
    context_id: u64,
    content: String,
    thread_id: u64,
) -> Result<(), String> {
    let who = ctx.sender();
    let now = ctx.timestamp;

    if content.trim().is_empty() {
        return Err("Reply cannot be empty".to_string());
    }

    // If context is a channel, verify org access and channel membership
    if context_type == ContextType::Channel {
        let channel = ctx.db.channel().id().find(&context_id)
            .ok_or("Channel not found")?;
        require_org_access(ctx, channel.org_id)?;
        if channel.is_private {
            require_channel_member(ctx, &channel)?;
        }
    }

    // Verify parent message exists
    if ctx.db.message().id().find(&thread_id).is_none() {
        return Err("Thread parent message not found".to_string());
    }

    let is_ai = ctx.db.employee().id().find(&who)
        .map(|e| e.employee_type == EmployeeType::AIAgent)
        .unwrap_or(false);

    ctx.db.message().insert(Message {
        id: 0,
        sender: who,
        context_type,
        context_id,
        message_type: MessageType::Chat,
        content,
        attachments: vec![],
        thread_id: Some(thread_id),
        in_reply_to: Some(thread_id),
        ai_generated: is_ai,
        ai_confidence: None,
        sent_at: now,
        edited_at: None,
        deleted: false,
    });

    Ok(())
}

// ============================================================================
// REDUCERS - CHANNEL MANAGEMENT
// ============================================================================

#[spacetimedb::reducer]
pub fn create_channel(
    ctx: &ReducerContext,
    name: String,
    description: Option<String>,
    is_private: bool,
    org_id: u64,
) -> Result<(), String> {
    require_org_access(ctx, org_id)?;
    let who = ctx.sender();
    let now = ctx.timestamp;

    let clean_name = name.trim().to_lowercase().replace(' ', "-");
    if clean_name.is_empty() {
        return Err("Channel name cannot be empty".to_string());
    }

    // Check for duplicate channel name within the org
    for ch in ctx.db.channel().iter() {
        if ch.org_id == org_id && ch.name == clean_name {
            return Err(format!("Channel #{} already exists", clean_name));
        }
    }

    ctx.db.channel().insert(Channel {
        id: 0,
        org_id,
        name: clean_name,
        description,
        is_private,
        members: vec![who.to_hex().to_string()],
        ai_participants: vec![],
        created_by: who,
        created_at: now,
    });

    Ok(())
}

#[spacetimedb::reducer]
pub fn join_channel(
    ctx: &ReducerContext,
    channel_id: u64,
) -> Result<(), String> {
    let who = ctx.sender();
    let hex = who.to_hex().to_string();

    let channel = ctx.db.channel().id().find(&channel_id)
        .ok_or("Channel not found")?;

    require_org_access(ctx, channel.org_id)?;

    if channel.members.contains(&hex) {
        return Ok(()); // Already a member
    }

    let mut updated = channel.clone();
    updated.members.push(hex);
    ctx.db.channel().id().update(updated);

    Ok(())
}

#[spacetimedb::reducer]
pub fn leave_channel(
    ctx: &ReducerContext,
    channel_id: u64,
) -> Result<(), String> {
    let who = ctx.sender();
    let hex = who.to_hex().to_string();

    let channel = ctx.db.channel().id().find(&channel_id)
        .ok_or("Channel not found")?;

    require_org_access(ctx, channel.org_id)?;

    let mut updated = channel.clone();
    updated.members.retain(|m| m != &hex);
    ctx.db.channel().id().update(updated);

    Ok(())
}

#[spacetimedb::reducer]
pub fn update_channel_topic(
    ctx: &ReducerContext,
    channel_id: u64,
    description: Option<String>,
) -> Result<(), String> {
    let channel = ctx.db.channel().id().find(&channel_id)
        .ok_or("Channel not found")?;

    require_org_access(ctx, channel.org_id)?;
    require_channel_member(ctx, &channel)?;

    let mut updated = channel.clone();
    updated.description = description;
    ctx.db.channel().id().update(updated);

    Ok(())
}

// ============================================================================
// REDUCERS - REACTIONS
// ============================================================================

#[spacetimedb::reducer]
pub fn add_reaction(
    ctx: &ReducerContext,
    message_id: u64,
    emoji: String,
) -> Result<(), String> {
    let who = ctx.sender();
    let now = ctx.timestamp;

    // Verify message exists
    if ctx.db.message().id().find(&message_id).is_none() {
        return Err("Message not found".to_string());
    }

    // Check for duplicate reaction
    for r in ctx.db.reaction().iter() {
        if r.message_id == message_id
            && r.user_id == who
            && r.emoji == emoji
        {
            return Ok(()); // Already reacted
        }
    }

    ctx.db.reaction().insert(Reaction {
        id: 0,
        message_id,
        user_id: who,
        emoji,
        created_at: now,
    });

    Ok(())
}

#[spacetimedb::reducer]
pub fn remove_reaction(
    ctx: &ReducerContext,
    message_id: u64,
    emoji: String,
) -> Result<(), String> {
    let who = ctx.sender();

    let mut to_delete: Option<u64> = None;
    for r in ctx.db.reaction().iter() {
        if r.message_id == message_id
            && r.user_id == who
            && r.emoji == emoji
        {
            to_delete = Some(r.id);
            break;
        }
    }

    if let Some(id) = to_delete {
        ctx.db.reaction().id().delete(&id);
    }

    Ok(())
}

// ============================================================================
// REDUCERS - DM CHANNELS
// ============================================================================

#[spacetimedb::reducer]
pub fn create_dm_channel(
    ctx: &ReducerContext,
    target_identity_hex: String,
) -> Result<(), String> {
    let who = ctx.sender();
    let now = ctx.timestamp;
    let my_hex = who.to_hex().to_string();

    // Use caller's org_id for the DM channel
    let caller_org_id = get_caller_org_id(ctx)?;

    let is_self_dm = my_hex == target_identity_hex;

    // Check if DM channel already exists between these two users
    for ch in ctx.db.channel().iter() {
        if ch.is_private && ch.name.starts_with("dm-") {
            if is_self_dm {
                // Self-DM: 1 member, that member is me
                if ch.members.len() == 1 && ch.members.contains(&my_hex) {
                    return Ok(());
                }
            } else if ch.members.len() == 2
                && ch.members.contains(&my_hex)
                && ch.members.contains(&target_identity_hex)
            {
                return Ok(());
            }
        }
    }

    // Create the DM channel
    let dm_name = format!("dm-{}-{}", &my_hex[..8], &target_identity_hex[..8.min(target_identity_hex.len())]);
    let members = if is_self_dm {
        vec![my_hex]
    } else {
        vec![my_hex, target_identity_hex]
    };

    ctx.db.channel().insert(Channel {
        id: 0,
        org_id: caller_org_id,
        name: dm_name,
        description: None,
        is_private: true,
        members,
        ai_participants: vec![],
        created_by: who,
        created_at: now,
    });

    Ok(())
}

// ============================================================================
// REDUCERS - VOICE/VIDEO CALLS (From SpaceChat)
// ============================================================================

#[spacetimedb::reducer]
pub fn request_call(
    ctx: &ReducerContext,
    target: Identity,
    call_type: CallType,
    context_type: Option<ContextType>,
    context_id: Option<u64>,
) -> Result<(), String> {
    let caller = ctx.sender();
    let now = ctx.timestamp;

    if caller == target {
        return Err("Cannot call yourself".to_string());
    }

    // Check if target exists
    if ctx.db.employee().id().find(&target).is_none() {
        return Err("Target not found".to_string());
    }

    // Check for existing calls
    let caller_hex = caller.to_hex().to_string();
    let target_hex = target.to_hex().to_string();

    for s in ctx.db.call_session().iter() {
        if (s.participants.contains(&caller_hex) || s.participants.contains(&target_hex))
            && (s.state == CallState::Ringing || s.state == CallState::Active)
        {
            return Err("Participant is already in a call".to_string());
        }
    }

    let session_id = ctx.new_uuid_v7()
        .or_else(|_| ctx.new_uuid_v4())
        .map_err(|_| "Failed to generate session id".to_string())?;

    ctx.db.call_session().insert(CallSession {
        session_id,
        call_type,
        state: CallState::Ringing,
        participants: vec![caller_hex, target_hex],
        ai_participants: vec![],
        context_type,
        context_id,
        meeting_id: None,
        created_at: now,
        answered_at: None,
    });

    Ok(())
}

#[spacetimedb::reducer]
pub fn accept_call(ctx: &ReducerContext, session_id: Uuid) -> Result<(), String> {
    let who = ctx.sender();
    let now = ctx.timestamp;
    let who_hex = who.to_hex().to_string();

    let sess = ctx.db.call_session().session_id().find(&session_id)
        .ok_or("Call session not found")?;

    if !sess.participants.contains(&who_hex) {
        return Err("You are not a participant in this call".to_string());
    }

    if sess.state != CallState::Ringing {
        return Err("Call is not ringing".to_string());
    }

    let mut updated = sess.clone();
    updated.state = CallState::Active;
    updated.answered_at = Some(now);
    ctx.db.call_session().session_id().update(updated);

    Ok(())
}

#[spacetimedb::reducer]
pub fn end_call(ctx: &ReducerContext, session_id: Uuid) -> Result<(), String> {
    let who = ctx.sender();
    let who_hex = who.to_hex().to_string();

    let sess = ctx.db.call_session().session_id().find(&session_id)
        .ok_or("Call session not found")?;

    if !sess.participants.contains(&who_hex) {
        return Err("You are not a participant in this call".to_string());
    }

    ctx.db.call_session().session_id().delete(&session_id);
    Ok(())
}

#[spacetimedb::reducer]
pub fn send_audio_frame(
    ctx: &ReducerContext,
    session_id: Uuid,
    to: Identity,
    seq: u32,
    sample_rate: u32,
    channels: u8,
    rms: f32,
    pcm16le: Vec<u8>,
) -> Result<(), String> {
    let who = ctx.sender();

    let sess = ctx.db.call_session().session_id().find(&session_id)
        .ok_or("Call session not found")?;

    if sess.state != CallState::Active {
        return Err("Call is not active".to_string());
    }

    if pcm16le.len() > 64_000 {
        return Err("Audio frame too large".to_string());
    }

    ctx.db.audio_frame_event().insert(AudioFrameEvent {
        session_id,
        from: who,
        to,
        seq,
        sample_rate,
        channels,
        rms,
        pcm16le,
    });

    Ok(())
}

#[spacetimedb::reducer]
pub fn send_video_frame(
    ctx: &ReducerContext,
    session_id: Uuid,
    to: Identity,
    seq: u32,
    width: u16,
    height: u16,
    jpeg: Vec<u8>,
) -> Result<(), String> {
    let who = ctx.sender();

    let sess = ctx.db.call_session().session_id().find(&session_id)
        .ok_or("Call session not found")?;

    if sess.state != CallState::Active {
        return Err("Call is not active".to_string());
    }

    if sess.call_type != CallType::Video && sess.call_type != CallType::ScreenShare {
        return Err("Not a video call".to_string());
    }

    if jpeg.len() > 512_000 {
        return Err("Video frame too large".to_string());
    }

    ctx.db.video_frame_event().insert(VideoFrameEvent {
        session_id,
        from: who,
        to,
        seq,
        width,
        height,
        jpeg,
    });

    Ok(())
}

// ============================================================================
// REDUCERS - SUPPORT MODULE
// ============================================================================

#[spacetimedb::reducer]
pub fn create_customer(
    ctx: &ReducerContext,
    name: Option<String>,
    email: String,
    phone: Option<String>,
    company: Option<String>,
    org_id: u64,
) -> Result<(), String> {
    require_org_access(ctx, org_id)?;
    let now = ctx.timestamp;

    ctx.db.customer().insert(Customer {
        id: 0,
        org_id,
        external_id: None,
        name,
        email,
        phone,
        company,
        plan: Some("Free".to_string()),
        lifetime_value: None,
        health_score: None,
        summary: None,
        sentiment: Some(Sentiment::Neutral),
        preferred_agent: None,
        created_at: now,
        last_contact: None,
    });

    Ok(())
}

#[spacetimedb::reducer]
pub fn create_ticket(
    ctx: &ReducerContext,
    customer_id: u64,
    subject: String,
    priority: Priority,
) -> Result<(), String> {
    let now = ctx.timestamp;

    // Verify customer exists and get its org_id
    let customer = ctx.db.customer().id().find(&customer_id)
        .ok_or("Customer not found")?;
    require_org_access(ctx, customer.org_id)?;

    let _ticket = ctx.db.ticket().insert(Ticket {
        id: 0,
        org_id: customer.org_id,
        customer_id,
        subject: subject.clone(),
        status: TicketStatus::New,
        priority: priority.clone(),
        category: None,
        assigned_to: None,
        sla_due: None,
        first_response_at: None,
        resolved_at: None,
        ai_auto_resolved: false,
        escalation_count: 0,
        created_at: now,
    });

    // Auto-create task for handling this ticket
    ctx.db.task().insert(Task {
        id: 0,
        org_id: customer.org_id,
        task_type: TaskType::CustomerSupport,
        title: format!("Respond to: {}", subject),
        description: subject.clone(),
        priority: priority.clone(),
        context_type: ContextType::Customer,
        context_id: customer_id,
        assignee: None,
        assigned_by: None,
        supervisor_id: None,
        status: TaskStatus::Unclaimed,
        ai_confidence: None,
        self_verification_passed: None,
        thought_trace: vec![],
        retry_count: 0,
        escalation_reason: None,
        result: None,
        created_at: now,
        claimed_at: None,
        completed_at: None,
        due_at: None,
    });

    Ok(())
}

// ============================================================================
// REDUCERS - SALES MODULE
// ============================================================================

#[spacetimedb::reducer]
pub fn create_lead(
    ctx: &ReducerContext,
    name: String,
    email: String,
    company: Option<String>,
    source: LeadSource,
    org_id: u64,
) -> Result<(), String> {
    require_org_access(ctx, org_id)?;
    let now = ctx.timestamp;

    ctx.db.lead().insert(Lead {
        id: 0,
        org_id,
        name,
        email,
        phone: None,
        company,
        title: None,
        score: None,
        source,
        status: LeadStatus::New,
        assigned_to: None,
        enriched_data: None,
        icp_match_score: None,
        created_at: now,
        last_contacted: None,
    });

    Ok(())
}

// ============================================================================
// REDUCERS - RECRUITMENT MODULE
// ============================================================================

#[spacetimedb::reducer]
pub fn create_candidate(
    ctx: &ReducerContext,
    name: String,
    email: String,
    linkedin_url: Option<String>,
    org_id: u64,
) -> Result<(), String> {
    require_org_access(ctx, org_id)?;
    let now = ctx.timestamp;

    ctx.db.candidate().insert(Candidate {
        id: 0,
        org_id,
        name,
        email,
        phone: None,
        linkedin_url,
        github_url: None,
        resume_url: None,
        current_company: None,
        current_title: None,
        overall_score: None,
        skills: vec![],
        experience_years: None,
        recruiter: None,
        status: CandidateStatus::Sourced,
        created_at: now,
    });

    Ok(())
}
