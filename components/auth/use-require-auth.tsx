"use client";

import { useCallback, useState } from "react";
import { AuthPrompt } from "@/components/auth/auth-prompt";
import { useAuthMode } from "@/components/auth/use-auth-mode";

type RequireAuthOptions = {
  title?: string;
  description?: string;
};

export function useRequireAuth(options?: RequireAuthOptions) {
  const { isAuthenticated } = useAuthMode();
  const [showPrompt, setShowPrompt] = useState(false);

  const requireAuth = useCallback(
    (action: () => void) => {
      if (isAuthenticated) {
        action();
      } else {
        setShowPrompt(true);
      }
    },
    [isAuthenticated],
  );

  const AuthPromptModal = (
    <AuthPrompt
      open={showPrompt}
      onClose={() => setShowPrompt(false)}
      title={options?.title}
      description={options?.description}
    />
  );

  return { requireAuth, AuthPromptModal, isAuthenticated };
}