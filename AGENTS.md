
# ⛔ CRITICAL: NEVER USE --clear-database ⛔

**`spacetime publish --clear-database` DESTROYS ALL DATA — every user, org, message, channel, and membership is permanently lost.**

- NEVER run `--clear-database` in any environment (local, staging, or production)
- Adding NEW tables is safe and does NOT require clearing the database
- If you need new fields on an existing table, create a SEPARATE new table instead of modifying the existing one
- There is NO recovery from `--clear-database` — the data is gone forever
- If a schema migration fails, investigate alternatives (new tables, workarounds) — do NOT resort to clearing

**This rule has NO exceptions. Violating it causes catastrophic, unrecoverable data loss.**

---

# SpacetimeDB Rules (All Languages)

## Migrating from 1.0 to 2.0?

**If you are migrating existing SpacetimeDB 1.0 code to 2.0, apply `spacetimedb-migration-2.0.mdc` first.** It documents breaking changes (reducer callbacks → event tables, `name`→`accessor`, `sender()` method, etc.) and should be considered before other rules.

---

## Language-Specific Rules

| Language | Rule File |
|----------|-----------|
| **TypeScript/React** | `spacetimedb-typescript.mdc` (MANDATORY) |
| **Rust** | `spacetimedb-rust.mdc` (MANDATORY) |
| **C#** | `spacetimedb-csharp.mdc` (MANDATORY) |
| **Migrating 1.0 → 2.0** | `spacetimedb-migration-2.0.mdc` |

---

## Core Concepts

1. **Reducers are transactional** — they do not return data to callers
2. **Reducers must be deterministic** — no filesystem, network, timers, or random
3. **Read data via tables/subscriptions** — not reducer return values
4. **Auto-increment IDs are not sequential** — gaps are normal, don't use for ordering
5. **`ctx.sender` is the authenticated principal** — never trust identity args

---

## Feature Implementation Checklist

When implementing a feature that spans backend and client:

1. **Backend:** Define table(s) to store the data
2. **Backend:** Define reducer(s) to mutate the data
3. **Client:** Subscribe to the table(s)
4. **Client:** Call the reducer(s) from UI — **don't forget this step!**
5. **Client:** Render the data from the table(s)

**Common mistake:** Building backend tables/reducers but forgetting to wire up the client to call them.

---

## Index System

SpacetimeDB automatically creates indexes for:
- Primary key columns
- Columns marked as unique

You can add explicit indexes on non-unique columns for query performance.

**Index names must be unique across your entire module (all tables).** If two tables have indexes with the same declared name → conflict error.

**Schema ↔ Code coupling:**
- Your query code references indexes by name
- If you add/remove/rename an index in the schema, update all code that uses it
- Removing an index without updating queries causes runtime errors

---

## Commands

```bash
# Login to allow remote database deployment e.g. to maincloud
spacetime login

# Start local SpacetimeDB
spacetime start

# Publish module
spacetime publish <db-name> --module-path <module-path>

# ⛔ DANGER: DO NOT USE — destroys all data! See top of file.
# spacetime publish <db-name> --clear-database -y --module-path <module-path>

# Generate client bindings
spacetime generate --lang <lang> --out-dir <out> --module-path <module-path>

# View logs
spacetime logs <db-name>
```

---

## Deployment

- Maincloud is the spacetimedb hosted cloud and the default location for module publishing
- The default server marked by *** in `spacetime server list` should be used when publishing
- If the default server is maincloud you should publish to maincloud
- Publishing to maincloud is free of charge
- When publishing to maincloud the database dashboard will be at the url: https://spacetimedb.com/@<username>/<database-name>
- The database owner can view utilization and performance metrics on the dashboard

---

## Debugging Checklist

1. Is SpacetimeDB server running? (`spacetime start`)
2. Is the module published? (`spacetime publish`)
3. Are client bindings generated? (`spacetime generate`)
4. Check server logs for errors (`spacetime logs <db-name>`)
5. **Is the reducer actually being called from the client?**

---

## Editing Behavior

- Make the smallest change necessary
- Do NOT touch unrelated files, configs, or dependencies
- Do NOT invent new SpacetimeDB APIs — use only what exists in docs or this repo
- Do NOT add restrictions the prompt didn't ask for — if "users can do X", implement X for all users




# SpacetimeDB Rust SDK

## ⛔ COMMON MISTAKES — LLM HALLUCINATIONS

These are **actual errors** observed when LLMs generate SpacetimeDB Rust code:

### 1. Wrong Crate for Server vs Client

```rust
// ❌ WRONG — using client crate for server module
use spacetimedb_sdk::*;  // This is for CLIENTS only!

// ✅ CORRECT — use spacetimedb for server modules
use spacetimedb::{table, reducer, Table, ReducerContext, Identity, Timestamp};
```

### 2. Wrong Table Macro Syntax

```rust
// ❌ WRONG — using attribute-style like C#
#[spacetimedb::table]
#[primary_key]
pub struct User { ... }

// ❌ WRONG — SpacetimeType on tables (causes conflicts!)
#[derive(SpacetimeType)]
#[table(accessor = my_table)]
pub struct MyTable { ... }

// ✅ CORRECT — use #[table(...)] macro with options, NO SpacetimeType
#[table(accessor = user, public)]
pub struct User {
    #[primary_key]
    identity: Identity,
    name: Option<String>,
}
```

### 3. Wrong Table Access Pattern

```rust
// ❌ WRONG — using ctx.Db or ctx.db() method or field access
ctx.Db.user.Insert(...);
ctx.db().user().insert(...);
ctx.db.player;  // Field access

// ✅ CORRECT — ctx.db is a field, table names are methods with parentheses
ctx.db.user().insert(User { ... });
ctx.db.user().identity().find(ctx.sender);
ctx.db.player().id().find(&player_id);
```

### 4. Wrong Update Pattern

```rust
// ❌ WRONG — partial update or using .update() directly on table
ctx.db.user().update(User { name: Some("new".into()), ..Default::default() });

// ✅ CORRECT — find existing, spread it, update via primary key accessor
if let Some(user) = ctx.db.user().identity().find(ctx.sender) {
    ctx.db.user().identity().update(User { name: Some("new".into()), ..user });
}
```

### 5. Wrong Reducer Return Type

```rust
// ❌ WRONG — returning data from reducer
#[reducer]
pub fn get_user(ctx: &ReducerContext, id: Identity) -> Option<User> { ... }

// ❌ WRONG — mutable context
pub fn my_reducer(ctx: &mut ReducerContext, ...) { }

// ✅ CORRECT — reducers return Result<(), String> or nothing, immutable context
#[reducer]
pub fn do_something(ctx: &ReducerContext, value: String) -> Result<(), String> {
    if value.is_empty() {
        return Err("Value cannot be empty".to_string());
    }
    Ok(())
}
```

### 6. Wrong Client Connection Pattern

```rust
// ❌ WRONG — subscribing before connected
let conn = DbConnection::builder().build()?;
conn.subscription_builder().subscribe_to_all_tables();  // NOT CONNECTED YET!

// ✅ CORRECT — subscribe in on_connect callback
DbConnection::builder()
    .on_connect(|conn, identity, token| {
        conn.subscription_builder()
            .on_applied(|ctx| println!("Ready!"))
            .subscribe_to_all_tables();
    })
    .build()?;
```

### 7. Forgetting to Advance the Connection

```rust
// ❌ WRONG — connection never processes messages
let conn = DbConnection::builder().build()?;
// ... callbacks never fire ...

// ✅ CORRECT — must call one of these to process messages
conn.run_threaded();           // Spawn background thread
// OR
conn.run_async().await;        // Async task
// OR (in game loop)
conn.frame_tick()?;            // Manual polling
```

### 8. Missing Table Trait Import

```rust
// ❌ WRONG — "no method named `insert` found"
use spacetimedb::{table, reducer, ReducerContext};
ctx.db.user().insert(...);  // ERROR!

// ✅ CORRECT — import Table trait for table methods
use spacetimedb::{table, reducer, Table, ReducerContext};
ctx.db.user().insert(...);  // Works!
```

### 9. Wrong ScheduleAt Variant

```rust
// ❌ WRONG — At variant doesn't exist
scheduled_at: ScheduleAt::At(future_time),

// ✅ CORRECT — use Time variant
scheduled_at: ScheduleAt::Time(future_time),
```

### 10. Identity to String Conversion

```rust
// ❌ WRONG — to_hex() returns HexString<32>, not String
let id: String = identity.to_hex();  // Type mismatch!

// ✅ CORRECT — chain .to_string()
let id: String = identity.to_hex().to_string();
```

### 11. Timestamp Duration Extraction

```rust
// ❌ WRONG — returns Result, not Duration directly
let micros = ctx.timestamp.to_duration_since_unix_epoch().as_micros();

// ✅ CORRECT — unwrap the Result
let micros = ctx.timestamp.to_duration_since_unix_epoch()
    .unwrap_or_default()
    .as_micros();
```

### 12. Borrow After Move

```rust
// ❌ WRONG — `tool` moved into struct, then borrowed
ctx.db.stroke().insert(Stroke { tool, color, ... });
if tool == "eraser" { ... }  // ERROR: value moved!

// ✅ CORRECT — check before move, or use clone
let is_eraser = tool == "eraser";
ctx.db.stroke().insert(Stroke { tool, color, ... });
if is_eraser { ... }
```

### 13. Client SDK Uses Blocking I/O

The SpacetimeDB Rust client SDK uses blocking I/O. If mixing with async runtimes (Tokio, async-std), use `spawn_blocking` or run the SDK on a dedicated thread to avoid blocking the async executor.

### 14. Wrong Schedule Syntax
```rust
// ❌ WRONG — `schedule` is not a valid table type
#[table(name = tick_timer, schedule(reducer = tick, column = scheduled_at))]

// ✅ CORRECT — `scheduled` is a valid table type
#[table(name = tick_timer, scheduled(reducer = tick, column = scheduled_at))]
```
---

## 1) Common Mistakes Table

### Server-side errors

| Wrong | Right | Error |
|-------|-------|-------|
| `#[derive(SpacetimeType)]` on `#[table]` | Remove it — macro handles this | Conflicting derive macros |
| `ctx.db.player` (field access) | `ctx.db.player()` (method) | "no field `player` on type" |
| `ctx.db.player().find(id)` | `ctx.db.player().id().find(&id)` | Must access via index |
| `&mut ReducerContext` | `&ReducerContext` | Wrong context type |
| Missing `use spacetimedb::Table;` | Add import | "no method named `insert`" |
| `#[table(accessor = "my_table")]` | `#[table(accessor = my_table)]` | String literals not allowed |
| Missing `public` on table | Add `public` flag | Clients can't subscribe |
| `#[spacetimedb::reducer]` | `#[reducer]` after import | Wrong attribute path |
| Network/filesystem in reducer | Use procedures instead | Sandbox violation |
| Panic for expected errors | Return `Result<(), String>` | WASM instance destroyed |

---

## 2) Table Definition (CRITICAL)

**Tables use `#[table(...)]` macro on `pub struct`. DO NOT derive `SpacetimeType` on tables!**

> ⚠️ **CRITICAL:** Always import `Table` trait — required for `.insert()`, `.iter()`, `.find()`, etc.

```rust
use spacetimedb::{table, reducer, Table, ReducerContext, Identity, Timestamp};

// ❌ WRONG — DO NOT derive SpacetimeType on tables!
#[derive(SpacetimeType)]  // REMOVE THIS!
#[table(accessor = task)]
pub struct Task { ... }

// ✅ CORRECT — just the #[table] attribute
#[table(accessor = user, public)]
pub struct User {
    #[primary_key]
    identity: Identity,
    
    #[unique]
    username: Option<String>,
    
    online: bool,
}

#[table(accessor = message, public)]
pub struct Message {
    #[primary_key]
    #[auto_inc]
    id: u64,
    
    sender: Identity,
    text: String,
    sent: Timestamp,
}

// With multi-column index
#[table(accessor = task, public, index(name = by_owner, btree(columns = [owner_id])))]
pub struct Task {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub owner_id: Identity,
    pub title: String,
}
```

### Table Options

```rust
#[table(accessor = my_table)]           // Private table (default)
#[table(accessor = my_table, public)]   // Public table - clients can subscribe
```

### Column Attributes

```rust
#[primary_key]           // Primary key (auto-indexed, enables .find())
#[auto_inc]              // Auto-increment (use with #[primary_key])
#[unique]                // Unique constraint (auto-indexed)
#[index(btree)]          // B-Tree index for queries
```

### Insert returns ROW, not ID

```rust
let row = ctx.db.task().insert(Task {
    id: 0,  // auto-inc placeholder
    owner_id: ctx.sender,
    title: "New task".to_string(),
    created_at: ctx.timestamp,
});
let new_id = row.id;  // Get the actual ID
```

---

## 3) Reducers

### Definition Syntax

```rust
use spacetimedb::{reducer, ReducerContext, Table};

#[reducer]
pub fn send_message(ctx: &ReducerContext, text: String) -> Result<(), String> {
    // Validate input
    if text.is_empty() {
        return Err("Message cannot be empty".to_string());
    }
    
    // Insert returns the inserted row
    let row = ctx.db.message().insert(Message {
        id: 0,  // auto-inc placeholder
        sender: ctx.sender,
        text,
        sent: ctx.timestamp,
    });
    
    log::info!("Message {} sent by {:?}", row.id, ctx.sender);
    Ok(())
}
```

### Update Pattern (CRITICAL)

```rust
#[reducer]
pub fn set_name(ctx: &ReducerContext, name: String) -> Result<(), String> {
    // Find existing row
    let user = ctx.db.user().identity().find(ctx.sender)
        .ok_or("User not found")?;
    
    // ✅ CORRECT — spread existing row, override specific fields
    ctx.db.user().identity().update(User {
        name: Some(name),
        ..user  // Preserves identity, online, etc.
    });
    
    Ok(())
}

// ❌ WRONG — partial update nulls out other fields!
// ctx.db.user().identity().update(User { identity: ctx.sender, name: Some(name), ..Default::default() });
```

### Delete Pattern

```rust
#[reducer]
pub fn delete_message(ctx: &ReducerContext, message_id: u64) -> Result<(), String> {
    ctx.db.message().id().delete(&message_id);
    Ok(())
}
```

### Lifecycle Hooks

```rust
#[reducer(init)]
pub fn init(ctx: &ReducerContext) {
    // Called when module is first published
}

#[reducer(client_connected)]
pub fn client_connected(ctx: &ReducerContext) {
    // ctx.sender is the connecting identity
    if let Some(user) = ctx.db.user().identity().find(ctx.sender) {
        ctx.db.user().identity().update(User { online: true, ..user });
    } else {
        ctx.db.user().insert(User {
            identity: ctx.sender,
            username: None,
            online: true,
        });
    }
}

#[reducer(client_disconnected)]
pub fn client_disconnected(ctx: &ReducerContext) {
    if let Some(user) = ctx.db.user().identity().find(ctx.sender) {
        ctx.db.user().identity().update(User { online: false, ..user });
    }
}
```

### ReducerContext fields

```rust
ctx.sender          // Identity of the caller
ctx.timestamp       // Current timestamp
ctx.db              // Database access
ctx.rng             // Deterministic RNG (use instead of rand)
```

---

## 4) Index Access

### Primary Key / Unique — `.find()` returns `Option<Row>`

```rust
// Primary key lookup
let user = ctx.db.user().identity().find(ctx.sender);

// Unique column lookup  
let user = ctx.db.user().username().find(&"alice".to_string());

if let Some(user) = user {
    // Found
}
```

### BTree Index — `.filter()` returns iterator

```rust
#[table(accessor = message, public)]
pub struct Message {
    #[primary_key]
    #[auto_inc]
    id: u64,
    
    #[index(btree)]
    room_id: u64,
    
    text: String,
}

// Filter by indexed column
for msg in ctx.db.message().room_id().filter(&room_id) {
    // Process each message in room
}
```

### No Index — `.iter()` + manual filter

```rust
// Full table scan
for user in ctx.db.user().iter() {
    if user.online {
        // Process online users
    }
}
```

---

## 5) Custom Types

**Use `#[derive(SpacetimeType)]` ONLY for custom structs/enums used as fields or parameters.**

```rust
use spacetimedb::SpacetimeType;

// Custom struct for table fields
#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub struct Position {
    pub x: i32,
    pub y: i32,
}

// Custom enum
#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum PlayerStatus {
    Idle,
    Walking(Position),
    Fighting(Identity),
}

// Use in table (DO NOT derive SpacetimeType on the table!)
#[table(accessor = player, public)]
pub struct Player {
    #[primary_key]
    pub id: Identity,
    pub position: Position,
    pub status: PlayerStatus,
}
```

---

## 6) Scheduled Tables

```rust
use spacetimedb::{table, reducer, ReducerContext, ScheduleAt, Timestamp};

#[table(accessor = cleanup_job, scheduled(cleanup_expired))]
pub struct CleanupJob {
    #[primary_key]
    #[auto_inc]
    scheduled_id: u64,
    
    scheduled_at: ScheduleAt,
    target_id: u64,
}

#[reducer]
pub fn cleanup_expired(ctx: &ReducerContext, job: CleanupJob) {
    // Job row is auto-deleted after reducer completes
    log::info!("Cleaning up: {}", job.target_id);
}

// Schedule a job
#[reducer]
pub fn schedule_cleanup(ctx: &ReducerContext, target_id: u64, delay_ms: u64) {
    let future_time = ctx.timestamp + std::time::Duration::from_millis(delay_ms);
    ctx.db.cleanup_job().insert(CleanupJob {
        scheduled_id: 0,  // auto-inc placeholder
        scheduled_at: ScheduleAt::Time(future_time),
        target_id,
    });
}

// Cancel by deleting the row
#[reducer]
pub fn cancel_cleanup(ctx: &ReducerContext, job_id: u64) {
    ctx.db.cleanup_job().scheduled_id().delete(&job_id);
}
```

---

## 7) Client SDK

```rust
// Connection pattern
let conn = DbConnection::builder()
    .with_uri("http://localhost:3000")
    .with_module_name("my-module")
    .with_token(load_saved_token())  // None for first connection
    .on_connect(on_connected)
    .build()
    .expect("Failed to connect");

// Subscribe in on_connect callback, NOT before!
fn on_connected(conn: &DbConnection, identity: Identity, token: &str) {
    conn.subscription_builder()
        .on_applied(|ctx| println!("Ready!"))
        .subscribe_to_all_tables();
}
```

### ⚠️ CRITICAL: Advance the Connection

**You MUST call one of these** — without it, no callbacks fire:

```rust
conn.run_threaded();           // Background thread (simplest)
conn.run_async().await;        // Async task
conn.frame_tick()?;            // Manual polling (game loops)
```

### Table Access & Callbacks

```rust
// Iterate
for user in ctx.db.user().iter() { ... }

// Find by primary key
if let Some(user) = ctx.db.user().identity().find(&identity) { ... }

// Row callbacks
ctx.db.user().on_insert(|ctx, user| { ... });
ctx.db.user().on_update(|ctx, old, new| { ... });
ctx.db.user().on_delete(|ctx, user| { ... });

// Call reducers
ctx.reducers.set_name("Alice".to_string()).unwrap();
```

---

## 8) Procedures (Beta)

**Procedures are for side effects (HTTP, filesystem) that reducers can't do.**

⚠️ Procedures are currently in beta. API may change.

```rust
use spacetimedb::{procedure, ProcedureContext};

// Simple procedure
#[procedure]
fn add_numbers(_ctx: &mut ProcedureContext, a: u32, b: u32) -> u64 {
    a as u64 + b as u64
}

// Procedure with database access
#[procedure]
fn save_external_data(ctx: &mut ProcedureContext, url: String) -> Result<(), String> {
    // HTTP request (allowed in procedures, not reducers)
    let data = fetch_from_url(&url)?;

    // Database access requires explicit transaction
    ctx.try_with_tx(|tx| {
        tx.db.external_data().insert(ExternalData {
            id: 0,
            content: data,
        });
        Ok(())
    })?;

    Ok(())
}
```

### Key differences from reducers

| Reducers | Procedures |
|----------|------------|
| `&ReducerContext` (immutable) | `&mut ProcedureContext` (mutable) |
| Direct `ctx.db` access | Must use `ctx.with_tx()` |
| No HTTP/network | HTTP allowed |
| No return values | Can return data |

---

## 9) Logging

```rust
use spacetimedb::log;

log::trace!("Detailed trace");
log::debug!("Debug info");
log::info!("Information");
log::warn!("Warning");
log::error!("Error occurred");
```

---

## 10) Commands

```bash
# Start local server
spacetime start

# Publish module
spacetime publish <module-name> --module-path <backend-dir>

# ⛔ DANGER: DO NOT USE — destroys all data! See top of file.
# spacetime publish <module-name> --clear-database -y --module-path <backend-dir>

# Generate bindings
spacetime generate --lang rust --out-dir <client>/src/module_bindings --module-path <backend-dir>

# View logs
spacetime logs <module-name>
```

---

## 11) Hard Requirements

**Rust-specific:**

1. **DO NOT derive `SpacetimeType` on `#[table]` structs** — the macro handles this
2. **Import `Table` trait** — `use spacetimedb::Table;` required for `.insert()`, `.iter()`, etc.
3. **Use `&ReducerContext`** — not `&mut ReducerContext`
4. **Tables are methods** — `ctx.db.table()` not `ctx.db.table`
5. **Server modules use `spacetimedb` crate** — clients use `spacetimedb-sdk`
6. **Reducers must be deterministic** — no filesystem, network, timers, or external RNG
7. **Use `ctx.rng`** — not `rand` crate for random numbers
8. **Use `ctx.timestamp`** — never `std::time::SystemTime::now()` in reducers
9. **Client MUST advance connection** — call `run_threaded()`, `run_async()`, or `frame_tick()`
10. **Subscribe in `on_connect` callback** — not before connection is established
11. **Update requires full row** — spread existing row with `..existing`
12. **DO NOT edit generated bindings** — regenerate with `spacetime generate`
13. **Identity to String needs `.to_string()`** — `identity.to_hex().to_string()`
14. **Client SDK is blocking** — use `spawn_blocking` or dedicated thread if mixing with async runtimes


--

UX Design

# Interface Design Agent

Build interfaces with **craft**, **memory**, and **consistency**.

**Scope:** Dashboards, admin panels, SaaS apps, tools, settings pages, data interfaces.
**Not for:** Landing pages, marketing sites, campaigns.

---

## The Problem

You will generate generic output. Your training has seen thousands of dashboards. The patterns are strong.

Intent lives in prose, but code generation pulls from patterns. The gap between them is where defaults win.

### Where Defaults Hide

- **Typography feels like a container** — but it IS your design. The weight of a headline, the personality of a label shapes how the product feels.
- **Navigation feels like scaffolding** — but it IS your product. Where you are, where you can go, what matters most.
- **Data feels like presentation** — but a number on screen is not design. The question is: what does this number mean?
- **Token names feel like implementation** — but `--ink` and `--parchment` evoke a world. `--gray-700` and `--surface-2` evoke a template.

**There are no structural decisions. Everything is design.**

---

## Intent First

Before touching code, answer these OUT LOUD:

1. **Who is this human?** Not "users" — the actual person. Where are they? What's on their mind? A teacher at 7am is not a developer at midnight.

2. **What must they accomplish?** Not "use the dashboard" — the verb. Grade submissions. Find the broken deployment. Approve the payment.

3. **What should this feel like?** "Clean and modern" means nothing. Warm like a notebook? Cold like a terminal? Dense like a trading floor?

If you cannot answer with specifics, **stop and ask**. Do not guess. Do not default.

### Every Choice Must Be A Choice

For every decision, explain WHY:
- Why this layout and not another?
- Why this color temperature?
- Why this typeface?
- Why this spacing scale?

**The test:** If you swapped your choices for common alternatives and the design didn't feel meaningfully different, you never made real choices.

### Sameness Is Failure

If another AI, given a similar prompt, would produce substantially the same output — you have failed.

When you design from intent, sameness becomes impossible because no two intents are identical.

---

## Product Domain Exploration

**Do not propose any direction until you produce all four:**

1. **Domain** — Concepts, metaphors, vocabulary from this product's world. Minimum 5.

2. **Color World** — What colors exist naturally in this domain? If this product were a physical space, what would you see? List 5+.

3. **Signature** — One element (visual, structural, or interaction) that could only exist for THIS product.

4. **Defaults to Reject** — 3 obvious choices for this interface type. Name them so you can avoid them.

### Proposal Requirements

Your direction must explicitly reference:
- Domain concepts you explored
- Colors from your color world exploration
- Your signature element
- What replaces each default

---

## The Mandate

**Before showing the user, look at what you made.**

Ask yourself: "If they said this lacks craft, what would they mean?"

That thing you just thought of — fix it first.

### The Checks

Run these before presenting:

- **Swap test:** If you swapped the typeface for your usual one, would anyone notice?
- **Squint test:** Blur your eyes. Can you still perceive hierarchy? Is anything jumping out harshly?
- **Signature test:** Can you point to five specific elements where your signature appears?
- **Token test:** Read your CSS variables out loud. Do they sound like they belong to this product's world?

---

## Core Craft Principles

### Subtle Layering (The Backbone)

This separates professional interfaces from amateur ones.

**Surfaces must be barely different but still distinguishable.** Study Vercel, Supabase, Linear. Their elevation changes are so subtle you almost can't see them — but you feel the hierarchy.

**Borders must be light but not invisible.** The border should disappear when you're not looking for it, but be findable when you need to understand structure.

**The squint test:** Blur your eyes at the interface. You should still perceive hierarchy. Nothing should jump out.

### Surface Elevation Hierarchy

```
Level 0: Base background (the app canvas)
Level 1: Cards, panels (same visual plane as base)
Level 2: Dropdowns, popovers (floating above)
Level 3: Nested dropdowns, stacked overlays
Level 4: Highest elevation (rare)
```

In dark mode: higher elevation = slightly lighter (few percentage points, not dramatic jumps).

### Text Hierarchy

Build four levels and use all four:
- **Primary** — default text, highest contrast
- **Secondary** — supporting text, slightly muted
- **Tertiary** — metadata, timestamps
- **Muted** — disabled, placeholder

### Border Progression

- **Default** — standard borders
- **Subtle/Muted** — softer separation
- **Strong** — emphasis, hover states
- **Stronger** — maximum emphasis, focus rings

---

## Design Principles

### Spacing
Pick a base unit (4px or 8px) and stick to multiples. Random values signal no system.

### Padding
Keep it symmetrical. If one side is 16px, others should match unless there's a clear reason.

### Depth
Choose ONE approach and commit:
- **Borders-only** — Clean, technical. For dense tools.
- **Subtle shadows** — Soft lift. For approachable products.
- **Layered shadows** — Premium, dimensional. For cards that need presence.

**Don't mix approaches.**

### Border Radius
Sharper = technical. Rounder = friendly. Pick a scale and apply consistently.

### Typography
- Headlines: heavier weight, tight tracking
- Body: comfortable weight for readability
- Data: monospace with `tabular-nums`

### Color & Surfaces
Build from primitives:
- **Foreground** — text hierarchy
- **Background** — surface elevation
- **Border** — separation hierarchy
- **Brand** — primary accent
- **Semantic** — destructive, warning, success

**Every color traces back to these. No random hex values.**

### Animation
Fast micro-interactions (~150ms), smooth easing. No bouncy/spring effects.

### States
Every interactive element needs: default, hover, active, focus, disabled.
Data needs: loading, empty, error.

### Controls
**Never use native form elements for styled UI.** Native `<select>` and `<input type="date">` render OS-native dropdowns. Build custom components.

---

## What to Avoid

- **Harsh borders** — if borders are the first thing you see, they're too strong
- **Dramatic surface jumps** — elevation changes should be whisper-quiet
- **Inconsistent spacing** — the clearest sign of no system
- **Mixed depth strategies** — pick one approach and commit
- **Missing interaction states** — hover, focus, disabled, loading, error
- **Dramatic drop shadows** — shadows should be subtle
- **Large radius on small elements**
- **Pure white cards on colored backgrounds**
- **Thick decorative borders**
- **Gradients and color for decoration** — color should mean something
- **Multiple accent colors** — dilutes focus

---

## Workflow

### Communication
Be invisible. Don't announce modes or narrate process.

**Never say:** "I'm in ESTABLISH MODE", "Let me check system.md..."

**Instead:** Jump into work. State suggestions with reasoning.

### Suggest + Ask

```
"Domain: [5+ concepts from the product's world]
Color world: [5+ colors that exist in this domain]
Signature: [one element unique to this product]
Rejecting: [default 1] → [alternative], [default 2] → [alternative]

Direction: [approach that connects to the above]

Does that direction feel right?"
```

### If Project Has system.md
Read `.interface-design/system.md` and apply. Decisions are made.

### If No system.md
1. Explore domain — Produce all four required outputs
2. Propose — Direction must reference all four
3. Confirm — Get user buy-in
4. Build — Apply principles
5. Evaluate — Run the mandate checks before showing
6. Offer to save

---

## After Completing a Task

Always offer:
```
"Want me to save these patterns for future sessions?"
```

If yes, write to `.interface-design/system.md`:
- Direction and feel
- Depth strategy
- Spacing base unit
- Key component patterns

---

## System File Format

```markdown
# Design System

## Direction
Personality: [Precision & Density | Warmth & Approachability | etc.]
Foundation: [warm | cool | neutral | tinted]
Depth: [borders-only | subtle-shadows | layered-shadows]

## Tokens
### Spacing
Base: [4px | 8px]
Scale: [4, 8, 12, 16, 24, 32]

### Colors
--foreground: [value]
--secondary: [value]
--muted: [value]
--accent: [value]
--border: [value]

### Radius
Scale: [4px, 6px, 8px] (sharp) | [8px, 12px, 16px] (soft)

### Typography
Font: [system | Inter | Geist]
Scale: 12, 13, 14 (base), 16, 18, 24

## Patterns
### Button Primary
- Height: 36px
- Padding: 12px 16px
- Radius: 6px
- Usage: Primary actions

### Card Default
- Border: 0.5px solid
- Padding: 16px
- Radius: 8px

## Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| ... | ... | ... |
```

---

## Memory Management

### When to Add Patterns
- Component used 2+ times
- Pattern is reusable across the project
- Has specific measurements worth remembering

### Don't Document
- One-off components
- Temporary experiments
- Variations better handled with props

### Validation Checks
- **Spacing** — All values multiples of the defined base?
- **Depth** — Using the declared strategy throughout?
- **Colors** — Using defined palette, not random hex codes?
- **Patterns** — Reusing documented patterns instead of creating new?

---

## Design Directions Reference

| Direction | Feel | Best For |
|-----------|------|----------|
| **Precision & Density** | Tight, technical, monochrome | Developer tools, admin dashboards |
| **Warmth & Approachability** | Generous spacing, soft shadows | Collaborative tools, consumer apps |
| **Sophistication & Trust** | Cool tones, layered depth | Finance, enterprise B2B |
| **Boldness & Clarity** | High contrast, dramatic space | Modern dashboards, data-heavy apps |
| **Utility & Function** | Muted, functional density | GitHub-style tools |
| **Data & Analysis** | Chart-optimized, numbers-first | Analytics, BI tools |

---

## The Philosophy

**Decisions compound.** A spacing value chosen once becomes a pattern. A depth strategy becomes an identity.

**Consistency beats perfection.** A coherent system with "imperfect" values beats a scattered interface with "correct" ones.

**Memory enables iteration.** When you can see what you decided and why, you can evolve intentionally instead of drifting accidentally.
