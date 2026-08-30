import { readdir } from 'node:fs/promises'
import { extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from '../../legacy/node_modules/typescript/lib/typescript.js'

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(scriptDirectory, '../..')
const legacyRoot = resolve(projectRoot, 'legacy')
const outputRoot = resolve(projectRoot, 'docs/round-0/generated')

interface RouteRecord {
  path: string
  name: string | null
  redirect: string | null
  component: string | null
  sourceLine: number
  suggestedPriority: 'P0' | 'P1' | 'P2'
}

interface ResourceRecord {
  path: string
  root: 'public' | 'src/assets'
  extension: string
  bytes: number
  sha256: string
}

function command(commandLine: string[], cwd = projectRoot) {
  const result = Bun.spawnSync(commandLine, {
    cwd,
    env: process.env,
    stderr: 'pipe',
    stdout: 'pipe',
  })

  return {
    exitCode: result.exitCode,
    stderr: result.stderr.toString().trim(),
    stdout: result.stdout.toString().trim(),
  }
}

async function writeJson(fileName: string, value: unknown) {
  await Bun.write(resolve(outputRoot, fileName), `${JSON.stringify(value, null, 2)}\n`)
}

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const results: string[] = []

  for (const entry of entries) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      results.push(...(await walk(path)))
    } else if (entry.isFile()) {
      results.push(path)
    }
  }

  return results
}

function property(object: ts.ObjectLiteralExpression, name: string) {
  return object.properties.find(
    (item): item is ts.PropertyAssignment =>
      ts.isPropertyAssignment(item) && item.name.getText().replaceAll(/["']/g, '') === name,
  )
}

function literalText(expression: ts.Expression | undefined): string | null {
  if (!expression) return null
  if (ts.isStringLiteralLike(expression)) return expression.text
  return null
}

function findDynamicImport(expression: ts.Node): string | null {
  let result: string | null = null

  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      result = node.arguments[0].text
      return
    }
    ts.forEachChild(node, visit)
  }

  visit(expression)
  return result
}

async function collectRoutes() {
  const routeFile = resolve(legacyRoot, 'src/router/routes.ts')
  const sourceText = await Bun.file(routeFile).text()
  const source = ts.createSourceFile(routeFile, sourceText, ts.ScriptTarget.Latest, true)
  const imports = new Map<string, string>()

  for (const statement of source.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      statement.importClause?.name &&
      ts.isStringLiteralLike(statement.moduleSpecifier)
    ) {
      imports.set(statement.importClause.name.text, statement.moduleSpecifier.text)
    }
  }

  let routeArray: ts.ArrayLiteralExpression | undefined
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === 'routes' &&
        declaration.initializer &&
        ts.isArrayLiteralExpression(declaration.initializer)
      ) {
        routeArray = declaration.initializer
      }
    }
  }

  if (!routeArray) throw new Error('Unable to find the routes array')

  const p0 = new Set([
    '/home',
    '/home/search',
    '/shop',
    '/shop/detail',
    '/message',
    '/message/chat',
    '/me',
    '/me/edit-userinfo',
    '/login',
    '/video-detail',
  ])

  const routes: RouteRecord[] = []
  for (const item of routeArray.elements) {
    if (!ts.isObjectLiteralExpression(item)) continue
    const path = literalText(property(item, 'path')?.initializer)
    if (!path) continue

    const componentExpression = property(item, 'component')?.initializer
    let component: string | null = null
    if (componentExpression) {
      if (ts.isIdentifier(componentExpression)) {
        component = imports.get(componentExpression.text) ?? componentExpression.text
      } else {
        component = findDynamicImport(componentExpression)
      }
    }

    routes.push({
      path,
      name: literalText(property(item, 'name')?.initializer),
      redirect: literalText(property(item, 'redirect')?.initializer),
      component,
      sourceLine: source.getLineAndCharacterOfPosition(item.getStart()).line + 1,
      suggestedPriority: p0.has(path) ? 'P0' : path.startsWith('/test') ? 'P2' : 'P1',
    })
  }

  await writeJson('routes.json', {
    generatedAt: new Date().toISOString(),
    source: 'legacy/src/router/routes.ts',
    total: routes.length,
    named: routes.filter((route) => route.name).length,
    redirects: routes.filter((route) => route.redirect).length,
    dynamicImports: routes.filter((route) => route.component?.startsWith('@')).length,
    priorityCounts: Object.fromEntries(
      Object.entries(Object.groupBy(routes, (route) => route.suggestedPriority)).map(
        ([priority, group]) => [priority, group?.length ?? 0],
      ),
    ),
    routes,
  })

  return routes
}

async function collectApi() {
  const files = ['src/api/user.ts', 'src/api/videos.ts']
  const endpoints: Array<{
    functionName: string
    method: string | null
    url: string | null
    params: string[]
    source: string
    sourceLine: number
  }> = []

  for (const sourcePath of files) {
    const file = resolve(legacyRoot, sourcePath)
    const sourceText = await Bun.file(file).text()
    const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true)

    function visit(node: ts.Node) {
      if (ts.isFunctionDeclaration(node) && node.name) {
        let requestObject: ts.ObjectLiteralExpression | undefined
        function findRequest(callNode: ts.Node) {
          if (
            ts.isCallExpression(callNode) &&
            ts.isIdentifier(callNode.expression) &&
            callNode.expression.text === 'request' &&
            callNode.arguments[0] &&
            ts.isObjectLiteralExpression(callNode.arguments[0])
          ) {
            requestObject = callNode.arguments[0]
          }
          ts.forEachChild(callNode, findRequest)
        }
        findRequest(node)

        endpoints.push({
          functionName: node.name.text,
          method: requestObject
            ? (literalText(property(requestObject, 'method')?.initializer)?.toUpperCase() ?? null)
            : null,
          url: requestObject ? literalText(property(requestObject, 'url')?.initializer) : null,
          params: node.parameters.map((parameter) => parameter.name.getText()),
          source: `legacy/${sourcePath}`,
          sourceLine: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        })
      }
      ts.forEachChild(node, visit)
    }

    visit(source)
  }

  const mockText = await Bun.file(resolve(legacyRoot, 'src/mock/index.ts')).text()
  const mockEndpoints = [
    ...mockText.matchAll(/mock\.on([A-Z][A-Za-z]+)\((\/.*?\/[a-z]*|['"].*?['"])\)\.reply/g),
  ].map((match) => ({
    method: match[1].toUpperCase(),
    matcher: match[2],
    sourceLine: mockText.slice(0, match.index).split('\n').length,
  }))

  await writeJson('api-and-mocks.json', {
    generatedAt: new Date().toISOString(),
    apiEndpointCount: endpoints.length,
    mockEndpointCount: mockEndpoints.length,
    apiEndpoints: endpoints,
    mockEndpoints,
  })
}

async function collectSourceSummary() {
  const sourceRoot = resolve(legacyRoot, 'src')
  const sourceFiles = await walk(sourceRoot)
  const vueFiles = sourceFiles.filter((file) => file.endsWith('.vue'))
  const categories: Record<string, number> = {
    noScript: 0,
    scriptJs: 0,
    scriptSetupJs: 0,
    scriptSetupTs: 0,
    scriptTs: 0,
  }
  const occurrences: Record<string, Array<{ path: string; count: number }>> = {
    any: [],
    dollarRef: [],
    tsIgnore: [],
  }

  for (const file of vueFiles) {
    const text = await Bun.file(file).text()
    const script = text.match(/<script\b([^>]*)>/)
    const attributes = script?.[1] ?? ''
    if (!script) categories.noScript += 1
    else if (/\bsetup\b/.test(attributes) && /lang=["']ts["']/.test(attributes))
      categories.scriptSetupTs += 1
    else if (/\bsetup\b/.test(attributes)) categories.scriptSetupJs += 1
    else if (/lang=["']ts["']/.test(attributes)) categories.scriptTs += 1
    else categories.scriptJs += 1
  }

  for (const file of sourceFiles.filter((item) => /\.(vue|ts|tsx|js)$/.test(item))) {
    const text = await Bun.file(file).text()
    const counters = {
      any: [...text.matchAll(/(:\s*any\b|\bas\s+any\b)/g)].length,
      dollarRef: [...text.matchAll(/\$ref\b/g)].length,
      tsIgnore: [...text.matchAll(/@ts-ignore/g)].length,
    }
    for (const [name, count] of Object.entries(counters)) {
      if (count) occurrences[name].push({ path: relative(legacyRoot, file), count })
    }
  }

  const extensions = Object.groupBy(sourceFiles, (file) => extname(file).toLowerCase() || '[none]')
  await writeJson('source-summary.json', {
    generatedAt: new Date().toISOString(),
    files: sourceFiles.length,
    fileCountsByExtension: Object.fromEntries(
      Object.entries(extensions)
        .map(([extension, files]) => [extension, files?.length ?? 0])
        .sort((left, right) => Number(right[1]) - Number(left[1])),
    ),
    vue: {
      total: vueFiles.length,
      categories,
    },
    occurrences: Object.fromEntries(
      Object.entries(occurrences).map(([name, files]) => [
        name,
        {
          count: files.reduce((total, file) => total + file.count, 0),
          files,
        },
      ]),
    ),
    globalSideEffects: [
      {
        path: 'src/main.ts',
        behavior: 'Proxies HTMLElement.prototype.addEventListener for every click listener.',
      },
      {
        path: 'src/main.ts',
        behavior: 'Installs a global mixin and global directives/components.',
      },
      {
        path: 'src/main.ts',
        behavior: 'Creates mutable window.isMoved/window.isMuted state.',
      },
      {
        path: 'src/main.ts',
        behavior: 'Starts Axios mock handlers after Pinia/router mount.',
      },
      {
        path: 'src/store/pinia.ts',
        behavior: 'Reads document.body dimensions during store state initialization.',
      },
    ],
  })
}

async function collectResources() {
  const roots = [
    { directory: resolve(legacyRoot, 'public'), name: 'public' as const },
    {
      directory: resolve(legacyRoot, 'src/assets'),
      name: 'src/assets' as const,
    },
  ]
  const records: ResourceRecord[] = []

  for (const root of roots) {
    for (const file of await walk(root.directory)) {
      const bytes = await Bun.file(file).arrayBuffer()
      const sha256 = new Bun.CryptoHasher('sha256').update(bytes).digest('hex')
      records.push({
        path: relative(legacyRoot, file),
        root: root.name,
        extension: extname(file).toLowerCase() || '[none]',
        bytes: bytes.byteLength,
        sha256,
      })
    }
  }

  records.sort((left, right) => left.path.localeCompare(right.path))
  await writeJson('resource-manifest.local.json', {
    generatedAt: new Date().toISOString(),
    records,
  })

  const byExtension = Object.groupBy(records, (record) => record.extension)
  const byRoot = Object.groupBy(records, (record) => record.root)
  const byHash = Object.groupBy(records, (record) => record.sha256)
  const duplicates = Object.values(byHash)
    .filter((group): group is ResourceRecord[] => Boolean(group && group.length > 1))
    .map((group) => ({
      bytesEach: group[0].bytes,
      reclaimableBytes: group[0].bytes * (group.length - 1),
      paths: group.map((record) => record.path),
      sha256: group[0].sha256,
    }))
    .sort((left, right) => right.reclaimableBytes - left.reclaimableBytes)

  function summarize(groups: Partial<Record<string, ResourceRecord[]>>) {
    return Object.fromEntries(
      Object.entries(groups)
        .map(([name, group]) => [
          name,
          {
            bytes: group?.reduce((total, record) => total + record.bytes, 0) ?? 0,
            files: group?.length ?? 0,
          },
        ])
        .sort(
          (left, right) =>
            Number((right[1] as { bytes: number }).bytes) -
            Number((left[1] as { bytes: number }).bytes),
        ),
    )
  }

  await writeJson('resource-summary.json', {
    generatedAt: new Date().toISOString(),
    totalFiles: records.length,
    totalBytes: records.reduce((total, record) => total + record.bytes, 0),
    byRoot: summarize(byRoot),
    byExtension: summarize(byExtension),
    duplicateGroups: duplicates.length,
    reclaimableDuplicateBytes: duplicates.reduce(
      (total, group) => total + group.reclaimableBytes,
      0,
    ),
    largestDuplicates: duplicates.slice(0, 25),
    largestFiles: [...records].sort((left, right) => right.bytes - left.bytes).slice(0, 30),
    fullManifest: 'resource-manifest.local.json (ignored by Git)',
  })
}

function describeValue(value: unknown, depth = 0): unknown {
  if (value === null) return 'null'
  if (Array.isArray(value)) {
    return {
      type: 'array',
      length: value.length,
      element: value.length && depth < 2 ? describeValue(value[0], depth + 1) : null,
    }
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    return {
      type: 'object',
      keys: entries.map(([key]) => key),
      fields:
        depth < 2
          ? Object.fromEntries(
              entries.map(([key, field]) => [key, describeValue(field, depth + 1)]),
            )
          : null,
    }
  }
  return typeof value
}

async function collectFixtures() {
  const commentDirectory = resolve(legacyRoot, 'public/data/comments')
  const userVideoDirectory = resolve(legacyRoot, 'public/data/user_video_list')
  const firstComment = (await readdir(commentDirectory))
    .filter((name) => name.endsWith('.json'))
    .sort()[0]
  const firstUserVideo = (await readdir(userVideoDirectory))
    .filter((name) => name.endsWith('.json'))
    .sort()[0]
  const files = [
    'public/data/users.json',
    'public/data/goods.json',
    'public/data/posts.json',
    'public/data/videos.json',
    `public/data/comments/${firstComment}`,
    `public/data/user_video_list/${firstUserVideo}`,
  ]
  const fixtures = []

  for (const path of files) {
    const file = Bun.file(resolve(legacyRoot, path))
    const value = await file.json()
    fixtures.push({
      path,
      bytes: file.size,
      shape: describeValue(value),
    })
  }

  await writeJson('fixture-summary.json', {
    generatedAt: new Date().toISOString(),
    note: 'Development and non-Gitee modes rewrite .md fixture URLs to these .json files. Gitee mode reads archived .md files through libarchive-wasm.',
    fixtures,
  })
}

async function collectBuildAndTypeCheck() {
  const distRoot = resolve(legacyRoot, 'dist')
  const distFiles = await walk(distRoot)
  const buildFiles = await Promise.all(
    distFiles.map(async (file) => {
      const bytes = await Bun.file(file).arrayBuffer()
      const shouldCompress = /\.(css|html|js|json|svg)$/.test(file)
      return {
        path: relative(distRoot, file),
        bytes: bytes.byteLength,
        gzipBytes: shouldCompress ? Bun.gzipSync(new Uint8Array(bytes)).byteLength : null,
      }
    }),
  )
  const buildLog = await Bun.file(resolve(projectRoot, 'docs/round-0/evidence/build.log')).text()
  const warningLines = buildLog
    .split('\n')
    .filter((line) => line.includes('[plugin ') || line.toLowerCase().includes('warning'))

  await writeJson('build-summary.json', {
    generatedAt: new Date().toISOString(),
    exitCode: Number(buildLog.match(/exit_code=(\d+)/)?.[1] ?? -1),
    outputFiles: buildFiles.length,
    totalBytes: buildFiles.reduce((total, file) => total + file.bytes, 0),
    warnings: warningLines,
    largestFiles: buildFiles.sort((left, right) => right.bytes - left.bytes).slice(0, 30),
  })

  const typeLog = await Bun.file(
    resolve(projectRoot, 'docs/round-0/evidence/type-check.log'),
  ).text()
  const errors = typeLog
    .split('\n')
    .map((line) => line.match(/^(.*?)\((\d+),(\d+)\): error (TS\d+): (.*)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      path: match[1],
      line: Number(match[2]),
      column: Number(match[3]),
      code: match[4],
      message: match[5],
    }))

  await writeJson('type-errors.json', {
    generatedAt: new Date().toISOString(),
    exitCode: Number(typeLog.match(/exit_code=(\d+)/)?.[1] ?? -1),
    errorCount: errors.length,
    filesWithErrors: new Set(errors.map((error) => error.path)).size,
    countsByCode: Object.fromEntries(
      Object.entries(Object.groupBy(errors, (error) => error.code))
        .map(([code, group]) => [code, group?.length ?? 0])
        .sort((left, right) => Number(right[1]) - Number(left[1])),
    ),
    errors,
  })
}

async function collectEnvironment(routes: RouteRecord[]) {
  const packageJson = await Bun.file(resolve(legacyRoot, 'package.json')).json()
  const packageHash = command(['sha256sum', 'package.json'], legacyRoot).stdout.split(' ')[0]
  const lockHash = command(['sha256sum', 'pnpm-lock.yaml'], legacyRoot).stdout.split(' ')[0]
  const dependencyList = command(['pnpm', 'list', '--depth=0', '--json'], legacyRoot)
  const environmentFiles = (await readdir(resolve(legacyRoot, 'env'))).filter((name) =>
    name.startsWith('.env'),
  )
  const environmentKeys: Record<string, string[]> = {}

  for (const name of environmentFiles) {
    const text = await Bun.file(resolve(legacyRoot, 'env', name)).text()
    environmentKeys[name] = text
      .split('\n')
      .map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1])
      .filter((key): key is string => Boolean(key))
  }

  let resolvedDependencies: unknown = null
  if (dependencyList.exitCode === 0) {
    resolvedDependencies = JSON.parse(dependencyList.stdout)
  }

  const gitBranch = command(['git', 'branch', '--show-current']).stdout
  const gitCommitCount = Number(command(['git', 'rev-list', '--all', '--count']).stdout)
  const gitRemotes = command(['git', 'remote']).stdout

  await writeJson('environment.json', {
    generatedAt: new Date().toISOString(),
    platform: command(['uname', '-a']).stdout,
    tools: {
      bun: command(['bun', '--version']).stdout,
      bunRevision: command(['bun', '--revision']).stdout,
      git: command(['git', '--version']).stdout,
      node: command(['node', '--version']).stdout,
      pnpm: command(['pnpm', '--version']).stdout,
    },
    newRepository: {
      branch: gitBranch,
      commitCount: gitCommitCount,
      remoteCount: gitRemotes ? gitRemotes.split('\n').length : 0,
    },
    legacy: {
      packageName: packageJson.name,
      packageVersion: packageJson.version,
      packageJsonSha256: packageHash,
      pnpmLockSha256: lockHash,
      routeCount: routes.length,
      environmentKeys,
      resolvedDependencies,
    },
  })
}

async function main() {
  await Bun.write(resolve(outputRoot, '.keep'), '')
  const routes = await collectRoutes()
  await Promise.all([
    collectApi(),
    collectSourceSummary(),
    collectResources(),
    collectFixtures(),
    collectBuildAndTypeCheck(),
    collectEnvironment(routes),
  ])
  console.log(`Round-0 baseline generated in ${relative(projectRoot, outputRoot)}`)
}

await main()
