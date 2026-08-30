import { mkdir, readdir } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { format } from 'prettier'

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(scriptDirectory, '../..')
const legacyRoot = resolve(projectRoot, 'legacy')
const fixtureSource = resolve(legacyRoot, 'public/data/goods.json')
const legacyImageRoot = resolve(legacyRoot, 'public/images/goods')
const fixtureTarget = resolve(projectRoot, 'src/features/shop/data/goods.fixture.json')
const imageTargetRoot = resolve(projectRoot, 'public/shop/products')
const manifestTarget = resolve(projectRoot, 'docs/round-2/generated/shop-import.json')

interface LegacyGoodsRecord {
  cover: string
  discount: string
  imgs: string[]
  isLowPrice: boolean
  name: string
  price: number
  real_price: number
  sold: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertLegacyRecord(value: unknown, index: number): asserts value is LegacyGoodsRecord {
  if (!isRecord(value)) throw new Error(`goods[${index}] must be an object`)

  const requiredStrings = ['cover', 'discount', 'name'] as const
  for (const key of requiredStrings) {
    if (typeof value[key] !== 'string') throw new Error(`goods[${index}].${key} must be a string`)
  }

  const requiredNumbers = ['price', 'real_price', 'sold'] as const
  for (const key of requiredNumbers) {
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key])) {
      throw new Error(`goods[${index}].${key} must be a finite number`)
    }
  }

  if (typeof value.isLowPrice !== 'boolean') {
    throw new Error(`goods[${index}].isLowPrice must be a boolean`)
  }
  if (!Array.isArray(value.imgs) || value.imgs.some((item) => typeof item !== 'string')) {
    throw new Error(`goods[${index}].imgs must be a string array`)
  }
}

async function sha256(path: string) {
  const bytes = await Bun.file(path).arrayBuffer()
  return new Bun.CryptoHasher('sha256').update(bytes).digest('hex')
}

async function main() {
  const raw: unknown = await Bun.file(fixtureSource).json()
  if (!Array.isArray(raw)) throw new Error('legacy goods fixture must be an array')
  raw.forEach(assertLegacyRecord)

  const uniqueByCover = new Map<string, LegacyGoodsRecord>()
  for (const item of raw) {
    if (!uniqueByCover.has(item.cover)) uniqueByCover.set(item.cover, item)
  }
  const unique = [...uniqueByCover.values()]

  await mkdir(resolve(fixtureTarget, '..'), { recursive: true })
  await mkdir(imageTargetRoot, { recursive: true })
  await mkdir(resolve(manifestTarget, '..'), { recursive: true })
  await Bun.write(fixtureTarget, await format(JSON.stringify(unique), { parser: 'json' }))

  const referencedImages = new Set(unique.flatMap((item) => item.imgs))
  const availableImages = new Set(await readdir(legacyImageRoot))
  const missingImages = [...referencedImages].filter((image) => !availableImages.has(image))
  if (missingImages.length) throw new Error(`missing legacy images: ${missingImages.join(', ')}`)

  const images = []
  for (const image of [...referencedImages].sort()) {
    const source = resolve(legacyImageRoot, image)
    const target = resolve(imageTargetRoot, basename(image))
    const bytes = await Bun.file(source).arrayBuffer()
    await Bun.write(target, bytes)
    images.push({
      file: image,
      bytes: bytes.byteLength,
      sha256: await sha256(target),
    })
  }

  const manifest = {
    source: 'legacy/public/data/goods.json',
    originalRecords: raw.length,
    uniqueRecords: unique.length,
    dedupeKey: 'cover',
    order: 'first appearance in legacy fixture',
    fixtureTarget: 'src/features/shop/data/goods.fixture.json',
    imageTarget: 'public/shop/products',
    images,
    totalImageBytes: images.reduce((total, image) => total + image.bytes, 0),
  }
  await Bun.write(manifestTarget, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(
    `Imported ${unique.length} unique goods and ${images.length} images (${manifest.totalImageBytes} bytes)`,
  )
}

await main()
