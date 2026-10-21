"use client";

import { Children, cloneElement, isValidElement, type ReactNode, type ReactElement, useMemo } from "react";
import { useTranslation } from "@/lib/i18n";

/** Marks private records, user-authored content and identifiers as verbatim. */
export function Verbatim({ children }: { children: ReactNode }) {
  return <bdi translate="no">{children}</bdi>;
}

/** Translates React nodes without mutating the DOM, event handlers or submitted values. */
export default function TranslatedContent({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return useMemo(() => {
    function visit(value: ReactNode): ReactNode {
      if (typeof value === "string") return t(value);
      if (Array.isArray(value)) {
        const result: ReactNode[] = [];
        let run: (string | number)[] = [];
        const flush = () => {
          if (!run.length) return;
          const joined = run.join("");
          const translated = t(joined);
          result.push(...(translated === joined ? run.map(part => typeof part === "string" ? t(part) : part) : [translated, ...run.slice(1).map(() => null)]));
          run = [];
        };
        value.forEach(child => {
          if (typeof child === "string" || typeof child === "number") run.push(child);
          else { flush(); result.push(visit(child)); }
        });
        flush();
        return result;
      }
      if (!isValidElement(value)) return value;
      const element = value as ReactElement<Record<string, any>>;
      const { type, props } = element;
      if (type === TranslatedContent || type === Verbatim || props.translate === "no" || props["data-no-translate"] || typeof type === "string" && ["script", "style", "code", "pre", "track"].includes(type)) return element;
      const changed: Record<string, any> = {};
      for (const name of ["aria-label", "aria-description", "aria-valuetext", "alt", "title", "placeholder"]) {
        if (typeof props[name] === "string") changed[name] = t(props[name]);
      }
      // An option's submitted value must not change when its display text changes.
      if (type === "option" && props.value === undefined) changed.value = Children.toArray(props.children).filter(part => typeof part === "string" || typeof part === "number").join("");
      if (props.children !== undefined && type !== "textarea") changed.children = visit(props.children);
      return cloneElement(element, changed);
    }
    return <>{visit(children)}</>;
  }, [children, t]);
}
