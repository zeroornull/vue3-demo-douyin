import { readdir } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(scriptDirectory, '../..')
const outputFile = resolve(projectRoot, 'docs/round-1/generated/summary.json')

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

function extractExitCode(log: string) {
  const matches = [...log.matchAll(/^exit_code=(\d+)$/gm)]
  return matches.length ? Number(matches[matches.length - 1]?.[1]) : null
}

async function readEvidence(name: string) {
  const text = await Bun.file(resolve(projectRoot, 'docs/round-1/evidence', name)).text()
  return {
    exitCode: extractExitCode(text),
    sha256: new Bun.CryptoHasher('sha256').update(text).digest('hex'),
  }
}

async function main() {
  const packageJson = await Bun.file(resolve(projectRoot, 'package.json')).json()
  const lockFile = Bun.file(resolve(projectRoot, 'bun.lock'))
  const lockText = await lockFile.text()
  const sourceFiles = await walk(resolve(projectRoot, 'src'))
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
  const screenshotFiles = await Promise.all(
    (await walk(resolve(projectRoot, 'docs/round-1/screenshots'))).map(async (path) => ({
      path: relative(projectRoot, path),
      bytes: Bun.file(path).size,
    })),
  )
  const runtimeFiles = [
    ...sourceFiles,
    resolve(projectRoot, 'package.json'),
    resolve(projectRoot, 'vite.config.ts'),
    resolve(projectRoot, 'vitest.config.ts'),
    resolve(projectRoot, 'playwright.config.ts'),
  ]
  const runtimeText = (await Promise.all(runtimeFiles.map((path) => Bun.file(path).text()))).join(
    '\n',
  )
  const vueFiles = sourceFiles.filter((path) => path.endsWith('.vue'))
  const directDependencyOutput = command(['bun', 'pm', 'ls', '--depth=0']).stdout
  const directDependencies = Object.fromEntries(
    directDependencyOutput
      .split('\n')
      .map((line) => line.match(/^[├└]──\s+(.+)@([^@\s]+)$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => [match[1], match[2]]),
  )

  const summary = {
    generatedAt: new Date().toISOString(),
    tools: {
      bun: command(['bun', '--version']).stdout,
      bunRevision: command(['bun', '--revision']).stdout,
      git: command(['git', '--version']).stdout,
      node: command(['node', '--version']).stdout,
    },
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
      name: packageJson.name,
      version: packageJson.version,
      packageManager: packageJson.packageManager,
      dependencies: packageJson.dependencies,
      devDependencies: packageJson.devDependencies,
      resolvedDirectDependencies: directDependencies,
    },
    lockfile: {
      bytes: lockFile.size,
      lines: lockText.split('\n').length,
      sha256: new Bun.CryptoHasher('sha256').update(lockText).digest('hex'),
    },
    source: {
      files: sourceFiles.length,
      typescriptFiles: sourceFiles.filter((path) => /\.(ts|tsx)$/.test(path)).length,
      vueFiles: vueFiles.length,
      vueScriptSetupTypeScript: (
        await Promise.all(vueFiles.map((path) => Bun.file(path).text()))
      ).filter((text) => /<script\s+setup\s+lang=["']ts["']>/.test(text)).length,
      javascriptFiles: sourceFiles.filter((path) => /\.(js|jsx|cjs|mjs)$/.test(path)).length,
      legacyReferences: [...runtimeText.matchAll(/legacy\//g)].length,
      oldCdnReferences: [
        ...runtimeText.matchAll(/baomitu|vue\.runtime\.global|vue-router\.global/g),
      ].length,
      dollarRefTokens: [...runtimeText.matchAll(/\$ref\b/g)].length,
    },
    build: {
      files: buildFiles.length,
      bytes: buildFiles.reduce((total, file) => total + file.bytes, 0),
      largestFiles: buildFiles.sort((left, right) => right.bytes - left.bytes),
    },
    screenshots: {
      files: screenshotFiles.length,
      bytes: screenshotFiles.reduce((total, file) => total + file.bytes, 0),
      items: screenshotFiles.sort((left, right) => left.path.localeCompare(right.path)),
    },
    evidence: {
      bunInstall: await readEvidence('bun-install.log'),
      frozenInstall: await readEvidence('bun-install-frozen.log'),
      cleanFrozenInstall: await readEvidence('bun-install-clean-frozen.log'),
      check: await readEvidence('check.log'),
      e2e: await readEvidence('e2e.log'),
      e2eCiMode: await readEvidence('e2e-ci-mode.log'),
      playwrightChromium: await readEvidence('playwright-install-chromium.log'),
      audit: await readEvidence('bun-audit.log'),
    },
    tests: {
      unitFiles: 3,
      unitTests: 4,
      e2eFiles: 1,
      e2eTests: 3,
    },
  }

  await Bun.write(outputFile, `${JSON.stringify(summary, null, 2)}\n`)
  console.log(`Round-1 summary written to ${relative(projectRoot, outputFile)}`)
}

await main()
