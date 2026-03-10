# Postmark Email Templates (Shared Layout + HTTPS Logo)

## Strategy

Use one reusable Postmark layout plus content-only templates:

- Layout alias: `mv-base-layout-cid-v1`
- Template aliases:
- `verify-email-cid-v1`
- `reset-password-cid-v1`
- `welcome-cid-v1`
- `investor-signup-under-review-cid-v1`
- `investor-new-property-published-cid-v1`
- `admin-inquiry-created-cid-v1`
- `admin-inquiry-follow-up-cid-v1`
- `admin-contact-request-created-cid-v1`
- `investor-inquiry-admin-reply-cid-v1`
- `contact-request-reply-cid-v1`
- `admin-seller-property-submitted-cid-v1`
- `seller-property-published-cid-v1`

All templates use the same HTTPS logo URL:

```html
<img src="{{logo_url}}" alt="MV Deal Portal" />
```

## Source files

- Layout HTML: `/Users/zafaralitolibov/Documents/mv-deal-portal/docs/email/postmark-layout-cid-v1.html`
- Verify content HTML: `/Users/zafaralitolibov/Documents/mv-deal-portal/docs/email/postmark-verify-email-content-v1.html`
- Reset content HTML: `/Users/zafaralitolibov/Documents/mv-deal-portal/docs/email/postmark-reset-password-content-v1.html`
- Welcome content HTML: `/Users/zafaralitolibov/Documents/mv-deal-portal/docs/email/postmark-welcome-content-v1.html`
- Investor signup under-review content HTML: `/Users/zafaralitolibov/Documents/mv-deal-portal/docs/email/postmark-investor-signup-under-review-content-v1.html`
- Investor property-published content HTML: `/Users/zafaralitolibov/Documents/mv-deal-portal/docs/email/postmark-investor-new-property-published-content-v1.html`
- Admin inquiry-created content HTML: `/Users/zafaralitolibov/Documents/mv-deal-portal/docs/email/postmark-admin-inquiry-created-content-v1.html`
- Admin inquiry-follow-up content HTML: `/Users/zafaralitolibov/Documents/mv-deal-portal/docs/email/postmark-admin-inquiry-follow-up-content-v1.html`
- Admin contact-request-created content HTML: `/Users/zafaralitolibov/Documents/mv-deal-portal/docs/email/postmark-admin-contact-request-created-content-v1.html`
- Investor inquiry admin-reply content HTML: `/Users/zafaralitolibov/Documents/mv-deal-portal/docs/email/postmark-investor-inquiry-admin-reply-content-v1.html`
- Contact request reply content HTML: `/Users/zafaralitolibov/Documents/mv-deal-portal/docs/email/postmark-contact-request-reply-content-v1.html`
- Admin seller-property-submitted content HTML: `/Users/zafaralitolibov/Documents/mv-deal-portal/docs/email/postmark-admin-seller-property-submitted-content-v1.html`
- Seller property-published content HTML: `/Users/zafaralitolibov/Documents/mv-deal-portal/docs/email/postmark-seller-property-published-content-v1.html`

## Postmark UI setup

1. Create layout `mv-base-layout-cid-v1` and paste the layout file HTML.
2. Create template `verify-email-cid-v1`, select that layout, paste verify content HTML.
3. Create template `reset-password-cid-v1`, select that layout, paste reset content HTML.
4. Create template `welcome-cid-v1`, select that layout, paste welcome content HTML.
5. Create template `investor-signup-under-review-cid-v1`, select that layout, paste investor signup under-review content HTML.
6. Create template `investor-new-property-published-cid-v1`, select that layout, paste investor property-published content HTML.
7. Create template `admin-inquiry-created-cid-v1`, select that layout, paste admin inquiry-created content HTML.
8. Create template `admin-inquiry-follow-up-cid-v1`, select that layout, paste admin inquiry-follow-up content HTML.
9. Create template `admin-contact-request-created-cid-v1`, select that layout, paste admin contact-request-created content HTML.
10. Create template `investor-inquiry-admin-reply-cid-v1`, select that layout, paste investor inquiry admin-reply content HTML.
11. Create template `contact-request-reply-cid-v1`, select that layout, paste contact request reply content HTML.
12. Create template `admin-seller-property-submitted-cid-v1`, select that layout, paste admin seller-property-submitted content HTML.
13. Create template `seller-property-published-cid-v1`, select that layout, paste seller property-published content HTML.
14. Add template subject as `{{subject}}` for each template.

## Text bodies

Verify + Welcome:

```txt
{{title}}

{{message}}

{{action_text}}: {{action_url}}

{{footer_text}}
```

Investor signup under review:

```txt
{{title}}

{{message}}

{{footer_text}}
```

Reset password:

```txt
{{title}}

{{message}}
{{expiry_note}}

{{action_text}}: {{action_url}}

{{footer_text}}
```

Investor new property published:

```txt
{{title}}

{{message}}
{{property_address}}
{{property_price}}

{{action_text}}: {{action_url}}

{{footer_text}}
```

Admin inquiry created:

```txt
{{title}}

{{message}}

Inquiry ID: {{inquiry_id}}
Investor Name: {{investor_name}}
Investor Email: {{investor_email}}
Property: {{property_address}}
Created: {{created_at}}

Inquiry Message:
{{inquiry_message}}

{{action_text}}: {{action_url}}

{{footer_text}}
```

Admin inquiry follow-up:

```txt
{{title}}

{{message}}

Inquiry ID: {{inquiry_id}}
Thread ID: {{thread_id}}
Investor Name: {{investor_name}}
Investor Email: {{investor_email}}
Property: {{property_address}}
Last Message: {{last_message_at}}

Previous Message:
{{previous_message_excerpt}}

New Follow-Up Message:
{{follow_up_message}}

{{action_text}}: {{action_url}}

{{footer_text}}
```

Admin contact request created:

```txt
{{title}}

{{message}}

Request ID: {{request_id}}
Category: {{category}}
Contact Name: {{contact_name}}
Contact Email: {{contact_email}}
Submitted: {{created_at}}

Message:
{{contact_message}}

{{action_text}}: {{action_url}}

{{footer_text}}
```

Investor inquiry admin reply:

```txt
{{title}}

{{message}}

Reply ID: {{reply_id}}
Property ID: {{property_id}}
Investor ID: {{investor_id}}

Reply:
{{reply_message}}

Original Inquiry:
{{original_inquiry_message}}

{{action_text}}: {{action_url}}

{{footer_text}}
```

Contact request reply:

```txt
{{title}}

{{message}}

Request ID: {{request_id}}
Contact: {{contact_name}}

Reply from Megna Team:
{{reply_message}}

{{action_text}}: {{action_url}}

{{footer_text}}
```

Admin seller-property-submitted:

```txt
{{title}}

{{message}}

Property ID: {{property_id}}
Seller Name: {{seller_name}}
Seller Email: {{seller_email}}
Property: {{property_address}}
Submitted: {{submitted_at}}

{{action_text}}: {{action_url}}

{{footer_text}}
```

Seller property-published:

```txt
{{title}}

{{message}}

Property ID: {{property_id}}
Property: {{property_address}}
List Price: {{property_price}}
Published: {{published_at}}

{{action_text}}: {{action_url}}

{{footer_text}}
```

## Template models

Verify model:

```json
{
  "subject": "Confirm your email",
  "logo_url": "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png",
  "title": "Confirm your email address",
  "message": "Click below to verify your email and finish setting up your account.",
  "action_text": "Verify Email",
  "action_url": "https://example.com/verify?token=abc123",
  "footer_text": "If you didn’t request this, you can safely ignore this email."
}
```

Reset model:

```json
{
  "subject": "Reset your password",
  "logo_url": "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png",
  "title": "Reset your password",
  "message": "We received a request to reset your password.",
  "expiry_note": "For your security, this link expires in 30 minutes.",
  "action_text": "Reset Password",
  "action_url": "https://example.com/reset-password?token=abc123",
  "footer_text": "If you didn’t request this, you can ignore this email."
}
```

Welcome model:

```json
{
  "subject": "Welcome to MV Deal Portal",
  "logo_url": "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png",
  "title": "Welcome to MV Deal Portal",
  "message": "Your account is ready. You can now explore listings and manage your deals.",
  "action_text": "Open Dashboard",
  "action_url": "https://example.com/dashboard",
  "footer_text": "Need help? Reply to this email and our team will assist you."
}
```

Investor signup under-review model:

```json
{
  "subject": "Your Megna account is under review",
  "logo_url": "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png",
  "title": "Thanks for signing up, John",
  "message": "Your account is now under review by the Megna Team. One of our team members will reach out to you shortly.",
  "footer_text": "If you have questions, reply to this email and our team will assist you."
}
```

Investor new-property-published model:

```json
{
  "subject": "New property published",
  "logo_url": "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png",
  "title": "A new property just went live",
  "message": "A listing that matches your interest has been published.",
  "property_address": "123 Main St, Dallas, TX",
  "property_price": "$975,000",
  "action_text": "View Property",
  "action_url": "https://example.com/properties/abc123",
  "footer_text": "You're receiving this because property notifications are enabled on your account."
}
```

Admin inquiry-created model:

```json
{
  "subject": "New investor inquiry",
  "logo_url": "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png",
  "title": "A new investor inquiry was created",
  "message": "A new inquiry has been submitted and needs admin attention.",
  "inquiry_id": "inquiry_12345",
  "investor_name": "John Doe",
  "investor_email": "john.doe@example.com",
  "property_address": "123 Main St, Dallas, TX",
  "created_at": "2026-03-09 11:30 AM CT",
  "inquiry_message": "I am interested in this listing and want to discuss cap rate assumptions and closing timeline.",
  "action_text": "Open Inquiry",
  "action_url": "https://example.com/admin/inquiries/inquiry_12345",
  "footer_text": "This notification was sent to admins because a new inquiry was created."
}
```

Admin inquiry-follow-up model:

```json
{
  "subject": "Investor follow-up on inquiry",
  "logo_url": "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png",
  "title": "An investor sent a follow-up message",
  "message": "There is a new follow-up in an existing inquiry thread.",
  "inquiry_id": "inquiry_12345",
  "thread_id": "thread_98765",
  "investor_name": "John Doe",
  "investor_email": "john.doe@example.com",
  "property_address": "123 Main St, Dallas, TX",
  "last_message_at": "2026-03-09 2:15 PM CT",
  "previous_message_excerpt": "Can you confirm current occupancy and recent rent comps?",
  "follow_up_message": "Also, please share whether seller financing is open for discussion.",
  "action_text": "Open Inquiry Thread",
  "action_url": "https://example.com/admin/inquiries/inquiry_12345",
  "footer_text": "This notification was sent to admins because an investor followed up on an inquiry."
}
```

Admin contact-request-created model:

```json
{
  "subject": "New contact request",
  "logo_url": "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png",
  "title": "A new contact request was submitted",
  "message": "A new contact request has been submitted and needs admin attention.",
  "request_id": "301",
  "category": "General support",
  "contact_name": "Alex Johnson",
  "contact_email": "alex@example.com",
  "created_at": "2026-03-10 8:16 AM CT",
  "contact_message": "Need help with account access.",
  "action_text": "Open Contact Requests",
  "action_url": "https://megna-realestate.com/admin/contact-requests",
  "footer_text": "This notification was sent to admins because a new contact request was submitted."
}
```

Investor inquiry admin-reply model:

```json
{
  "subject": "Megna Team replied to your inquiry",
  "logo_url": "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png",
  "title": "You have a new inquiry reply",
  "message": "Megna Team has posted a reply to your inquiry.",
  "reply_id": "700",
  "property_id": "101",
  "investor_id": "10",
  "reply_message": "Thanks for reaching out. We reviewed your request and can share additional details.",
  "original_inquiry_message": "Original investor message",
  "action_text": "View Properties",
  "action_url": "https://megna-realestate.com/properties/101",
  "footer_text": "Reply to this email if you need additional support from the Megna Team."
}
```

Contact request reply model:

```json
{
  "subject": "Reply from Megna Real Estate - Request #998",
  "logo_url": "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png",
  "title": "Megna Team replied to your contact request",
  "message": "Thanks for reaching out to Megna Real Estate. We sent a response to your request.",
  "contact_name": "Alex Johnson",
  "request_id": "998",
  "reply_message": "Thanks, we will follow up today.",
  "action_text": "Contact Us",
  "action_url": "https://megna-realestate.com/contact",
  "footer_text": "If you need anything else, reply to this email and our team will help."
}
```

Admin seller-property-submitted model:

```json
{
  "subject": "Seller submitted a property for review",
  "logo_url": "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png",
  "title": "A seller listing is ready for admin review",
  "message": "A seller submitted a property and it is now waiting in the review queue.",
  "property_id": "501",
  "seller_name": "Alex Seller",
  "seller_email": "seller@example.com",
  "property_address": "123 Main St, St Louis, MO 63101",
  "submitted_at": "2026-03-10 03:45 PM CT",
  "action_text": "Open Submitted Listings",
  "action_url": "https://megna-realestate.com/admin/queue?tab=submitted",
  "footer_text": "This notification was sent because a seller submitted a listing for review."
}
```

Seller property-published model:

```json
{
  "subject": "Your property is now published",
  "logo_url": "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png",
  "title": "Your listing is live",
  "message": "Your property passed review and is now visible to approved investors.",
  "property_id": "601",
  "property_address": "123 Main St, St Louis, MO 63101",
  "property_price": "$120000",
  "published_at": "2026-03-10 04:05 PM CT",
  "action_text": "View Listing",
  "action_url": "https://megna-realestate.com/seller/properties/601",
  "footer_text": "Need to make a change? Contact Megna support from your seller dashboard."
}
```

## Send payload example (HTTPS logo, no attachments)

```json
{
  "From": "noreply@yourdomain.com",
  "To": "user@example.com",
  "ReplyTo": "support@yourdomain.com",
  "TemplateAlias": "verify-email-cid-v1",
  "TemplateModel": {
    "subject": "Confirm your email",
    "logo_url": "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png",
    "title": "Confirm your email address",
    "message": "Click below to verify your email and finish setting up your account.",
    "action_text": "Verify Email",
    "action_url": "https://example.com/verify?token=abc123",
    "footer_text": "If you didn’t request this, you can safely ignore this email."
  },
  "MessageStream": "outbound"
}
```

For investor new-property-published emails, switch `TemplateAlias` and model values:

```json
{
  "TemplateAlias": "investor-new-property-published-cid-v1",
  "TemplateModel": {
    "subject": "New property published",
    "title": "A new property just went live",
    "message": "A listing that matches your interest has been published.",
    "property_address": "123 Main St, Dallas, TX",
    "property_price": "$975,000",
    "action_text": "View Property",
    "action_url": "https://example.com/properties/abc123",
    "footer_text": "You're receiving this because property notifications are enabled on your account."
  }
}
```

For investor signup under-review emails, switch `TemplateAlias` and model values:

```json
{
  "TemplateAlias": "investor-signup-under-review-cid-v1",
  "TemplateModel": {
    "subject": "Your Megna account is under review",
    "title": "Thanks for signing up, John",
    "message": "Your account is now under review by the Megna Team. One of our team members will reach out to you shortly.",
    "footer_text": "If you have questions, reply to this email and our team will assist you."
  }
}
```

For admin inquiry-created emails, switch `TemplateAlias` and model values:

```json
{
  "TemplateAlias": "admin-inquiry-created-cid-v1",
  "TemplateModel": {
    "subject": "New investor inquiry",
    "title": "A new investor inquiry was created",
    "message": "A new inquiry has been submitted and needs admin attention.",
    "inquiry_id": "inquiry_12345",
    "investor_name": "John Doe",
    "investor_email": "john.doe@example.com",
    "property_address": "123 Main St, Dallas, TX",
    "created_at": "2026-03-09 11:30 AM CT",
    "inquiry_message": "I am interested in this listing and want to discuss cap rate assumptions and closing timeline.",
    "action_text": "Open Inquiry",
    "action_url": "https://example.com/admin/inquiries/inquiry_12345",
    "footer_text": "This notification was sent to admins because a new inquiry was created."
  }
}
```

For admin inquiry follow-up emails, switch `TemplateAlias` and model values:

```json
{
  "TemplateAlias": "admin-inquiry-follow-up-cid-v1",
  "TemplateModel": {
    "subject": "Investor follow-up on inquiry",
    "title": "An investor sent a follow-up message",
    "message": "There is a new follow-up in an existing inquiry thread.",
    "inquiry_id": "inquiry_12345",
    "thread_id": "thread_98765",
    "investor_name": "John Doe",
    "investor_email": "john.doe@example.com",
    "property_address": "123 Main St, Dallas, TX",
    "last_message_at": "2026-03-09 2:15 PM CT",
    "previous_message_excerpt": "Can you confirm current occupancy and recent rent comps?",
    "follow_up_message": "Also, please share whether seller financing is open for discussion.",
    "action_text": "Open Inquiry Thread",
    "action_url": "https://example.com/admin/inquiries/inquiry_12345",
    "footer_text": "This notification was sent to admins because an investor followed up on an inquiry."
  }
}
```

## Integration note for this repo

Current backend sender is text-only and posts to `/email`:

- `/Users/zafaralitolibov/Documents/mv-deal-portal/backend/src/main/java/com/megna/backend/application/service/email/PostmarkEmailClient.java`
- `/Users/zafaralitolibov/Documents/mv-deal-portal/backend/src/main/java/com/megna/backend/application/service/email/TransactionalEmailRequest.java`

Backend now supports:

- `/email/withTemplate`
- `TemplateAlias`
- `TemplateModel`
