import _ from 'lodash'
import inquirer from 'inquirer'
import filesizeParser from 'filesize-parser'
import prettySize from 'prettysize'
import chalk from 'chalk'

import { config } from './config.js'

async function promptTitle (message, titles, truncateLength) {
  /* CHECKS */
  const hasSeeders = titles[0] && _.isNumber(titles[0].seeds)
  const hasLeechers = titles[0] && _.isNumber(titles[0].peers)
  const hasSize = titles[0] && _.isString(titles[0].size)
  const hasTime = titles[0] && _.isString(titles[0].time)

  /* TABLE */
  const table = []
  titles.forEach(title => {
    const row = []
    row.push(parseTitle(title.title))

    if (config.torrents.details.seeders && hasSeeders) row.push(title.seeds)
    if (config.torrents.details.leechers && hasLeechers) row.push(title.peers)
    if (config.torrents.details.size && hasSize) row.push(parseSize(title.size))
    if (config.torrents.details.time && hasTime) row.push(title.time)

    table.push(row)
  })

  /* COLORS */
  const colors = [undefined]
  if (config.torrents.details.seeders && hasSeeders) colors.push('green')
  if (config.torrents.details.leechers && hasLeechers) colors.push('red')
  if (config.torrents.details.size && hasSize) colors.push('yellow')
  if (config.torrents.details.time && hasTime) colors.push('magenta')

  const choices = toChoicesTable(table, titles, colors, truncateLength)

  return inquirer.prompt({
    type: config.listType,
    name: 'selection',
    message,
    choices
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

function toChoicesTable (table, titles, colors = [], truncateLength) {
  if (table[0] && table[0].length > 1) {
    // Shorten title names
    for (const row of table) {
      row[0] = _.truncate(row[0], {
        length: truncateLength
      })
    }

    // Get max lengths for padding
    const maxLengths = table[0].map((val, index) => _.max(table.map(row => String(row[index] && row[index].length))))

    // Pad
    table = table.map(row => {
      return row.map((val, index) => {
        const padFn = index > 0 ? _.padStart : _.padEnd
        return padFn(val, maxLengths[index])
      })
    })

    // Color
    table = table.map(row => {
      return row.map((val, index) => {
        const color = colors[index]
        if (!color) return val
        return chalk[color](val)
      })
    })
  }

  // Build choice objs to pass to inquire.prompt with separators
  const choices = table.map((row, index) => ({
    name: row.length > 1 ? `| ${row.join(' | ')} |` : row[0],
    short: row[0].trim(),
    value: titles[index]
  }))

  return choices
}

export { promptTitle }
