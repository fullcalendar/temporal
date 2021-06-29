/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { readdirSync } from 'fs'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

// Get localeRoot relative to this file
const localeRoot = resolve(fileURLToPath(import.meta.url), '../../locales')

export const listLocales = () => {
  const localeList = readdirSync(localeRoot)

  // Error out if no locales
  if (localeList.length === 0) {
    console.error('Locales have not been generated')
    process.exit()
  }

  return localeList
}

export const localesReduceAsync = (
  transform = (accum, locale, json) => {
    return { ...accum, [locale]: json }
  },
  initial = ''
) => {
  // Read files and reduce to locale comparison string asynchronously
  return listLocales(localeRoot).reduce(async (accumPromise, val) => {
    const json = JSON.parse(
      await readFile(resolve(localeRoot, val), {
        encoding: 'utf8',
      })
    )

    // Get current state of accum, this will cause the async to become synchronous
    const accum = await accumPromise

    // Format using given transform function
    return transform(accum, val.replace('.json', ''), json)
  }, Promise.resolve(initial))
}