import _ from 'lodash'
import inquirer from 'inquirer'
import filesizeParser from 'filesize-parser'
import prettySize from 'prettysize'
import chalk from 'chalk'

import { config } from './config.js'

// Define header names and colors
const HEADERS = {
  title: { name: 'TITLE', color: 'cyan' },
  seeds: { name: 'SEEDS', color: 'green' },
  peers: { name: 'PEERS', color: 'red' },
  size: { name: 'SIZE', color: 'yellow' },
  time: { name: 'DATE', color: 'magenta' }
}

async function promptTitle (message, titles, truncateLength) {
  /* CHECKS */
  const hasSeeders = titles[0] && _.isNumber(titles[0].seeds)
  const hasLeechers = titles[0] && _.isNumber(titles[0].peers)
  const hasSize = titles[0] && _.isString(titles[0].size)
  const hasTime = titles[0] && _.isString(titles[0].time)

  /* TABLE */
  // Add table headers
  const headerRow = []
  headerRow.push(HEADERS.title.name)
  if (config.torrents.details.seeders && hasSeeders) headerRow.push(HEADERS.seeds.name)
  if (config.torrents.details.leechers && hasLeechers) headerRow.push(HEADERS.peers.name)
  if (config.torrents.details.size && hasSize) headerRow.push(HEADERS.size.name)
  if (config.torrents.details.time && hasTime) headerRow.push(HEADERS.time.name)

  // Format torrent data into rows
  const table = [headerRow]
  titles.forEach(title => {
    const row = []
    row.push(parseTitle(title.title))

    if (config.torrents.details.seeders && hasSeeders) row.push(title.seeds)
    if (config.torrents.details.leechers && hasLeechers) row.push(title.peers)
    if (config.torrents.details.size && hasSize) row.push(parseSize(title.size))
    if (config.torrents.details.time && hasTime) row.push(formatDate(title.time))

    table.push(row)
  })

  /* COLORS */
  const colors = [HEADERS.title.color]
  if (config.torrents.details.seeders && hasSeeders) colors.push(HEADERS.seeds.color)
  if (config.torrents.details.leechers && hasLeechers) colors.push(HEADERS.peers.color)
  if (config.torrents.details.size && hasSize) colors.push(HEADERS.size.color)
  if (config.torrents.details.time && hasTime) colors.push(HEADERS.time.color)

  const choices = toChoicesTable(table, titles, colors, truncateLength)

  return inquirer.prompt({
    type: config.listType,
    name: 'selection',
    message,
    choices,
    pageSize: process.stdout.rows ? Math.floor(process.stdout.rows * 0.7) : 15
  })
}

function parseTitle (title) {
  return title.replace(/\d+(\.\d+)? ?[k|m|g|t]b/gi, '') // Size info
    .replace(/\s\s+/g, ' ') // Multiple spaces
    .replace(/- -/g, '-') // Empty blocks between dashes
    .replace(/\s*-$/, '') // Ending dash
}

function parseSize (size) {
  try {
    const bytes = filesizeParser(size)
    return prettySize(bytes, true, true, 1)
  } catch (e) {
    return size
  }
}

function formatDate (date) {
  // If date is already formatted well, return as is
  if (!date) return ''
  
  // Try to parse and format the date if it looks like a timestamp or date string
  try {
    const dateObj = new Date(date)
    if (!isNaN(dateObj.getTime())) {
      // Check if it's today or this year
      const now = new Date()
      const isToday = dateObj.toDateString() === now.toDateString()
      const isThisYear = dateObj.getFullYear() === now.getFullYear()
      
      if (isToday) {
        return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } else if (isThisYear) {
        return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })
      } else {
        return dateObj.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
      }
    }
  } catch (e) {
    // If parsing fails, return original
  }
  
  return date
}

function toChoicesTable (table, titles, colors = [], truncateLength) {
  if (table.length <= 1) return [] // Return empty if only headers or no data
  
  const dataRows = table.slice(1) // Skip header row for data processing
  const headerRow = table[0]
  
  if (dataRows[0] && dataRows[0].length > 1) {
    // Shorten title names
    for (const row of dataRows) {
      row[0] = _.truncate(row[0], {
        length: truncateLength
      })
    }

    // Get max lengths for padding (include header in calculation)
    const maxLengths = headerRow.map((header, index) => {
      const dataLengths = dataRows.map(row => String(row[index] && row[index].length).length)
      const headerLength = String(header).length
      return Math.max(headerLength, ...dataLengths)
    })

    // Format the header row
    const formattedHeader = headerRow.map((val, index) => {
      const color = colors[index] || 'white'
      return chalk.bold[color](_.padEnd(val, maxLengths[index]))
    }).join(' | ')
    
    // Pad and color data rows
    const formattedRows = dataRows.map(row => {
      return row.map((val, index) => {
        const padFn = index > 0 ? _.padStart : _.padEnd
        const paddedVal = padFn(val, maxLengths[index])
        const color = colors[index] || 'white'
        return chalk[color](paddedVal)
      })
    })

    // Build choice objects
    const choices = []
    
    // Add a separator with the header
    choices.push(new inquirer.Separator(`| ${formattedHeader} |`))
    choices.push(new inquirer.Separator('|' + '―'.repeat(formattedHeader.length + 2) + '|'))
    
    // Add data rows
    formattedRows.forEach((row, index) => {
      choices.push({
        name: `| ${row.join(' | ')} |`,
        short: row[0].trim(),
        value: titles[index]
      })
    })

    return choices
  }
  
  // Fall back to simple choices if not a proper table
  return dataRows.map((row, index) => ({
    name: row[0],
    short: row[0].trim(),
    value: titles[index]
  }))
}

// Function to display detailed information about a specific torrent
function displayTorrentDetails (torrent) {
  console.log('\n' + chalk.bold.underline('Torrent Details:'))
  console.log(`${chalk.bold('Title:')} ${chalk.white(torrent.title)}`)
  
  if (torrent.size) {
    console.log(`${chalk.bold('Size:')} ${chalk.yellow(parseSize(torrent.size))}`)
  }
  
  if (torrent.seeds !== undefined) {
    console.log(`${chalk.bold('Seeders:')} ${chalk.green(torrent.seeds)}`)
  }
  
  if (torrent.peers !== undefined) {
    console.log(`${chalk.bold('Leechers:')} ${chalk.red(torrent.peers)}`)
  }
  
  if (torrent.time) {
    console.log(`${chalk.bold('Uploaded:')} ${chalk.magenta(formatDate(torrent.time))}`)
  }
  
  if (torrent.provider) {
    console.log(`${chalk.bold('Provider:')} ${chalk.blue(torrent.provider)}`)
  }
  
  if (torrent.desc) {
    console.log(`\n${chalk.bold('Description:')}`)
    console.log(chalk.white(torrent.desc))
  }
  
  if (torrent.link) {
    console.log(`\n${chalk.bold('Link:')} ${chalk.cyan(torrent.link)}`)
  }
  
  console.log() // Empty line at the end
}

// Create a progress bar function
function createProgressBar (total = 100, title = 'Progress', width = 40) {
  const stream = process.stderr
  let lastStr = ''
  let lastPercent = 0
  
  // Don't show progress bar in tests or non-TTY environments
  const isTTY = stream && stream.isTTY
  if (!isTTY) {
    return {
      update: () => {},
      stop: () => {}
    }
  }
  
  return {
    update: (current) => {
      // Calculate percentage and avoid unnecessary updates
      const percent = Math.floor((current / total) * 100)
      if (percent === lastPercent && percent !== 100) return
      lastPercent = percent
      
      // Create the bar
      const barWidth = Math.floor((width * current) / total)
      const bar = '█'.repeat(barWidth) + '░'.repeat(width - barWidth)
      
      // Create the status string
      const str = `${title} ${bar} ${percent}%`
      
      // Clear the last status and write the new one
      if (lastStr && lastStr.length > str.length) {
        stream.cursorTo(0)
        stream.write(' '.repeat(lastStr.length))
      }
      
      stream.cursorTo(0)
      stream.write(str)
      lastStr = str
    },
    stop: (message = '') => {
      stream.cursorTo(0)
      if (lastStr) {
        stream.write(' '.repeat(lastStr.length))
        stream.cursorTo(0)
      }
      if (message) {
        stream.write(message)
      }
      stream.write('\n')
    }
  }
}

export { promptTitle, displayTorrentDetails, createProgressBar }
