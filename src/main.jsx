import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { supabase } from "./supabase";
import Auth from "./Auth";
import App from "./App";

// Let Supabase client pick up the auth tokens from the URL hash,
// then clean up the URL so it doesn't look alarming
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_IN") {
    window.history.replaceState({}, "", window.location.pathname);
  }
});

/**
 * Root component.
 *
 * Listens for Supabase auth state changes. When a user is signed in,
 * renders the main App with the user's ID. When signed out, renders
 * the Auth screen.
 *
 * The onAuthStateChange listener fires on page load (checking for an
 * existing session in localStorage) and whenever the user signs in,
 * signs out, or their token refreshes.
 */
function Root() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    /* Check for existing session */
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    /* Listen for auth changes */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setSession(session),
    );

    return () => subscription.unsubscribe();
  }, []);

  /* Still checking for session */
  if (session === undefined) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf9f7",
          color: "#7a7a7e",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "1.1rem",
        }}
      >
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Auth dark={false} />;
  }

  return <App userId={session.user.id} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
