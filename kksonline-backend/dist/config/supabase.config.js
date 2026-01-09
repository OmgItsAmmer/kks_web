import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env.config.js';
// Service role client for admin operations (bypasses RLS)
export const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
// Anon client for operations that respect RLS
export const supabaseAnon = createClient(config.supabase.url, config.supabase.anonKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
// Create a client with a specific user's JWT for RLS-aware operations
export const createUserClient = (jwt) => {
    return createClient(config.supabase.url, config.supabase.anonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${jwt}`,
            },
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
};
export { SupabaseClient };
//# sourceMappingURL=supabase.config.js.map