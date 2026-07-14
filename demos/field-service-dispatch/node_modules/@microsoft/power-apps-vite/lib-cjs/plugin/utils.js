"use strict";
/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalConnectionUrl = exports.parsePowerConfig = exports.generatePlayUrl = exports.isOriginAllowed = exports.isPowerConfig = exports.powerConfigPath = exports.powerAppsCorsOrigins = void 0;
/**
 * CORS origin patterns for Power Apps domains
 */
exports.powerAppsCorsOrigins = [
    // vite default localhost origins
    // eslint-disable-next-line security/detect-unsafe-regex -- input bounded by origin header length
    /^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/,
    // apps.powerapps.com
    /^https:\/\/apps\.powerapps\.com$/,
    // apps.*.powerapps.com
    // eslint-disable-next-line security/detect-unsafe-regex -- input bounded by origin header length
    /^https:\/\/apps\.(?:[^.]+\.)*powerapps\.com$/,
    // apps.*.powerapps.us
    // eslint-disable-next-line security/detect-unsafe-regex -- input bounded by origin header length
    /^https:\/\/apps\.(?:[^.]+\.)*powerapps\.us$/,
    // play.apps.appsplatform.us
    /^https:\/\/play\.apps\.appsplatform\.us$/,
    // apps.powerapps.cn
    /^https:\/\/apps\.powerapps\.cn$/,
    // apps.powerapps.eaglex.ic.gov
    /^https:\/\/apps\.powerapps\.eaglex\.ic\.gov$/,
    // apps.powerapps.microsoft.scloud
    /^https:\/\/apps\.powerapps\.microsoft\.scloud$/,
];
/**
 * Path used to serve power.config.json content
 */
exports.powerConfigPath = '__vite_powerapps_plugin__/power.config.json';
/**
 * Type guard to validate PowerConfig structure
 */
function isPowerConfig(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'environmentId' in obj &&
        typeof obj.environmentId === 'string');
}
exports.isPowerConfig = isPowerConfig;
/**
 * Check if an origin is allowed by the CORS patterns
 */
function isOriginAllowed(origin) {
    return exports.powerAppsCorsOrigins.some(function (pattern) { return pattern.test(origin); });
}
exports.isOriginAllowed = isOriginAllowed;
/**
 * Generate the Power Apps local play URL
 */
function generatePlayUrl(environmentId, localAppUrl, localConnectionUrl) {
    return ("https://apps.powerapps.com/play/e/".concat(environmentId, "/a/local") +
        "?_localAppUrl=".concat(encodeURIComponent(localAppUrl)) +
        "&_localConnectionUrl=".concat(encodeURIComponent(localConnectionUrl)));
}
exports.generatePlayUrl = generatePlayUrl;
/**
 * Parse power.config.json content and validate it
 * @throws Error if the content is invalid
 */
function parsePowerConfig(content) {
    var parsed;
    try {
        parsed = JSON.parse(content);
    }
    catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error("Invalid JSON in power.config.json: ".concat(error.message));
        }
        throw error;
    }
    if (!isPowerConfig(parsed)) {
        throw new Error('Invalid power.config.json structure. Missing environmentId.');
    }
    return parsed;
}
exports.parsePowerConfig = parsePowerConfig;
/**
 * Generate the local connection URL from a base URL
 */
function getLocalConnectionUrl(baseUrl) {
    // Ensure base URL ends with /
    var normalizedBase = baseUrl.endsWith('/') ? baseUrl : "".concat(baseUrl, "/");
    return "".concat(normalizedBase).concat(exports.powerConfigPath);
}
exports.getLocalConnectionUrl = getLocalConnectionUrl;
//# sourceMappingURL=utils.js.map