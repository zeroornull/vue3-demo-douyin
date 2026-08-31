import { readdir } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(scriptDirectory, '../..')

async function walk(directory: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(path)))
    else if (entry.isFile()) files.push(path)
  }
  return files
}

function run(command: string[]) {
  const result = Bun.spawnSync(command, { cwd: root, stderr: 'pipe', stdout: 'pipe' })
  return result.stdout.toString().trim()
}

function count(pattern: RegExp, text: string) {
  return [...text.matchAll(pattern)].length
}

async function main() {
  const sourceFiles = await walk(resolve(root, 'src'))
  const productionFiles = sourceFiles.filter((path) => !path.includes('/__tests__/'))
  const productionText = (
    await Promise.all(
      productionFiles
        .filter((path) => /\.(css|json|ts|tsx|vue)$/.test(path))
        .map((path) => Bun.file(path).text()),
    )
  ).join('\n')
  const allText = (
    await Promise.all(
      sourceFiles
        .filter((path) => /\.(css|json|ts|tsx|vue)$/.test(path))
        .map((path) => Bun.file(path).text()),
    )
  ).join('\n')
  const buildFiles = (await walk(resolve(root, 'dist'))).map((path) => ({
    path: relative(resolve(root, 'dist'), path),
    bytes: Bun.file(path).size,
  }))
  const screenshots = (await walk(resolve(root, 'docs/round-4/screenshots'))).map((path) => ({
    path: relative(root, path),
    bytes: Bun.file(path).size,
  }))
  const lockText = await Bun.file(resolve(root, 'bun.lock')).text()

  const summary = {
    generatedAt: new Date().toISOString(),
    git: {
      branch: run(['git', 'branch', '--show-current']),
      head: run(['git', 'rev-parse', 'HEAD']),
      commitCount: Number(run(['git', 'rev-list', '--all', '--count'])),
      remoteCount: run(['git', 'remote']) ? 1 : 0,
      stagedFiles: run(['git', 'diff', '--cached', '--name-only']).split('\n').filter(Boolean)
        .length,
    },
    runtime: {
      files: productionFiles.length,
      typescriptFiles: productionFiles.filter((path) => /\.(ts|tsx)$/.test(path)).length,
      vueFiles: productionFiles.filter((path) => path.endsWith('.vue')).length,
      javascriptFiles: productionFiles.filter((path) => /\.(cjs|js|jsx|mjs)$/.test(path)).length,
      explicitAny: count(/(:\s*any\b|\bas\s+any\b)/g, productionText),
      dollarRef: count(/\$ref\b/g, productionText),
      typeSuppressions: count(/@ts-(?:ignore|nocheck)/g, productionText),
      legacyReferences: count(/legacy\//g, productionText),
      unknownTokens: count(/\bunknown\b/g, productionText),
    },
    allSource: {
      files: sourceFiles.length,
      explicitAny: count(/(:\s*any\b|\bas\s+any\b)/g, allText),
      dollarRef: count(/\$ref\b/g, allText),
      typeSuppressions: count(/@ts-(?:ignore|nocheck)/g, allText),
    },
    authSlice: {
      productionFiles: productionFiles.filter((path) => path.includes('/features/auth/')).length,
      testFiles: sourceFiles.filter((path) => path.includes('/features/auth/__tests__/')).length,
      routes: ['/login', '/login/password', '/login/other'],
      adapters: ['fixture', 'http'],
      resultKinds: ['validation', 'unauthorized', 'http', 'parse', 'aborted', 'unexpected'],
    },
    profileSlice: {
      productionFiles: productionFiles.filter((path) => path.includes('/features/profile/')).length,
      testFiles: sourceFiles.filter((path) => path.includes('/features/profile/__tests__/')).length,
      routes: ['/me', '/me/edit-userinfo'],
      adapters: ['fixture', 'http'],
      resultKinds: ['validation', 'unauthorized', 'conflict', 'http', 'parse', 'aborted'],
    },
    messageSlice: {
      productionFiles: productionFiles.filter((path) => path.includes('/features/message/')).length,
      testFiles: sourceFiles.filter((path) => path.includes('/features/message/__tests__/')).length,
      routes: ['/message', '/message/chat/:conversationId'],
      adapters: ['fixture', 'http'],
      resultKinds: ['validation', 'unauthorized', 'not-found', 'http', 'parse', 'aborted'],
    },
    feedSlice: {
      productionFiles: productionFiles.filter((path) => path.includes('/features/feed/')).length,
      testFiles: sourceFiles.filter((path) => path.includes('/features/feed/__tests__/')).length,
      routes: ['/home', '/home/search', '/home/content/:feedId'],
      adapters: ['fixture', 'http'],
      resultKinds: ['validation', 'not-found', 'http', 'parse', 'aborted'],
    },
    mediaSlice: {
      productionFiles: productionFiles.filter(
        (path) => path.includes('/features/media/') || path.includes('/domain/media/'),
      ).length,
      testFiles: sourceFiles.filter((path) => path.includes('/features/media/__tests__/')).length,
      routes: ['/home/content/:feedId'],
      sourceKinds: ['local-mp4'],
      playbackStates: ['idle', 'loading', 'paused', 'playing', 'buffering', 'ended', 'error'],
    },
    interactionSlice: {
      productionFiles: productionFiles.filter(
        (path) => path.includes('/features/interaction/') || path.includes('/domain/interaction/'),
      ).length,
      testFiles: sourceFiles.filter((path) => path.includes('/features/interaction/__tests__/'))
        .length,
      routes: ['/home/content/:feedId'],
      writes: ['like', 'comment'],
      resultKinds: [
        'validation',
        'unauthorized',
        'conflict',
        'rate-limit',
        'http',
        'parse',
        'aborted',
      ],
    },
    tests: { vitestFiles: 51, vitestTests: 192, e2eFiles: 1, e2eTests: 61 },
    build: {
      files: buildFiles.length,
      bytes: buildFiles.reduce((total, file) => total + file.bytes, 0),
      largestFiles: buildFiles.sort((left, right) => right.bytes - left.bytes).slice(0, 15),
    },
    screenshots: {
      files: screenshots.length,
      bytes: screenshots.reduce((total, file) => total + file.bytes, 0),
    },
    lockfile: {
      bytes: Bun.file(resolve(root, 'bun.lock')).size,
      sha256: new Bun.CryptoHasher('sha256').update(lockText).digest('hex'),
    },
  }
  await Bun.write(
    resolve(root, 'docs/round-4/generated/summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  )
  console.log('Round-4 summary generated')
}

await main()
