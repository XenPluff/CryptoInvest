"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import { useState, type FormEvent } from "react";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
export function ContactForm() {
  useDisplayLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setError("");
    setSuccess("");
    setPending(true);
    try {
      const result = await api<{ message: string }>("/contact", {
        method: "POST",
        body: JSON.stringify({
          name: String(fields.get("name")).trim(),
          email: String(fields.get("email")).trim(),
          subject: String(fields.get("subject")).trim(),
          message: String(fields.get("message")).trim(),
        }),
      });
      setSuccess(
        result.message || "Your message has been saved for the support team.",
      );
      form.reset();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Your message could not be submitted. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }
  return <TranslatedContent>{(
    <form onSubmit={submit} className="public-form">
      {error && (
        <div role="alert" className="public-form-message error">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="public-form-message success">
          <CheckCircle2
            size={14}
            style={{
              display: "inline",
              verticalAlign: "middle",
              marginRight: 8,
            }}
          />
          {success}
        </div>
      )}
      <div className="public-form-row">
        <div className="public-form-field">
          <label htmlFor="contact-name">Your name</label>
          <input
            id="contact-name"
            name="name"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            required
            placeholder="Full name"
          />
        </div>
        <div className="public-form-field">
          <label htmlFor="contact-email">Email address</label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            placeholder="you@example.com"
          />
        </div>
      </div>
      <div className="public-form-field">
        <label htmlFor="contact-subject">What can we help with?</label>
        <select id="contact-subject" name="subject" required defaultValue="">
          <option value="" disabled>
            Select a topic
          </option>
          <option value="Account access and verification">
            Account access & verification
          </option>
          <option value="Identity verification review">
            Identity verification
          </option>
          <option value="Deposit or withdrawal question">
            Deposits & withdrawals
          </option>
          <option value="Investment plan information">
            Investment plan information
          </option>
          <option value="Security concern">Security concern</option>
          <option value="Privacy or data request">
            Privacy & data request
          </option>
          <option value="General enquiry">General enquiry</option>
        </select>
      </div>
      <div className="public-form-field">
        <label htmlFor="contact-message">Your message</label>
        <textarea
          id="contact-message"
          name="message"
          minLength={10}
          maxLength={5000}
          required
          placeholder="Tell us how we can help. Please include relevant transaction references, but never passwords, private keys or authentication codes."
        />
      </div>
      <p className="plan-caption">
        Your details are used to review and respond to this enquiry. Sending
        this form saves a message to the support queue; it does not initiate a
        transaction.
      </p>
      <button className="button button-gold" type="submit" disabled={pending}>
        {pending ? "Sending your message…" : "Send message"}{" "}
        <ArrowUpRight size={15} />
      </button>
    </form>
  )}</TranslatedContent>;
}
