# Developer notifications and uptime monitor

The developer notification center at `/notifications` collects owner website
inquiries and change requests, prospective custom CRM requests, and outage or
recovery transitions reported by an external monitor. Notifications are
in-app only.

## Configure an external monitor

1. Generate a random secret with at least 32 characters and configure it as
   `UPTIME_WEBHOOK_SECRET` in the web application's server environment. Do not
   put it in browser code, source control, or a URL.
2. Configure the external monitor's webhook to send `POST` requests to
   `/api/monitoring/webhook` with `Authorization: Bearer <secret>` and
   `Content-Type: application/json`.
3. Send this JSON contract for state changes:

   ```json
   {
     "eventId": "unique-id-for-this-monitor-event",
     "monitorId": "stable-service-name",
     "status": "DOWN",
     "observedAt": "2026-11-10T12:00:00.000Z"
   }
   ```

   Use `UP` for recovery. Keep `monitorId` stable, use a unique `eventId` for
   each event, and reuse that ID when retrying delivery. `observedAt` must be
   an ISO-8601 timestamp. The application stores each event, ignores
   duplicates and stale reports, and notifies developers only when status
   changes.
4. Verify a `DOWN` event appears in the notification center and changes the
   monitor status. Send an `UP` event with a later timestamp and verify a
   recovery notification.

An unconfigured webhook returns 503; an invalid secret returns 401; malformed
events return 400. The application does not monitor the endpoint itself, so
the external provider must be able to reach the deployed webhook.

## Review requests

- Prospects select Tailored website & CRM during `/signup`. Their contact
  details and preferred callback time appear in `/custom-crm-requests`; the
  request does not create an account or reserve a confirmed appointment.
- Call at the requested time, checking the displayed time zone. If the owner
  cannot answer, use the fallback email. Older requests can lack phone or
  callback details; those display as not provided.
- After consultation, use Set up portal on the request to review prefilled
  owner/business details, or Set up client portal for a blank form. Verify
  the public website contact fields separately from private request details.
  Copy the one-time password-setup link and send it privately to the owner's
  email. Email is not sent by the app. The link expires after 24 hours; the
  owner sets a password before entering their portal. If needed, regenerate
  the link from the pending business's detail page; prior links stop working.
- Owner website inquiries and feature requests appear in the notifications
  center. Opening their notification leads to the relevant business request
  page and still requires the developer's explicit business grant.
- Marking notifications read changes only the signed-in developer's badge and
  does not delete the source request.
