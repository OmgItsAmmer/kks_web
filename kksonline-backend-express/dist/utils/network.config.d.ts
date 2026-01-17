/**
 * Configure Node.js networking for better connectivity
 * Especially useful when ISP blocks or throttles certain connections
 */
export declare function configureNetworking(): void;
/**
 * Test connectivity to Supabase
 */
export declare function testSupabaseConnectivity(supabaseUrl: string): Promise<boolean>;
/**
 * Get system DNS configuration info
 */
export declare function logNetworkInfo(): void;
//# sourceMappingURL=network.config.d.ts.map