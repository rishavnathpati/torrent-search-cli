import _ from 'lodash'
import inquirer from 'inquirer'
import TorrentSearchApi from 'torrent-search-api'
import chalk from 'chalk'
import clipboardy from 'clipboardy'
import open from 'open'

import { config } from './config.js'
import { promptTitle, displayTorrentDetails, createProgressBar } from './utils.js'

const options = {
  openDefault: config.method.openInDefault,
  clipboard: config.method.clipboard,
  openApp: config.method.openInApp,
  showDetails: true,
  showProgress: true,
  searchAllProviders: false
}

function overWriteOptions(cliOpts) {
  for (const entry of Object.entries(cliOpts)) {
    if (typeof entry[1] !== 'undefined') options[entry[0]] = entry[1]
  }
}

async function wizard(isNext, searchQuery, provider, rows, truncateLength, cliOpts) {
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
  let inquirerResp = await getTorrent(searchQuery, provider, rows, truncateLength)
  if (inquirerResp) torrent = inquirerResp.selection
  
  // Show detailed view if enabled
  if (options.showDetails) {
    displayTorrentDetails(torrent)
    
    // Ask if the user wants to proceed with this torrent
    const confirmChoices = ['Download/Open Magnet', 'Back to Search', 'Exit']
    const confirmPrompt = await inquirer.prompt({
      type: config.listType,
      name: 'choice',
      message: 'What would you like to do?',
      choices: confirmChoices
    })
    
    if (confirmPrompt.choice === confirmChoices[1]) {
      return wizard(true, searchQuery, provider, rows, truncateLength, cliOpts)
    } else if (confirmPrompt.choice === confirmChoices[2]) {
      process.exit(0)
    }
  }
  
  // Proceed with getting the magnet and downloading/opening
  const magnet = await getMagnet(torrent)
  if (!magnet) return console.error(chalk.red('Magnet not found.'))
  return download(magnet, torrent)
}

async function searchProvider(query, provider, rows = config.torrents.limit) {
  TorrentSearchApi.disableAllProviders()
  TorrentSearchApi.enableProvider(provider)

  try {
    const torrents = await TorrentSearchApi.search(query, 'All', rows)
    
    // Add provider info to each torrent for display
    return torrents.map(torrent => ({
      ...torrent,
      provider
    }))
  } catch (e) {
    return []
  }
}

async function getTorrents(query, provider, providers = config.torrents.providers.available, rows = config.torrents.limit) {
  // If no specific provider and not searching all, ask user to select one
  if (!provider && !options.searchAllProviders) {
    const providerPrompt = await inquirer.prompt({
      type: config.listType,
      name: 'selection',
      message: 'Which torrent provider would you like to use?',
      choices: [...providers, 'All Providers']
    })
    
    if (providerPrompt.selection === 'All Providers') {
      options.searchAllProviders = true
    } else {
      provider = providerPrompt.selection
    }
  }

  // Create progress UI
  let progressBar
  let progressInterval
  
  if (options.showProgress) {
    progressBar = createProgressBar(100, 'Searching')
    let progress = 0
    progressInterval = setInterval(() => {
      progress += 5
      if (progress > 95) progress = 95
      progressBar.update(progress)
    }, 200)
  } else {
    if (options.searchAllProviders) {
      console.log(chalk.blue(`Searching for "${chalk.bold(query)}" across all providers...`))
    } else {
      console.log(chalk.blue(`Searching for "${chalk.bold(query)}" on "${chalk.bold(provider)}"...`))
    }
  }
  
  try {
    let allTorrents = []
    
    // Search across all providers or use the specific one
    if (options.searchAllProviders) {
      // Create an array of promises to search all providers simultaneously
      const searchPromises = providers.map(p => searchProvider(query, p, Math.ceil(rows / providers.length)))
      const results = await Promise.allSettled(searchPromises)
      
      // Combine all successful results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
          allTorrents = [...allTorrents, ...result.value]
        }
      })
      
      // Sort by seeders (high to low)
      allTorrents = _.sortBy(allTorrents, torrent => -(torrent.seeds || 0))
      
      // Limit to requested row count
      if (allTorrents.length > rows) {
        allTorrents = allTorrents.slice(0, rows)
      }
    } else {
      // Just search the specified provider
      allTorrents = await searchProvider(query, provider, rows)
    }
    
    // Update progress UI
    if (options.showProgress) {
      clearInterval(progressInterval)
      progressBar.update(100)
      
      if (options.searchAllProviders) {
        progressBar.stop(chalk.green(`✓ Found ${allTorrents.length} results across all providers`))
      } else {
        progressBar.stop(chalk.green(`✓ Found ${allTorrents.length} results on "${chalk.bold(provider)}"`))
      }
    } else {
      if (options.searchAllProviders) {
        console.log(chalk.green(`✓ Found ${allTorrents.length} results across all providers`))
      } else {
        console.log(chalk.green(`✓ Found ${allTorrents.length} results on "${chalk.bold(provider)}"`))
      }
    }
    
    if (!allTorrents.length) {
      throw new Error('No torrents found.')
    }
    
    return allTorrents
  } catch (e) {
    // Update progress UI
    if (options.showProgress) {
      clearInterval(progressInterval)
      if (options.searchAllProviders) {
        progressBar.stop(chalk.yellow(`✗ No torrents found across any providers`))
      } else {
        progressBar.stop(chalk.yellow(`✗ No torrents found via "${chalk.bold(provider)}"`))
      }
    } else {
      if (options.searchAllProviders) {
        console.log(chalk.yellow(`✗ No torrents found across any providers`))
      } else {
        console.log(chalk.yellow(`✗ No torrents found via "${chalk.bold(provider)}"`))
      }
    }
    
    if (!options.searchAllProviders) {
      console.log(chalk.cyan(`Would you like to try searching across all providers?`))
      const retryPrompt = await inquirer.prompt({
        type: 'confirm',
        name: 'retry',
        message: 'Search across all providers?',
        default: true
      })
      
      if (retryPrompt.retry) {
        options.searchAllProviders = true
        return getTorrents(query, null, providers, rows)
      }
    }
    
    return []
  }
}

async function getTorrent(withQuery, provider, rows, truncateLength) {
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
    
    const torrents = await getTorrents(searchString, provider, undefined, rows)
    if (!torrents || !torrents.length) {
      console.error(chalk.yellow(`No torrents found for "${chalk.bold(searchString)}", try another query.`))
      withQuery = undefined
      continue
    }
    return promptTitle('Which torrent would you like to view?', torrents, truncateLength)
  }
}

async function getMagnet(torrent) {
  try {
    // Show progress UI based on options
    let progress
    
    if (options.showProgress) {
      // Create a progress bar for getting the magnet link
      progress = createProgressBar(100, 'Getting magnet link')
      
      for (let i = 0; i <= 90; i += 15) {
        progress.update(i)
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    } else {
      console.log(chalk.blue('Getting magnet link...'))
    }
    
    // Need to enable the specific provider for this torrent
    TorrentSearchApi.disableAllProviders()
    TorrentSearchApi.enableProvider(torrent.provider)
    
    const magnet = await TorrentSearchApi.getMagnet(torrent)
    
    // Update progress UI based on options
    if (options.showProgress) {
      progress.update(100)
      progress.stop(chalk.green('✓ Magnet link retrieved successfully'))
    } else {
      console.log(chalk.green('✓ Magnet link retrieved successfully'))
    }
    
    return magnet
  } catch (e) {
    console.error(chalk.red('Unable to get magnet for torrent.'))
    return null
  }
}

async function download(magnet, torrent) {
  if (options.clipboard) {
    console.log(chalk.bold('Magnet link for ') + chalk.cyan(torrent.title) + chalk.bold(' copied to clipboard.'))
    await clipboardy.write(magnet)
  }
  
  if (options.openApp || options.openDefault) {
    let progress
    
    // Show progress UI based on options
    if (options.showProgress) {
      // Show progress for opening the torrent
      progress = createProgressBar(100, 'Opening torrent')
      
      for (let i = 0; i <= 90; i += 10) {
        progress.update(i)
        await new Promise(resolve => setTimeout(resolve, 30))
      }
    } else {
      console.log(chalk.blue('Opening torrent...'))
    }
    
    if (options.openApp) {
      await open(magnet, { app: { name: options.openApp } })
      
      if (options.showProgress) {
        progress.stop(chalk.green(`✓ Opened in ${options.openApp}`))
      } else {
        console.log(chalk.green(`✓ Opened in ${options.openApp}`))
      }
    } else if (options.openDefault) {
      await open(magnet)
      
      if (options.showProgress) {
        progress.stop(chalk.green('✓ Opened in default application'))
      } else {
        console.log(chalk.green('✓ Opened in default application'))
      }
    }
  }
  
  return wizard(true)
}

export { wizard, getTorrent }
