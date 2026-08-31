import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(scriptDirectory, '../..')
const input = resolve(root, 'public/feed/covers/field.jpg')
const output = resolve(root, 'public/feed/media/field-demo.mp4')

const result = Bun.spawnSync(
  [
    'ffmpeg',
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-loop',
    '1',
    '-framerate',
    '24',
    '-i',
    input,
    '-vf',
    'scale=640:480:force_original_aspect_ratio=increase,crop=640:480,fade=t=in:st=0:d=0.35,fade=t=out:st=3.5:d=0.5,format=yuv420p',
    '-t',
    '4',
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '30',
    '-movflags',
    '+faststart',
    '-metadata',
    'title=Douyin migration playback fixture',
    '-metadata',
    'comment=Generated from public/feed/covers/field.jpg',
    output,
  ],
  { cwd: root, stderr: 'pipe', stdout: 'pipe' },
)

if (result.exitCode !== 0) {
  throw new Error(`ffmpeg failed: ${result.stderr.toString().trim()}`)
}

const bytes = new Uint8Array(await Bun.file(output).arrayBuffer())
const sha256 = new Bun.CryptoHasher('sha256').update(bytes).digest('hex')
console.log(`Generated ${output}`)
console.log(`bytes=${bytes.byteLength}`)
console.log(`sha256=${sha256}`)
