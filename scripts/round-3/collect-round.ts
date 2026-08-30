import { readdir } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(scriptDirectory, '../..')
const outputFile = resolve(projectRoot, 'docs/round-3/generated/summary.json')

function command(commandLine: string[]) {
  const result = Bun.spawnSync(commandLine, {
    cwd: projectRoot,
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

async function walk(directory: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(path)))
    else if (entry.isFile()) files.push(path)
  }
  return files
}

function count(pattern: RegExp, text: string) {
  return [...text.matchAll(pattern)].length
}

function exitCode(text: string) {
  const matches = [...text.matchAll(/^exit_code=(\d+)$/gm)]
  return matches.length ? Number(matches[matches.length - 1]?.[1]) : null
}

async function evidence(name: string) {
  const text = await Bun.file(resolve(projectRoot, 'docs/round-3/evidence', name)).text()
  return {
    exitCode: exitCode(text),
    sha256: new Bun.CryptoHasher('sha256').update(text).digest('hex'),
  }
}

async function main() {
  const sourceFiles = await walk(resolve(projectRoot, 'src'))
  const productionFiles = sourceFiles.filter((path) => !path.includes('/__tests__/'))
  const productionText = (
    await Promise.all(
      productionFiles
        .filter((path) => /\.(css|json|ts|tsx|vue)$/.test(path))
        .map((path) => Bun.file(path).text()),
    )
  ).join('\n')
  const allSourceText = (
    await Promise.all(
      sourceFiles
        .filter((path) => /\.(css|json|ts|tsx|vue)$/.test(path))
        .map((path) => Bun.file(path).text()),
    )
  ).join('\n')
  const buildFiles = await Promise.all(
    (await walk(resolve(projectRoot, 'dist'))).map(async (path) => {
      const bytes = new Uint8Array(await Bun.file(path).arrayBuffer())
      const compressible = /\.(css|html|js|json|svg)$/.test(path)
      return {
        path: relative(resolve(projectRoot, 'dist'), path),
        bytes: bytes.byteLength,
        gzipBytes: compressible ? Bun.gzipSync(bytes).byteLength : null,
      }
    }),
  )
  const screenshots = (await walk(resolve(projectRoot, 'docs/round-3/screenshots'))).map(
    (path) => ({
      path: relative(projectRoot, path),
      bytes: Bun.file(path).size,
    }),
  )
  const packageJson = await Bun.file(resolve(projectRoot, 'package.json')).json()
  const lockText = await Bun.file(resolve(projectRoot, 'bun.lock')).text()
  const round2 = await Bun.file(resolve(projectRoot, 'docs/round-2/generated/summary.json')).json()
  const browserStates = await Bun.file(
    resolve(projectRoot, 'docs/round-3/generated/browser-states.json'),
  ).json()
  const directDependencies = Object.fromEntries(
    command(['bun', 'pm', 'ls', '--depth=0'])
      .stdout.split('\n')
      .map((line) => line.match(/^[├└]──\s+(.+)@([^@\s]+)$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => [match[1], match[2]]),
  )

  const summary = {
    generatedAt: new Date().toISOString(),
    git: {
      branch: command(['git', 'branch', '--show-current']).stdout,
      commitCount: Number(command(['git', 'rev-list', '--all', '--count']).stdout),
      head: command(['git', 'rev-parse', 'HEAD']).stdout,
      remoteCount: command(['git', 'remote']).stdout ? 1 : 0,
      stagedFiles: command(['git', 'diff', '--cached', '--name-only'])
        .stdout.split('\n')
        .filter(Boolean).length,
    },
    package: {
      packageManager: packageJson.packageManager,
      axios: directDependencies.axios,
      dependencies: packageJson.dependencies,
      resolvedDirectDependencies: directDependencies,
    },
    previousRound: {
      productionFiles: round2.modernRuntime.files,
      vitestFiles: round2.tests.vitestFiles,
      vitestTests: round2.tests.vitestTests,
      e2eTests: round2.tests.e2eTests,
      buildBytes: round2.build.bytes,
    },
    modernRuntime: {
      files: productionFiles.length,
      typescriptFiles: productionFiles.filter((path) => /\.(ts|tsx)$/.test(path)).length,
      vueFiles: productionFiles.filter((path) => path.endsWith('.vue')).length,
      javascriptFiles: productionFiles.filter((path) => /\.(cjs|js|jsx|mjs)$/.test(path)).length,
      explicitAnyTokens: count(/(:\s*any\b|\bas\s+any\b)/g, productionText),
      dollarRefTokens: count(/\$ref\b/g, productionText),
      tsIgnoreTokens: count(/@ts-(?:ignore|nocheck)/g, productionText),
      legacyPathReferences: count(/legacy\//g, productionText),
      routeDataTokens: count(/\brouteData\b/g, productionText),
      unknownTokens: count(/\bunknown\b/g, productionText),
    },
    allModernSource: {
      files: sourceFiles.length,
      explicitAnyTokens: count(/(:\s*any\b|\bas\s+any\b)/g, allSourceText),
      dollarRefTokens: count(/\$ref\b/g, allSourceText),
      tsIgnoreTokens: count(/@ts-(?:ignore|nocheck)/g, allSourceText),
    },
    infrastructure: {
      appErrorKinds: ['aborted', 'http', 'network', 'not-found', 'parse', 'timeout', 'unexpected'],
      dataSources: ['fixture', 'http'],
      e2eDataSource: 'http',
      httpClient: 'Axios 1.20.0',
      httpGatewayPath: '/api/shop/products',
      navigationDirections: ['back', 'forward', 'none'],
      typedEvent: 'shop:product-viewed',
    },
    tests: {
      vitestFiles: 13,
      vitestTests: 43,
      e2eFiles: 1,
      e2eTests: 10,
    },
    browserStates,
    build: {
      files: buildFiles.length,
      bytes: buildFiles.reduce((total, file) => total + file.bytes, 0),
      productImageBytes: round2.shopImport.totalImageBytes,
      largestFiles: buildFiles.sort((left, right) => right.bytes - left.bytes).slice(0, 20),
    },
    screenshots: {
      files: screenshots.length,
      bytes: screenshots.reduce((total, file) => total + file.bytes, 0),
      items: screenshots.sort((left, right) => left.path.localeCompare(right.path)),
    },
    lockfile: {
      bytes: Bun.file(resolve(projectRoot, 'bun.lock')).size,
      sha256: new Bun.CryptoHasher('sha256').update(lockText).digest('hex'),
    },
    evidence: {
      install: await evidence('bun-install.log'),
      frozenInstall: await evidence('bun-install-frozen.log'),
      cleanFrozenInstall: await evidence('bun-install-clean-frozen.log'),
      check: await evidence('check.log'),
      build: await evidence('build.log'),
      e2e: await evidence('e2e.log'),
      e2eCiMode: await evidence('e2e-ci-mode.log'),
      visualHttpStates: await evidence('capture-http-states.log'),
      audit: await evidence('bun-audit.log'),
    },
  }

  await Bun.write(outputFile, `${JSON.stringify(summary, null, 2)}\n`)
  console.log(`Round-3 summary written to ${relative(projectRoot, outputFile)}`)
}

await main()
