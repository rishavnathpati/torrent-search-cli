# Torrent Search CLI

A tool that lets you find torrents without leaving your CLI.

![Wizard Demo Gif](./docs/wizard-demo.gif)

## Features

- Search for torrents across multiple providers
- Auto-fallback to other providers if no results are found
- Category selection via wizard or command line
- Copy magnet links to clipboard
- Open torrents in default or specific applications
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

## Example

The command demoed in the gif below lists up to **35** results from the **1337x** provider. Instead of opening the magnet url by default (via `-o=false`), the command copies the magnet url of the torrent you select to your clipboard (via `--clipboard`).

![Demo Command Gif](./docs/demo.gif)

Give it a try,

```bash
./cli.js ubuntu -p='1337x' -o=false --rows=35 --clipboard
```

## TODO

- [x] Fallback to another provider when no results are found
- [x] Select category via wizard & map categories to each provider. Default to all if no mapping exists.
- [ ] Use **node-torrent** or similar lib to actually download torrents
- [ ] Add ability to add/remove providers
- [ ] Add support for more providers
- [ ] Add proxy support for providers that are blocked in certain regions
