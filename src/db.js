import { supabase } from './supabase'

/* ── Entries ────────────────────────────────────────────────────────── */

export async function loadEntries(userId) {
  const { data, error } = await supabase
    .from('entries').select('*').eq('user_id', userId).order('date', { ascending: false })
  if (error) { console.error('loadEntries:', error); return [] }
  return data.map(row => ({
    id: row.id, category: row.category, date: row.date,
    communicants: row.communicants, under16: row.under16, over16: row.over16,
    baptisedUnder6: row.baptised_under6, baptisedOver6: row.baptised_over6,
    numberConfirmed: row.number_confirmed, notes: row.notes,
  }))
}

export async function saveEntry(userId, entry) {
  const row = {
    user_id: userId, category: entry.category, date: entry.date,
    communicants: entry.communicants || 0, under16: entry.under16 || 0, over16: entry.over16 || 0,
    baptised_under6: entry.baptisedUnder6 || 0, baptised_over6: entry.baptisedOver6 || 0,
    number_confirmed: entry.numberConfirmed || 0, notes: entry.notes || '',
  }
  if (entry.id) {
    const { error } = await supabase.from('entries').update(row).eq('id', entry.id).eq('user_id', userId)
    if (error) console.error('updateEntry:', error)
    return entry.id
  } else {
    const { data, error } = await supabase.from('entries').insert(row).select('id').single()
    if (error) { console.error('insertEntry:', error); return null }
    return data.id
  }
}

export async function deleteEntry(userId, entryId) {
  const { error } = await supabase.from('entries').delete().eq('id', entryId).eq('user_id', userId)
  if (error) console.error('deleteEntry:', error)
}

/* ── Settings ───────────────────────────────────────────────────────── */

export async function loadSettings(userId) {
  const { data, error } = await supabase.from('settings').select('*').eq('user_id', userId).single()
  let fontSize = 'medium'
  try { fontSize = localStorage.getItem('sec-fontSize') || 'medium' } catch {}
  if (error || !data) return { fontSize }
  return { darkMode: data.dark_mode || false, fontSize }
}

export async function saveSettings(userId, settings) {
  const row = {
    user_id: userId,
    charge_name: '',
    dark_mode: settings.darkMode || false,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('settings').upsert(row, { onConflict: 'user_id' })
  if (error) console.error('saveSettings:', error)
  try { localStorage.setItem('sec-fontSize', settings.fontSize || 'medium') } catch {}
}
