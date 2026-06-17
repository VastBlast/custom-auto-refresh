# Custom Auto Refresh

Browser extension for refreshing the current tab on a custom interval.

Custom Auto Refresh is local-first and does not track users, collect analytics, or send browsing data to a remote service. Refresh schedules are stored locally by the browser so active timers can recover when the extension context restarts.

## Install

[![Install from Chrome Web Store](https://img.shields.io/badge/Install%20from-Chrome%20Web%20Store-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chrome.google.com/webstore/detail/lpfhikbcgmboakfdiedcccfofbejaihd)
[![Install from Microsoft Edge Add-ons](https://img.shields.io/badge/Install%20from-Microsoft%20Edge%20Add--ons-0078D7?style=for-the-badge&logo=microsoftedge&logoColor=white)](https://microsoftedge.microsoft.com/addons/detail/kimgcjmijjjihjikhlkpoheegdddpkaa)

## Features

- Start and stop automatic refreshes for the active tab.
- Use seconds, milliseconds, minutes, or hours for intervals up to seven days.
- See the next refresh countdown in the extension badge.
- Build separate packages for Chrome, Edge, and Firefox from one source tree.
- Localized browser UI strings through extension `_locales`.

## Development

```sh
npm install
npm run dev
```

Useful commands:

```sh
npm run check
npm run test
npm run build
npm run package
```

`npm run build` generates icons, builds the Svelte app, and writes browser-specific extension directories to:

- `dist/chrome`
- `dist/edge`
- `dist/firefox`

Load one of those directories as an unpacked extension during manual testing.

## Store Assets

Assets are grouped by lifecycle:

- `assets/brand/` source artwork.
- `assets/extension/` static files copied into the extension package.
- `assets/store/` generated store icons, screenshots, and promotional tiles.

Regenerate store assets with:

```sh
npm run icons
npm run store:screenshots
```

## Releases

Pushing a tag like `v2.4.1` runs the release workflow. The workflow applies the tag version, checks the project, builds all browser targets, packages zip artifacts, and uploads them to the GitHub release.

## License

GPL-3.0-only
