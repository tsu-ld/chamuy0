export default {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'A imports B imports A.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'services-stay-third-party-free',
      comment: 'Business code imports no third party, not even the framework.',
      severity: 'error',
      from: { path: '/services/' },
      to: { dependencyTypes: ['npm'] },
    },
    {
      name: 'core-is-a-leaf',
      comment: 'core/ is shared classifier logic: never imports extension/ or dev/.',
      severity: 'error',
      from: { path: '^core/' },
      to: { path: '^(extension|dev)/' },
    },
    {
      name: 'extension-never-imports-dev',
      comment: 'dev/ is tooling, not shipped code.',
      severity: 'error',
      from: { path: '^extension/' },
      to: { path: '^dev/' },
    },
    {
      name: 'dev-never-imports-extension',
      comment: 'The browser layer is not importable outside a browser.',
      severity: 'error',
      from: { path: '^dev/' },
      to: { path: '^extension/' },
    },
    {
      name: 'no-junk-drawer-folders',
      comment: 'No junk-drawer folders. Put the code in the feature that owns it.',
      severity: 'error',
      from: { path: '^(src/)?(helpers|common|misc|stuff|utils|utilities)/' },
      to: {},
    },
    {
      name: 'no-deprecated-core',
      severity: 'error',
      from: {},
      to: { dependencyTypes: ['core'], path: '^(punycode|domain|sys|querystring)$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '^extension/dist/' },
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: { extensions: ['.ts', '.tsx', '.js', '.jsx'] },
  },
}
