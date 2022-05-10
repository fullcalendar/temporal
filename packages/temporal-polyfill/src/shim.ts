import { DateTimeFormat, Temporal, toTemporalInstant } from './internal'

// TODO: better way to extend already-polyfilled rootObj
// somehow WRAP the whole lib, UMD-style?

export function shim(): void {
  if (!globalThis.Temporal) {
    globalThis.Temporal = Temporal
    Intl.DateTimeFormat = DateTimeFormat
    // eslint-disable-next-line no-extend-native
    Date.prototype.toTemporalInstant = toTemporalInstant
  }
}
