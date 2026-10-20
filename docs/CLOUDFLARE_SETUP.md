# Cloudflare agent setup

Setup source: <https://developers.cloudflare.com/agent-setup/prompt.md>.
Verified October 20, 2026.

## Installed in this cloud environment

- All 19 official Cloudflare skills are installed in
  `/home/agent/.agents/skills`, using the Codex agent target.
- Codex MCP configuration is saved in
  `/run/codex-environment/codex-home/config.toml`:

  ```toml
  [mcp_servers.cloudflare]
  url = "https://mcp.cloudflare.com/mcp"
  ```

- `codex mcp list --json` confirms the connection is enabled, with
  `auth_status: not_logged_in`.
- A read-only initialization check reaches the official HTTPS endpoint and
  receives HTTP 401, confirming account authorization is still required.
- The optional beta `cf` CLI was not installed. No user-level instruction file
  was changed to require it.

The executed installation commands were:

```sh
npx -y skills add cloudflare/skills --skill '*' --yes --global --agent codex
codex mcp add cloudflare --url https://mcp.cloudflare.com/mcp
```

New Codex sessions must reload/restart to load newly configured MCP servers.
These settings apply to the cloud environment, not automatically to a local
computer or the tools already attached to this running chat.

## Account authorization remains pending

Cloudflare OAuth was attempted using the Codex login command and permissions
limited to account identification and R2 storage. This environment cannot
complete its interactive browser callback: the CLI requires the callback URL
through a hidden terminal input, which this chat does not expose securely.
No account authorization, API token, bucket, storage subscription, or backup
upload has been created. Do not paste OAuth callback URLs, authentication codes,
passwords, or private recovery keys into chat. Complete account authorization
through a trusted Codex client with secure MCP OAuth sign-in.

For AUREON, the website remains on Render. Cloudflare R2 is intended only for
private encrypted backups. Its storage configuration is separate from MCP
OAuth: see [backup and recovery](BACKUP_RECOVERY.md) for private-bucket creation,
bucket-scoped S3 credentials entered through Render's secure environment
settings, retention, and verification. Automatic off-site backups remain disabled
until private storage and the owner's recovery kit are configured.
