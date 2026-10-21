"use client";
import { displayLocale } from "./i18n";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      data.error || "The request could not be completed.",
      response.status,
    );
  return data;
}
export const money = (amount: number, currency = "USD") =>
  new Intl.NumberFormat(displayLocale(), {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
