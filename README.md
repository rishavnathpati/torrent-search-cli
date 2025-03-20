# Torrent Search CLI

A tool that lets you find torrents without leaving your CLI.

![Wizard Demo Gif](./docs/wizard-demo.gif)

## Features

- Search for torrents across multiple providers simultaneously
- Auto-fallback to all providers when no results are found with a single provider
- Copy magnet links to clipboard
- Open torrents in default or specific applications
- Enhanced UI with color-coded tables and progress bars
- Detailed torrent information view
- ES Modules support

## Prerequisites

Node.js 18.0.0 or higher

## Installation

Clone this repo:

```bash
git clone git@github.com:rishavnathpati/torrent-search-cli.git
```

Navigate to the root directory and install dependencies:

```bash
cd torrent-search-cli
npm install
```

## Usage

Start the CLI tool with:

```bash
npm start
```

Or as an executable with:

```bash
./cli.js
```

**NOTE:** Windows users can build an executable via `npm run build` into `./build/torrent-search.exe`.

Run `./cli.js -h` or `npm start -- -h` to see the CLI options:

![Usage -h](./docs/usage.png)

### Enhanced UI Options

The application now features an improved UI with:

- **Color-coded Tables**: Results are displayed in a clean table format with color-coded information
- **Progress Bars**: Visual feedback during searches and operations
- **Detailed View**: See complete information about torrents before downloading

You can control these features with the following flags:

```bash
# Disable detailed view (skip confirmation screen)
./cli.js ubuntu --no-details

# Disable progress bars (useful for non-interactive terminals)
./cli.js ubuntu --no-progress
```

### Multi-Provider Search

You can now search across all torrent providers simultaneously:

```bash
# Search across all providers at once
./cli.js ubuntu --all-providers

# Or use the short flag
./cli.js ubuntu -a
```

This will distribute your search across all available providers, collect all results, and sort them by number of seeders.

## Example

The command demoed in the gif below lists up to **35** results from all providers for "ubuntu". Instead of opening the magnet url by default (via `-o=false`), the command copies the magnet url of the torrent you select to your clipboard (via `--clipboard`).

```bash
./cli.js ubuntu -a -o=false --rows=35 --clipboard
```

## TODO

- [x] Fallback to another provider when no results are found
- [x] Enhanced UI with tables and progress bars
- [x] Search across all providers simultaneously
- [ ] Use **node-torrent** or similar lib to actually download torrents
- [ ] Add ability to add/remove providers
- [ ] Add support for more providers
- [ ] Add proxy support for providers that are blocked in certain regions
