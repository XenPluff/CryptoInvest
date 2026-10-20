# Administrator setup

The owner selected `aurreon.support@gmail.com` for administrator access and
reported successful email verification and sign-in. The previously proposed
`+admin` alias is not the selected account.

## Current status

The owner-requested retry succeeded on October 20, 2026. Deployment
`dep-dbbncc8n74is73d95ut0` of commit
`d468acd03054fd58faa3fa25384dc170bb6dd0e0` became live using the verified
`--promote-admin` startup command. The launcher only starts the web service after
the operator command succeeds, confirming administrator access for the selected
verified account. The earlier failed attempts are historical; their dashboard
log request is no longer needed.

Normal Docker Command was restored to `npm run start:render`, and temporary
`ADMIN_EMAIL`/`ADMIN_NAME` settings were removed. Live health is 200 with database
connected, funding enabled, and email checks passed; unauthenticated admin API
access remains 401. No password was collected or reset. The owner must sign in
again and complete authenticator enrollment if needed; enrollment has not been
independently confirmed. The operator CLI passed eight real PostgreSQL checks,
including its compiled subprocess.

## Existing verified account

An operator with access to the deployment environment can set `ADMIN_EMAIL`
and run:

```sh
npm run admin:promote
```

In an already-built production image, the equivalent command is:

```sh
node dist/scripts/promote-admin.js
```

This is an operator command, with no public HTTP role-grant endpoint. It refuses
missing, unverified, and suspended accounts. It locks the selected user row,
changes only the role, revokes active sessions and outstanding password-reset
tokens, and records `ADMIN_ROLE_GRANTED` with operator provenance. The password,
authenticator, verified email, passkeys, balances, investments, and transaction
history are preserved. Repeating the command for an eligible administrator
does not change credentials or revoke newly created sessions.

For this Render free service, the one-time operator command can be run before
the normal startup command by temporarily setting its Docker Command to:

```sh
node scripts/start-render.mjs --promote-admin
```

The launcher applies migrations and seeds, then runs the explicit operator
command. The normal web server only starts after that command succeeds. After
the deployment reports live, restore Docker Command to `npm run start:render`
and remove temporary operator environment settings. Never put a password in
the Docker Command or chat. An existing account uses its current password.

## New administrator account

`npm run admin:create` remains available for an unused email address. It requires
`ADMIN_EMAIL`, a unique `ADMIN_PASSWORD` of at least 14 characters and at most
72 UTF-8 bytes, and optionally `ADMIN_NAME`, supplied through secure settings.
It refuses to overwrite or promote an existing account. Remove the temporary
password from deployment settings after successful provisioning.

## Sign in and enroll an authenticator

After promotion, sign in again at `/login` and open `/admin`. If prompted, use
**Account & security** at `/dashboard/account`, enroll an authenticator app, and confirm its six-digit
code. The owner must perform enrollment on their own device; passwords, setup
secrets, and authentication codes should never be shared in chat. Financial
administration continues to require current TOTP. Withdrawal approval and paid
reconciliation retain their separate-administrator requirement.

## Validation

```sh
npm run test:integration -- --admin-provisioning
```

The helper creates and drops its own disposable PostgreSQL database. Eight
checks cover credential/fund preservation, session and reset-token revocation,
audit records, repeat and concurrent grants, ineligible accounts, and missing
or invalid target addresses, plus a compiled CLI subprocess check. It does not
modify the application database. Run `npm run build` before this check so the
compiled command is available.
