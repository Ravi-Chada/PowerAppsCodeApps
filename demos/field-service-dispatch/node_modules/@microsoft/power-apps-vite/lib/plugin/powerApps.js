import pc from 'picocolors';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isOriginAllowed, isPowerConfig, powerAppsCorsOrigins, powerConfigPath } from './utils.js';
export function powerApps() {
    return {
        name: 'powerApps',
        config() {
            return {
                // Needed for publishing static assets correctly
                base: './',
                // Automatically inject CORS configuration needed for Vite 7+
                server: {
                    cors: {
                        origin: powerAppsCorsOrigins,
                    },
                },
            };
        },
        configureServer(server) {
            printLocalPlayUrl(server);
            servePowerConfig(server);
            watchPowerConfig(server);
        },
    };
}
function getLocalBaseUrl(server) {
    var _a, _b;
    // Vite 6+
    if ((_b = (_a = server.resolvedUrls) === null || _a === void 0 ? void 0 : _a.local) === null || _b === void 0 ? void 0 : _b[0]) {
        return server.resolvedUrls.local[0];
    }
    // In Vite 5 and below, resolvedUrls may not be available, fallback to httpServer address
    const address = server.httpServer.address();
    if (typeof address === 'string') {
        return address;
    }
    if (typeof address === 'object' && address !== null) {
        const { address: rawHost, port } = address;
        const host = rawHost === '::1' ? 'localhost' : rawHost;
        const https = server.config.server.https;
        return `${https ? 'https' : 'http'}://${host}:${port}/`;
    }
    return null;
}
// Cache for power config to avoid repeated file reads
let cachedPowerConfig = null;
function getPowerConfig(server) {
    if (cachedPowerConfig) {
        return cachedPowerConfig;
    }
    const configPath = join(server.config.root, 'power.config.json');
    try {
        const configContent = readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(configContent);
        if (!isPowerConfig(parsed)) {
            throw new Error('Invalid power.config.json structure. Missing environmentId.');
        }
        cachedPowerConfig = parsed;
        return parsed;
    }
    catch (error) {
        // Handle specific error types
        if (error.code === 'ENOENT') {
            throw new Error(`Missing file. Ensure you have run 'pac code init' first. power.config.json expected at ${configPath}.`);
        }
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON in power.config.json: ${error.message}`);
        }
        throw error;
    }
}
function watchPowerConfig(server) {
    const configPath = join(server.config.root, 'power.config.json');
    server.watcher.add(configPath);
    server.watcher.on('change', (file) => {
        if (file === configPath) {
            server.config.logger.info(pc.yellow('[powerApps] power.config.json changed, restarting server...'));
            // Clear cache so new config is loaded
            cachedPowerConfig = null;
            server.restart();
        }
    });
}
function getWebPlayerBaseUrl(region) {
    if (!region) {
        return 'https://apps.powerapps.com';
    }
    region = region.toLowerCase();
    switch (region) {
        case 'public':
        case 'prod':
            return 'https://apps.powerapps.com';
        case 'preprod':
            return 'https://apps.preprod.powerapps.com';
        case 'test':
            return 'https://apps.test.powerapps.com';
        case 'preview':
            return 'https://apps.preview.powerapps.com';
        case 'usgov':
        case 'gccmoderate':
            return 'https://apps.gov.powerapps.us';
        case 'usgovhigh':
        case 'gcchigh':
            return 'https://apps.high.powerapps.us';
        case 'usgovdod':
        case 'dod':
            return 'https://play.apps.appsplatform.us';
        case 'china':
        case 'mooncake':
            return 'https://apps.powerapps.cn';
        default:
            return 'https://apps.powerapps.com';
    }
}
// Prints the apps.powerapps.com play URL to the console
function printLocalPlayUrl(server) {
    var _a;
    (_a = server.httpServer) === null || _a === void 0 ? void 0 : _a.on('listening', () => {
        var _a;
        let powerConfig;
        try {
            powerConfig = getPowerConfig(server);
        }
        catch (error) {
            server.config.logger.error(pc.red(`[powerApps] Error loading power.config.json:\n            ⤷${(_a = error.message) !== null && _a !== void 0 ? _a : error}`));
            return;
        }
        const environmentId = powerConfig.environmentId;
        if (!environmentId) {
            server.config.logger.error('[powerApps] environmentId is not defined in power.config.json');
            return;
        }
        const baseUrl = getLocalBaseUrl(server);
        if (!baseUrl) {
            server.config.logger.error('[powerApps] Unable to determine vite dev server URL');
            return;
        }
        const localAppUrl = `${baseUrl}`;
        const localConnectionUrl = `${baseUrl}${powerConfigPath}`;
        const playUrl = `${pc.magenta(`${getWebPlayerBaseUrl(powerConfig.region || 'prod')}/play/e/`) +
            pc.magentaBright(environmentId) +
            pc.magenta('/a/local')}` +
            `${pc.magenta('?_localAppUrl=') + pc.magentaBright(localAppUrl)}` +
            `${pc.magenta('&_localConnectionUrl=') + pc.magentaBright(localConnectionUrl)}` +
            `${pc.reset('')}`;
        // Nicely formatted console output
        server.config.logger.info(`  ${pc.magentaBright('Power Apps Vite Plugin')}\n`);
        server.config.logger.info(`  ${pc.magenta('➜')}  Local Play:   ${playUrl}`);
    });
}
// Serves the power.config.json content at a specific path to be accessed by apps.powerapps.com
function servePowerConfig(server) {
    server.middlewares.use(`/${powerConfigPath}`, (req, res) => {
        var _a;
        // Manual CORS headers are needed for Vite 6 and below
        const origin = req.headers.origin;
        if (origin && isOriginAllowed(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');
        }
        if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        let powerConfig;
        try {
            powerConfig = getPowerConfig(server);
        }
        catch (error) {
            server.config.logger.error(pc.red(`[powerApps] Error serving power.config.json:\n            ⤷${(_a = error.message) !== null && _a !== void 0 ? _a : error}`));
            // Player can sometimes work without power.config.json
            res.end();
            return;
        }
        res.end(JSON.stringify(powerConfig));
    });
}
//# sourceMappingURL=powerApps.js.map