// Runs outside Render. Only public health is read; no application credentials.
export function healthyStatus(status, body) {
  return status === 200 && body?.status === "ok" && body.database === "connected" && body.emailConfigured === true && body.emailDeliveryStatus === "checks_passed";
}
export async function monitor({ origin, repository, token, request = fetch, pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)) }) {
  const target = new URL(origin);
  if (target.protocol !== "https:" || target.username || target.password || target.pathname !== "/" || target.search || target.hash) throw new Error("Configure the public HTTPS origin without credentials or a path.");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !token) throw new Error("Repository monitoring credentials are missing.");
  let healthy = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await request(`${target.origin}/api/health`, { signal: AbortSignal.timeout(15000), redirect: "error" });
      healthy = healthyStatus(result.status, await result.json());
    } catch { healthy = false; }
    if (healthy) break;
    if (attempt < 2) await pause(5000);
  }
  const api = async (path, method = "GET", body) => {
    const result = await request(`https://api.github.com/repos/${repository}${path}`, { method, headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000), redirect: "error" });
    if (!result.ok) throw new Error(`Repository alert update failed (HTTP ${result.status}).`);
    return result.status === 204 ? null : result.json();
  };
  const label = "aureon-operations";
  // Ensure the label exists. Duplicate label creation returns 422 safely.
  const labelResult = await request(`https://api.github.com/repos/${repository}/labels/${label}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(15000), redirect: "error" });
  if (labelResult.status === 404) await api("/labels", "POST", { name: label, color: "B77D34", description: "Independent AUREON availability and email readiness checks" });
  else if (!labelResult.ok) throw new Error(`Repository alert labels unavailable (HTTP ${labelResult.status}).`);
  const issues = await api(`/issues?state=open&labels=${label}&per_page=100`);
  const marker = "<!-- aureon-independent-monitor -->";
  const existing = issues.find(issue => !issue.pull_request && issue.body?.includes(marker));
  const time = new Date().toISOString();
  if (!healthy && !existing) await api("/issues", "POST", { title: "[AUREON monitor] Service needs attention", labels: [label], body: `${marker}\n\nThe independent check could not confirm healthy website/database availability and email readiness after three attempts.\n\nWebsite: ${target.origin}\nObserved at: ${time}\n\nCheck Render service status, database connectivity, and email readiness. This notice includes no investor data or credentials. This issue closes automatically after a healthy check. Repository notification preferences control email delivery.` });
  if (healthy && existing) {
    await api(`/issues/${existing.number}/comments`, "POST", { body: `Availability and email readiness checks recovered at ${time}.` });
    await api(`/issues/${existing.number}`, "PATCH", { state: "closed", state_reason: "completed" });
  }
  return { healthy, openAlert: !healthy, checkedAt: time };
}
if (process.argv[1]?.endsWith("check-uptime.mjs")) {
  monitor({ origin: process.env.AUREON_MONITOR_ORIGIN || "", repository: process.env.GITHUB_REPOSITORY || "", token: process.env.GITHUB_TOKEN || "" }).then(result => { console.log(JSON.stringify(result)); if (!result.healthy) process.exitCode = 1; }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
