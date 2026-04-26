"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import type { GoogleLoginResponse } from "@/lib/auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            auto_select?: boolean;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, string | number>,
          ) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

function statusTone(status?: GoogleLoginResponse["status"]) {
  if (status === "APPROVED") {
    return "success";
  }
  if (status === "PENDING") {
    return "warning";
  }
  return "danger";
}

export function LoginShell() {
  const router = useRouter();
  const { user, loading, signInWithGoogle } = useAuth();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GoogleLoginResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user?.status === "APPROVED") {
      router.replace("/");
    }
  }, [loading, router, user]);

  const resetGoogleSelection = () => {
    if (!window.google?.accounts?.id) {
      return;
    }
    window.google.accounts.id.disableAutoSelect();
    setError("");
    setResult(null);
  };

  useEffect(() => {
    if (!scriptReady || !GOOGLE_CLIENT_ID || !buttonRef.current || !window.google?.accounts?.id) {
      return;
    }

    buttonRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      auto_select: false,
      callback: async ({ credential }) => {
        try {
          setBusy(true);
          setError("");
          const next = await signInWithGoogle(credential);
          setResult(next);
          if (next.status === "APPROVED") {
            router.replace("/");
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Google sign-in failed.");
        } finally {
          setBusy(false);
        }
      },
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: 360,
    });
  }, [router, scriptReady, signInWithGoogle]);

  const activeResult = result;

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" onLoad={() => setScriptReady(true)} strategy="afterInteractive" />
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "32px 16px",
          background:
            "radial-gradient(circle at top left, rgba(241, 178, 77, 0.18), transparent 28%), linear-gradient(180deg, #07131f 0%, #0c1f34 100%)",
        }}
      >
        <section
          style={{
            width: "min(560px, 100%)",
            borderRadius: "28px",
            border: "1px solid rgba(157, 180, 210, 0.18)",
            background: "rgba(7, 19, 31, 0.9)",
            padding: "28px",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.38)",
            color: "#e7eef8",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 12px",
              borderRadius: "999px",
              background: "rgba(54, 210, 163, 0.12)",
              color: "#8df0d0",
              fontSize: "0.82rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            TradeStrix Access
          </div>
          <h1 style={{ margin: "18px 0 10px", fontSize: "2rem", lineHeight: 1.1 }}>
            Gmail signup with admin approval
          </h1>
          <p style={{ margin: 0, color: "#9db4d2", fontSize: "1rem" }}>
            Use your verified Gmail account to request access. Approved users enter the operator desk immediately.
          </p>

          <div
            style={{
              marginTop: "22px",
              padding: "18px",
              borderRadius: "20px",
              background: "rgba(16, 34, 55, 0.92)",
              border: "1px solid rgba(157, 180, 210, 0.14)",
            }}
          >
            <div style={{ fontSize: "0.9rem", color: "#9db4d2", marginBottom: "14px" }}>
              {"Access flow: Gmail sign-in -> email verification -> pending approval -> approved access"}
            </div>

            {!GOOGLE_CLIENT_ID ? (
              <div className="alert alert-danger mb-0">
                <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> is missing. Add the Google web client ID in the frontend env before testing.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px", justifyItems: "center" }}>
                <div ref={buttonRef} />
                <button
                  type="button"
                  onClick={resetGoogleSelection}
                  style={{
                    border: "1px solid rgba(157, 180, 210, 0.24)",
                    background: "transparent",
                    color: "#9db4d2",
                    borderRadius: "999px",
                    padding: "10px 16px",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                  }}
                >
                  Choose another Google account
                </button>
              </div>
            )}

            {busy ? <div style={{ marginTop: "14px", color: "#9db4d2" }}>Verifying Google login and checking approval status...</div> : null}
            {error ? <div className="alert alert-danger mt-3 mb-0">{error}</div> : null}
            {activeResult ? (
              <div className={`alert alert-${statusTone(activeResult.status)} mt-3 mb-0`}>
                <div>
                  <strong>{activeResult.user.email}</strong>
                </div>
                <div>{activeResult.message}</div>
              </div>
            ) : null}
          </div>

          <div
            style={{
              marginTop: "18px",
              display: "grid",
              gap: "10px",
              color: "#9db4d2",
              fontSize: "0.92rem",
            }}
          >
            <div>Only verified `@gmail.com` accounts are accepted by the backend.</div>
            <div>New users are created with `PENDING` status until an admin approves them.</div>
            <div>The first admin should sign in using an email listed in `AUTH_ADMIN_EMAILS`.</div>
          </div>
        </section>
      </main>
    </>
  );
}
