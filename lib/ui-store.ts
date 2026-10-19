"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
type Preferences = {
  theme: "dark" | "light";
  currency: "USD" | "EUR" | "GBP";
  setTheme: (theme: "dark" | "light") => void;
  setCurrency: (currency: "USD" | "EUR" | "GBP") => void;
};
export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      theme: "dark",
      currency: "USD",
      setTheme: (theme) => set({ theme }),
      setCurrency: (currency) => set({ currency }),
    }),
    { name: "aureon-preferences" },
  ),
);
