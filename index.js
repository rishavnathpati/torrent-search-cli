import _ from 'lodash'
import inquirer from 'inquirer'
import TorrentSearchApi from 'torrent-search-api'
import chalk from 'chalk'
import { oraPromise } from 'ora'
import clipboardy from 'clipboardy'
import open from 'open'

import { config } from './config.js'
import { promptTitle } from './utils.js'

const options = {
  openDefault: config.method.openInDefault,
  clipboard: config.method.clipboard,
  openApp: config.method.openInApp
}

function overWriteOptions (cliOpts) {
  for (const entry of Object.entries(cliOpts)) {
    if (typeof entry[1] !== 'undefined') options[entry[0]] = entry[1]
  }
}

async function wizard (isNext, searchQuery, category, provider, rows, truncateLength, cliOpts) {
  if (cliOpts) overWriteOptions(cliOpts)
  // Ask user if they want to continue if after first iteration
  if (isNext) {
    const choices = ['Yes', 'No']
    const shouldContinuePrompt = await inquirer.prompt({
      type: config.listType,
      name: 'choice',
      message: 'Find another torrent?',
      choices
    })
    if (shouldContinuePrompt.choice === choices[1]) process.exit(0)
  }

  let torrent
  let inquirerResp = await getTorrent(searchQuery, category, provider, rows, truncateLength)
  if (inquirerResp) torrent = inquirerResp.selection
  const magnet = await getMagnet(torrent)
  if (!magnet) return console.error(chalk.red('Magnet not found.'))
  return download(magnet, torrent)
}

async function getTorrents (query, category, provider, providers = config.torrents.providers.available, rows = config.torrents.limit) {
  const hasProvider = !!provider
  if (!provider) {
    const providerPrompt = await inquirer.prompt({
      type: config.listType,
      name: 'selection',
      message: 'Which torrent provider would you like to start with?',
      choices: providers
    })
    provider = providerPrompt.selection
  }

  try {
    TorrentSearchApi.disableAllProviders()
    TorrentSearchApi.enableProvider(provider)
    if (!category) category = 'All'
    
    // Use oraPromise to show a spinner during the search
    const torrents = await oraPromise(
      TorrentSearchApi.search(query, category, rows),
      {
        text: `Searching "${chalk.bold(query)}" on "${chalk.bold(provider)}"...`,
        successText: `Found results on "${chalk.bold(provider)}"`,
        failText: `No torrents found via "${chalk.bold(provider)}"`
      }
    )
    
    if (!torrents.length) throw new Error('No torrents found.')
    return torrents
  } catch (e) {
    console.error(chalk.yellow(`No torrents found via "${chalk.bold(provider)}"`))
    const nextProviders = _.without(providers, provider)
    const nextProvider = hasProvider ? providers[providers.indexOf(provider) + 1] : ''
    if (!nextProvider || !nextProviders.length) return []
    // Automatically fallback to next provider without requiring user intervention
    console.log(chalk.cyan(`Trying next provider: "${chalk.bold(nextProvider)}"`))
    return getTorrents(query, category, nextProvider, nextProviders, rows)
  }
}

async function getTorrent (withQuery, category, provider, rows, truncateLength) {
  let searchString = ''
  while (true) {
    if (!withQuery) {
      const query = await inquirer.prompt({
        type: 'input',
        name: 'input',
        message: 'What do you want to download?'
      })
      searchString = query.input
    } else {
      searchString = withQuery
    }
    
    // Add category selection through wizard if not provided
    if (!category) {
      const categoryPrompt = await inquirer.prompt({
        type: config.listType,
        name: 'selection',
        message: 'Which category do you want to search in?',
        choices: ['All', 'Movies', 'TV', 'Music', 'Games', 'Apps', 'Books', 'Top100']
      })
      category = categoryPrompt.selection
    }
    
    const torrents = await getTorrents(searchString, category, provider, undefined, rows)
    if (!torrents || !torrents.length) {
      console.error(chalk.yellow(`No torrents found for "${chalk.bold(searchString)}" in category: "${category}", try another query.`))
      withQuery = undefined
      category = undefined
      continue
    }
    return promptTitle('Which torrent?', torrents, truncateLength)
  }
}

async function getMagnet (torrent) {
  try {
    return await TorrentSearchApi.getMagnet(torrent)
  } catch (e) {
    console.error('Unable to get magnet for torrent.')
  }
}

async function download (magnet, torrent) {
  if (options.clipboard) {
    console.log(chalk.bold('Magnet link for ') + chalk.cyan(torrent.title) + chalk.bold(' copied to clipboard.'))
    await clipboardy.write(magnet)
  }
  if (options.openApp) {
    await open(magnet, { app: { name: options.openApp } })
  } else if (options.openDefault) {
    await open(magnet)
  }
  return wizard(true)
}

export { wizard, getTorrent }
