const HASH_SEED = 5381
const HASH_SHIFT = 5
const HASH_RADIX = 36

function hashText(text: string): string {
  let hash = HASH_SEED
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << HASH_SHIFT) + hash) ^ text.charCodeAt(index)
  }
  return (hash >>> 0).toString(HASH_RADIX)
}

export function textKey(text: string): string {
  return `${hashText(text)}:${text.length}`
}
