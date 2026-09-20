type ExtensionApi = typeof chrome

const scope = globalThis as unknown as { browser?: ExtensionApi, chrome: ExtensionApi }

// Firefox exposes promise-based APIs on `browser`; Chrome only has `chrome`.
export const extensionApi: ExtensionApi = scope.browser ?? scope.chrome
export const isGecko = scope.browser !== undefined

export function onLocalChange(field: string, listener: (value: unknown) => void): void {
  extensionApi.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(field in changes)) return
    listener(changes[field].newValue)
  })
}
