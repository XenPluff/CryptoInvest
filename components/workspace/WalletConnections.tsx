"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Link2, LoaderCircle, Unplug, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import {
  ActionForm,
  CopyButton,
  DateText,
  LoadState,
  Notice,
  Panel,
  useRemote,
} from "./shared";

type ProviderName = "MetaMask" | "Coinbase Wallet" | "Browser wallet";
type Eip1193Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  providers?: Eip1193Provider[];
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
};
type DiscoveredProvider = { provider: Eip1193Provider; name: ProviderName };
type WalletLink = {
  id: string;
  address: string;
  chainId: number;
  provider: string;
  verifiedAt: string;
};
type ActiveWallet = {
  provider: Eip1193Provider;
  address: string;
  chainId: number;
};

function providerName(provider: Eip1193Provider, rdns?: string): ProviderName {
  if (rdns === "com.coinbase.wallet" || provider.isCoinbaseWallet)
    return "Coinbase Wallet";
  if (rdns === "io.metamask" || provider.isMetaMask) return "MetaMask";
  return "Browser wallet";
}
function shortAddress(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}
function signatureHex(message: string) {
  return (
    "0x" +
    Array.from(new TextEncoder().encode(message), (value) =>
      value.toString(16).padStart(2, "0"),
    ).join("")
  );
}

export function WalletConnections({
  emailVerified,
}: {
  emailVerified: boolean;
}) {
  useDisplayLocale();
  const connections = useRemote<{ links: WalletLink[] }>(
    "/wallet-connect/links",
    emailVerified,
  );
  const discovered = useRef<DiscoveredProvider[]>([]);
  const [hasOtherWallet, setHasOtherWallet] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [active, setActive] = useState<ActiveWallet | null>(null);
  const [unlink, setUnlink] = useState<string | null>(null);

  useEffect(() => {
    const remember = (provider: Eip1193Provider, rdns?: string) => {
      if (
        !provider ||
        typeof provider.request !== "function" ||
        discovered.current.some((item) => item.provider === provider)
      )
        return;
      const name = providerName(provider, rdns);
      discovered.current.push({ provider, name });
      if (name === "Browser wallet") setHasOtherWallet(true);
    };
    const announcement = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          provider: Eip1193Provider;
          info?: { rdns?: string };
        }>
      ).detail;
      if (detail?.provider) remember(detail.provider, detail.info?.rdns);
    };
    window.addEventListener("eip6963:announceProvider", announcement);
    // Discovery never opens a wallet permission or signature prompt.
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    const injected = (window as Window & { ethereum?: Eip1193Provider })
      .ethereum;
    if (injected?.providers?.length)
      injected.providers.forEach((provider) => remember(provider));
    else if (injected) remember(injected);
    return () =>
      window.removeEventListener("eip6963:announceProvider", announcement);
  }, []);

  useEffect(() => {
    if (!active) return;
    const changed = () => {
      setActive(null);
      setMessage(
        "Your wallet account or network changed. Connect again to verify the selected account.",
      );
    };
    const disconnected = () => {
      setActive(null);
      setMessage(
        "Your wallet disconnected. Your verified ownership records remain available below.",
      );
    };
    active.provider.on?.("accountsChanged", changed);
    active.provider.on?.("chainChanged", changed);
    active.provider.on?.("disconnect", disconnected);
    return () => {
      active.provider.removeListener?.("accountsChanged", changed);
      active.provider.removeListener?.("chainChanged", changed);
      active.provider.removeListener?.("disconnect", disconnected);
    };
  }, [active]);

  async function connect(name: ProviderName) {
    setError("");
    setMessage("");
    const selected = discovered.current.find((item) => item.name === name);
    if (!selected) {
      setError(
        `${name} was not detected. Install its browser extension or open AUREON in its wallet browser, then reload this page.`,
      );
      return;
    }
    setBusy(name);
    try {
      const accounts = await selected.provider.request({
        method: "eth_requestAccounts",
      });
      if (
        !Array.isArray(accounts) ||
        typeof accounts[0] !== "string" ||
        !/^0x[0-9a-fA-F]{40}$/.test(accounts[0])
      )
        throw new Error(
          "Your wallet did not return an Ethereum-compatible account.",
        );
      const address = accounts[0];
      const rawChainId = await selected.provider.request({
        method: "eth_chainId",
      });
      const chainId =
        typeof rawChainId === "string" && /^0x[0-9a-f]+$/i.test(rawChainId)
          ? Number.parseInt(rawChainId.slice(2), 16)
          : NaN;
      if (!Number.isSafeInteger(chainId) || chainId < 1 || chainId > 2147483647)
        throw new Error(
          "This wallet network is not supported. Select a standard EVM network in your wallet.",
        );
      const challenge = await api<{ challengeId: string; message: string }>(
        "/wallet-connect/challenge",
        {
          method: "POST",
          body: JSON.stringify({ address, chainId, provider: name }),
        },
      );
      const signature = await selected.provider.request({
        method: "personal_sign",
        params: [signatureHex(challenge.message), address],
      });
      if (typeof signature !== "string")
        throw new Error("The wallet did not return a valid signature.");
      await api("/wallet-connect/verify", {
        method: "POST",
        body: JSON.stringify({ challengeId: challenge.challengeId, signature }),
      });
      setActive({ provider: selected.provider, address, chainId });
      setMessage(
        "Wallet ownership verified. Your funds remain in your wallet.",
      );
      await connections.reload();
    } catch (cause) {
      const code =
        typeof cause === "object" && cause !== null && "code" in cause
          ? Number(cause.code)
          : 0;
      setError(
        code === 4001
          ? "The wallet request was declined. You can connect again whenever you are ready."
          : cause instanceof Error
            ? cause.message
            : "Your wallet could not connect. Please try again.",
      );
    } finally {
      setBusy("");
    }
  }

  async function disconnect() {
    if (!active) return;
    setBusy("disconnect");
    setError("");
    try {
      await active.provider.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
      setMessage(
        "Wallet permission revoked. Verified ownership links are still listed below.",
      );
    } catch {
      setMessage(
        "Disconnected from this page. To revoke site access, remove AUREON from your wallet’s connected sites. Verified ownership links are still listed below.",
      );
    } finally {
      setActive(null);
      setBusy("");
    }
  }

  return <TranslatedContent>{(
    <Panel
      title="Your connected wallets"
      eyebrow="PROVE IT’S YOURS"
      action={<Wallet size={20} strokeWidth={1.5} />}
    >
      <p className="ws-panel-description">
        Connect a wallet and sign a short ownership message. Linking an address
        keeps your assets in your wallet and does not authorize a transfer.
      </p>
      {!emailVerified ? (
        <Notice>
          Verify your email before linking a wallet.{" "}
          <Link href="/dashboard/account" className="ws-text-button">
            Open account security
          </Link>
        </Notice>
      ) : (
        <>
          <div
            className="ws-form-row"
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            {(
              [
                "MetaMask",
                "Coinbase Wallet",
                ...(hasOtherWallet ? ["Browser wallet"] : []),
              ] as ProviderName[]
            ).map((name) => (
              <button
                key={name}
                className="ws-button"
                disabled={!!busy}
                onClick={() => void connect(name)}
              >
                {busy === name ? (
                  <LoaderCircle size={15} className="ws-spin" />
                ) : (
                  <Link2 size={15} />
                )}
                {busy === name ? "Check your wallet…" : `Connect ${name}`}
              </button>
            ))}
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          {message && <Notice tone="success">{message}</Notice>}
          {active && (
            <div className="ws-inline-status">
              <span className="ws-mono">
                {shortAddress(active.address)} · Chain {active.chainId}
              </span>
              <button
                className="ws-button ws-button-small"
                disabled={!!busy}
                onClick={() => void disconnect()}
              >
                <Unplug size={14} /> Disconnect
              </button>
            </div>
          )}
          <LoadState {...connections} />
          {connections.data?.links.map((link) => (
            <div
              className="ws-wallet-card"
              key={link.id}
              style={{ marginTop: 16 }}
            >
              <div className="ws-wallet-heading">
                <span className="ws-coin">
                  <Check size={18} />
                </span>
                <div>
                  <h3>{link.provider}</h3>
                  <span>
                    Chain {link.chainId} · Verified{" "}
                    <DateText value={link.verifiedAt} />
                  </span>
                </div>
                <CopyButton value={link.address} label="Address" />
              </div>
              <code title={link.address}>{shortAddress(link.address)}</code>
              {unlink === link.id ? (
                <ActionForm
                  path={`/wallet-connect/links/${link.id}`}
                  method="DELETE"
                  submit="Confirm unlink"
                  onSuccess={() => {
                    setUnlink(null);
                    void connections.reload();
                    if (active?.address.toLowerCase() === link.address)
                      setActive(null);
                  }}
                >
                  <button
                    className="ws-text-button"
                    type="button"
                    onClick={() => setUnlink(null)}
                  >
                    Keep this link
                  </button>
                </ActionForm>
              ) : (
                <button
                  className="ws-text-button"
                  onClick={() => setUnlink(link.id)}
                >
                  Unlink from AUREON <Unplug size={14} />
                </button>
              )}
            </div>
          ))}
          {!connections.loading && connections.data?.links.length === 0 && (
            <p className="ws-muted">
              No wallets linked yet. Choose a wallet above to get started.
            </p>
          )}

        </>
      )}
      <p
        className="ws-panel-description"
        style={{ marginTop: 18, marginBottom: 0 }}
      >
        WalletConnect QR pairing is not configured. MetaMask and Coinbase
        connections use their installed wallet providers. A linked wallet does
        not establish the sender or source of funds for a deposit.
      </p>
    </Panel>
  )}</TranslatedContent>;
}
