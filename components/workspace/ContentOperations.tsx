"use client";
import { useState } from "react";
import { FileText, Mail, Plus, X } from "lucide-react";
import {
  ActionForm,
  Badge,
  DateText,
  Empty,
  Field,
  LoadState,
  Notice,
  Panel,
  RecordData,
  useModalFocus,
  useRemote,
} from "./shared";

function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useModalFocus(onClose);
  return (
    <div className="ws-modal-backdrop" onClick={onClose}>
      <section
        className="ws-modal ws-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="ws-modal-close"
          aria-label="Close editor"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <span className="ws-eyebrow">OPERATOR WORKSPACE</span>
        <h2 id="content-dialog-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}
export function ContentOperations() {
  const r = useRemote("/admin/content");
  const [editor, setEditor] = useState<RecordData | null>(null);
  const [review, setReview] = useState<RecordData | null>(null);
  return (
    <>
      <Notice>
        Articles, announcements, and FAQ answers appear publicly after an
        administrator publishes them. Content is displayed as plain text.
        Publication changes require your current authenticator code and are
        audited.
      </Notice>
      <Panel
        title="Publications"
        eyebrow="CONTENT LIBRARY"
        action={
          <button
            className="ws-button ws-button-gold"
            onClick={() => setEditor({ kind: "ARTICLE" })}
          >
            <Plus size={16} /> New draft
          </button>
        }
      >
        <LoadState {...r} />
        {r.data?.entries?.length ? (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Publication</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {r.data.entries.map((entry: RecordData) => (
                  <tr key={entry.id}>
                    <td>
                      <strong>{entry.title}</strong>
                      <small>/{entry.slug}</small>
                    </td>
                    <td>{entry.kind}</td>
                    <td>
                      <Badge value={entry.status} />
                    </td>
                    <td>
                      <DateText value={entry.updatedAt} />
                    </td>
                    <td>
                      <button
                        className="ws-button ws-button-small"
                        onClick={() =>
                          entry.status === "DRAFT"
                            ? setEditor(entry)
                            : setReview(entry)
                        }
                      >
                        {entry.status === "DRAFT" ? "Edit draft" : "Review"}
                      </button>
                      {entry.status === "DRAFT" && (
                        <button
                          className="ws-button ws-button-small"
                          onClick={() => setReview(entry)}
                        >
                          Publish
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !r.loading &&
          !r.error && (
            <Empty title="Your publication library is empty" icon={FileText}>
              Create a draft to share an announcement, article, or frequently
              asked question. No content is published automatically.
            </Empty>
          )
        )}
      </Panel>
      {editor && (
        <Dialog
          title={
            editor.id ? "Edit publication draft" : "Create a publication draft"
          }
          onClose={() => setEditor(null)}
        >
          <ActionForm
            path={editor.id ? `/admin/content/${editor.id}` : "/admin/content"}
            method={editor.id ? "PATCH" : "POST"}
            submit="Save draft"
            onSuccess={() => {
              setEditor(null);
              void r.reload();
            }}
          >
            <div className="ws-form-row">
              <Field label="Content type" name="kind">
                <select name="kind" defaultValue={editor.kind || "ARTICLE"}>
                  <option value="ARTICLE">Journal article</option>
                  <option value="ANNOUNCEMENT">Announcement</option>
                  <option value="FAQ">FAQ answer</option>
                </select>
              </Field>
              <Field
                label="URL slug"
                name="slug"
                required
                defaultValue={editor.slug}
                placeholder="understanding-digital-assets"
                help="Lowercase letters, numbers, and hyphens."
              />
            </div>
            <Field
              label="Title or question"
              name="title"
              required
              defaultValue={editor.title}
            />
            <Field label="Summary" name="summary">
              <textarea
                name="summary"
                rows={2}
                required
                minLength={3}
                maxLength={500}
                defaultValue={editor.summary}
              />
            </Field>
            <Field
              label="Publication text"
              name="body"
              help="Plain text only. Separate paragraphs with a blank line; embedded HTML is never rendered."
            >
              <textarea
                name="body"
                rows={12}
                required
                minLength={10}
                maxLength={20000}
                defaultValue={editor.body}
              />
            </Field>
          </ActionForm>
        </Dialog>
      )}
      {review && (
        <Dialog title="Review publication" onClose={() => setReview(null)}>
          <Badge value={review.status} />
          <h3>{review.title}</h3>
          <p className="ws-muted">{review.summary}</p>
          <div
            style={{
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              maxHeight: 280,
              overflowY: "auto",
              lineHeight: 1.8,
              margin: "20px 0",
            }}
          >
            {review.body}
          </div>
          <ActionForm
            path={`/admin/content/${review.id}/status`}
            submit="Confirm publication change"
            onSuccess={() => {
              setReview(null);
              void r.reload();
            }}
          >
            <Field label="Publication status" name="status">
              <select
                name="status"
                defaultValue={review.status === "DRAFT" ? "PUBLISHED" : "DRAFT"}
              >
                <option value="PUBLISHED">
                  Published — visible to everyone
                </option>
                <option value="DRAFT">Draft — private and editable</option>
                <option value="ARCHIVED">
                  Archived — removed from public view
                </option>
              </select>
            </Field>
            <Field
              label="Authenticator code"
              name="code"
              required
              placeholder="6-digit code"
            />
            <label className="ws-checkbox">
              <input type="checkbox" required /> I have reviewed this content
              and authorize the selected visibility.
            </label>
          </ActionForm>
        </Dialog>
      )}
    </>
  );
}
export function CampaignOperations() {
  const r = useRemote("/admin/campaigns");
  const [editor, setEditor] = useState<RecordData | null>(null);
  const [review, setReview] = useState<RecordData | null>(null);
  const [archive, setArchive] = useState<RecordData | null>(null);
  const counts = r.data?.subscriberCounts;
  return (
    <>
      <Notice>
        Only subscribers who confirmed their email consent receive campaigns.
        Every message includes an unsubscribe link, and consent is checked again
        before delivery. A campaign sends only after an explicit queue
        confirmation.
      </Notice>
      <div className="ws-stats-grid">
        {[
          ["Confirmed subscribers", counts?.confirmed ?? "—"],
          ["Awaiting confirmation", counts?.pending ?? "—"],
          ["Unsubscribed", counts?.unsubscribed ?? "—"],
        ].map(([label, value]) => (
          <div className="ws-stat-card" key={label}>
            <span className="ws-stat-top">
              {label}
              <Mail size={17} />
            </span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <Panel
        title="Newsletter campaigns"
        eyebrow="CONSENT-BASED COMMUNICATION"
        action={
          <button
            className="ws-button ws-button-gold"
            onClick={() => setEditor({})}
          >
            <Plus size={16} /> New campaign
          </button>
        }
      >
        <LoadState {...r} />
        {r.data && !r.data.emailConfigured && (
          <Notice>
            Email delivery must be configured before a campaign can be queued.
            You can prepare drafts now.
          </Notice>
        )}
        {r.data?.campaigns?.length ? (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Queued recipients</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {r.data.campaigns.map((campaign: RecordData) => (
                  <tr key={campaign.id}>
                    <td>
                      <strong>{campaign.title}</strong>
                      <small>{campaign.subject}</small>
                    </td>
                    <td>
                      <Badge value={campaign.status} />
                    </td>
                    <td>{campaign._count?.recipients ?? 0}</td>
                    <td>
                      <DateText value={campaign.updatedAt} />
                    </td>
                    <td>
                      {campaign.status === "DRAFT" && (
                        <button
                          className="ws-button ws-button-small"
                          onClick={() => setEditor(campaign)}
                        >
                          Edit
                        </button>
                      )}
                      {campaign.status !== "ARCHIVED" && (
                        <>
                          <button
                            className="ws-button ws-button-small"
                            onClick={() => setReview(campaign)}
                          >
                            Review & queue
                          </button>
                          <button
                            className="ws-button ws-button-small"
                            onClick={() => setArchive(campaign)}
                          >
                            Archive
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !r.loading &&
          !r.error && (
            <Empty title="No campaigns yet" icon={Mail}>
              Create a campaign draft. Saving a draft does not queue or send
              email.
            </Empty>
          )
        )}
        <p className="ws-panel-description">
          Queued counts represent unique recipient records. Provider acceptance
          and inbox delivery are separate events; no inbox delivery guarantee is
          implied.
        </p>
      </Panel>
      {editor && (
        <Dialog
          title={editor.id ? "Edit campaign draft" : "Create campaign draft"}
          onClose={() => setEditor(null)}
        >
          <ActionForm
            path={
              editor.id ? `/admin/campaigns/${editor.id}` : "/admin/campaigns"
            }
            method={editor.id ? "PATCH" : "POST"}
            submit="Save campaign draft"
            onSuccess={() => {
              setEditor(null);
              void r.reload();
            }}
          >
            <Field
              label="Internal campaign name"
              name="title"
              required
              defaultValue={editor.title}
            />
            <Field
              label="Email subject"
              name="subject"
              required
              defaultValue={editor.subject}
            />
            <Field
              label="Email message"
              name="message"
              help="Plain text. The unsubscribe link and consent footer are added automatically."
            >
              <textarea
                name="message"
                rows={12}
                required
                minLength={20}
                maxLength={12000}
                defaultValue={editor.message}
              />
            </Field>
          </ActionForm>
        </Dialog>
      )}
      {review && (
        <Dialog
          title="Review and queue a campaign batch"
          onClose={() => setReview(null)}
        >
          <h3>{review.subject}</h3>
          <p
            style={{
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              maxHeight: 280,
              overflowY: "auto",
              lineHeight: 1.8,
            }}
          >
            {review.message}
          </p>
          <Notice>
            Queue up to 100 confirmed subscribers per action. Already queued
            recipients are excluded. The campaign text becomes immutable after
            its first batch.
          </Notice>
          <ActionForm
            path={`/admin/campaigns/${review.id}/queue`}
            submit="Queue confirmed subscriber batch"
            disabled={!r.data?.emailConfigured}
            transform={(d) => ({
              confirmation: d.confirmation,
              code: d.code,
              batchSize: Number(d.batchSize),
            })}
            onSuccess={() => {
              void r.reload();
            }}
          >
            <Field
              label="Maximum recipients in this batch"
              name="batchSize"
              type="number"
              required
              min={1}
              max={100}
              step={1}
              defaultValue={100}
            />
            <Field
              label="Type QUEUE CAMPAIGN to confirm"
              name="confirmation"
              required
              placeholder="QUEUE CAMPAIGN"
            />
            <Field
              label="Authenticator code"
              name="code"
              required
              placeholder="6-digit code"
            />
            <label className="ws-checkbox">
              <input type="checkbox" required /> I authorize delivery of this
              message to this batch of confirmed subscribers.
            </label>
          </ActionForm>
        </Dialog>
      )}
      {archive && (
        <Dialog title="Archive campaign" onClose={() => setArchive(null)}>
          <p>
            Archive “{archive.title}” and cancel its pending messages. Messages
            already accepted by the provider cannot be recalled.
          </p>
          <ActionForm
            path={`/admin/campaigns/${archive.id}/archive`}
            submit="Archive and cancel pending messages"
            onSuccess={() => {
              setArchive(null);
              void r.reload();
            }}
          >
            <Field
              label="Authenticator code"
              name="code"
              required
              placeholder="6-digit code"
            />
          </ActionForm>
        </Dialog>
      )}
    </>
  );
}
