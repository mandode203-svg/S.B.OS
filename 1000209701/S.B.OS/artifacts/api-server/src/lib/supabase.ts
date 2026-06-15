import { createClient } from "@supabase/supabase-js";

// ⚠️  BACKEND UNIQUEMENT — ne jamais exposer ces clés côté frontend
//
// SUPABASE_URL          → ex: https://xxxx.supabase.co
// SUPABASE_SERVICE_ROLE_KEY → clé "service_role" dans Supabase > Settings > API
//                             (JAMAIS la clé anon ici — l'admin API l'exige)

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Variable d'environnement manquante : SUPABASE_URL\n" +
    "Ajoutez-la dans Railway > Variables."
  );
}
if (!supabaseServiceKey) {
  throw new Error(
    "Variable d'environnement manquante : SUPABASE_SERVICE_ROLE_KEY\n" +
    "Récupérez-la dans Supabase > Settings > API > service_role key.\n" +
    "Ajoutez-la dans Railway > Variables."
  );
}

// createClient avec la service_role key donne accès à auth.admin.*
// (createUser, deleteUser, getUserById) — indispensable pour l'inscription.
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    // Côté serveur Node.js : pas de session à persister dans le navigateur
    autoRefreshToken: false,
    persistSession: false,
  },
});
