# Stage 1

## Notification APIs

Base URL:

```text
/api/v1
```

Common headers:

```http
Authorization: Bearer <token>
Content-Type: application/json
Accept: application/json
```

The student is identified from the access token. The client should not send `studentId` in request bodies for normal student notification APIs.

## GET /notifications

Endpoint:

```http
GET /api/v1/notifications?limit=20&cursor=<cursor>&status=unread&type=placement
```

Request body:

```json
{}
```

Response body:

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_123",
        "type": "placement",
        "title": "Placement Drive Scheduled",
        "message": "A new placement drive is available.",
        "readAt": null,
        "createdAt": "2026-06-23T10:00:00.000Z",
        "metadata": {
          "companyId": "company_123"
        }
      }
    ],
    "nextCursor": "cursor_value",
    "hasNextPage": true
  }
}
```

Status codes:

| Code | Meaning |
| --- | --- |
| 200 | Notifications fetched |
| 400 | Invalid query params |
| 401 | Unauthorized |
| 500 | Server error |

## GET /notifications/:id

Endpoint:

```http
GET /api/v1/notifications/notif_123
```

Request body:

```json
{}
```

Response body:

```json
{
  "success": true,
  "data": {
    "id": "notif_123",
    "type": "placement",
    "title": "Placement Drive Scheduled",
    "message": "A new placement drive is available.",
    "readAt": null,
    "createdAt": "2026-06-23T10:00:00.000Z",
    "metadata": {
      "companyId": "company_123"
    }
  }
}
```

Status codes:

| Code | Meaning |
| --- | --- |
| 200 | Notification fetched |
| 401 | Unauthorized |
| 403 | Notification belongs to another user |
| 404 | Notification not found |
| 500 | Server error |

## PATCH /notifications/:id/read

Endpoint:

```http
PATCH /api/v1/notifications/notif_123/read
```

Request body:

```json
{}
```

Response body:

```json
{
  "success": true,
  "data": {
    "id": "notif_123",
    "readAt": "2026-06-23T10:10:00.000Z"
  }
}
```

Status codes:

| Code | Meaning |
| --- | --- |
| 200 | Marked as read |
| 401 | Unauthorized |
| 403 | Notification belongs to another user |
| 404 | Notification not found |
| 500 | Server error |

## PATCH /notifications/read-all

Endpoint:

```http
PATCH /api/v1/notifications/read-all
```

Request body:

```json
{
  "type": "placement"
}
```

`type` is optional. If it is not sent, all unread notifications are marked as read.

Response body:

```json
{
  "success": true,
  "data": {
    "updatedCount": 12
  }
}
```

Status codes:

| Code | Meaning |
| --- | --- |
| 200 | Notifications updated |
| 400 | Invalid request body |
| 401 | Unauthorized |
| 500 | Server error |

## DELETE /notifications/:id

Endpoint:

```http
DELETE /api/v1/notifications/notif_123
```

Request body:

```json
{}
```

Response body:

```json
{
  "success": true,
  "data": {
    "id": "notif_123",
    "deleted": true
  }
}
```

Status codes:

| Code | Meaning |
| --- | --- |
| 200 | Notification deleted |
| 401 | Unauthorized |
| 403 | Notification belongs to another user |
| 404 | Notification not found |
| 500 | Server error |

## GET /notifications/unread-count

Endpoint:

```http
GET /api/v1/notifications/unread-count
```

Request body:

```json
{}
```

Response body:

```json
{
  "success": true,
  "data": {
    "unreadCount": 8
  }
}
```

Status codes:

| Code | Meaning |
| --- | --- |
| 200 | Count fetched |
| 401 | Unauthorized |
| 500 | Server error |

## WebSocket Design

REST APIs are good for history, but new notifications should be pushed in real time.

Flow:

1. Student logs in and opens a WebSocket connection.
2. The WebSocket server validates the token.
3. The server stores a mapping of `studentId -> socketId`.
4. When a notification is created, the notification service saves it in the database.
5. After saving, it publishes a `notification.created` event.
6. The WebSocket server sends the event to the connected student.
7. If the student is offline, the notification is still available through `GET /notifications`.

Example event:

```json
{
  "event": "notification.created",
  "data": {
    "id": "notif_123",
    "type": "placement",
    "title": "Placement Drive Scheduled",
    "message": "A new placement drive is available.",
    "createdAt": "2026-06-23T10:00:00.000Z"
  }
}
```

For multiple backend instances, Redis Pub/Sub or a queue broker can be used so any WebSocket node can deliver the event.

---

# Stage 2

## Database Architecture

## Database Selection

Use PostgreSQL.

Reasons:

- Notifications are relational and belong to users.
- Read/unread status needs reliable updates.
- PostgreSQL supports composite indexes, partial indexes, transactions, and JSONB metadata.
- It is a good fit for pagination and reporting queries.

Redis can be added for caching unread counts, but PostgreSQL should remain the source of truth.

## Schema Design

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

```sql
CREATE TABLE student_notifications (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL,
    notification_id UUID NOT NULL REFERENCES notifications(id),
    read_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, notification_id)
);
```

```sql
CREATE TABLE notification_delivery_logs (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL,
    notification_id UUID NOT NULL,
    channel VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Index Strategy

For notification list:

```sql
CREATE INDEX idx_student_notifications_list
ON student_notifications (student_id, created_at DESC, id DESC)
WHERE deleted_at IS NULL;
```

For unread notifications:

```sql
CREATE INDEX idx_student_notifications_unread
ON student_notifications (student_id, created_at DESC, id DESC)
WHERE read_at IS NULL AND deleted_at IS NULL;
```

For filtering by type:

```sql
CREATE INDEX idx_notifications_type
ON notifications (type, created_at DESC);
```

## Pagination Strategy

Use cursor pagination instead of offset pagination.

First page:

```sql
SELECT sn.id, n.type, n.title, n.message, n.metadata, sn.read_at, sn.created_at
FROM student_notifications sn
JOIN notifications n ON n.id = sn.notification_id
WHERE sn.student_id = $1
  AND sn.deleted_at IS NULL
ORDER BY sn.created_at DESC, sn.id DESC
LIMIT $2;
```

Next page:

```sql
SELECT sn.id, n.type, n.title, n.message, n.metadata, sn.read_at, sn.created_at
FROM student_notifications sn
JOIN notifications n ON n.id = sn.notification_id
WHERE sn.student_id = $1
  AND sn.deleted_at IS NULL
  AND (sn.created_at, sn.id) < ($2, $3)
ORDER BY sn.created_at DESC, sn.id DESC
LIMIT $4;
```

---

# Stage 3

## Unread Notification Query Analysis

Unread count query:

```sql
SELECT COUNT(*)
FROM student_notifications
WHERE student_id = $1
  AND read_at IS NULL
  AND deleted_at IS NULL;
```

## Why It Becomes Slow

This query becomes slow when the table grows because every student keeps old notification history. Most old rows are already read, but without the right index the database still scans many rows to find unread ones.

If the table has millions of records, a simple count can become expensive because it filters by:

- `student_id`
- `read_at IS NULL`
- `deleted_at IS NULL`

## Complexity

Without an index:

```text
O(N)
```

The database may scan the full table.

With a proper partial composite index:

```text
O(log N + K)
```

`K` is the number of matching unread rows for the student.

With a cached counter:

```text
O(1)
```

The API can directly read the count from Redis or a counter table.

## Composite Indexes

A good index should match the actual query.

```sql
CREATE INDEX idx_student_notifications_unread
ON student_notifications (student_id, created_at DESC, id DESC)
WHERE read_at IS NULL AND deleted_at IS NULL;
```

This is better than separate indexes on `student_id`, `read_at`, and `deleted_at` because the query needs all of them together.

## Query Optimization

For unread list:

```sql
SELECT sn.id, n.type, n.title, n.message, sn.created_at
FROM student_notifications sn
JOIN notifications n ON n.id = sn.notification_id
WHERE sn.student_id = $1
  AND sn.read_at IS NULL
  AND sn.deleted_at IS NULL
ORDER BY sn.created_at DESC, sn.id DESC
LIMIT $2;
```

For unread count at scale, maintain a counter:

```sql
SELECT unread_count
FROM student_notification_counters
WHERE student_id = $1;
```

## Why Indexing Every Column Is Bad

Indexing every column is not a good solution.

Reasons:

- Inserts become slower because every index must be updated.
- Updates become slower when indexed fields change.
- Indexes consume disk and memory.
- The query planner has more work to do.
- Single-column indexes may not help multi-column queries.
- Low-cardinality columns like `read_at` or `type` alone may not filter enough data.

Indexes should be created for real access patterns, not for every field.

## Placement Notifications From Last 7 Days

```sql
SELECT sn.id, n.title, n.message, n.metadata, sn.read_at, sn.created_at
FROM student_notifications sn
JOIN notifications n ON n.id = sn.notification_id
WHERE sn.student_id = $1
  AND sn.deleted_at IS NULL
  AND n.type = 'placement'
  AND sn.created_at >= NOW() - INTERVAL '7 days'
ORDER BY sn.created_at DESC, sn.id DESC
LIMIT $2;
```

---

# Stage 4

## Performance Improvements

## Redis Cache

Use Redis for unread counts and short-lived notification list caching.

Advantages:

- Very fast reads.
- Reduces repeated database calls.
- Good for notification badge counts.

Disadvantages:

- Cache can become stale.
- Cache invalidation adds complexity.
- Redis should not replace the database as source of truth.

## WebSockets

Use WebSockets for real-time in-app notification delivery.

Advantages:

- Users receive notifications instantly.
- Reduces polling.
- Better experience for urgent updates.

Disadvantages:

- More difficult to scale than REST.
- Needs connection tracking.
- Offline users still need database-backed notification history.

## Read Replicas

Use read replicas for notification list APIs and admin reporting.

Advantages:

- Reduces load on primary database.
- Helps during high read traffic.
- Keeps writes safer on the primary DB.

Disadvantages:

- Replication lag can show stale data.
- Read-after-write may need to go to the primary database.
- More infrastructure to operate.

## Background Jobs

Use background workers for email sending and notify-all fanout.

Advantages:

- API requests return quickly.
- Long-running work is handled safely.
- Retries are easier to manage.

Disadvantages:

- Requires queue infrastructure.
- Failures need monitoring.
- Results are eventually consistent.

## Pagination

Use cursor pagination for notification lists.

Advantages:

- Stable performance for large tables.
- Works well with indexes.
- Avoids slow offset scans.

Disadvantages:

- Cursor is less simple than page number.
- Direct jump to page 20 is not natural.

---

# Stage 5

## Notify-All Architecture Redesign

Requirement:

- 50,000 students
- Email notifications
- In-app notifications

A simple loop inside an API request is not reliable. It can timeout, partially fail, and create duplicate messages during retries.

## Queue Architecture

Recommended queues:

```text
notification.fanout
notification.in_app
notification.email
notification.dlq
```

Flow:

1. Admin creates one notification.
2. API saves it in `notifications`.
3. API adds a fanout job and returns immediately.
4. Fanout worker loads students in batches, for example 1000 at a time.
5. For each student, it creates one in-app job and one email job.
6. In-app worker creates the student notification row.
7. Email worker sends email through the provider.
8. Failed jobs are retried.
9. Permanently failed jobs go to the dead letter queue.

## Retry Mechanism

Use exponential backoff.

Example:

```text
attempt 1: immediately
attempt 2: after 30 seconds
attempt 3: after 2 minutes
attempt 4: after 10 minutes
attempt 5: after 30 minutes
```

Retry transient failures like timeout, rate limit, network error, or temporary database issue.

Do not keep retrying permanent failures like invalid email address or invalid payload.

## Dead Letter Queue

After max retry attempts, move the job to `notification.dlq`.

DLQ should store:

- Job type
- Student ID
- Notification ID
- Channel
- Error message
- Attempt count
- Failed timestamp

This lets developers inspect failures and replay jobs after fixing the issue.

## Idempotency

Every job should have an idempotency key:

```text
notificationId:studentId:channel
```

For in-app notifications:

```sql
ALTER TABLE student_notifications
ADD CONSTRAINT uq_student_notification
UNIQUE (student_id, notification_id);
```

For email delivery:

```sql
CREATE TABLE notification_channel_deliveries (
    id UUID PRIMARY KEY,
    notification_id UUID NOT NULL,
    student_id UUID NOT NULL,
    channel VARCHAR(30) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL,
    provider_message_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Improved Pseudocode

```text
function notifyAll(request):
    validate request

    notification = create notification with title, message, type, metadata

    enqueue notification.fanout with:
        notificationId = notification.id
        cursor = null

    return accepted response with notificationId
```

```text
function fanoutWorker(job):
    students = fetch students in batches using job.cursor

    for each student in students:
        enqueue notification.in_app with:
            notificationId
            studentId
            idempotencyKey = notificationId + ":" + studentId + ":in_app"

        enqueue notification.email with:
            notificationId
            studentId
            email
            idempotencyKey = notificationId + ":" + studentId + ":email"

    if more students exist:
        enqueue next fanout job with next cursor
```

```text
function inAppWorker(job):
    if student notification already exists:
        return success

    create student notification
    increment unread count
    publish websocket event
```

```text
function emailWorker(job):
    delivery = find delivery by idempotency key

    if delivery status is sent:
        return success

    try:
        send email
        mark delivery as sent
    catch temporary error:
        retry with backoff
    catch permanent error:
        move to dead letter queue
```

This design handles 50,000 students safely because the API does not perform all work synchronously. Work is batched, retryable, and protected against duplicates.
