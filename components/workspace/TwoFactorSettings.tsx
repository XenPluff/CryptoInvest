"use client";
import {useState} from "react";
import {ArrowUpRight,Shield} from "lucide-react";
import TranslatedContent from "@/components/TranslatedContent";
import {useDisplayLocale} from "@/lib/i18n";
import {api} from "@/lib/api";
import {ActionForm,Badge,CopyButton,Field,Notice,Panel,type RecordData} from "./shared";

export function TwoFactorSettings({user,refreshUser}:{user:RecordData;refreshUser:()=>void}) {
  useDisplayLocale();
  const [twoFactor,setTwoFactor]=useState<RecordData|null>(null);
  const [setupError,setSetupError]=useState("");
  const [setupBusy,setSetupBusy]=useState(false);
  return <TranslatedContent>{(
        <Panel
          title="Two-factor authentication"
          eyebrow="AN EXTRA LAYER"
          action={
            <Badge value={user.twoFactorEnabled ? "enabled" : "disabled"} />
          }
        >
          <div className="ws-security-visual">
            <Shield size={45} strokeWidth={1} />
          </div>
          <p className="ws-panel-description">
            {user.role === "ADMIN"
              ? "Two-factor authentication is mandatory for administrator sign-in and every administrator change. It cannot be disabled from this account."
              : "Two-factor authentication is optional. When enabled, enter a code at sign-in and when requesting a withdrawal. Confirm one code when setting up your authenticator."}
          </p>
          {setupError && <Notice tone="error">{setupError}</Notice>}
          {user.role === "ADMIN" && user.twoFactorEnabled ? (
            <Notice tone="success">Administrator two-factor protection is enabled and required.</Notice>
          ) : user.twoFactorEnabled ? (
            <ActionForm
              path="/auth/2fa/disable"
              submit="Disable two-factor authentication"
              onSuccess={refreshUser}
            >
              <Field
                label="Current password"
                name="password"
                type="password"
                required
              />
            </ActionForm>
          ) : twoFactor ? (
            <>
              <Notice>
                Save the setup key in your authenticator app. Never share it
                with anyone.
              </Notice>
              <div className="ws-copy-field">
                <code>{twoFactor.secret}</code>
                <CopyButton value={twoFactor.secret} label="Key" />
              </div>
              <a className="ws-text-button" href={twoFactor.otpauthUrl}>
                Open in authenticator app <ArrowUpRight size={15} />
              </a>
              <ActionForm
                path="/auth/2fa/enable"
                submit="Enable two-factor authentication"
                onSuccess={() => {
                  setTwoFactor(null);
                  refreshUser();
                }}
              >
                <Field
                  label="Authenticator code"
                  name="code"
                  required
                  placeholder="Enter the current 6-digit code"
                />
              </ActionForm>
            </>
          ) : (
            <button
              disabled={setupBusy}
              className="ws-button ws-button-gold"
              onClick={async () => {
                setSetupBusy(true);
                setSetupError("");
                try {
                  setTwoFactor(
                    await api("/auth/2fa/setup", { method: "POST" }),
                  );
                } catch (e) {
                  setSetupError(
                    e instanceof Error
                      ? e.message
                      : "Could not set up authentication.",
                  );
                } finally {
                  setSetupBusy(false);
                }
              }}
            >
              {setupBusy ? "Preparing…" : "Set up authenticator"}
              <ArrowUpRight size={16} />
            </button>
          )}
        </Panel>
  )}</TranslatedContent>;
}
