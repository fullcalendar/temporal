import { tryParseOffsetNano } from '../dateUtils/parse'
import { nanoInMinute } from '../dateUtils/units'
import { FixedTimeZoneImpl } from './fixedTimeZoneImpl'
import { IntlTimeZoneImpl } from './intlTimeZoneImpl'
import { TimeZoneImpl } from './timeZoneImpl'

const implCache: { [zoneName: string]: TimeZoneImpl } = {
  UTC: new FixedTimeZoneImpl('UTC', 0),
}

export function queryTimeZoneImpl(id: string): TimeZoneImpl {
  const key = String(id).toLocaleUpperCase() // uppercase is better for 'UTC'

  if (implCache[key]) {
    return implCache[key]
  }

  // parse a literal time zone offset
  const offsetNano = tryParseOffsetNano(id)
  if (offsetNano != null) {
    // don't store fixed-offset zones in cache. there could be many
    return new FixedTimeZoneImpl(id, Math.trunc(offsetNano / nanoInMinute)) // convert to minutes
  }

  return (implCache[key] = new IntlTimeZoneImpl(id))
}