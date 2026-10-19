import { EnvHttpProxyAgent } from "undici";
// Reuse the environment's supported proxy route and trusted CA configuration.
// No certificate checks are disabled, and no proxy credentials are logged.
const proxyDispatcher =
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY ||
  process.env.https_proxy ||
  process.env.http_proxy
    ? new EnvHttpProxyAgent()
    : undefined;
export function externalFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  if (new URL(url).protocol !== "https:")
    throw new Error("External services require verified HTTPS.");
  return fetch(url, {
    ...options,
    ...(proxyDispatcher ? { dispatcher: proxyDispatcher } : {}),
  } as RequestInit);
}
