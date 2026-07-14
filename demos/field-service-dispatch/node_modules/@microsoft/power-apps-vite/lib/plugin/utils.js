/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */
/**
 * CORS origin patterns for Power Apps domains
 */
export const powerAppsCorsOrigins = [
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
export const powerConfigPath = '__vite_powerapps_plugin__/power.config.json';
/**
 * Type guard to validate PowerConfig structure
 */
export function isPowerConfig(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'environmentId' in obj &&
        typeof obj.environmentId === 'string');
}
/**
 * Check if an origin is allowed by the CORS patterns
 */
export function isOriginAllowed(origin) {
    return powerAppsCorsOrigins.some((pattern) => pattern.test(origin));
}
/**
 * Generate the Power Apps local play URL
 */
export function generatePlayUrl(environmentId, localAppUrl, localConnectionUrl) {
    return (`https://apps.powerapps.com/play/e/${environmentId}/a/local` +
        `?_localAppUrl=${encodeURIComponent(localAppUrl)}` +
        `&_localConnectionUrl=${encodeURIComponent(localConnectionUrl)}`);
}
/**
 * Parse power.config.json content and validate it
 * @throws Error if the content is invalid
 */
export function parsePowerConfig(content) {
    let parsed;
    try {
        parsed = JSON.parse(content);
    }
    catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON in power.config.json: ${error.message}`);
        }
        throw error;
    }
    if (!isPowerConfig(parsed)) {
        throw new Error('Invalid power.config.json structure. Missing environmentId.');
    }
    return parsed;
}
/**
 * Generate the local connection URL from a base URL
 */
export function getLocalConnectionUrl(baseUrl) {
    // Ensure base URL ends with /
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return `${normalizedBase}${powerConfigPath}`;
}
//# sourceMappingURL=utils.js.map