"use client";

import { Languages } from "lucide-react";
import { isLocale, localeNames, supportedLocales, useLocale, useTranslation } from "@/lib/i18n";
import "./language.css";

export default function LanguageSelector() {
  const { locale, t } = useTranslation();
  const setLocale = useLocale((state) => state.setLocale);
  const loading = useLocale(state => state.loading);
  const error = useLocale(state => state.error);
  return (
    <label className="language-selector">
      <Languages size={15} aria-hidden="true" />
      <span className="sr-only">{t("Language")}</span>
      <select
        aria-label={t("Language")}
        value={locale}
        aria-busy={loading}
        title={loading ? t("Loading language…") : t("Website language")}
        onChange={(event) => {
          if (isLocale(event.target.value)) void setLocale(event.target.value);
        }}
      >
        {supportedLocales.map(code => <option key={code} value={code} lang={code} dir={code === "ar" ? "rtl" : "ltr"}>{code.toUpperCase()} · {localeNames[code]}</option>)}
      </select>
      {error && <span role="alert" className="language-error">{t("Language could not load. Please try again.")}</span>}
    </label>
  );
}
