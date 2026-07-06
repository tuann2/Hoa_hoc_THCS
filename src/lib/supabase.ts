import { createClient } from '@supabase/supabase-js';

function readEnvString(key: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY') {
  const env = import.meta.env as Record<string, unknown>;
  const value = env[key];
  return typeof value === 'string' ? value.trim() : '';
}

const SUPABASE_URL = readEnvString('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = readEnvString('VITE_SUPABASE_ANON_KEY');

// Use the official SDK directly; when env is missing the app stays local-only.
export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storageKey: 'hhthcs-supabase-session'
        }
      })
    : null;
