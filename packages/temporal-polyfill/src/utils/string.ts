
export function capitalizeFirstLetter(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/*
converts a positive integer to a string with a guaranteed length, padding zeros on the left side
*/
export function padZeros(num: number, length: number): string {
  return String(num).padStart(length, '0')
}

export function getSignStr(num: number): string {
  return num < 0 ? '-' : '+'
}
