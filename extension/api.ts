type ExtensionApi = typeof chrome

const scope = globalThis as unknown as { browser?: ExtensionApi, chrome: ExtensionApi }

// Firefox exposes promise-based APIs on `browser`; Chrome only has `chrome`.
export const extensionApi: ExtensionApi = scope.browser ?? scope.chrome
export const isGecko = scope.browser !== undefined
