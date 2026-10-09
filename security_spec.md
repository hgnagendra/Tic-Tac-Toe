# Security Specification & Security TDD (Tic-Tac-Toe)

## 1. Data Invariants
1. **Master Gate Enforcement:** Events in `/games/{gameId}/events/{eventId}` are strictly bound to `/games/{gameId}`. Subcollection writes require that the user is an authenticated participant of the parent game (`playerXId == request.auth.uid || playerOId == request.auth.uid`).
2. **Identity Integrity:** Documents created in `/games/{gameId}` must set `creatorId == request.auth.uid` and `playerXId == request.auth.uid`. A user cannot forge another user's UID as creator or player.
3. **Turn Sequence & Action Safety:** Moves can only be committed by the active player for that mark (`X` or `O`).
4. **Time & Immutability:** `createdAt` and `creatorId` are immutable. `updatedAt` on update must equal server `request.time`.
5. **Rollback Invariant:** Only players participating in the game can invoke a rollback event. The target turn number must be bounded between 0 and the current event index.
6. **No Blanket Queries:** Listing games is restricted to queries matching the user's participation or creator ID.

## 2. The "Dirty Dozen" Malicious Payloads

1. **Payload 1 (Ghost Field Injection):**
   Attempting to add unauthorized fields like `{ isAdmin: true, bypassRules: true }` during game creation.
2. **Payload 2 (Creator Identity Spoofing):**
   Creating a game where `creatorId` is spoofed to another user's UID (`"victim-user-123"`).
3. **Payload 3 (Player X Identity Spoofing):**
   Creating a game where `playerXId` is set to someone else's UID without their authorization.
4. **Payload 4 (Unauthenticated Write):**
   Submitting a move event or game creation without being signed in (`request.auth == null`).
5. **Payload 5 (Unverified Email Write):**
   Writing game documents with an unverified email token when verification is required.
6. **Payload 6 (Oversized Game ID):**
   Using a 2KB garbage string as `gameId` (Denial of Wallet attack).
7. **Payload 7 (Invalid Event Cell Index):**
   Submitting an event with `cellIndex: 99` or a negative index to corrupt board calculations.
8. **Payload 8 (Third-Party Event Injection):**
   A non-participant user submitting an event to an in-progress game between two other players.
9. **Payload 9 (Retroactive Creator Mutability):**
   Attempting to update an existing game to change `creatorId` or `createdAt`.
10. **Payload 10 (Terminal State Tampering):**
    Attempting to add moves or alter the winner after `status` is `'completed'`.
11. **Payload 11 (Out-of-Turn Move Event):**
    Player O creating a move event when `currentTurn` is `'X'`.
12. **Payload 12 (Blanket Collection Scrape):**
    Unconstrained `list` query across `/games` without filtering by user ownership or participation.

## 3. Test Assertions
All 12 payloads are asserted to fail with `PERMISSION_DENIED` in Firestore rules test coverage.
