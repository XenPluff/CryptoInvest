"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { RecordData } from "./shared";

/** Refresh recorded account data without replacing the page or inventing local credits. */
export function usePortfolioRemote<T = RecordData>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [status, setStatus] = useState(0);
  const request = useRef<AbortController | null>(null);
  const hasData = useRef(false);
  const reload = useCallback(async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    if (!hasData.current) setLoading(true);
    setRefreshing(true);
    setError("");
    setRefreshError("");
    try {
      const next = await api<T>(path, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]) });
      if (controller.signal.aborted) return;
      setData(next); hasData.current = true; setStatus(200);
      setUpdatedAt(new Date().toISOString());
    } catch (e) {
      if (controller.signal.aborted) return;
      const message = e instanceof Error ? e.message : "The request could not be completed.";
      const code = e instanceof ApiError ? e.status : 500;
      setStatus(code);
      if (!hasData.current || code === 401 || code === 403) {
        setError(message); setData(null); hasData.current = false;
      } else setRefreshError(message);
    } finally {
      if (request.current === controller) {
        request.current = null;
        if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); }
      }
    }
  }, [path]);
  useEffect(() => {
    hasData.current = false; setData(null); setLoading(true); setUpdatedAt(null);
    void reload();
    const refreshVisible = () => { if (!document.hidden && navigator.onLine) void reload(); };
    const timer = setInterval(refreshVisible, 15_000);
    window.addEventListener("focus", refreshVisible);
    window.addEventListener("online", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
      window.removeEventListener("online", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
      request.current?.abort(); request.current = null;
    };
  }, [reload]);
  return { data, loading, error, refreshError, refreshing, updatedAt, status, reload };
}
