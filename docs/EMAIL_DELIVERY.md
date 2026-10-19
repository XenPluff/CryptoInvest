# Enable account email on the Render preview

The public support inbox supplied by the owner is `aurreon.support@gmail.com`.
Gmail SMTP cannot be used by the current Render free web service, which blocks
outbound SMTP ports. The application supports Brevo's HTTPS transactional API
for verification links, password recovery, and the existing notification queue.

## Owner account steps

1. Create a free account at <https://app.brevo.com/account/register> using the
   project inbox. Complete the account information and any activation review
   Brevo requests. Transactional sending must be enabled on the account.
2. In Brevo's sender settings, add `aurreon.support@gmail.com` as a sender named
   `AUREON`. Complete Brevo's verification using the code/link sent to that inbox.
3. Create an **API key**, not an SMTP key, in Brevo's API-key settings.
4. Open the `aureon-preview` service in the Render dashboard, then Environment.
   Save the real API key as the secret environment variable `BREVO_API_KEY`.
   Keep these non-secret settings:

   ```dotenv
   EMAIL_PROVIDER=brevo
   BREVO_SENDER_EMAIL=aurreon.support@gmail.com
   ```

5. Save and deploy the updated environment. Never paste the key or Gmail
   password into chat, commit it, or put it in the blueprint. A cloud-workspace
   proxy binding is not raw key material to copy into Render.

The app explicitly selects Brevo on this preview, so old Resend settings do not
take precedence. If Brevo's key is absent, public health continues to report
`emailConfigured:false`. A present key is configuration evidence only; Brevo
sender verification, account permissions, quotas, and actual delivery still need
to be checked.

## Free Gmail sender behavior

Brevo temporarily replaces free-domain sender addresses with its own compliant
transactional sending domain (for example, an address ending in
`t-sender-sib.com`). The app sets Reply-To to `aurreon.support@gmail.com`.
Recipients may therefore see an address from Brevo's domain as the sender.
This is suitable for testing the preview without buying a domain; Brevo describes
it as a temporary measure. Register and authenticate an owned sending domain
before relying on a permanent branded sender.

## Check the complete account flow

After the owner enables sending and enters the key, check Render health and the
Brevo account/sender status. With the owner's instruction to send a test message,
register a controlled test account, receive and open the verification link,
then request and complete a password reset. Links must use the exact live
`https://aureon-preview.onrender.com` origin. Never skip verification or expose
tokens in public API responses to make registration appear operational.

The app requires a successful API response with a non-empty `messageId` before
recording provider acceptance. Rejections, quota errors, invalid responses, and
timeouts return a safe error without exposing credentials or provider bodies.
An accepted message is not proof of inbox delivery. The existing worker retries
queued activity notifications with backoff; registration and reset requests
surface delivery failures through their existing error handling.

## Local development

Use the local Mailpit service without contacting a real provider:

```sh
EMAIL_PROVIDER=smtp RESEND_API_KEY= BREVO_API_KEY= npm run dev
```

References:

- <https://developers.brevo.com/docs/send-a-transactional-email>
- <https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders>
- <https://render.com/docs/free>
