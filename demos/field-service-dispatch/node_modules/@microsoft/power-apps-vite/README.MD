# @microsoft/power-apps-vite

Extended Vite support for developing Power Apps code apps.

# Who is this for?

Developers using Vite or a Vite-based template for developing their Power Apps code apps.

# Why use this plugin?

This plugin streamlines the experience of developing Power Apps code apps by leveraging Vite-specific tools.

It does this by configuring your build settings for Power Apps and letting the Power Apps host communicate with your Vite dev server. All you need to do is run `vite` or `npm run dev` and the plugin will print out a URL where you can open, interact, and test your local app using the Power Apps host, which gives you full access to the Power Platform connectors, services and authentication exposed via the Power Apps SDK `@microsoft/power-apps`.

## Installation

```bash
# npm
npm install @microsoft/power-apps-vite --save-dev

# yarn
yarn add @microsoft/power-apps-vite --dev

# pnpm
pnpm add @microsoft/power-apps-vite --save-dev

# bun
bun add @microsoft/power-apps-vite --dev
```

## Setup

### 1. Add the plugin to your Vite config

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { powerApps } from '@microsoft/power-apps-vite';

export default defineConfig({
  plugins: [powerApps()],
});
```

That's it! No need to further modify your `vite.config.ts` or `package.json` scripts.

### 2. Set up your app with Power Apps and create a `power.config.json`

Run `pac code init` in your project root. It will create a power.config.json required for running your app.

## Usage

Start your Vite dev server:

```bash
# npm
npm run dev

# yarn
yarn dev

# pnpm
pnpm dev

# bun
bun run dev
```

The plugin will output a **Local Play URL** in the console:

```
  Power Apps Vite Plugin

  ➜  Local Play:   https://apps.powerapps.com/play/e/{environmentId}/a/local?_localAppUrl=...
```

Open this URL in your browser to run your app in the Power Apps host.

## Features

- **Standalone** – `pac code run` is not needed when using this plugin. You can open your local app using the Power Apps host by just running the Vite dev server. No other changes to `vite.config.ts` and `package.json` scripts are required if using the plugin.
- **Convenience** – Prints a ready-to-use URL for testing using the Power Apps host.
- **Hot reload** – Changes to `power.config.json` automatically restart the dev server.

## Requirements

- Node.js >= 18
- Vite >= 5.0.0

## License

See LICENSE file.
