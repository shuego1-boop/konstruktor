import { readFileSync, writeFileSync } from 'fs'

const f = 'C:/Users/eg0re/konstruktor/node_modules/.bun/vite-node@3.2.4+3165045332a37099/node_modules/vite-node/dist/client.mjs'
const text = readFileSync(f, 'utf8')

const old = `\t\tconst href = pathToFileURL(modulePath).href;\n\t\tconst __filename = fileURLToPath(href);\n\t\tconst __dirname = dirname(__filename);`

const replacement = `\t\tlet href, __filename, __dirname;\n\t\ttry {\n\t\t\thref = pathToFileURL(modulePath).href;\n\t\t\t__filename = fileURLToPath(href);\n\t\t\t__dirname = dirname(__filename);\n\t\t} catch {\n\t\t\thref = modulePath;\n\t\t\t__filename = modulePath;\n\t\t\t__dirname = dirname(modulePath) || "/";\n\t\t}`

if (!text.includes(old)) {
  console.error('NOT FOUND - check string match')
  console.error('Searching for:', JSON.stringify(old.slice(0, 80)))
  process.exit(1)
}

writeFileSync(f, text.replace(old, replacement))
console.log('Patched vite-node client.mjs successfully')
