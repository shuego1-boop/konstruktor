import { writeFileSync } from 'fs'
import { mkdirSync } from 'fs'

mkdirSync('src-tauri/icons', { recursive: true })

// Minimal valid 32x32 ICO (indigo #6366f1 square)
const width = 32, height = 32
const pixelCount = width * height

// BITMAPINFOHEADER (40 bytes)
const bmpHeader = Buffer.alloc(40)
bmpHeader.writeUInt32LE(40, 0)
bmpHeader.writeInt32LE(width, 4)
bmpHeader.writeInt32LE(height * 2, 8) // ICO double-height convention
bmpHeader.writeUInt16LE(1, 12)        // planes
bmpHeader.writeUInt16LE(32, 14)       // bpp
bmpHeader.writeUInt32LE(0, 16)        // BI_RGB
bmpHeader.writeUInt32LE(pixelCount * 4, 20)

// BGRA pixels
const pixels = Buffer.alloc(pixelCount * 4)
for (let i = 0; i < pixelCount; i++) {
  pixels[i*4+0] = 241  // B
  pixels[i*4+1] = 102  // G
  pixels[i*4+2] = 99   // R
  pixels[i*4+3] = 255  // A
}

// AND mask (all zeros = opaque, 4-byte aligned rows)
const rowBytes = Math.ceil(width / 32) * 4
const andMask = Buffer.alloc(rowBytes * height)

const imageData = Buffer.concat([bmpHeader, pixels, andMask])

// ICO header (6) + dir entry (16) + image data
const icoHeader = Buffer.from([0,0, 1,0, 1,0])

const dirEntry = Buffer.alloc(16)
dirEntry.writeUInt8(width, 0)
dirEntry.writeUInt8(height, 1)
dirEntry.writeUInt8(0, 2)
dirEntry.writeUInt8(0, 3)
dirEntry.writeUInt16LE(1, 4)
dirEntry.writeUInt16LE(32, 6)
dirEntry.writeUInt32LE(imageData.length, 8)
dirEntry.writeUInt32LE(22, 12)

const ico = Buffer.concat([icoHeader, dirEntry, imageData])
writeFileSync('src-tauri/icons/icon.ico', ico)

// Also create minimal 1x1 PNG files that tauri-build may look for
// Real PNG header + IHDR + IDAT + IEND
function makePng(w, h, r, g, b) {
  // Use sharp/canvas-free approach: hardcode a tiny valid PNG
  // This is a 1x1 opaque PNG template, scaled up via raw bytes
  // For dev purposes a placeholder is fine
  const png = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
    '2e00000000c4944415478016360f8cfc00000000200016ebe2790000000049454e44ae426082',
    'hex'
  )
  return png
}

const placeholder = makePng(1, 1, 99, 102, 241)
const pngNames = [
  '32x32.png', '128x128.png', '128x128@2x.png',
  'icon.png', 'StoreLogo.png', 'Square30x30Logo.png',
  'Square44x44Logo.png', 'Square71x71Logo.png', 'Square89x89Logo.png',
  'Square107x107Logo.png', 'Square142x142Logo.png', 'Square150x150Logo.png',
  'Square284x284Logo.png', 'Square310x310Logo.png',
]
for (const name of pngNames) {
  writeFileSync(`src-tauri/icons/${name}`, placeholder)
}

console.log('✓ icons created')
