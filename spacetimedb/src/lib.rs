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

    // Visibility & sharing
    pub visibility: DocumentVisibility,
    pub shared_with: Vec<String>, // Identity hex strings

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
// RESOURCE PRESENCE (who's viewing what)
// ============================================================================

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum ResourceType {
    Canvas,
    Ticket,
    Channel,
    Page,
}

#[spacetimedb::table(accessor = resource_presence, public)]
#[derive(Clone)]
pub struct ResourcePresence {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub user_id: Identity,
    pub resource_type: ResourceType,
    pub resource_id: u64,
    pub last_seen_at: Timestamp,
}

// ============================================================================
// USER LOCATION (for globe visualization)
// ============================================================================

#[spacetimedb::table(accessor = user_location, public)]
#[derive(Clone)]
pub struct UserLocation {
    #[primary_key]
    pub user_id: Identity,
    pub latitude: f64,
    pub longitude: f64,
    pub updated_at: Timestamp,
}

// ============================================================================
// DOCUMENT VISIBILITY
// ============================================================================

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum DocumentVisibility {
    /// Visible to everyone in the org
    Public,
    /// Only visible to creator and shared_with users
    Private,
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
// TICKET LABELS
// ============================================================================

#[spacetimedb::table(accessor = ticket_label, public)]
#[derive(Clone)]
pub struct TicketLabel {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub name: String,
    pub color: String,
}

#[spacetimedb::table(accessor = ticket_label_assignment, public)]
#[derive(Clone)]
pub struct TicketLabelAssignment {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub task_id: u64,
    pub label_id: u64,
}

// ============================================================================
// TIME TRACKING
// ============================================================================

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum TimeEntryCategory {
    Development,
    Meeting,
    Support,
    Sales,
    Recruitment,
    Documentation,
    Review,
    Planning,
    Break,
    Other,
}

#[spacetimedb::table(accessor = time_entry, public)]
#[derive(Clone)]
pub struct TimeEntry {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub user_id: Identity,
    pub category: TimeEntryCategory,
    pub description: String,
    pub task_id: Option<u64>,
    pub ticket_id: Option<u64>,
    pub started_at: Timestamp,
    pub ended_at: Option<Timestamp>,
    pub duration_minutes: u32,
    pub billable: bool,
    pub created_at: Timestamp,
}

// ============================================================================
// SPRINTS & EPICS — Project Management
// ============================================================================

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum SprintStatus {
    Planning,
    Active,
    Completed,
    Cancelled,
}

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum EpicStatus {
    Draft,
    Active,
    Completed,
    Cancelled,
}

#[spacetimedb::table(accessor = sprint, public)]
#[derive(Clone)]
pub struct Sprint {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub name: String,
    pub goal: String,
    pub status: SprintStatus,
    pub start_date: Option<Timestamp>,
    pub end_date: Option<Timestamp>,
    pub created_at: Timestamp,
}

#[spacetimedb::table(accessor = epic, public)]
#[derive(Clone)]
pub struct Epic {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub name: String,
    pub description: String,
    pub color: String,
    pub status: EpicStatus,
    pub created_at: Timestamp,
}

/// 1:1 extension for tasks — links sprint, epic, and story points
/// without modifying the existing Task table schema.
#[spacetimedb::table(accessor = task_extension, public)]
#[derive(Clone)]
pub struct TaskExtension {
    #[primary_key]
    pub task_id: u64,
    pub sprint_id: Option<u64>,
    pub epic_id: Option<u64>,
    pub story_points: Option<u32>,
}

// ============================================================================
// DOCUMENT FAVORITES
// ============================================================================

#[spacetimedb::table(accessor = document_favorite, public)]
#[derive(Clone)]
pub struct DocumentFavorite {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub user_id: Identity,
    pub document_id: u64,
    pub created_at: Timestamp,
}

// ============================================================================
// DOCUMENT VERSIONS
// ============================================================================

#[spacetimedb::table(accessor = document_version, public)]
#[derive(Clone)]
pub struct DocumentVersion {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub document_id: u64,
    pub version_number: u32,
    pub title: String,
    pub content: String,
    pub created_by: Identity,
    pub created_at: Timestamp,
}

// ============================================================================
// EMAIL METADATA (per-user state on messages used as emails)
// ============================================================================

#[spacetimedb::table(accessor = email_meta, public)]
#[derive(Clone)]
pub struct EmailMeta {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub message_id: u64,
    pub user_id: Identity,
    pub starred: bool,
    pub archived: bool,
    pub trashed: bool,
    pub read: bool,
    pub label: Option<String>,
    pub snoozed_until: Option<Timestamp>,
}

#[spacetimedb::table(accessor = email_label, public)]
#[derive(Clone)]
pub struct EmailLabel {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub user_id: Identity,
    pub name: String,
    pub color: String,
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
            name: "World".to_string(),
            domain: None,
            auto_approve_domain: false,
            is_global: true,
            created_by: ctx.sender(),
            created_at: ctx.timestamp,
        })
    };
    let global_org_id = global_org.id;

    // Seed default channels if none exist (using World org_id)
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
        // Fix org_id if it was never set (backfill for existing users)
        if updated.org_id.is_none() {
            updated.org_id = global_org_id.or(updated.selected_org_id);
        }
        ctx.db.employee().id().update(updated);
        log::info!("Client reconnected: {} ({})", existing.name, who.to_abbreviated_hex());
    } else {
        // Create new human employee — default selected org to World
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
            org_id: global_org_id,
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

        // Auto-join user to all World public channels
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

/// Sync OIDC profile (name, email, avatar) to employee record.
/// Called automatically by the client after connecting.
#[spacetimedb::reducer]
pub fn sync_identity(
    ctx: &ReducerContext,
    name: String,
    email: Option<String>,
    avatar_url: Option<String>,
) -> Result<(), String> {
    let who = ctx.sender();

    // Input validation
    if name.len() > 200 {
        return Err("Name exceeds maximum length".to_string());
    }
    if let Some(ref e) = email {
        if e.len() > 320 { return Err("Email exceeds maximum length".to_string()); }
    }
    if let Some(ref a) = avatar_url {
        if a.len() > 2_000 { return Err("Avatar URL exceeds maximum length".to_string()); }
    }

    let employee = ctx.db.employee().id().find(&who)
        .ok_or("Employee not found")?;

    // Only update if name is still the default hex placeholder or if profile data changed
    let should_update = employee.name.starts_with("user-")
        || employee.name != name
        || employee.email != email
        || employee.avatar_url != avatar_url;

    if should_update {
        ctx.db.employee().id().update(Employee {
            name,
            email,
            avatar_url,
            last_active: ctx.timestamp,
            ..employee
        });
    }

    Ok(())
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

    if name.trim().is_empty() {
        return Err("Name cannot be empty".to_string());
    }
    if name.len() > 100 {
        return Err("Name exceeds maximum length of 100 characters".to_string());
    }
    if role.len() > 100 {
        return Err("Role exceeds maximum length of 100 characters".to_string());
    }

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
    if title.len() > 200 {
        return Err("Task title exceeds maximum length of 200 characters".to_string());
    }
    if description.len() > 5_000 {
        return Err("Task description exceeds maximum length of 5,000 characters".to_string());
    }
    if let Some(ref assignee_id) = assignee {
        if ctx.db.employee().id().find(assignee_id).is_none() {
            return Err("Assignee does not exist as an employee".to_string());
        }
    }
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

    require_org_access(ctx, task.org_id)?;

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

    require_org_access(ctx, task.org_id)?;

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
    let who = ctx.sender();
    let now = ctx.timestamp;

    let task = ctx.db.task().id().find(&task_id)
        .ok_or("Task not found")?;

    require_org_access(ctx, task.org_id)?;

    // Only assignee, creator (assigned_by), or org admin can change task status
    let is_assignee = task.assignee == Some(who);
    let is_creator = task.assigned_by == Some(who);
    let is_admin = is_admin_or_owner_for_org(ctx, task.org_id);
    if !is_assignee && !is_creator && !is_admin {
        return Err("Only the assignee, creator, or org admin can change task status".to_string());
    }

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
    let who = ctx.sender();
    let task = ctx.db.task().id().find(&task_id)
        .ok_or("Task not found")?;

    require_org_access(ctx, task.org_id)?;

    // Only assignee, creator, or org admin can edit task details
    let is_assignee = task.assignee == Some(who);
    let is_creator = task.assigned_by == Some(who);
    let is_admin = is_admin_or_owner_for_org(ctx, task.org_id);
    if !is_assignee && !is_creator && !is_admin {
        return Err("Only the assignee, creator, or org admin can edit this task".to_string());
    }

    if title.len() > 200 {
        return Err("Task title exceeds maximum length of 200 characters".to_string());
    }
    if description.len() > 5_000 {
        return Err("Task description exceeds maximum length of 5,000 characters".to_string());
    }

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
    if new_content.len() > 10_000 {
        return Err("Message content exceeds maximum length of 10,000 characters".to_string());
    }

    // Verify caller still has org access for this message's context
    let org_id = resolve_context_org_id(ctx, &msg.context_type, msg.context_id)?;
    require_org_access(ctx, org_id)?;

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

    // Verify caller still has org access for this message's context
    let org_id = resolve_context_org_id(ctx, &msg.context_type, msg.context_id)?;
    require_org_access(ctx, org_id)?;

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
    if title.len() > 200 {
        return Err("Document title exceeds maximum length of 200 characters".to_string());
    }
    if content.len() > 100_000 {
        return Err("Document content exceeds maximum length of 100,000 characters".to_string());
    }
    ctx.db.document().insert(Document {
        id: 0, org_id, title, content, doc_type, parent_id,
        created_by: who, last_edited_by: Some(who),
        editors: vec![who.to_hex().to_string()],
        visibility: DocumentVisibility::Public,
        shared_with: vec![],
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

    // Only creator, existing editors, or org admin can edit
    let hex = who.to_hex().to_string();
    let is_creator = doc.created_by == who;
    let is_editor = doc.editors.contains(&hex);
    let is_admin = is_admin_or_owner_for_org(ctx, doc.org_id);
    if !is_creator && !is_editor && !is_admin {
        return Err("Only the creator, editors, or org admin can edit this document".to_string());
    }

    if title.len() > 200 {
        return Err("Document title exceeds maximum length of 200 characters".to_string());
    }
    if content.len() > 100_000 {
        return Err("Document content exceeds maximum length of 100,000 characters".to_string());
    }

    let mut editors = doc.editors.clone();
    if !editors.contains(&hex) { editors.push(hex); }
    ctx.db.document().id().update(Document {
        title, content, editors, last_edited_by: Some(who), updated_at: ctx.timestamp, ..doc
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_document(ctx: &ReducerContext, document_id: u64) -> Result<(), String> {
    let who = ctx.sender();
    let doc = ctx.db.document().id().find(&document_id).ok_or("Document not found")?;
    require_org_access(ctx, doc.org_id)?;

    // Only creator or org admin can delete documents
    let is_creator = doc.created_by == who;
    let is_admin = is_admin_or_owner_for_org(ctx, doc.org_id);
    if !is_creator && !is_admin {
        return Err("Only the document creator or org admin can delete this document".to_string());
    }

    ctx.db.document().id().delete(&document_id);
    Ok(())
}

// ============================================================================
// REDUCERS - DOCUMENT SHARING
// ============================================================================

#[spacetimedb::reducer]
pub fn share_document(ctx: &ReducerContext, document_id: u64, target_identity_hex: String) -> Result<(), String> {
    let who = ctx.sender();
    let mut doc = ctx.db.document().id().find(&document_id).ok_or("Document not found")?;
    require_org_access(ctx, doc.org_id)?;
    // Only creator or existing editors can share
    let who_hex = who.to_hex().to_string();
    if doc.created_by != who && !doc.editors.contains(&who_hex) {
        return Err("Only the creator or editors can share this document".to_string());
    }
    if !doc.shared_with.contains(&target_identity_hex) {
        doc.shared_with.push(target_identity_hex);
    }
    ctx.db.document().id().update(doc);
    Ok(())
}

#[spacetimedb::reducer]
pub fn unshare_document(ctx: &ReducerContext, document_id: u64, target_identity_hex: String) -> Result<(), String> {
    let who = ctx.sender();
    let mut doc = ctx.db.document().id().find(&document_id).ok_or("Document not found")?;
    require_org_access(ctx, doc.org_id)?;
    let who_hex = who.to_hex().to_string();
    if doc.created_by != who && !doc.editors.contains(&who_hex) {
        return Err("Only the creator or editors can modify sharing".to_string());
    }
    doc.shared_with.retain(|h| h != &target_identity_hex);
    ctx.db.document().id().update(doc);
    Ok(())
}

#[spacetimedb::reducer]
pub fn set_document_visibility(ctx: &ReducerContext, document_id: u64, visibility: DocumentVisibility) -> Result<(), String> {
    let who = ctx.sender();
    let mut doc = ctx.db.document().id().find(&document_id).ok_or("Document not found")?;
    require_org_access(ctx, doc.org_id)?;
    let who_hex = who.to_hex().to_string();
    if doc.created_by != who && !doc.editors.contains(&who_hex) {
        return Err("Only the creator or editors can change visibility".to_string());
    }
    doc.visibility = visibility;
    ctx.db.document().id().update(doc);
    Ok(())
}

// ============================================================================
// REDUCERS - RESOURCE PRESENCE
// ============================================================================

#[spacetimedb::reducer]
pub fn set_resource_presence(ctx: &ReducerContext, resource_type: ResourceType, resource_id: u64) -> Result<(), String> {
    let who = ctx.sender();
    let now = ctx.timestamp;
    // Remove old presence for this user (across all resources)
    let old: Vec<ResourcePresence> = ctx.db.resource_presence().iter()
        .filter(|p| p.user_id == who)
        .collect();
    for p in old {
        ctx.db.resource_presence().id().delete(&p.id);
    }
    // Insert new presence
    ctx.db.resource_presence().insert(ResourcePresence {
        id: 0, user_id: who, resource_type, resource_id, last_seen_at: now,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn clear_resource_presence(ctx: &ReducerContext) -> Result<(), String> {
    let who = ctx.sender();
    let old: Vec<ResourcePresence> = ctx.db.resource_presence().iter()
        .filter(|p| p.user_id == who)
        .collect();
    for p in old {
        ctx.db.resource_presence().id().delete(&p.id);
    }
    Ok(())
}

// ============================================================================
// REDUCERS - USER LOCATION
// ============================================================================

#[spacetimedb::reducer]
pub fn set_user_location(ctx: &ReducerContext, latitude: f64, longitude: f64) -> Result<(), String> {
    let who = ctx.sender();

    // Validate coordinates
    if latitude < -90.0 || latitude > 90.0 {
        return Err("Latitude must be between -90 and 90".to_string());
    }
    if longitude < -180.0 || longitude > 180.0 {
        return Err("Longitude must be between -180 and 180".to_string());
    }

    if let Some(_existing) = ctx.db.user_location().user_id().find(&who) {
        ctx.db.user_location().user_id().update(UserLocation {
            user_id: who,
            latitude,
            longitude,
            updated_at: ctx.timestamp,
        });
    } else {
        ctx.db.user_location().insert(UserLocation {
            user_id: who,
            latitude,
            longitude,
            updated_at: ctx.timestamp,
        });
    }

    log::info!("User {:?} shared location: ({}, {})", who, latitude, longitude);
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

    // Input validation
    if let Some(ref b) = bio {
        if b.len() > 2_000 { return Err("Bio exceeds maximum length of 2,000 characters".to_string()); }
    }
    if skills.len() > 50 { return Err("Too many skills (max 50)".to_string()); }
    if education.len() > 20 { return Err("Too many education entries (max 20)".to_string()); }
    if certifications.len() > 30 { return Err("Too many certifications (max 30)".to_string()); }
    if employment_history.len() > 30 { return Err("Too many employment history entries (max 30)".to_string()); }
    if let Some(ref u) = linkedin_url {
        if u.len() > 500 { return Err("LinkedIn URL exceeds maximum length of 500 characters".to_string()); }
    }
    if let Some(ref u) = github_url {
        if u.len() > 500 { return Err("GitHub URL exceeds maximum length of 500 characters".to_string()); }
    }
    if let Some(ref t) = timezone {
        if t.len() > 100 { return Err("Timezone exceeds maximum length of 100 characters".to_string()); }
    }

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
    if org.is_global { return Err("Cannot modify World".to_string()); }
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

/// Check if caller is a member of the given org (or if org is Global/World)
fn require_org_access(ctx: &ReducerContext, org_id: u64) -> Result<(), String> {
    let org = ctx.db.organization().id().find(&org_id)
        .ok_or("Organization not found")?;
    if org.is_global {
        return Ok(()); // Everyone can access World
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

/// Resolve the org_id for a message's context (channel, task, customer, etc.)
fn resolve_context_org_id(ctx: &ReducerContext, context_type: &ContextType, context_id: u64) -> Result<u64, String> {
    match context_type {
        ContextType::Channel => {
            let ch = ctx.db.channel().id().find(&context_id).ok_or("Channel not found")?;
            Ok(ch.org_id)
        }
        ContextType::Task => {
            let t = ctx.db.task().id().find(&context_id).ok_or("Task not found")?;
            Ok(t.org_id)
        }
        ContextType::Customer => {
            let c = ctx.db.customer().id().find(&context_id).ok_or("Customer not found")?;
            Ok(c.org_id)
        }
        ContextType::Deal => {
            let d = ctx.db.deal().id().find(&context_id).ok_or("Deal not found")?;
            Ok(d.org_id)
        }
        ContextType::Candidate => {
            let c = ctx.db.candidate().id().find(&context_id).ok_or("Candidate not found")?;
            Ok(c.org_id)
        }
        ContextType::Document => {
            let d = ctx.db.document().id().find(&context_id).ok_or("Document not found")?;
            Ok(d.org_id)
        }
        ContextType::Meeting => {
            let m = ctx.db.meeting().id().find(&context_id).ok_or("Meeting not found")?;
            Ok(m.org_id)
        }
        ContextType::CodeReview => {
            let pr = ctx.db.pull_request().id().find(&context_id).ok_or("Code review not found")?;
            Ok(pr.org_id)
        }
    }
}

/// Get the caller's current org_id from their employee record, or error
fn get_caller_org_id(ctx: &ReducerContext) -> Result<u64, String> {
    let emp = ctx.db.employee().id().find(&ctx.sender())
        .ok_or("Employee not found")?;
    emp.org_id
        .or(emp.selected_org_id)
        .ok_or("You must belong to an organization".to_string())
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
    if name.len() > 100 {
        return Err("Organization name exceeds maximum length of 100 characters".to_string());
    }
    if display_name.len() > 100 {
        return Err("Display name exceeds maximum length of 100 characters".to_string());
    }

    // Prevent creating orgs with reserved names
    let lower_name = name.trim().to_lowercase();
    if lower_name == "world" || lower_name == "za warudo" {
        return Err("Cannot create organization with reserved name".to_string());
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

    // Seed default channels for the new org
    let creator_hex = who.to_hex().to_string();
    ctx.db.channel().insert(Channel {
        id: 0,
        org_id: org.id,
        name: "general".to_string(),
        description: Some("Company-wide announcements and discussion".to_string()),
        is_private: false,
        members: vec![creator_hex.clone()],
        ai_participants: vec![],
        created_by: who,
        created_at: now,
    });
    ctx.db.channel().insert(Channel {
        id: 0,
        org_id: org.id,
        name: "random".to_string(),
        description: Some("Non-work banter and water cooler conversation".to_string()),
        is_private: false,
        members: vec![creator_hex],
        ai_participants: vec![],
        created_by: who,
        created_at: now,
    });

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

    // Generate random 16-char code using deterministic RNG
    let mut rng = ctx.rng();
    let chars: Vec<char> = "abcdefghijklmnopqrstuvwxyz0123456789".chars().collect();
    let code: String = (0..16).map(|_| {
        let idx = (rng.next_u32() as usize) % chars.len();
        chars[idx]
    }).collect();

    // Default expiry: 7 days from now
    let expires_at = Some(ctx.timestamp + std::time::Duration::from_secs(7 * 24 * 60 * 60));

    ctx.db.org_invite_link().insert(OrgInviteLink {
        id: 0,
        org_id: org.id,
        code: code.clone(),
        created_by: who,
        max_uses,
        use_count: 0,
        expires_at,
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
    // Input validation
    if display_name.len() > 200 {
        return Err("Display name exceeds maximum length of 200 characters".to_string());
    }
    if let Some(ref url) = avatar_url {
        if url.len() > 2_000 {
            return Err("Avatar URL exceeds maximum length of 2,000 characters".to_string());
        }
    }

    let who = ctx.sender();
    let now = ctx.timestamp;
    let email = email.trim().to_lowercase();

    let org = ctx.db.organization().id().find(&org_id)
        .ok_or("Organization not found")?;

    // Check if already has a membership (Active or Pending)
    for m in ctx.db.org_membership().iter() {
        if m.org_id == org.id && m.identity == Some(who) {
            if m.status == MembershipStatus::Active {
                // Already an active member, just update employee info
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
            if m.status == MembershipStatus::Pending {
                // Already has a pending request — don't create duplicates
                return Ok(());
            }
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

    let mut became_active = false;

    if let Some(invite) = matched_invite {
        // Accept the invite
        ctx.db.org_membership().id().update(OrgMembership {
            identity: Some(who),
            status: MembershipStatus::Active,
            accepted_at: Some(now),
            ..invite
        });
        became_active = true;
        log::info!("{} accepted invite, joined org", email);
    } else if org.auto_approve_domain {
        // Check domain match using VERIFIED email from employee record (not user-supplied)
        let verified_email = ctx.db.employee().id().find(&who)
            .and_then(|e| e.email.clone())
            .unwrap_or_default();
        let email_domain = if verified_email.is_empty() {
            ""
        } else {
            verified_email.rsplit('@').next().unwrap_or("")
        };
        let org_domain = org.domain.as_deref().unwrap_or("");
        if !org_domain.is_empty() && !email_domain.is_empty() && email_domain == org_domain {
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
            became_active = true;
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

    // Only update employee org_id if membership is Active (not Pending)
    if let Some(emp) = ctx.db.employee().id().find(&who) {
        ctx.db.employee().id().update(Employee {
            name: display_name,
            email: Some(email),
            avatar_url,
            org_id: if became_active { Some(org.id) } else { emp.org_id },
            ..emp
        });
    }

    // Auto-join user to all public channels in the org if they became active
    if became_active {
        let hex = who.to_hex().to_string();
        let public_channels: Vec<Channel> = ctx.db.channel().iter()
            .filter(|ch| ch.org_id == org.id && !ch.is_private)
            .collect();
        for ch in public_channels {
            if !ch.members.contains(&hex) {
                let mut updated = ch.clone();
                updated.members.push(hex.clone());
                ctx.db.channel().id().update(updated);
            }
        }
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
    // Input validation
    if display_name.len() > 200 {
        return Err("Display name exceeds maximum length of 200 characters".to_string());
    }
    if let Some(ref url) = avatar_url {
        if url.len() > 2_000 {
            return Err("Avatar URL exceeds maximum length of 2,000 characters".to_string());
        }
    }

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

    // Check expiry
    if let Some(expires_at) = link.expires_at {
        if ctx.timestamp > expires_at {
            return Err("This invite link has expired".to_string());
        }
    }

    // Check max uses
    if let Some(max) = link.max_uses {
        if link.use_count >= max {
            return Err("This invite link has reached its maximum uses".to_string());
        }
    }

    // Check for existing membership — prevent duplicates
    let mut pending_membership_id: Option<u64> = None;
    for m in ctx.db.org_membership().iter() {
        if m.org_id == link.org_id && m.identity == Some(who) {
            if m.status == MembershipStatus::Active {
                // Already an active member, just update employee info
                if let Some(emp) = ctx.db.employee().id().find(&who) {
                    ctx.db.employee().id().update(Employee {
                        name: display_name,
                        email: Some(email),
                        avatar_url,
                        org_id: Some(link.org_id),
                        ..emp
                    });
                }
                return Ok(());
            }
            if m.status == MembershipStatus::Pending {
                // Has a pending request — upgrade it to Active instead of creating duplicate
                pending_membership_id = Some(m.id);
            }
        }
    }

    // Increment use count (after all guard checks pass)
    ctx.db.org_invite_link().id().update(OrgInviteLink {
        use_count: link.use_count + 1,
        ..link.clone()
    });

    // If there's an existing Pending membership, upgrade it to Active
    if let Some(pending_id) = pending_membership_id {
        if let Some(pending) = ctx.db.org_membership().id().find(&pending_id) {
            ctx.db.org_membership().id().update(OrgMembership {
                status: MembershipStatus::Active,
                accepted_at: Some(now),
                ..pending
            });
        }
    } else {
        // Create new active membership
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
    }

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

    // Auto-join user to all public channels in the org
    let hex = who.to_hex().to_string();
    let public_channels: Vec<Channel> = ctx.db.channel().iter()
        .filter(|ch| ch.org_id == link.org_id && !ch.is_private)
        .collect();
    for ch in public_channels {
        if !ch.members.contains(&hex) {
            let mut updated = ch.clone();
            updated.members.push(hex.clone());
            ctx.db.channel().id().update(updated);
        }
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

    // Update employee org_id and auto-join public channels
    if let Some(identity) = membership.identity {
        if let Some(emp) = ctx.db.employee().id().find(&identity) {
            ctx.db.employee().id().update(Employee {
                org_id: Some(membership.org_id),
                ..emp
            });
        }

        // Auto-join user to all public channels in the org
        let hex = identity.to_hex().to_string();
        let public_channels: Vec<Channel> = ctx.db.channel().iter()
            .filter(|ch| ch.org_id == membership.org_id && !ch.is_private)
            .collect();
        for ch in public_channels {
            if !ch.members.contains(&hex) {
                let mut updated = ch.clone();
                updated.members.push(hex.clone());
                ctx.db.channel().id().update(updated);
            }
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
    if content.len() > 10_000 {
        return Err("Message content exceeds maximum length of 10,000 characters".to_string());
    }

    // Verify org access based on context type
    match context_type {
        ContextType::Channel => {
            let channel = ctx.db.channel().id().find(&context_id)
                .ok_or("Channel not found")?;
            require_org_access(ctx, channel.org_id)?;
            if channel.is_private {
                require_channel_member(ctx, &channel)?;
            }
        }
        ContextType::Task => {
            let task = ctx.db.task().id().find(&context_id)
                .ok_or("Task not found")?;
            require_org_access(ctx, task.org_id)?;
        }
        ContextType::Customer => {
            let customer = ctx.db.customer().id().find(&context_id)
                .ok_or("Customer not found")?;
            require_org_access(ctx, customer.org_id)?;
        }
        ContextType::Deal => {
            let deal = ctx.db.deal().id().find(&context_id)
                .ok_or("Deal not found")?;
            require_org_access(ctx, deal.org_id)?;
        }
        ContextType::Candidate => {
            let candidate = ctx.db.candidate().id().find(&context_id)
                .ok_or("Candidate not found")?;
            require_org_access(ctx, candidate.org_id)?;
        }
        ContextType::Document => {
            let doc = ctx.db.document().id().find(&context_id)
                .ok_or("Document not found")?;
            require_org_access(ctx, doc.org_id)?;
        }
        ContextType::Meeting | ContextType::CodeReview => {
            let org_id = resolve_context_org_id(ctx, &context_type, context_id)?;
            require_org_access(ctx, org_id)?;
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
    if content.len() > 10_000 {
        return Err("Reply content exceeds maximum length of 10,000 characters".to_string());
    }

    // Verify org access based on context type
    match context_type {
        ContextType::Channel => {
            let channel = ctx.db.channel().id().find(&context_id)
                .ok_or("Channel not found")?;
            require_org_access(ctx, channel.org_id)?;
            if channel.is_private {
                require_channel_member(ctx, &channel)?;
            }
        }
        ContextType::Task => {
            let task = ctx.db.task().id().find(&context_id)
                .ok_or("Task not found")?;
            require_org_access(ctx, task.org_id)?;
        }
        ContextType::Customer => {
            let customer = ctx.db.customer().id().find(&context_id)
                .ok_or("Customer not found")?;
            require_org_access(ctx, customer.org_id)?;
        }
        ContextType::Deal => {
            let deal = ctx.db.deal().id().find(&context_id)
                .ok_or("Deal not found")?;
            require_org_access(ctx, deal.org_id)?;
        }
        ContextType::Candidate => {
            let candidate = ctx.db.candidate().id().find(&context_id)
                .ok_or("Candidate not found")?;
            require_org_access(ctx, candidate.org_id)?;
        }
        ContextType::Document => {
            let doc = ctx.db.document().id().find(&context_id)
                .ok_or("Document not found")?;
            require_org_access(ctx, doc.org_id)?;
        }
        ContextType::Meeting | ContextType::CodeReview => {
            let org_id = resolve_context_org_id(ctx, &context_type, context_id)?;
            require_org_access(ctx, org_id)?;
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

    if name.len() > 80 {
        return Err("Channel name exceeds maximum length of 80 characters".to_string());
    }
    if let Some(ref desc) = description {
        if desc.len() > 500 {
            return Err("Channel description exceeds maximum length of 500 characters".to_string());
        }
    }

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

    // Private channels (including DMs) require an invitation — no self-joining
    if channel.is_private {
        return Err("Cannot join a private channel without an invitation".to_string());
    }

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

    // Require actual channel membership (not just org membership)
    let hex = ctx.sender().to_hex().to_string();
    if !channel.members.contains(&hex) && !is_admin_or_owner_for_org(ctx, channel.org_id) {
        return Err("You must be a member of this channel or an org admin to update the topic".to_string());
    }

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

    if emoji.is_empty() || emoji.len() > 50 {
        return Err("Invalid emoji".to_string());
    }

    // Verify message exists and user has access
    let msg = ctx.db.message().id().find(&message_id)
        .ok_or("Message not found")?;
    match msg.context_type {
        ContextType::Channel => {
            let channel = ctx.db.channel().id().find(&msg.context_id)
                .ok_or("Channel not found")?;
            require_org_access(ctx, channel.org_id)?;
            if channel.is_private {
                require_channel_member(ctx, &channel)?;
            }
        }
        ContextType::Task => {
            let task = ctx.db.task().id().find(&msg.context_id)
                .ok_or("Task not found")?;
            require_org_access(ctx, task.org_id)?;
        }
        ContextType::Customer => {
            let customer = ctx.db.customer().id().find(&msg.context_id)
                .ok_or("Customer not found")?;
            require_org_access(ctx, customer.org_id)?;
        }
        ContextType::Deal => {
            let deal = ctx.db.deal().id().find(&msg.context_id)
                .ok_or("Deal not found")?;
            require_org_access(ctx, deal.org_id)?;
        }
        ContextType::Candidate => {
            let candidate = ctx.db.candidate().id().find(&msg.context_id)
                .ok_or("Candidate not found")?;
            require_org_access(ctx, candidate.org_id)?;
        }
        ContextType::Document => {
            let doc = ctx.db.document().id().find(&msg.context_id)
                .ok_or("Document not found")?;
            require_org_access(ctx, doc.org_id)?;
        }
        ContextType::Meeting | ContextType::CodeReview => {
            let org_id = resolve_context_org_id(ctx, &msg.context_type, msg.context_id)?;
            require_org_access(ctx, org_id)?;
        }
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

    // Can only remove your own reactions
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

    // Verify target identity exists as an employee (unless self-DM)
    if !is_self_dm {
        // Parse hex string to find target employee
        let target_exists = ctx.db.employee().iter().any(|e| e.id.to_hex().to_string() == target_identity_hex);
        if !target_exists {
            return Err("Target user does not exist".to_string());
        }

        // Verify target is a member of the same org (unless it's the global org)
        let org = ctx.db.organization().id().find(&caller_org_id)
            .ok_or("Organization not found")?;
        if !org.is_global {
            let target_in_org = ctx.db.org_membership().iter().any(|m|
                m.org_id == caller_org_id
                && m.status == MembershipStatus::Active
                && m.identity.map(|i| i.to_hex().to_string()) == Some(target_identity_hex.clone())
            );
            if !target_in_org {
                return Err("Target user is not a member of your organization".to_string());
            }
        }
    }

    // Check if DM channel already exists between these two users in this org
    for ch in ctx.db.channel().iter() {
        if ch.org_id == caller_org_id && ch.is_private && ch.name.starts_with("dm-") {
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

    let sender_hex = who.to_hex().to_string();
    if !sess.participants.contains(&sender_hex) {
        return Err("Sender is not a participant of this call".to_string());
    }
    let to_hex = to.to_hex().to_string();
    if !sess.participants.contains(&to_hex) {
        return Err("Recipient is not a participant of this call".to_string());
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

    let sender_hex = who.to_hex().to_string();
    if !sess.participants.contains(&sender_hex) {
        return Err("Sender is not a participant of this call".to_string());
    }
    let to_hex = to.to_hex().to_string();
    if !sess.participants.contains(&to_hex) {
        return Err("Recipient is not a participant of this call".to_string());
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
// REDUCERS - TIME TRACKING
// ============================================================================

#[spacetimedb::reducer]
pub fn start_time_entry(
    ctx: &ReducerContext,
    org_id: u64,
    category_tag: String,
    description: String,
    task_id: Option<u64>,
    ticket_id: Option<u64>,
    billable: bool,
) -> Result<(), String> {
    let category = match category_tag.as_str() {
        "Development" => TimeEntryCategory::Development,
        "Meeting" => TimeEntryCategory::Meeting,
        "Support" => TimeEntryCategory::Support,
        "Sales" => TimeEntryCategory::Sales,
        "Recruitment" => TimeEntryCategory::Recruitment,
        "Documentation" => TimeEntryCategory::Documentation,
        "Review" => TimeEntryCategory::Review,
        "Planning" => TimeEntryCategory::Planning,
        "Break" => TimeEntryCategory::Break,
        "Other" => TimeEntryCategory::Other,
        _ => return Err("Invalid category".to_string()),
    };

    // Stop any running entries first
    let running: Vec<TimeEntry> = ctx.db.time_entry().iter()
        .filter(|e| e.user_id == ctx.sender() && e.ended_at.is_none())
        .collect();
    for entry in running {
        let duration = ctx.timestamp.to_duration_since_unix_epoch()
            .unwrap_or_default()
            .as_secs()
            .saturating_sub(
                entry.started_at.to_duration_since_unix_epoch()
                    .unwrap_or_default()
                    .as_secs()
            ) / 60;
        ctx.db.time_entry().id().update(TimeEntry {
            ended_at: Some(ctx.timestamp),
            duration_minutes: duration as u32,
            ..entry
        });
    }

    ctx.db.time_entry().insert(TimeEntry {
        id: 0,
        org_id,
        user_id: ctx.sender(),
        category,
        description,
        task_id,
        ticket_id,
        started_at: ctx.timestamp,
        ended_at: None,
        duration_minutes: 0,
        billable,
        created_at: ctx.timestamp,
    });

    Ok(())
}

#[spacetimedb::reducer]
pub fn stop_time_entry(ctx: &ReducerContext, entry_id: u64) -> Result<(), String> {
    let entry = ctx.db.time_entry().id().find(&entry_id)
        .ok_or("Time entry not found")?;
    if entry.user_id != ctx.sender() {
        return Err("Not your time entry".to_string());
    }
    if entry.ended_at.is_some() {
        return Err("Entry already stopped".to_string());
    }
    let duration = ctx.timestamp.to_duration_since_unix_epoch()
        .unwrap_or_default()
        .as_secs()
        .saturating_sub(
            entry.started_at.to_duration_since_unix_epoch()
                .unwrap_or_default()
                .as_secs()
        ) / 60;
    ctx.db.time_entry().id().update(TimeEntry {
        ended_at: Some(ctx.timestamp),
        duration_minutes: duration as u32,
        ..entry
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn log_time_entry(
    ctx: &ReducerContext,
    org_id: u64,
    category_tag: String,
    description: String,
    task_id: Option<u64>,
    ticket_id: Option<u64>,
    duration_minutes: u32,
    billable: bool,
) -> Result<(), String> {
    let category = match category_tag.as_str() {
        "Development" => TimeEntryCategory::Development,
        "Meeting" => TimeEntryCategory::Meeting,
        "Support" => TimeEntryCategory::Support,
        "Sales" => TimeEntryCategory::Sales,
        "Recruitment" => TimeEntryCategory::Recruitment,
        "Documentation" => TimeEntryCategory::Documentation,
        "Review" => TimeEntryCategory::Review,
        "Planning" => TimeEntryCategory::Planning,
        "Break" => TimeEntryCategory::Break,
        "Other" => TimeEntryCategory::Other,
        _ => return Err("Invalid category".to_string()),
    };

    ctx.db.time_entry().insert(TimeEntry {
        id: 0,
        org_id,
        user_id: ctx.sender(),
        category,
        description,
        task_id,
        ticket_id,
        started_at: ctx.timestamp,
        ended_at: Some(ctx.timestamp),
        duration_minutes,
        billable,
        created_at: ctx.timestamp,
    });

    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_time_entry(ctx: &ReducerContext, entry_id: u64) -> Result<(), String> {
    let entry = ctx.db.time_entry().id().find(&entry_id)
        .ok_or("Time entry not found")?;
    if entry.user_id != ctx.sender() {
        return Err("Not your time entry".to_string());
    }
    ctx.db.time_entry().id().delete(&entry_id);
    Ok(())
}

// ============================================================================
// REDUCERS - SPRINTS & EPICS
// ============================================================================

#[spacetimedb::reducer]
pub fn create_sprint(
    ctx: &ReducerContext,
    org_id: u64,
    name: String,
    goal: String,
    start_date: Option<Timestamp>,
    end_date: Option<Timestamp>,
) -> Result<(), String> {
    require_org_access(ctx, org_id)?;
    if name.trim().is_empty() {
        return Err("Sprint name cannot be empty".to_string());
    }

    ctx.db.sprint().insert(Sprint {
        id: 0,
        org_id,
        name: name.trim().to_string(),
        goal: goal.trim().to_string(),
        status: SprintStatus::Planning,
        start_date,
        end_date,
        created_at: ctx.timestamp,
    });

    Ok(())
}

#[spacetimedb::reducer]
pub fn update_sprint(
    ctx: &ReducerContext,
    sprint_id: u64,
    name: String,
    goal: String,
    status: SprintStatus,
    start_date: Option<Timestamp>,
    end_date: Option<Timestamp>,
) -> Result<(), String> {
    let sprint = ctx.db.sprint().id().find(&sprint_id)
        .ok_or("Sprint not found")?;
    require_org_access(ctx, sprint.org_id)?;

    ctx.db.sprint().id().update(Sprint {
        name: name.trim().to_string(),
        goal: goal.trim().to_string(),
        status,
        start_date,
        end_date,
        ..sprint
    });

    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_sprint(ctx: &ReducerContext, sprint_id: u64) -> Result<(), String> {
    let sprint = ctx.db.sprint().id().find(&sprint_id)
        .ok_or("Sprint not found")?;
    require_org_access(ctx, sprint.org_id)?;

    // Remove sprint references from task extensions
    for ext in ctx.db.task_extension().iter() {
        if ext.sprint_id == Some(sprint_id) {
            ctx.db.task_extension().task_id().update(TaskExtension {
                sprint_id: None,
                ..ext
            });
        }
    }

    ctx.db.sprint().id().delete(&sprint_id);
    Ok(())
}

#[spacetimedb::reducer]
pub fn create_epic(
    ctx: &ReducerContext,
    org_id: u64,
    name: String,
    description: String,
    color: String,
) -> Result<(), String> {
    require_org_access(ctx, org_id)?;
    if name.trim().is_empty() {
        return Err("Epic name cannot be empty".to_string());
    }

    ctx.db.epic().insert(Epic {
        id: 0,
        org_id,
        name: name.trim().to_string(),
        description: description.trim().to_string(),
        color: if color.is_empty() { "#8B5CF6".to_string() } else { color },
        status: EpicStatus::Active,
        created_at: ctx.timestamp,
    });

    Ok(())
}

#[spacetimedb::reducer]
pub fn update_epic(
    ctx: &ReducerContext,
    epic_id: u64,
    name: String,
    description: String,
    color: String,
    status: EpicStatus,
) -> Result<(), String> {
    let epic = ctx.db.epic().id().find(&epic_id)
        .ok_or("Epic not found")?;
    require_org_access(ctx, epic.org_id)?;

    ctx.db.epic().id().update(Epic {
        name: name.trim().to_string(),
        description: description.trim().to_string(),
        color,
        status,
        ..epic
    });

    Ok(())
}

#[spacetimedb::reducer]
pub fn set_task_extension(
    ctx: &ReducerContext,
    task_id: u64,
    sprint_id: Option<u64>,
    epic_id: Option<u64>,
    story_points: Option<u32>,
) -> Result<(), String> {
    // Verify the task exists
    let task = ctx.db.task().id().find(&task_id)
        .ok_or("Task not found")?;
    require_org_access(ctx, task.org_id)?;

    // Verify sprint exists if provided
    if let Some(sid) = sprint_id {
        ctx.db.sprint().id().find(&sid)
            .ok_or("Sprint not found")?;
    }
    // Verify epic exists if provided
    if let Some(eid) = epic_id {
        ctx.db.epic().id().find(&eid)
            .ok_or("Epic not found")?;
    }

    if let Some(existing) = ctx.db.task_extension().task_id().find(&task_id) {
        ctx.db.task_extension().task_id().update(TaskExtension {
            sprint_id,
            epic_id,
            story_points,
            ..existing
        });
    } else {
        ctx.db.task_extension().insert(TaskExtension {
            task_id,
            sprint_id,
            epic_id,
            story_points,
        });
    }

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

// ============================================================================
// REDUCERS - DOCUMENT VERSIONS
// ============================================================================

#[spacetimedb::reducer]
pub fn save_document_version(
    ctx: &ReducerContext,
    document_id: u64,
) -> Result<(), String> {
    let doc = ctx.db.document().id().find(&document_id)
        .ok_or("Document not found")?;
    require_org_access(ctx, doc.org_id)?;

    // Determine the next version number
    let max_version = ctx.db.document_version().iter()
        .filter(|v| v.document_id == document_id)
        .map(|v| v.version_number)
        .max()
        .unwrap_or(0);

    ctx.db.document_version().insert(DocumentVersion {
        id: 0,
        document_id,
        version_number: max_version + 1,
        title: doc.title.clone(),
        content: doc.content.clone(),
        created_by: ctx.sender(),
        created_at: ctx.timestamp,
    });

    Ok(())
}

#[spacetimedb::reducer]
pub fn restore_document_version(
    ctx: &ReducerContext,
    document_id: u64,
    version_id: u64,
) -> Result<(), String> {
    let doc = ctx.db.document().id().find(&document_id)
        .ok_or("Document not found")?;
    require_org_access(ctx, doc.org_id)?;

    let version = ctx.db.document_version().id().find(&version_id)
        .ok_or("Version not found")?;

    if version.document_id != document_id {
        return Err("Version doesn't belong to this document".to_string());
    }

    // Save current state as a version first
    let max_version = ctx.db.document_version().iter()
        .filter(|v| v.document_id == document_id)
        .map(|v| v.version_number)
        .max()
        .unwrap_or(0);

    ctx.db.document_version().insert(DocumentVersion {
        id: 0,
        document_id,
        version_number: max_version + 1,
        title: doc.title.clone(),
        content: doc.content.clone(),
        created_by: ctx.sender(),
        created_at: ctx.timestamp,
    });

    // Restore the version
    ctx.db.document().id().update(Document {
        title: version.title.clone(),
        content: version.content.clone(),
        last_edited_by: Some(ctx.sender()),
        updated_at: ctx.timestamp,
        ..doc
    });

    Ok(())
}

// ============================================================================
// REDUCERS - DOCUMENT FAVORITES
// ============================================================================

#[spacetimedb::reducer]
pub fn favorite_document(ctx: &ReducerContext, document_id: u64) -> Result<(), String> {
    let who = ctx.sender();
    let doc = ctx.db.document().id().find(&document_id).ok_or("Document not found")?;
    require_org_access(ctx, doc.org_id)?;
    let already = ctx.db.document_favorite().iter()
        .any(|f| f.user_id == who && f.document_id == document_id);
    if already {
        return Err("Already favorited".to_string());
    }
    ctx.db.document_favorite().insert(DocumentFavorite {
        id: 0, user_id: who, document_id, created_at: ctx.timestamp,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn unfavorite_document(ctx: &ReducerContext, document_id: u64) -> Result<(), String> {
    let who = ctx.sender();
    let fav = ctx.db.document_favorite().iter()
        .find(|f| f.user_id == who && f.document_id == document_id);
    match fav {
        Some(f) => { ctx.db.document_favorite().id().delete(&f.id); Ok(()) }
        None => Err("Not favorited".to_string()),
    }
}

#[spacetimedb::reducer]
pub fn duplicate_document(ctx: &ReducerContext, document_id: u64) -> Result<(), String> {
    let who = ctx.sender();
    let doc = ctx.db.document().id().find(&document_id).ok_or("Document not found")?;
    require_org_access(ctx, doc.org_id)?;
    let now = ctx.timestamp;
    ctx.db.document().insert(Document {
        id: 0,
        org_id: doc.org_id,
        title: format!("{} (Copy)", doc.title),
        content: doc.content,
        doc_type: doc.doc_type,
        parent_id: doc.parent_id,
        created_by: who,
        last_edited_by: Some(who),
        editors: vec![who.to_hex().to_string()],
        visibility: DocumentVisibility::Public,
        shared_with: vec![],
        ai_generated: false,
        ai_maintained: false,
        auto_sync_with: None,
        created_at: now,
        updated_at: now,
    });
    Ok(())
}

// ============================================================================
// REDUCERS - EMAIL METADATA
// ============================================================================

#[spacetimedb::reducer]
pub fn toggle_email_starred(ctx: &ReducerContext, message_id: u64) -> Result<(), String> {
    let who = ctx.sender();
    let existing = ctx.db.email_meta().iter()
        .find(|m| m.message_id == message_id && m.user_id == who);
    match existing {
        Some(meta) => {
            ctx.db.email_meta().id().update(EmailMeta { starred: !meta.starred, ..meta });
        }
        None => {
            ctx.db.email_meta().insert(EmailMeta {
                id: 0, message_id, user_id: who, starred: true,
                archived: false, trashed: false, read: false,
                label: None, snoozed_until: None,
            });
        }
    }
    Ok(())
}

#[spacetimedb::reducer]
pub fn mark_email_read(ctx: &ReducerContext, message_id: u64) -> Result<(), String> {
    let who = ctx.sender();
    let existing = ctx.db.email_meta().iter()
        .find(|m| m.message_id == message_id && m.user_id == who);
    match existing {
        Some(meta) => {
            if !meta.read {
                ctx.db.email_meta().id().update(EmailMeta { read: true, ..meta });
            }
        }
        None => {
            ctx.db.email_meta().insert(EmailMeta {
                id: 0, message_id, user_id: who, starred: false,
                archived: false, trashed: false, read: true,
                label: None, snoozed_until: None,
            });
        }
    }
    Ok(())
}

#[spacetimedb::reducer]
pub fn archive_email(ctx: &ReducerContext, message_id: u64) -> Result<(), String> {
    let who = ctx.sender();
    let existing = ctx.db.email_meta().iter()
        .find(|m| m.message_id == message_id && m.user_id == who);
    match existing {
        Some(meta) => {
            ctx.db.email_meta().id().update(EmailMeta { archived: !meta.archived, ..meta });
        }
        None => {
            ctx.db.email_meta().insert(EmailMeta {
                id: 0, message_id, user_id: who, starred: false,
                archived: true, trashed: false, read: false,
                label: None, snoozed_until: None,
            });
        }
    }
    Ok(())
}

#[spacetimedb::reducer]
pub fn trash_email(ctx: &ReducerContext, message_id: u64) -> Result<(), String> {
    let who = ctx.sender();
    let existing = ctx.db.email_meta().iter()
        .find(|m| m.message_id == message_id && m.user_id == who);
    match existing {
        Some(meta) => {
            ctx.db.email_meta().id().update(EmailMeta { trashed: !meta.trashed, ..meta });
        }
        None => {
            ctx.db.email_meta().insert(EmailMeta {
                id: 0, message_id, user_id: who, starred: false,
                archived: false, trashed: true, read: false,
                label: None, snoozed_until: None,
            });
        }
    }
    Ok(())
}

#[spacetimedb::reducer]
pub fn set_email_label(ctx: &ReducerContext, message_id: u64, label: String) -> Result<(), String> {
    let who = ctx.sender();
    let label_val = if label.is_empty() { None } else { Some(label) };
    let existing = ctx.db.email_meta().iter()
        .find(|m| m.message_id == message_id && m.user_id == who);
    match existing {
        Some(meta) => {
            ctx.db.email_meta().id().update(EmailMeta { label: label_val, ..meta });
        }
        None => {
            ctx.db.email_meta().insert(EmailMeta {
                id: 0, message_id, user_id: who, starred: false,
                archived: false, trashed: false, read: false,
                label: label_val, snoozed_until: None,
            });
        }
    }
    Ok(())
}

#[spacetimedb::reducer]
pub fn create_email_label(ctx: &ReducerContext, org_id: u64, name: String, color: String) -> Result<(), String> {
    if name.trim().is_empty() { return Err("Label name cannot be empty".to_string()); }
    ctx.db.email_label().insert(EmailLabel {
        id: 0, org_id, user_id: ctx.sender(), name, color,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_email_label(ctx: &ReducerContext, label_id: u64) -> Result<(), String> {
    let label = ctx.db.email_label().id().find(&label_id).ok_or("Label not found")?;
    if label.user_id != ctx.sender() { return Err("Not your label".to_string()); }
    ctx.db.email_label().id().delete(&label_id);
    Ok(())
}

// ============================================================================
// AI AGENT DEPLOYMENTS (deploy compat)
// ============================================================================

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum AgentDeploymentStatus {
    Draft,
    Deploying,
    Active,
    Paused,
    Failed,
}

#[spacetimedb::table(accessor = ai_agent_deployment, public)]
pub struct AiAgentDeployment {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub name: String,
    pub department: Department,
    pub role_description: String,
    pub system_prompt: String,
    pub model: String,
    pub capabilities: Vec<String>,
    pub self_verification_threshold: f32,
    pub max_task_duration_minutes: u32,
    pub status: AgentDeploymentStatus,
    pub tasks_completed: u64,
    pub avg_confidence: Option<f32>,
    pub created_by: Identity,
    pub created_at: Timestamp,
    pub last_active: Option<Timestamp>,
}

#[spacetimedb::reducer]
pub fn create_agent_deployment(
    ctx: &ReducerContext,
    org_id: u64,
    name: String,
    department: String,
    role_description: String,
    system_prompt: String,
    model: String,
    capabilities: Vec<String>,
    self_verification_threshold: f32,
    max_task_duration_minutes: u32,
) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("Agent name cannot be empty".to_string());
    }
    let dept = match department.as_str() {
        "Support" => Department::Support,
        "Sales" => Department::Sales,
        "Recruitment" => Department::Recruitment,
        "Engineering" => Department::Engineering,
        "Operations" => Department::Operations,
        "Marketing" => Department::Marketing,
        "Finance" => Department::Finance,
        _ => return Err(format!("Invalid department: {}", department)),
    };
    ctx.db.ai_agent_deployment().insert(AiAgentDeployment {
        id: 0, org_id, name, department: dept, role_description, system_prompt, model,
        capabilities, self_verification_threshold, max_task_duration_minutes,
        status: AgentDeploymentStatus::Draft, tasks_completed: 0, avg_confidence: None,
        created_by: ctx.sender(), created_at: ctx.timestamp, last_active: None,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn deploy_agent(ctx: &ReducerContext, agent_id: u64) -> Result<(), String> {
    let agent = ctx.db.ai_agent_deployment().id().find(&agent_id)
        .ok_or("Agent deployment not found")?;
    if agent.status == AgentDeploymentStatus::Active {
        return Err("Agent is already active".to_string());
    }
    ctx.db.ai_agent_deployment().id().update(AiAgentDeployment {
        status: AgentDeploymentStatus::Active,
        last_active: Some(ctx.timestamp),
        ..agent
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn pause_agent(ctx: &ReducerContext, agent_id: u64) -> Result<(), String> {
    let agent = ctx.db.ai_agent_deployment().id().find(&agent_id)
        .ok_or("Agent deployment not found")?;
    ctx.db.ai_agent_deployment().id().update(AiAgentDeployment {
        status: AgentDeploymentStatus::Paused,
        ..agent
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_agent_deployment(ctx: &ReducerContext, agent_id: u64) -> Result<(), String> {
    let agent = ctx.db.ai_agent_deployment().id().find(&agent_id)
        .ok_or("Agent deployment not found")?;
    if agent.status == AgentDeploymentStatus::Active {
        return Err("Cannot delete an active agent. Pause it first.".to_string());
    }
    ctx.db.ai_agent_deployment().id().delete(&agent_id);
    Ok(())
}

// ============================================================================
// NOTIFICATIONS (deploy compat)
// ============================================================================

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum NotificationType {
    TaskAssigned,
    TaskCompleted,
    MentionInMessage,
    TicketUpdate,
    PrReviewRequested,
    AgentCompleted,
    MeetingReminder,
    DocumentShared,
    SystemAlert,
}

#[derive(SpacetimeType, Debug, Clone, PartialEq, Eq)]
pub enum NotificationPriority {
    Low,
    Normal,
    High,
    Urgent,
}

#[spacetimedb::table(accessor = notification, public)]
pub struct Notification {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub recipient: Identity,
    pub notification_type: NotificationType,
    pub priority: NotificationPriority,
    pub title: String,
    pub body: String,
    pub link: Option<String>,
    pub read: bool,
    pub dismissed: bool,
    pub created_at: Timestamp,
}

#[spacetimedb::reducer]
pub fn create_notification(
    ctx: &ReducerContext,
    org_id: u64,
    recipient_hex: String,
    notification_type: String,
    priority: String,
    title: String,
    body: String,
    link: Option<String>,
) -> Result<(), String> {
    let recipient = Identity::from_hex(&recipient_hex)
        .map_err(|_| "Invalid recipient identity")?;
    let ntype = match notification_type.as_str() {
        "TaskAssigned" => NotificationType::TaskAssigned,
        "TaskCompleted" => NotificationType::TaskCompleted,
        "MentionInMessage" => NotificationType::MentionInMessage,
        "TicketUpdate" => NotificationType::TicketUpdate,
        "PrReviewRequested" => NotificationType::PrReviewRequested,
        "AgentCompleted" => NotificationType::AgentCompleted,
        "MeetingReminder" => NotificationType::MeetingReminder,
        "DocumentShared" => NotificationType::DocumentShared,
        "SystemAlert" => NotificationType::SystemAlert,
        _ => return Err(format!("Invalid notification type: {}", notification_type)),
    };
    let prio = match priority.as_str() {
        "Low" => NotificationPriority::Low,
        "Normal" => NotificationPriority::Normal,
        "High" => NotificationPriority::High,
        "Urgent" => NotificationPriority::Urgent,
        _ => NotificationPriority::Normal,
    };
    ctx.db.notification().insert(Notification {
        id: 0, org_id, recipient, notification_type: ntype, priority: prio,
        title, body, link, read: false, dismissed: false, created_at: ctx.timestamp,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn mark_notification_read(ctx: &ReducerContext, notification_id: u64) -> Result<(), String> {
    let notif = ctx.db.notification().id().find(&notification_id)
        .ok_or("Notification not found")?;
    if notif.recipient != ctx.sender() {
        return Err("Not your notification".to_string());
    }
    ctx.db.notification().id().update(Notification { read: true, ..notif });
    Ok(())
}

#[spacetimedb::reducer]
pub fn mark_all_notifications_read(ctx: &ReducerContext, org_id: u64) -> Result<(), String> {
    let my_notifs: Vec<_> = ctx.db.notification().iter()
        .filter(|n| n.recipient == ctx.sender() && n.org_id == org_id && !n.read)
        .collect();
    for n in my_notifs {
        ctx.db.notification().id().update(Notification { read: true, ..n });
    }
    Ok(())
}

#[spacetimedb::reducer]
pub fn dismiss_notification(ctx: &ReducerContext, notification_id: u64) -> Result<(), String> {
    let notif = ctx.db.notification().id().find(&notification_id)
        .ok_or("Notification not found")?;
    if notif.recipient != ctx.sender() {
        return Err("Not your notification".to_string());
    }
    ctx.db.notification().id().update(Notification { dismissed: true, read: true, ..notif });
    Ok(())
}

// === GOALS & OKRs ===========================================================

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum ObjectiveStatus {
    OnTrack,
    AtRisk,
    Behind,
    Completed,
}

#[spacetimedb::table(accessor = objective, public)]
#[derive(Clone)]
pub struct Objective {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub title: String,
    pub description: String,
    pub quarter: String,
    pub status: ObjectiveStatus,
    pub owner: Identity,
    pub department: String,
    pub created_at: Timestamp,
}

#[spacetimedb::table(accessor = key_result, public)]
#[derive(Clone)]
pub struct KeyResult {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub objective_id: u64,
    pub title: String,
    pub target_value: u32,
    pub current_value: u32,
    pub unit: String,
    pub owner: Identity,
}

#[spacetimedb::reducer]
pub fn create_objective(
    ctx: &ReducerContext,
    org_id: u64,
    title: String,
    description: String,
    quarter: String,
    department: String,
) -> Result<(), String> {
    if title.trim().is_empty() {
        return Err("Title cannot be empty".to_string());
    }
    ctx.db.objective().insert(Objective {
        id: 0,
        org_id,
        title,
        description,
        quarter,
        status: ObjectiveStatus::OnTrack,
        owner: ctx.sender(),
        department,
        created_at: ctx.timestamp,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn update_objective_status(
    ctx: &ReducerContext,
    objective_id: u64,
    status_tag: String,
) -> Result<(), String> {
    let obj = ctx.db.objective().id().find(&objective_id)
        .ok_or("Objective not found")?;
    let status = match status_tag.as_str() {
        "OnTrack" => ObjectiveStatus::OnTrack,
        "AtRisk" => ObjectiveStatus::AtRisk,
        "Behind" => ObjectiveStatus::Behind,
        "Completed" => ObjectiveStatus::Completed,
        _ => return Err(format!("Invalid status: {}", status_tag)),
    };
    ctx.db.objective().id().update(Objective { status, ..obj });
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_objective(ctx: &ReducerContext, objective_id: u64) -> Result<(), String> {
    // Delete all key results first
    let krs: Vec<_> = ctx.db.key_result().iter()
        .filter(|kr| kr.objective_id == objective_id)
        .collect();
    for kr in krs {
        ctx.db.key_result().id().delete(&kr.id);
    }
    ctx.db.objective().id().delete(&objective_id);
    Ok(())
}

#[spacetimedb::reducer]
pub fn create_key_result(
    ctx: &ReducerContext,
    objective_id: u64,
    title: String,
    target_value: u32,
    unit: String,
) -> Result<(), String> {
    let _obj = ctx.db.objective().id().find(&objective_id)
        .ok_or("Objective not found")?;
    if title.trim().is_empty() {
        return Err("Key result title cannot be empty".to_string());
    }
    ctx.db.key_result().insert(KeyResult {
        id: 0,
        objective_id,
        title,
        target_value,
        current_value: 0,
        unit,
        owner: ctx.sender(),
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn update_kr_progress(
    ctx: &ReducerContext,
    kr_id: u64,
    current_value: u32,
) -> Result<(), String> {
    let kr = ctx.db.key_result().id().find(&kr_id)
        .ok_or("Key result not found")?;
    ctx.db.key_result().id().update(KeyResult { current_value, ..kr });
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_key_result(ctx: &ReducerContext, kr_id: u64) -> Result<(), String> {
    ctx.db.key_result().id().delete(&kr_id);
    Ok(())
}

// === KNOWLEDGE BASE ==========================================================

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum ArticleCategory {
    Engineering,
    Product,
    Design,
    Hr,
    Operations,
    Onboarding,
    Security,
    General,
}

#[spacetimedb::table(accessor = kb_article, public)]
#[derive(Clone)]
pub struct KbArticle {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub title: String,
    pub content: String,
    pub category: ArticleCategory,
    pub author: Identity,
    pub tags: String, // comma-separated
    pub pinned: bool,
    pub views: u32,
    pub helpful: u32,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

#[spacetimedb::reducer]
pub fn create_kb_article(
    ctx: &ReducerContext,
    org_id: u64,
    title: String,
    content: String,
    category_tag: String,
    tags: String,
) -> Result<(), String> {
    if title.trim().is_empty() {
        return Err("Title cannot be empty".to_string());
    }
    let category = match category_tag.as_str() {
        "Engineering" => ArticleCategory::Engineering,
        "Product" => ArticleCategory::Product,
        "Design" => ArticleCategory::Design,
        "Hr" => ArticleCategory::Hr,
        "Operations" => ArticleCategory::Operations,
        "Onboarding" => ArticleCategory::Onboarding,
        "Security" => ArticleCategory::Security,
        "General" => ArticleCategory::General,
        _ => ArticleCategory::General,
    };
    ctx.db.kb_article().insert(KbArticle {
        id: 0,
        org_id,
        title,
        content,
        category,
        author: ctx.sender(),
        tags,
        pinned: false,
        views: 0,
        helpful: 0,
        created_at: ctx.timestamp,
        updated_at: ctx.timestamp,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn update_kb_article(
    ctx: &ReducerContext,
    article_id: u64,
    title: String,
    content: String,
    category_tag: String,
    tags: String,
) -> Result<(), String> {
    let article = ctx.db.kb_article().id().find(&article_id)
        .ok_or("Article not found")?;
    let category = match category_tag.as_str() {
        "Engineering" => ArticleCategory::Engineering,
        "Product" => ArticleCategory::Product,
        "Design" => ArticleCategory::Design,
        "Hr" => ArticleCategory::Hr,
        "Operations" => ArticleCategory::Operations,
        "Onboarding" => ArticleCategory::Onboarding,
        "Security" => ArticleCategory::Security,
        _ => ArticleCategory::General,
    };
    ctx.db.kb_article().id().update(KbArticle {
        title,
        content,
        category,
        tags,
        updated_at: ctx.timestamp,
        ..article
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_kb_article(ctx: &ReducerContext, article_id: u64) -> Result<(), String> {
    ctx.db.kb_article().id().delete(&article_id);
    Ok(())
}

#[spacetimedb::reducer]
pub fn toggle_kb_article_pin(ctx: &ReducerContext, article_id: u64) -> Result<(), String> {
    let article = ctx.db.kb_article().id().find(&article_id)
        .ok_or("Article not found")?;
    ctx.db.kb_article().id().update(KbArticle { pinned: !article.pinned, ..article });
    Ok(())
}

#[spacetimedb::reducer]
pub fn mark_kb_article_helpful(ctx: &ReducerContext, article_id: u64) -> Result<(), String> {
    let article = ctx.db.kb_article().id().find(&article_id)
        .ok_or("Article not found")?;
    ctx.db.kb_article().id().update(KbArticle { helpful: article.helpful + 1, ..article });
    Ok(())
}

#[spacetimedb::reducer]
pub fn increment_kb_article_views(ctx: &ReducerContext, article_id: u64) -> Result<(), String> {
    let article = ctx.db.kb_article().id().find(&article_id)
        .ok_or("Article not found")?;
    ctx.db.kb_article().id().update(KbArticle { views: article.views + 1, ..article });
    Ok(())
}

// ============================================================================
// Forms & Surveys
// ============================================================================

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum FormStatus {
    Draft,
    Active,
    Closed,
}

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum QuestionType {
    Text,
    MultipleChoice,
    Checkbox,
    Rating,
    Scale,
    Dropdown,
    Date,
}

#[spacetimedb::table(accessor = form_def, public)]
#[derive(Clone)]
pub struct FormDef {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub title: String,
    pub description: String,
    pub status: FormStatus,
    pub anonymous: bool,
    pub creator: Identity,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

#[spacetimedb::table(accessor = form_question, public)]
#[derive(Clone)]
pub struct FormQuestion {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub form_id: u64,
    pub question_type: QuestionType,
    pub label: String,
    pub required: bool,
    /// Comma-separated options for MultipleChoice, Checkbox, Dropdown
    pub options: String,
    /// Max rating stars for Rating type
    pub max_rating: u32,
    /// Sort position within the form
    pub sort_order: u32,
}

#[spacetimedb::table(accessor = form_response, public)]
#[derive(Clone)]
pub struct FormResponse {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub form_id: u64,
    pub respondent: Identity,
    pub submitted_at: Timestamp,
}

#[spacetimedb::table(accessor = form_answer, public)]
#[derive(Clone)]
pub struct FormAnswer {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub response_id: u64,
    pub question_id: u64,
    pub value: String,
}

// ---- Form reducers ----------------------------------------------------------

#[spacetimedb::reducer]
pub fn create_form(ctx: &ReducerContext, org_id: u64, title: String, description: String, anonymous: bool) -> Result<(), String> {
    if title.trim().is_empty() {
        return Err("Form title cannot be empty".to_string());
    }
    ctx.db.form_def().insert(FormDef {
        id: 0,
        org_id,
        title,
        description,
        status: FormStatus::Draft,
        anonymous,
        creator: ctx.sender(),
        created_at: ctx.timestamp,
        updated_at: ctx.timestamp,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn update_form(ctx: &ReducerContext, form_id: u64, title: String, description: String, anonymous: bool) -> Result<(), String> {
    let form = ctx.db.form_def().id().find(&form_id)
        .ok_or("Form not found")?;
    ctx.db.form_def().id().update(FormDef {
        title,
        description,
        anonymous,
        updated_at: ctx.timestamp,
        ..form
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn update_form_status(ctx: &ReducerContext, form_id: u64, status_tag: String) -> Result<(), String> {
    let form = ctx.db.form_def().id().find(&form_id)
        .ok_or("Form not found")?;
    let status = match status_tag.as_str() {
        "Draft" => FormStatus::Draft,
        "Active" => FormStatus::Active,
        "Closed" => FormStatus::Closed,
        _ => return Err("Invalid status".to_string()),
    };
    ctx.db.form_def().id().update(FormDef {
        status,
        updated_at: ctx.timestamp,
        ..form
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_form(ctx: &ReducerContext, form_id: u64) -> Result<(), String> {
    // Cascade: delete answers for all responses, then responses, then questions, then form
    let responses: Vec<FormResponse> = ctx.db.form_response().iter()
        .filter(|r| r.form_id == form_id).collect();
    for resp in &responses {
        let answers: Vec<FormAnswer> = ctx.db.form_answer().iter()
            .filter(|a| a.response_id == resp.id).collect();
        for ans in answers {
            ctx.db.form_answer().id().delete(&ans.id);
        }
        ctx.db.form_response().id().delete(&resp.id);
    }
    let questions: Vec<FormQuestion> = ctx.db.form_question().iter()
        .filter(|q| q.form_id == form_id).collect();
    for q in questions {
        ctx.db.form_question().id().delete(&q.id);
    }
    ctx.db.form_def().id().delete(&form_id);
    Ok(())
}

#[spacetimedb::reducer]
pub fn duplicate_form(ctx: &ReducerContext, form_id: u64) -> Result<(), String> {
    let form = ctx.db.form_def().id().find(&form_id)
        .ok_or("Form not found")?;
    let new_form = ctx.db.form_def().insert(FormDef {
        id: 0,
        title: format!("{} (Copy)", form.title),
        description: form.description.clone(),
        status: FormStatus::Draft,
        anonymous: form.anonymous,
        creator: ctx.sender(),
        created_at: ctx.timestamp,
        updated_at: ctx.timestamp,
        ..form
    });
    // Copy questions
    let questions: Vec<FormQuestion> = ctx.db.form_question().iter()
        .filter(|q| q.form_id == form_id).collect();
    for q in questions {
        ctx.db.form_question().insert(FormQuestion {
            id: 0,
            form_id: new_form.id,
            question_type: q.question_type,
            label: q.label,
            required: q.required,
            options: q.options,
            max_rating: q.max_rating,
            sort_order: q.sort_order,
        });
    }
    Ok(())
}

// ---- Question reducers ------------------------------------------------------

#[spacetimedb::reducer]
pub fn add_form_question(
    ctx: &ReducerContext,
    form_id: u64,
    question_type_tag: String,
    label: String,
    required: bool,
    options: String,
    max_rating: u32,
    sort_order: u32,
) -> Result<(), String> {
    let _form = ctx.db.form_def().id().find(&form_id)
        .ok_or("Form not found")?;
    let question_type = match question_type_tag.as_str() {
        "Text" => QuestionType::Text,
        "MultipleChoice" => QuestionType::MultipleChoice,
        "Checkbox" => QuestionType::Checkbox,
        "Rating" => QuestionType::Rating,
        "Scale" => QuestionType::Scale,
        "Dropdown" => QuestionType::Dropdown,
        "Date" => QuestionType::Date,
        _ => return Err("Invalid question type".to_string()),
    };
    ctx.db.form_question().insert(FormQuestion {
        id: 0,
        form_id,
        question_type,
        label,
        required,
        options,
        max_rating,
        sort_order,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn update_form_question(
    ctx: &ReducerContext,
    question_id: u64,
    label: String,
    required: bool,
    options: String,
    max_rating: u32,
) -> Result<(), String> {
    let q = ctx.db.form_question().id().find(&question_id)
        .ok_or("Question not found")?;
    ctx.db.form_question().id().update(FormQuestion {
        label,
        required,
        options,
        max_rating,
        ..q
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn remove_form_question(ctx: &ReducerContext, question_id: u64) -> Result<(), String> {
    // Also delete any answers referencing this question
    let answers: Vec<FormAnswer> = ctx.db.form_answer().iter()
        .filter(|a| a.question_id == question_id).collect();
    for ans in answers {
        ctx.db.form_answer().id().delete(&ans.id);
    }
    ctx.db.form_question().id().delete(&question_id);
    Ok(())
}

// ---- Response reducers ------------------------------------------------------

#[spacetimedb::reducer]
pub fn submit_form_response(
    ctx: &ReducerContext,
    form_id: u64,
    // Format: "qid:value\nqid:value\n..."
    answers_json: String,
) -> Result<(), String> {
    let form = ctx.db.form_def().id().find(&form_id)
        .ok_or("Form not found")?;
    if form.status != FormStatus::Active {
        return Err("Form is not accepting responses".to_string());
    }
    let response = ctx.db.form_response().insert(FormResponse {
        id: 0,
        form_id,
        respondent: ctx.sender(),
        submitted_at: ctx.timestamp,
    });
    // Parse answers - simple format: "qid:value\nqid:value\n..."
    for line in answers_json.lines() {
        if let Some((qid_str, value)) = line.split_once(':') {
            if let Ok(qid) = qid_str.trim().parse::<u64>() {
                ctx.db.form_answer().insert(FormAnswer {
                    id: 0,
                    response_id: response.id,
                    question_id: qid,
                    value: value.to_string(),
                });
            }
        }
    }
    Ok(())
}

// ============================================================================
// Calendar Events
// ============================================================================

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum EventCategory {
    Meeting,
    Deadline,
    Interview,
    Standup,
    Review,
    Personal,
    Other,
}

#[spacetimedb::table(accessor = cal_event, public)]
#[derive(Clone)]
pub struct CalEvent {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub title: String,
    pub description: String,
    pub start_time: Timestamp,
    pub end_time: Timestamp,
    pub all_day: bool,
    pub category: EventCategory,
    pub location: String,
    pub is_virtual: bool,
    pub creator: Identity,
    pub created_at: Timestamp,
}

#[spacetimedb::reducer]
pub fn create_cal_event(
    ctx: &ReducerContext,
    org_id: u64,
    title: String,
    description: String,
    start_time: Timestamp,
    end_time: Timestamp,
    all_day: bool,
    category_tag: String,
    location: String,
    is_virtual: bool,
) -> Result<(), String> {
    if title.trim().is_empty() {
        return Err("Event title cannot be empty".to_string());
    }
    let category = match category_tag.as_str() {
        "Meeting" => EventCategory::Meeting,
        "Deadline" => EventCategory::Deadline,
        "Interview" => EventCategory::Interview,
        "Standup" => EventCategory::Standup,
        "Review" => EventCategory::Review,
        "Personal" => EventCategory::Personal,
        "Other" => EventCategory::Other,
        _ => return Err("Invalid event category".to_string()),
    };
    ctx.db.cal_event().insert(CalEvent {
        id: 0,
        org_id,
        title,
        description,
        start_time,
        end_time,
        all_day,
        category,
        location,
        is_virtual,
        creator: ctx.sender(),
        created_at: ctx.timestamp,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn update_cal_event(
    ctx: &ReducerContext,
    event_id: u64,
    title: String,
    description: String,
    start_time: Timestamp,
    end_time: Timestamp,
    all_day: bool,
    category_tag: String,
    location: String,
    is_virtual: bool,
) -> Result<(), String> {
    let event = ctx.db.cal_event().id().find(&event_id)
        .ok_or("Event not found")?;
    let category = match category_tag.as_str() {
        "Meeting" => EventCategory::Meeting,
        "Deadline" => EventCategory::Deadline,
        "Interview" => EventCategory::Interview,
        "Standup" => EventCategory::Standup,
        "Review" => EventCategory::Review,
        "Personal" => EventCategory::Personal,
        "Other" => EventCategory::Other,
        _ => return Err("Invalid event category".to_string()),
    };
    ctx.db.cal_event().id().update(CalEvent {
        title,
        description,
        start_time,
        end_time,
        all_day,
        category,
        location,
        is_virtual,
        ..event
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_cal_event(ctx: &ReducerContext, event_id: u64) -> Result<(), String> {
    ctx.db.cal_event().id().delete(&event_id);
    Ok(())
}

// ============================================================================
// Expenses
// ============================================================================

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum ExpenseCategory {
    Travel,
    Meals,
    Software,
    Office,
    Equipment,
    Training,
    Other,
}

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum ExpenseStatus {
    Pending,
    Approved,
    Rejected,
    Reimbursed,
}

#[spacetimedb::table(accessor = expense, public)]
#[derive(Clone)]
pub struct Expense {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub description: String,
    pub amount_cents: u64,
    pub category: ExpenseCategory,
    pub status: ExpenseStatus,
    pub expense_date: Timestamp,
    pub has_receipt: bool,
    pub submitter: Identity,
    pub notes: String,
    pub created_at: Timestamp,
}

#[spacetimedb::reducer]
pub fn create_expense(
    ctx: &ReducerContext,
    org_id: u64,
    description: String,
    amount_cents: u64,
    category_tag: String,
    expense_date: Timestamp,
    has_receipt: bool,
    notes: String,
) -> Result<(), String> {
    if description.trim().is_empty() {
        return Err("Description cannot be empty".to_string());
    }
    let category = match category_tag.as_str() {
        "Travel" => ExpenseCategory::Travel,
        "Meals" => ExpenseCategory::Meals,
        "Software" => ExpenseCategory::Software,
        "Office" => ExpenseCategory::Office,
        "Equipment" => ExpenseCategory::Equipment,
        "Training" => ExpenseCategory::Training,
        "Other" => ExpenseCategory::Other,
        _ => return Err("Invalid expense category".to_string()),
    };
    ctx.db.expense().insert(Expense {
        id: 0,
        org_id,
        description,
        amount_cents,
        category,
        status: ExpenseStatus::Pending,
        expense_date,
        has_receipt,
        submitter: ctx.sender(),
        notes,
        created_at: ctx.timestamp,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn update_expense_status(ctx: &ReducerContext, expense_id: u64, status_tag: String) -> Result<(), String> {
    let expense = ctx.db.expense().id().find(&expense_id)
        .ok_or("Expense not found")?;
    let status = match status_tag.as_str() {
        "Pending" => ExpenseStatus::Pending,
        "Approved" => ExpenseStatus::Approved,
        "Rejected" => ExpenseStatus::Rejected,
        "Reimbursed" => ExpenseStatus::Reimbursed,
        _ => return Err("Invalid status".to_string()),
    };
    ctx.db.expense().id().update(Expense { status, ..expense });
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_expense(ctx: &ReducerContext, expense_id: u64) -> Result<(), String> {
    ctx.db.expense().id().delete(&expense_id);
    Ok(())
}

// ============================================================================
// Standups
// ============================================================================

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum StandupMood {
    Great,
    Good,
    Okay,
    Struggling,
}

#[spacetimedb::table(accessor = standup_entry, public)]
#[derive(Clone)]
pub struct StandupEntry {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub author: Identity,
    pub yesterday: String,
    pub today: String,
    pub blockers: String,
    pub mood: StandupMood,
    pub created_at: Timestamp,
}

#[spacetimedb::reducer]
pub fn submit_standup(
    ctx: &ReducerContext,
    org_id: u64,
    yesterday: String,
    today: String,
    blockers: String,
    mood_tag: String,
) -> Result<(), String> {
    if yesterday.trim().is_empty() && today.trim().is_empty() {
        return Err("Standup must have at least yesterday or today content".to_string());
    }
    let mood = match mood_tag.as_str() {
        "Great" => StandupMood::Great,
        "Good" => StandupMood::Good,
        "Okay" => StandupMood::Okay,
        "Struggling" => StandupMood::Struggling,
        _ => return Err("Invalid mood".to_string()),
    };
    ctx.db.standup_entry().insert(StandupEntry {
        id: 0,
        org_id,
        author: ctx.sender(),
        yesterday,
        today,
        blockers,
        mood,
        created_at: ctx.timestamp,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_standup(ctx: &ReducerContext, standup_id: u64) -> Result<(), String> {
    ctx.db.standup_entry().id().delete(&standup_id);
    Ok(())
}

// ── Approvals ────────────────────────────────────────────────────────────────

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum ApprovalType {
    Expense,
    TimeOff,
    Document,
    Purchase,
    Access,
    Other,
}

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum ApprovalStatus {
    Pending,
    Approved,
    Rejected,
    Cancelled,
}

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum ApprovalPriority {
    Low,
    Medium,
    High,
    Urgent,
}

#[spacetimedb::table(accessor = approval_request, public)]
#[derive(Clone)]
pub struct ApprovalRequest {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub title: String,
    pub description: String,
    pub approval_type: ApprovalType,
    pub status: ApprovalStatus,
    pub requester: Identity,
    pub approver: Identity,
    pub amount_cents: u64,
    pub priority: ApprovalPriority,
    pub decision_note: String,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

#[spacetimedb::table(accessor = approval_comment, public)]
#[derive(Clone)]
pub struct ApprovalComment {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub request_id: u64,
    pub author: Identity,
    pub text: String,
    pub created_at: Timestamp,
}

#[spacetimedb::reducer]
pub fn create_approval_request(
    ctx: &ReducerContext,
    org_id: u64,
    title: String,
    description: String,
    type_tag: String,
    priority_tag: String,
    approver_hex: String,
    amount_cents: u64,
) -> Result<(), String> {
    if title.trim().is_empty() {
        return Err("Title is required".to_string());
    }
    let approval_type = match type_tag.as_str() {
        "Expense" => ApprovalType::Expense,
        "TimeOff" => ApprovalType::TimeOff,
        "Document" => ApprovalType::Document,
        "Purchase" => ApprovalType::Purchase,
        "Access" => ApprovalType::Access,
        "Other" => ApprovalType::Other,
        _ => return Err("Invalid approval type".to_string()),
    };
    let priority = match priority_tag.as_str() {
        "Low" => ApprovalPriority::Low,
        "Medium" => ApprovalPriority::Medium,
        "High" => ApprovalPriority::High,
        "Urgent" => ApprovalPriority::Urgent,
        _ => return Err("Invalid priority".to_string()),
    };
    // Parse approver identity from hex string — if empty, use sender as placeholder
    let approver = if approver_hex.is_empty() {
        ctx.sender()
    } else {
        Identity::from_hex(&approver_hex).map_err(|e| format!("Invalid approver identity: {}", e))?
    };
    ctx.db.approval_request().insert(ApprovalRequest {
        id: 0,
        org_id,
        title,
        description,
        approval_type,
        status: ApprovalStatus::Pending,
        requester: ctx.sender(),
        approver,
        amount_cents,
        priority,
        decision_note: String::new(),
        created_at: ctx.timestamp,
        updated_at: ctx.timestamp,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn approve_request(
    ctx: &ReducerContext,
    request_id: u64,
    note: String,
) -> Result<(), String> {
    let req = ctx.db.approval_request().id().find(request_id)
        .ok_or("Request not found")?;
    ctx.db.approval_request().id().update(ApprovalRequest {
        status: ApprovalStatus::Approved,
        decision_note: note,
        updated_at: ctx.timestamp,
        ..req
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn reject_request(
    ctx: &ReducerContext,
    request_id: u64,
    note: String,
) -> Result<(), String> {
    let req = ctx.db.approval_request().id().find(request_id)
        .ok_or("Request not found")?;
    ctx.db.approval_request().id().update(ApprovalRequest {
        status: ApprovalStatus::Rejected,
        decision_note: note,
        updated_at: ctx.timestamp,
        ..req
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn cancel_request(
    ctx: &ReducerContext,
    request_id: u64,
) -> Result<(), String> {
    let req = ctx.db.approval_request().id().find(request_id)
        .ok_or("Request not found")?;
    if req.requester != ctx.sender() {
        return Err("Only the requester can cancel".to_string());
    }
    ctx.db.approval_request().id().update(ApprovalRequest {
        status: ApprovalStatus::Cancelled,
        updated_at: ctx.timestamp,
        ..req
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_approval_request(
    ctx: &ReducerContext,
    request_id: u64,
) -> Result<(), String> {
    // Delete comments first
    let comments: Vec<_> = ctx.db.approval_comment().iter()
        .filter(|c| c.request_id == request_id)
        .collect();
    for c in comments {
        ctx.db.approval_comment().id().delete(&c.id);
    }
    ctx.db.approval_request().id().delete(&request_id);
    Ok(())
}

#[spacetimedb::reducer]
pub fn add_approval_comment(
    ctx: &ReducerContext,
    request_id: u64,
    text: String,
) -> Result<(), String> {
    if text.trim().is_empty() {
        return Err("Comment cannot be empty".to_string());
    }
    // Verify the request exists
    ctx.db.approval_request().id().find(request_id)
        .ok_or("Request not found")?;
    ctx.db.approval_comment().insert(ApprovalComment {
        id: 0,
        request_id,
        author: ctx.sender(),
        text,
        created_at: ctx.timestamp,
    });
    Ok(())
}

// ── Invoicing ────────────────────────────────────────────────────────────────

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum InvoiceStatus {
    Draft,
    Sent,
    Paid,
    Overdue,
    Cancelled,
}

#[spacetimedb::table(accessor = invoice, public)]
#[derive(Clone)]
pub struct Invoice {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub invoice_number: String,
    pub client_name: String,
    pub client_email: String,
    pub status: InvoiceStatus,
    pub tax_rate: String,
    pub notes: String,
    pub creator: Identity,
    pub issued_at: Timestamp,
    pub due_date: Timestamp,
    pub paid_at: Timestamp,
}

#[spacetimedb::table(accessor = invoice_line_item, public)]
#[derive(Clone)]
pub struct InvoiceLineItem {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub invoice_id: u64,
    pub description: String,
    pub quantity: u32,
    pub unit_price_cents: u64,
    pub sort_order: u32,
}

#[spacetimedb::reducer]
pub fn create_invoice(
    ctx: &ReducerContext,
    org_id: u64,
    client_name: String,
    client_email: String,
    tax_rate: String,
    notes: String,
    due_date: Timestamp,
    // Format: "description|quantity|priceCents\n..."
    line_items_data: String,
) -> Result<(), String> {
    if client_name.trim().is_empty() {
        return Err("Client name is required".to_string());
    }
    // Generate invoice number from count
    let count = ctx.db.invoice().iter()
        .filter(|i| i.org_id == org_id)
        .count();
    let invoice_number = format!("INV-{:03}", count + 1);

    let row = ctx.db.invoice().insert(Invoice {
        id: 0,
        org_id,
        invoice_number,
        client_name,
        client_email,
        status: InvoiceStatus::Draft,
        tax_rate,
        notes,
        creator: ctx.sender(),
        issued_at: ctx.timestamp,
        due_date,
        paid_at: Timestamp::UNIX_EPOCH,
    });

    // Parse and insert line items
    for (idx, line) in line_items_data.lines().enumerate() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 3 {
            let desc = parts[0].to_string();
            let qty: u32 = parts[1].parse().unwrap_or(1);
            let price: u64 = parts[2].parse().unwrap_or(0);
            if !desc.trim().is_empty() {
                ctx.db.invoice_line_item().insert(InvoiceLineItem {
                    id: 0,
                    invoice_id: row.id,
                    description: desc,
                    quantity: qty,
                    unit_price_cents: price,
                    sort_order: idx as u32,
                });
            }
        }
    }
    Ok(())
}

#[spacetimedb::reducer]
pub fn update_invoice_status(
    ctx: &ReducerContext,
    invoice_id: u64,
    status_tag: String,
) -> Result<(), String> {
    let inv = ctx.db.invoice().id().find(invoice_id)
        .ok_or("Invoice not found")?;
    let status = match status_tag.as_str() {
        "Draft" => InvoiceStatus::Draft,
        "Sent" => InvoiceStatus::Sent,
        "Paid" => InvoiceStatus::Paid,
        "Overdue" => InvoiceStatus::Overdue,
        "Cancelled" => InvoiceStatus::Cancelled,
        _ => return Err("Invalid status".to_string()),
    };
    let paid_at = if status == InvoiceStatus::Paid { ctx.timestamp } else { inv.paid_at };
    ctx.db.invoice().id().update(Invoice {
        status,
        paid_at,
        ..inv
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn add_invoice_line_item(
    ctx: &ReducerContext,
    invoice_id: u64,
    description: String,
    quantity: u32,
    unit_price_cents: u64,
) -> Result<(), String> {
    ctx.db.invoice().id().find(invoice_id)
        .ok_or("Invoice not found")?;
    let max_order = ctx.db.invoice_line_item().iter()
        .filter(|li| li.invoice_id == invoice_id)
        .map(|li| li.sort_order)
        .max()
        .unwrap_or(0);
    ctx.db.invoice_line_item().insert(InvoiceLineItem {
        id: 0,
        invoice_id,
        description,
        quantity,
        unit_price_cents,
        sort_order: max_order + 1,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn remove_invoice_line_item(
    ctx: &ReducerContext,
    line_item_id: u64,
) -> Result<(), String> {
    ctx.db.invoice_line_item().id().delete(&line_item_id);
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_invoice(
    ctx: &ReducerContext,
    invoice_id: u64,
) -> Result<(), String> {
    let items: Vec<_> = ctx.db.invoice_line_item().iter()
        .filter(|li| li.invoice_id == invoice_id)
        .collect();
    for item in items {
        ctx.db.invoice_line_item().id().delete(&item.id);
    }
    ctx.db.invoice().id().delete(&invoice_id);
    Ok(())
}

// ── Contacts ─────────────────────────────────────────────────────────────────

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum ContactType {
    Customer,
    Vendor,
    Partner,
    Lead,
    Personal,
}

#[spacetimedb::table(accessor = contact, public)]
#[derive(Clone)]
pub struct Contact {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub company: String,
    pub contact_type: ContactType,
    pub title: String,
    pub tags: String,
    pub notes: String,
    pub starred: bool,
    pub last_contacted: Timestamp,
    pub created_at: Timestamp,
    pub creator: Identity,
}

#[spacetimedb::reducer]
pub fn create_contact(
    ctx: &ReducerContext,
    org_id: u64,
    name: String,
    email: String,
    phone: String,
    company: String,
    type_tag: String,
    title: String,
    tags: String,
    notes: String,
) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("Name is required".to_string());
    }
    let contact_type = match type_tag.as_str() {
        "Customer" => ContactType::Customer,
        "Vendor" => ContactType::Vendor,
        "Partner" => ContactType::Partner,
        "Lead" => ContactType::Lead,
        "Personal" => ContactType::Personal,
        _ => return Err("Invalid contact type".to_string()),
    };
    ctx.db.contact().insert(Contact {
        id: 0,
        org_id,
        name,
        email,
        phone,
        company,
        contact_type,
        title,
        tags,
        notes,
        starred: false,
        last_contacted: Timestamp::UNIX_EPOCH,
        created_at: ctx.timestamp,
        creator: ctx.sender(),
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn update_contact(
    ctx: &ReducerContext,
    contact_id: u64,
    name: String,
    email: String,
    phone: String,
    company: String,
    type_tag: String,
    title: String,
    tags: String,
    notes: String,
) -> Result<(), String> {
    let existing = ctx.db.contact().id().find(contact_id)
        .ok_or("Contact not found")?;
    let contact_type = match type_tag.as_str() {
        "Customer" => ContactType::Customer,
        "Vendor" => ContactType::Vendor,
        "Partner" => ContactType::Partner,
        "Lead" => ContactType::Lead,
        "Personal" => ContactType::Personal,
        _ => return Err("Invalid contact type".to_string()),
    };
    ctx.db.contact().id().update(Contact {
        name,
        email,
        phone,
        company,
        contact_type,
        title,
        tags,
        notes,
        ..existing
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn toggle_contact_star(
    ctx: &ReducerContext,
    contact_id: u64,
) -> Result<(), String> {
    let existing = ctx.db.contact().id().find(contact_id)
        .ok_or("Contact not found")?;
    ctx.db.contact().id().update(Contact {
        starred: !existing.starred,
        ..existing
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn log_contact_interaction(
    ctx: &ReducerContext,
    contact_id: u64,
) -> Result<(), String> {
    let existing = ctx.db.contact().id().find(contact_id)
        .ok_or("Contact not found")?;
    ctx.db.contact().id().update(Contact {
        last_contacted: ctx.timestamp,
        ..existing
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_contact(
    ctx: &ReducerContext,
    contact_id: u64,
) -> Result<(), String> {
    ctx.db.contact().id().delete(&contact_id);
    Ok(())
}

// ── Workflows ────────────────────────────────────────────────────────────────

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum WorkflowStatus {
    Active,
    Paused,
    Draft,
    Error,
}

#[spacetimedb::table(accessor = workflow, public)]
#[derive(Clone)]
pub struct Workflow {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub name: String,
    pub description: String,
    pub status: WorkflowStatus,
    pub nodes_json: String,
    pub connections_json: String,
    pub runs_total: u64,
    pub runs_success: u64,
    pub last_run: Timestamp,
    pub created_at: Timestamp,
    pub creator: Identity,
}

#[spacetimedb::reducer]
pub fn create_workflow(
    ctx: &ReducerContext,
    org_id: u64,
    name: String,
    description: String,
    nodes_json: String,
    connections_json: String,
) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("Name is required".to_string());
    }
    ctx.db.workflow().insert(Workflow {
        id: 0,
        org_id,
        name,
        description,
        status: WorkflowStatus::Draft,
        nodes_json,
        connections_json,
        runs_total: 0,
        runs_success: 0,
        last_run: Timestamp::UNIX_EPOCH,
        created_at: ctx.timestamp,
        creator: ctx.sender(),
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn update_workflow(
    ctx: &ReducerContext,
    workflow_id: u64,
    name: String,
    description: String,
    nodes_json: String,
    connections_json: String,
) -> Result<(), String> {
    let existing = ctx.db.workflow().id().find(workflow_id)
        .ok_or("Workflow not found")?;
    ctx.db.workflow().id().update(Workflow {
        name,
        description,
        nodes_json,
        connections_json,
        ..existing
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn update_workflow_status(
    ctx: &ReducerContext,
    workflow_id: u64,
    status_tag: String,
) -> Result<(), String> {
    let existing = ctx.db.workflow().id().find(workflow_id)
        .ok_or("Workflow not found")?;
    let status = match status_tag.as_str() {
        "Active" => WorkflowStatus::Active,
        "Paused" => WorkflowStatus::Paused,
        "Draft" => WorkflowStatus::Draft,
        "Error" => WorkflowStatus::Error,
        _ => return Err("Invalid status".to_string()),
    };
    ctx.db.workflow().id().update(Workflow {
        status,
        ..existing
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_workflow(
    ctx: &ReducerContext,
    workflow_id: u64,
) -> Result<(), String> {
    ctx.db.workflow().id().delete(&workflow_id);
    Ok(())
}

#[spacetimedb::reducer]
pub fn duplicate_workflow(
    ctx: &ReducerContext,
    workflow_id: u64,
) -> Result<(), String> {
    let existing = ctx.db.workflow().id().find(workflow_id)
        .ok_or("Workflow not found")?;
    ctx.db.workflow().insert(Workflow {
        id: 0,
        name: format!("{} (Copy)", existing.name),
        status: WorkflowStatus::Draft,
        runs_total: 0,
        runs_success: 0,
        last_run: Timestamp::UNIX_EPOCH,
        created_at: ctx.timestamp,
        creator: ctx.sender(),
        ..existing
    });
    Ok(())
}

// ─── Drive ────────────────────────────────────────────────────

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum DriveItemType {
    Folder,
    Document,
    Image,
    Spreadsheet,
    Code,
    Video,
    Audio,
    Archive,
    Other,
}

#[spacetimedb::table(accessor = drive_item, public)]
pub struct DriveItem {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub name: String,
    pub item_type: DriveItemType,
    pub size_bytes: u64,
    pub parent_id: u64,       // 0 = root
    pub starred: bool,
    pub shared: bool,
    pub creator: Identity,
    pub modified_at: Timestamp,
    pub created_at: Timestamp,
}

#[spacetimedb::reducer]
pub fn create_drive_item(
    ctx: &ReducerContext,
    org_id: u64,
    name: String,
    type_tag: String,
    size_bytes: u64,
    parent_id: u64,
) -> Result<(), String> {
    if name.is_empty() {
        return Err("Name is required".to_string());
    }
    let item_type = match type_tag.as_str() {
        "Folder" => DriveItemType::Folder,
        "Document" => DriveItemType::Document,
        "Image" => DriveItemType::Image,
        "Spreadsheet" => DriveItemType::Spreadsheet,
        "Code" => DriveItemType::Code,
        "Video" => DriveItemType::Video,
        "Audio" => DriveItemType::Audio,
        "Archive" => DriveItemType::Archive,
        _ => DriveItemType::Other,
    };
    ctx.db.drive_item().insert(DriveItem {
        id: 0,
        org_id,
        name,
        item_type,
        size_bytes,
        parent_id,
        starred: false,
        shared: false,
        creator: ctx.sender(),
        modified_at: ctx.timestamp,
        created_at: ctx.timestamp,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn rename_drive_item(
    ctx: &ReducerContext,
    item_id: u64,
    name: String,
) -> Result<(), String> {
    let existing = ctx.db.drive_item().id().find(item_id)
        .ok_or("Item not found")?;
    ctx.db.drive_item().id().update(DriveItem {
        name,
        modified_at: ctx.timestamp,
        ..existing
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn move_drive_item(
    ctx: &ReducerContext,
    item_id: u64,
    new_parent_id: u64,
) -> Result<(), String> {
    let existing = ctx.db.drive_item().id().find(item_id)
        .ok_or("Item not found")?;
    ctx.db.drive_item().id().update(DriveItem {
        parent_id: new_parent_id,
        modified_at: ctx.timestamp,
        ..existing
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn toggle_drive_star(
    ctx: &ReducerContext,
    item_id: u64,
) -> Result<(), String> {
    let existing = ctx.db.drive_item().id().find(item_id)
        .ok_or("Item not found")?;
    ctx.db.drive_item().id().update(DriveItem {
        starred: !existing.starred,
        ..existing
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn toggle_drive_shared(
    ctx: &ReducerContext,
    item_id: u64,
) -> Result<(), String> {
    let existing = ctx.db.drive_item().id().find(item_id)
        .ok_or("Item not found")?;
    ctx.db.drive_item().id().update(DriveItem {
        shared: !existing.shared,
        ..existing
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_drive_item(
    ctx: &ReducerContext,
    item_id: u64,
) -> Result<(), String> {
    // Cascade: delete children if folder
    let children: Vec<u64> = ctx.db.drive_item().iter()
        .filter(|i| i.parent_id == item_id)
        .map(|i| i.id)
        .collect();
    for child_id in children {
        let grandchildren: Vec<u64> = ctx.db.drive_item().iter()
            .filter(|i| i.parent_id == child_id)
            .map(|i| i.id)
            .collect();
        for gc_id in grandchildren {
            ctx.db.drive_item().id().delete(&gc_id);
        }
        ctx.db.drive_item().id().delete(&child_id);
    }
    ctx.db.drive_item().id().delete(&item_id);
    Ok(())
}

// ─── Whiteboard ───────────────────────────────────────────────

#[spacetimedb::table(accessor = whiteboard_board, public)]
pub struct WhiteboardBoard {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub org_id: u64,
    pub title: String,
    pub elements_json: String,      // JSON array of draw elements
    pub preview_color: String,
    pub creator: Identity,
    pub modified_at: Timestamp,
    pub created_at: Timestamp,
}

#[spacetimedb::reducer]
pub fn create_whiteboard_board(
    ctx: &ReducerContext,
    org_id: u64,
    title: String,
    preview_color: String,
) -> Result<(), String> {
    if title.is_empty() {
        return Err("Title is required".to_string());
    }
    ctx.db.whiteboard_board().insert(WhiteboardBoard {
        id: 0,
        org_id,
        title,
        elements_json: "[]".to_string(),
        preview_color,
        creator: ctx.sender(),
        modified_at: ctx.timestamp,
        created_at: ctx.timestamp,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn update_whiteboard_board(
    ctx: &ReducerContext,
    board_id: u64,
    title: String,
    elements_json: String,
) -> Result<(), String> {
    let existing = ctx.db.whiteboard_board().id().find(board_id)
        .ok_or("Board not found")?;
    ctx.db.whiteboard_board().id().update(WhiteboardBoard {
        title,
        elements_json,
        modified_at: ctx.timestamp,
        ..existing
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_whiteboard_board(
    ctx: &ReducerContext,
    board_id: u64,
) -> Result<(), String> {
    ctx.db.whiteboard_board().id().delete(&board_id);
    Ok(())
}