#!/usr/bin/env node

import { wizard } from './index.js';
import sywac from 'sywac';
import sywacStyleBasic from 'sywac-style-basic';

// CLI entry point
const cli = sywac
  // If only a string is entered, search that string
  .positional('[search]', {
    paramsDesc: 'Name of torrent to search for. If omitted, wizard will prompt for search.'
  })
  .style(sywacStyleBasic)
  .outputSettings({ maxWidth: 100 })
  .enumeration('-p, --provider', {
    desc: 'Specify the provider to search. If not specified, you will be prompted to select one.',
    choices: ['1337x', 'ThePirateBay', 'ExtraTorrent', 'Rarbg', 'Torrent9', 'KickassTorrents', 'TorrentProject', 'Torrentz2']
  })
  .boolean('-a, --all-providers', {
    desc: 'Search across all available torrent providers simultaneously.',
    defaultValue: false
  })
  .number('-r, --rows', {
    desc: 'Number of rows to list in search.',
    defaultValue: 30
  })
  .number('-t, --truncate', {
    desc: 'Number of characters to show before truncating torrent titles.',
    defaultValue: 40
  })
  .boolean('-b, --copy, --clipboard', {
    desc: `Copy selected torrent's magnet url to your clipboard.`,
    defaultValue: false
  })
  .boolean('-o, --default, --openDefault', {
    desc: 'Open selected torrent in default torrent app.',
    defaultValue: true
  })
  .string('--app, --openApp', {
    desc: 'Name of app to open selected torrent in (e.g. "utorrent"). Overrides --openDefault flag.'
  })
  .boolean('-d, --details', {
    desc: 'Show detailed view of torrent and confirm before downloading.',
    defaultValue: true
  })
  .boolean('--no-progress', {
    desc: 'Disable progress bars (useful for non-interactive terminals).',
    defaultValue: false
  })
  .help('-h, --help')
  .version('-v, --version');

async function main() {
  const argv = await cli.parseAndExit();
  
  const cliOptions = {
    openDefault: argv.openDefault,
    clipboard: argv.clipboard,
    openApp: argv.openApp,
    showDetails: argv.details,
    showProgress: !argv.noProgress,
    searchAllProviders: argv.allProviders
  };
  // If space-separated strings were entered in search, join them together
  if (argv.search && argv._) argv.search = [argv.search, ...argv._].join(' ');
  // When nothing is passed in, the wizard will ask the user to search
  wizard(false, argv.search, argv.provider, argv.rows, argv.truncate, cliOptions);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
