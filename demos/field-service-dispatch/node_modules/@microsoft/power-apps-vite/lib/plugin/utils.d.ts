/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */
/**
 * Power Apps config file structure from pac cli
 */
export interface PowerConfig {
    appId?: string;
    appDisplayName?: string;
    description?: string | null;
    environmentId: string;
    buildPath?: string;
    buildEntryPoint?: string;
    logoPath?: string;
    localAppUrl?: string;
    connectionReferences?: unknown;
    databaseReferences?: unknown;
    region?: string;
}
/**
 * CORS origin patterns for Power Apps domains
 */
export declare const powerAppsCorsOrigins: RegExp[];
/**
 * Path used to serve power.config.json content
 */
export declare const powerConfigPath = "__vite_powerapps_plugin__/power.config.json";
/**
 * Type guard to validate PowerConfig structure
 */
export declare function isPowerConfig(obj: unknown): obj is PowerConfig;
/**
 * Check if an origin is allowed by the CORS patterns
 */
export declare function isOriginAllowed(origin: string): boolean;
/**
 * Generate the Power Apps local play URL
 */
export declare function generatePlayUrl(environmentId: string, localAppUrl: string, localConnectionUrl: string): string;
/**
 * Parse power.config.json content and validate it
 * @throws Error if the content is invalid
 */
export declare function parsePowerConfig(content: string): PowerConfig;
/**
 * Generate the local connection URL from a base URL
 */
export declare function getLocalConnectionUrl(baseUrl: string): string;
//# sourceMappingURL=utils.d.ts.map