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
  .enumeration('-c, --cat, --category', {
    desc: 'Limit torrent search to a category (some providers use different categories).',
    choices: ['All', 'Movies', 'TV', 'Music', 'Games', 'Apps', 'Books', 'Top100'],
    defaultValue: 'All'
  })
  .enumeration('-p, --provider', {
    desc: 'Specify the first provider to search.',
    choices: ['1337x', 'ThePirateBay', 'ExtraTorrent', 'Rarbg', 'Torrent9', 'KickassTorrents', 'TorrentProject', 'Torrentz2']
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
  .string('-a, --app, --openApp', {
    desc: 'Name of app to open selected torrent in (e.g. "utorrent"). Overrides --openDefault flag.'
  })
  .help('-h, --help')
  .version('-v, --version');

async function main() {
  const argv = await cli.parseAndExit();
  
  const cliOptions = {
    openDefault: argv.openDefault,
    clipboard: argv.clipboard,
    openApp: argv.openApp
  };
  // If space-separated strings were entered in search, join them together
  if (argv.search && argv._) argv.search = [argv.search, ...argv._].join(' ');
  // When nothing is passed in, the wizard will ask the user to search
  wizard(false, argv.search, argv.category, argv.provider, argv.rows, argv.truncate, cliOptions);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
