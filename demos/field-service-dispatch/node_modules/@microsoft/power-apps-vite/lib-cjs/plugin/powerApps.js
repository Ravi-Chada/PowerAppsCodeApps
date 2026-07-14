"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.powerApps = void 0;
var picocolors_1 = __importDefault(require("picocolors"));
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var utils_js_1 = require("./utils.js");
function powerApps() {
    return {
        name: 'powerApps',
        config: function () {
            return {
                // Needed for publishing static assets correctly
                base: './',
                // Automatically inject CORS configuration needed for Vite 7+
                server: {
                    cors: {
                        origin: utils_js_1.powerAppsCorsOrigins,
                    },
                },
            };
        },
        configureServer: function (server) {
            printLocalPlayUrl(server);
            servePowerConfig(server);
            watchPowerConfig(server);
        },
    };
}
exports.powerApps = powerApps;
function getLocalBaseUrl(server) {
    var _a, _b;
    // Vite 6+
    if ((_b = (_a = server.resolvedUrls) === null || _a === void 0 ? void 0 : _a.local) === null || _b === void 0 ? void 0 : _b[0]) {
        return server.resolvedUrls.local[0];
    }
    // In Vite 5 and below, resolvedUrls may not be available, fallback to httpServer address
    var address = server.httpServer.address();
    if (typeof address === 'string') {
        return address;
    }
    if (typeof address === 'object' && address !== null) {
        var rawHost = address.address, port = address.port;
        var host = rawHost === '::1' ? 'localhost' : rawHost;
        var https = server.config.server.https;
        return "".concat(https ? 'https' : 'http', "://").concat(host, ":").concat(port, "/");
    }
    return null;
}
// Cache for power config to avoid repeated file reads
var cachedPowerConfig = null;
function getPowerConfig(server) {
    if (cachedPowerConfig) {
        return cachedPowerConfig;
    }
    var configPath = (0, node_path_1.join)(server.config.root, 'power.config.json');
    try {
        var configContent = (0, node_fs_1.readFileSync)(configPath, 'utf-8');
        var parsed = JSON.parse(configContent);
        if (!(0, utils_js_1.isPowerConfig)(parsed)) {
            throw new Error('Invalid power.config.json structure. Missing environmentId.');
        }
        cachedPowerConfig = parsed;
        return parsed;
    }
    catch (error) {
        // Handle specific error types
        if (error.code === 'ENOENT') {
            throw new Error("Missing file. Ensure you have run 'pac code init' first. power.config.json expected at ".concat(configPath, "."));
        }
        if (error instanceof SyntaxError) {
            throw new Error("Invalid JSON in power.config.json: ".concat(error.message));
        }
        throw error;
    }
}
function watchPowerConfig(server) {
    var configPath = (0, node_path_1.join)(server.config.root, 'power.config.json');
    server.watcher.add(configPath);
    server.watcher.on('change', function (file) {
        if (file === configPath) {
            server.config.logger.info(picocolors_1.default.yellow('[powerApps] power.config.json changed, restarting server...'));
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
    (_a = server.httpServer) === null || _a === void 0 ? void 0 : _a.on('listening', function () {
        var _a;
        var powerConfig;
        try {
            powerConfig = getPowerConfig(server);
        }
        catch (error) {
            server.config.logger.error(picocolors_1.default.red("[powerApps] Error loading power.config.json:\n            \u2937".concat((_a = error.message) !== null && _a !== void 0 ? _a : error)));
            return;
        }
        var environmentId = powerConfig.environmentId;
        if (!environmentId) {
            server.config.logger.error('[powerApps] environmentId is not defined in power.config.json');
            return;
        }
        var baseUrl = getLocalBaseUrl(server);
        if (!baseUrl) {
            server.config.logger.error('[powerApps] Unable to determine vite dev server URL');
            return;
        }
        var localAppUrl = "".concat(baseUrl);
        var localConnectionUrl = "".concat(baseUrl).concat(utils_js_1.powerConfigPath);
        var playUrl = "".concat(picocolors_1.default.magenta("".concat(getWebPlayerBaseUrl(powerConfig.region || 'prod'), "/play/e/")) +
            picocolors_1.default.magentaBright(environmentId) +
            picocolors_1.default.magenta('/a/local')) +
            "".concat(picocolors_1.default.magenta('?_localAppUrl=') + picocolors_1.default.magentaBright(localAppUrl)) +
            "".concat(picocolors_1.default.magenta('&_localConnectionUrl=') + picocolors_1.default.magentaBright(localConnectionUrl)) +
            "".concat(picocolors_1.default.reset(''));
        // Nicely formatted console output
        server.config.logger.info("  ".concat(picocolors_1.default.magentaBright('Power Apps Vite Plugin'), "\n"));
        server.config.logger.info("  ".concat(picocolors_1.default.magenta('➜'), "  Local Play:   ").concat(playUrl));
    });
}
// Serves the power.config.json content at a specific path to be accessed by apps.powerapps.com
function servePowerConfig(server) {
    server.middlewares.use("/".concat(utils_js_1.powerConfigPath), function (req, res) {
        var _a;
        // Manual CORS headers are needed for Vite 6 and below
        var origin = req.headers.origin;
        if (origin && (0, utils_js_1.isOriginAllowed)(origin)) {
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
        var powerConfig;
        try {
            powerConfig = getPowerConfig(server);
        }
        catch (error) {
            server.config.logger.error(picocolors_1.default.red("[powerApps] Error serving power.config.json:\n            \u2937".concat((_a = error.message) !== null && _a !== void 0 ? _a : error)));
            // Player can sometimes work without power.config.json
            res.end();
            return;
        }
        res.end(JSON.stringify(powerConfig));
    });
}
//# sourceMappingURL=powerApps.js.map