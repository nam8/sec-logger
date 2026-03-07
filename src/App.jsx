/**
 * SEC Service Logger — Main Application Component
 *
 * This is the same UI as the Claude artifact version, but adapted to use
 * Supabase via db.js instead of window.storage. The only structural
 * differences are:
 *
 * 1. Accepts a `userId` prop from main.jsx (the authenticated user's UUID)
 * 2. Calls loadEntries/saveEntry/deleteEntry/loadSettings/saveSettings
 *    from db.js instead of window.storage.get/set
 * 3. Adds a "Sign out" button in Settings
 *
 * All UI components (DatePicker, NumInput, CustomSelect, etc.) are
 * identical to the artifact version.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import { loadEntries, saveEntry, deleteEntry, loadSettings, saveSettings } from './db'

/* ── All the constants, helpers, liturgical calculations, palette,
      and UI components are identical to the artifact version.
      See sec-logger.jsx for the complete, inline-commented source.
      
      In a production codebase you would split these into separate
      module files. For now, copy everything from the artifact's
      sec-logger.jsx into this file, then make only the changes
      listed below. ── */

/*
 * MIGRATION CHECKLIST — changes to make when copying from sec-logger.jsx:
 *
 * 1. Remove the `export default` from the SECLogger function
 *
 * 2. Replace the loadData/saveData calls in the useEffect with:
 *
 *    useEffect(() => {
 *      (async () => {
 *        const [ent, sett] = await Promise.all([
 *          loadEntries(userId),
 *          loadSettings(userId),
 *        ]);
 *        setEntries(ent);
 *        setSettings(sett);
 *        if (sett.darkMode) setDark(true);
 *        setLoading(false);
 *      })();
 *    }, [userId]);
 *
 * 3. Replace handleSaveEntry to use saveEntry from db.js:
 *
 *    const handleSaveEntry = useCallback(async (entry) => {
 *      const id = await saveEntry(userId, editingId ? { ...entry, id: editingId } : entry);
 *      if (editingId) {
 *        setEntries(prev => prev.map(e => e.id === editingId ? { ...entry, id } : e));
 *        setEditingId(null);
 *        showToast("Entry updated");
 *      } else {
 *        setEntries(prev => [{ ...entry, id }, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
 *        showToast("Logged");
 *      }
 *    }, [userId, entries, editingId, showToast]);
 *
 * 4. Replace handleDelete:
 *
 *    const handleDelete = useCallback(async (id) => {
 *      await deleteEntry(userId, id);
 *      setEntries(prev => prev.filter(e => e.id !== id));
 *      showToast("Deleted");
 *    }, [userId, showToast]);
 *
 * 5. Replace handleSettings:
 *
 *    const handleSettings = useCallback(async (patch) => {
 *      const merged = { ...settings, ...patch };
 *      setSettings(merged);
 *      await saveSettings(userId, merged);
 *      if (patch.darkMode !== undefined) setDark(patch.darkMode);
 *    }, [userId, settings]);
 *
 * 6. Add userId to the function signature:
 *
 *    export default function App({ userId }) { ... }
 *
 * 7. In SettingsView, add a sign-out button:
 *
 *    <button onClick={() => supabase.auth.signOut()}
 *      style={{
 *        width: "100%", padding: "10px", marginTop: 16,
 *        background: "none", border: `1px solid ${c.danger}`,
 *        borderRadius: 10, color: c.danger, cursor: "pointer",
 *        fontSize: "0.82rem", fontFamily: "-apple-system, sans-serif",
 *      }}>
 *      Sign out
 *    </button>
 */

/* For now, re-export a placeholder that tells the developer to copy the code */
export default function App({ userId }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 20,
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      background: '#faf9f7', color: '#2c2c2c', textAlign: 'center',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />
      <h1 style={{ fontSize: '1.4rem', fontWeight: 300, marginBottom: 16 }}>
        Setup Required
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#7a7a7e', lineHeight: 1.6, maxWidth: 400 }}>
        Copy the contents of <code>sec-logger.jsx</code> into this file
        and apply the migration changes listed in the comments above.
        See <code>README.md</code> for full instructions.
      </p>
      <p style={{ fontSize: '0.75rem', color: '#8b6914', marginTop: 16 }}>
        Signed in as user: {userId?.slice(0, 8)}…
      </p>
    </div>
  )
}
