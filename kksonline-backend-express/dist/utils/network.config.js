"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureNetworking = configureNetworking;
exports.testSupabaseConnectivity = testSupabaseConnectivity;
exports.logNetworkInfo = logNetworkInfo;
const dns_1 = require("dns");
const logger_1 = require("./logger");
/**
 * Configure Node.js networking for better connectivity
 * Especially useful when ISP blocks or throttles certain connections
 */
function configureNetworking() {
    try {
        // Prefer IPv4 over IPv6 (helps with ISPs that have poor IPv6 routing)
        // This forces Node.js to try IPv4 addresses first
        (0, dns_1.setDefaultResultOrder)('ipv4first');
        logger_1.logger.info('✅ DNS configured to prefer IPv4 addresses');
        // Set environment variables for Node.js networking
        // These help bypass some ISP-level blocks and improve connection stability
        // Increase default connection timeout
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_ENV === 'production' ? '1' : '0';
        // Configure DNS resolution timeout
        if (!process.env.UV_THREADPOOL_SIZE) {
            process.env.UV_THREADPOOL_SIZE = '16'; // Increase thread pool for better concurrent connections
        }
        logger_1.logger.info('✅ Network configuration applied successfully');
    }
    catch (error) {
        logger_1.logger.warn('⚠️ Could not apply all network configurations', { error });
    }
}
/**
 * Test connectivity to Supabase
 */
async function testSupabaseConnectivity(supabaseUrl) {
    try {
        logger_1.logger.info('Testing Supabase connectivity...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        const response = await fetch(supabaseUrl + '/rest/v1/', {
            method: 'HEAD',
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response.ok || response.status === 401 || response.status === 403) {
            // 401/403 means we reached the server (auth failed, but connection works)
            logger_1.logger.info('✅ Supabase connectivity test successful');
            return true;
        }
        logger_1.logger.warn('⚠️ Supabase connectivity test returned unexpected status', {
            status: response.status
        });
        return false;
    }
    catch (error) {
        logger_1.logger.error('❌ Supabase connectivity test failed', {
            error: error.message,
            code: error.code,
            type: error.name,
        });
        // Provide helpful error messages
        if (error.name === 'AbortError') {
            logger_1.logger.error('💡 Connection timeout - This may indicate ISP blocking or DNS issues');
            logger_1.logger.error('💡 Try: 1) Use a VPN, 2) Change DNS to 8.8.8.8 (Google) or 1.1.1.1 (Cloudflare)');
        }
        else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
            logger_1.logger.error('💡 DNS resolution failed - Your ISP may be blocking Supabase domains');
            logger_1.logger.error('💡 Try: Change your system DNS to 8.8.8.8 and 8.8.4.4 (Google DNS)');
        }
        else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            logger_1.logger.error('💡 Connection refused/timeout - Firewall or ISP blocking detected');
            logger_1.logger.error('💡 Try: Use a VPN or contact your ISP');
        }
        return false;
    }
}
/**
 * Get system DNS configuration info
 */
function logNetworkInfo() {
    logger_1.logger.info('Network Configuration:', {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        ipv6: process.env.NODE_OPTIONS?.includes('--dns-result-order=ipv4first') ? 'disabled' : 'enabled',
        threadPoolSize: process.env.UV_THREADPOOL_SIZE || '4 (default)',
    });
}
//# sourceMappingURL=network.config.js.map