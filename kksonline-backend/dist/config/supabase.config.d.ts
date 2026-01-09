import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types.js';
export declare const supabaseAdmin: SupabaseClient<Database>;
export declare const supabaseAnon: SupabaseClient<Database>;
export declare const createUserClient: (jwt: string) => SupabaseClient<Database>;
export { SupabaseClient };
//# sourceMappingURL=supabase.config.d.ts.map