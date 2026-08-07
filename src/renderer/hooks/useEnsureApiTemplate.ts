import { useEffect, useRef } from "react";
import { looksLikeApiTemplateId, templateLayoutFromApi } from "../../shared/apiTemplate";
import type { ApiTemplateKind } from "../../shared/apiTemplate";
import type { TemplateLayout } from "../../shared/types";
import * as templatesApi from "../../services/templatesApi";
import { useAuth } from "../context/AuthContext";

/**
 * If the draft still has a local/default template, replace it with the first
 * active template from the API (once per mount).
 */
export function useEnsureApiTemplate(
  template: TemplateLayout,
  onApply: (layout: TemplateLayout) => void,
  kind: ApiTemplateKind = "product",
): void {
  const { accessToken } = useAuth();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (appliedRef.current || !accessToken) return;

    const hasRemoteImage = /^https?:\/\//i.test(template.backgroundImagePath.trim());
    if (hasRemoteImage || looksLikeApiTemplateId(template.id)) {
      appliedRef.current = true;
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const list = await templatesApi.listTemplates({
          kind,
          accessToken,
          limit: 1,
        });
        const first = list.items[0];
        if (!first || cancelled) return;
        const detail = await templatesApi.getTemplate(first.id, accessToken);
        if (cancelled) return;
        appliedRef.current = true;
        onApply(templateLayoutFromApi(detail));
      } catch {
        // Keep local fallback if API is unreachable.
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [accessToken, kind, onApply, template.backgroundImagePath, template.id]);
}
