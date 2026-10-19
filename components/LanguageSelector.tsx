"use client";

import { useEffect } from "react";
import { Languages } from "lucide-react";
import { isLocale, useLocale, useTranslation } from "@/lib/i18n";
import "./language.css";

export default function LanguageSelector() {
  const { locale, t } = useTranslation();
  const setLocale = useLocale((state) => state.setLocale);
  useEffect(() => {
    void useLocale.persist.rehydrate();
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <label className="language-selector">
      <Languages size={15} aria-hidden="true" />
      <span className="sr-only">{t("Language")}</span>
      <select
        aria-label={t("Language")}
        value={locale}
        onChange={(event) => {
          if (isLocale(event.target.value)) setLocale(event.target.value);
        }}
      >
        <option value="en" lang="en">
          EN
        </option>
        <option value="fr" lang="fr">
          FR
        </option>
      </select>
    </label>
  );
}
