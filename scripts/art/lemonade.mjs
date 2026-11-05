// Generates the lemonade illustrations (SVG). 100 px = 1 world unit.
// Run: node scripts/art/lemonade.mjs (overwrites apps/web/public/art/lemonade/*.svg)
// Output: apps/web/public/art/lemonade/*.svg
import { mkdirSync, writeFileSync } from 'node:fs'

const OUT = new URL('../../apps/web/public/art/lemonade', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })

const O = '#5b3a24' // outline
const SW = 4
const svg = (w, h, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
  (defs ? `<defs>${defs}</defs>` : '') +
  `<g stroke="${O}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>\n`
const files = {}
const put = (name, s) => (files[name] = s)

// ---------------------------------------------------------------- backdrop
{
  const W = 4000, H = 900
  let hills = ''
  // two hill layers
  hills += `<path stroke="none" fill="#bfe08a" d="M0 560 C300 470 600 520 900 500 C1250 470 1500 540 1800 510 C2100 480 2400 450 2700 500 C3000 540 3300 470 3600 490 C3800 500 3900 520 4000 510 L4000 900 L0 900 Z"/>`
  hills += `<path stroke="none" fill="#a8d672" d="M0 640 C400 590 700 620 1000 610 C1400 595 1700 640 2000 630 C2400 615 2700 600 3000 625 C3400 650 3700 610 4000 620 L4000 900 L0 900 Z"/>`
  // tree line on the far hills
  let trees = ''
  const rnd = (i) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1
  for (let i = 0; i < 44; i++) {
    const x = 40 + i * 92 + rnd(i) * 40
    const r = 38 + rnd(i + 7) * 26
    const y = 560 - rnd(i + 3) * 30
    const c = rnd(i + 11) > 0.5 ? '#6fae4d' : '#5b963f'
    trees += `<rect x="${x - 5}" y="${y}" width="10" height="${r + 16}" fill="#8a5a35" stroke="none"/>`
    trees += `<ellipse cx="${x}" cy="${y - r * 0.2}" rx="${r}" ry="${r * 0.95}" fill="${c}" stroke="#4a8034" stroke-width="3"/>`
    trees += `<ellipse cx="${x - r * 0.3}" cy="${y - r * 0.55}" rx="${r * 0.35}" ry="${r * 0.22}" fill="#8cc463" stroke="none"/>`
  }
  // clouds
  const cloud = (x, y, s) =>
    `<g transform="translate(${x} ${y}) scale(${s})" fill="#ffffff" stroke="#d6eaf2" stroke-width="3"><path d="M0 40 C-10 10 30 -5 50 12 C60 -20 120 -20 130 15 C160 0 190 20 180 45 Z"/></g>`
  let clouds = ''
  for (const [x, y, s] of [[300, 140, 1.2], [900, 90, 0.9], [1500, 170, 1.4], [2150, 110, 1], [2750, 160, 1.3], [3400, 100, 1.1], [3800, 200, 0.8]]) clouds += cloud(x, y, s)
  // bunting across the middle
  let bunting = `<path d="M1450 300 Q2000 380 2550 300" fill="none" stroke="#8a5a35" stroke-width="4"/>`
  const flagColours = ['#e9584a', '#f2bb45', '#167d8d', '#5b963f', '#f28aa6']
  for (let i = 0; i < 14; i++) {
    const t = (i + 0.5) / 14
    const x = 1450 + 1100 * t
    const y = 300 + 160 * t * (1 - t) * 2 * 0.5 * 2
    bunting += `<path d="M${x - 26} ${y - 2} L${x + 26} ${y - 2} L${x} ${y + 46} Z" fill="${flagColours[i % 5]}" stroke="${O}" stroke-width="3"/>`
  }
  put('backdrop', svg(W, H,
    `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#sky)" stroke="none"/>${clouds}${hills}${trees}${bunting}`,
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd8f0"/><stop offset="0.6" stop-color="#d9f1f4"/><stop offset="1" stop-color="#f3f8e4"/></linearGradient>`))
}

// ---------------------------------------------------------------- ground with path
{
  const W = 4000, H = 360
  let tufts = ''
  const rnd = (i) => ((Math.sin(i * 78.233) * 43758.5453) % 1 + 1) % 1
  for (let i = 0; i < 70; i++) {
    const x = rnd(i) * W
    const top = rnd(i + 1) > 0.5
    const y = top ? 20 + rnd(i + 2) * 60 : 300 + rnd(i + 2) * 50
    tufts += `<path d="M${x - 12} ${y} Q${x - 8} ${y - 18} ${x - 2} ${y} Q${x} ${y - 24} ${x + 4} ${y} Q${x + 10} ${y - 16} ${x + 12} ${y}" fill="none" stroke="#5b963f" stroke-width="3"/>`
    if (rnd(i + 5) > 0.7) tufts += `<circle cx="${x + 16}" cy="${y - 10}" r="6" fill="${rnd(i + 9) > 0.5 ? '#fff6c2' : '#f28aa6'}" stroke="${O}" stroke-width="2"/>`
  }
  let stones = ''
  for (let i = 0; i < 50; i++) {
    const x = rnd(i + 100) * W, y = 140 + rnd(i + 200) * 110
    stones += `<ellipse cx="${x}" cy="${y}" rx="${8 + rnd(i) * 8}" ry="${5 + rnd(i) * 4}" fill="#e2c486" stroke="none"/>`
  }
  put('ground', svg(W, H,
    `<rect x="0" y="0" width="${W}" height="${H}" fill="#a8d672" stroke="none"/>` +
    `<path d="M0 120 C600 100 1200 135 2000 118 C2800 100 3400 130 4000 115 L4000 275 C3400 290 2800 262 2000 280 C1200 296 600 268 0 285 Z" fill="#f2dca6" stroke="#d9b874" stroke-width="5"/>` +
    stones + tufts))
}

// ---------------------------------------------------------------- tree and bush
put('tree', svg(260, 340, `
<path d="M114 334 L120 210 Q130 196 140 210 L148 334 Z" fill="#9a6235"/>
<path d="M130 18 C70 18 40 60 48 100 C14 112 10 170 44 194 C40 232 90 252 130 238 C170 252 222 232 216 194 C250 170 246 112 212 100 C220 60 190 18 130 18 Z" fill="#5b963f"/>
<path stroke="none" fill="#4a8034" d="M48 196 C90 222 166 226 214 192 C206 222 166 240 130 232 C94 240 56 222 48 196 Z"/>
<path stroke="none" fill="#7fb653" d="M66 118 C58 86 90 56 122 58 C102 78 94 98 98 124 Z"/>
<path stroke="none" fill="#7fb653" d="M154 64 C186 66 206 90 202 118 C190 98 174 88 152 88 Z"/>
<path d="M92 150 q10 -10 20 0 M150 170 q10 -10 20 0 M120 110 q10 -10 20 0" fill="none" stroke="#4a8034" stroke-width="3"/>`))

put('bush', svg(240, 130, `
<path d="M10 124 C0 90 30 60 60 70 C70 30 130 20 150 56 C180 36 230 60 224 100 C236 110 232 124 224 124 Z" fill="#5b963f"/>
<path stroke="none" fill="#7fb653" d="M50 84 C60 70 80 66 92 74 C80 76 66 82 58 94 Z"/>
<circle cx="80" cy="100" r="7" fill="#f28aa6" stroke-width="2"/><circle cx="150" cy="86" r="7" fill="#fff6c2" stroke-width="2"/><circle cx="190" cy="106" r="7" fill="#f28aa6" stroke-width="2"/>`))

// ---------------------------------------------------------------- stall
{
  // Back of the stall: posts and back wall with a shelf.
  const W = 640, H = 340
  let planks = ''
  for (let x = 40; x < 600; x += 56) planks += `<path d="M${x} 60 L${x} 330" stroke="#d9a65a" stroke-width="3"/>`
  let bottles = ''
  for (let i = 0; i < 5; i++) {
    const x = 120 + i * 56
    bottles += `<path d="M${x - 14} 150 L${x - 14} 120 Q${x - 14} 104 ${x - 6} 100 L${x - 6} 86 L${x + 6} 86 L${x + 6} 100 Q${x + 14} 104 ${x + 14} 120 L${x + 14} 150 Z" fill="${i % 2 ? '#fff0a6' : '#ffe066'}"/>`
    bottles += `<rect x="${x - 8}" y="80" width="16" height="8" fill="#e9584a" stroke-width="3"/>`
  }
  const bowl = `<path d="M400 150 Q440 172 480 150 Z" fill="#e9584a"/><circle cx="420" cy="138" r="14" fill="#ffd84a"/><circle cx="446" cy="132" r="14" fill="#ffd84a"/><circle cx="466" cy="142" r="12" fill="#f5c93a"/>`
  put('stall-back', svg(W, H, `
<rect x="20" y="40" width="600" height="296" fill="#f6d08a"/>${planks}
<rect x="20" y="40" width="600" height="296" fill="none"/>
<rect x="50" y="150" width="540" height="16" rx="4" fill="#c98a3a"/>${bottles}${bowl}
<rect x="6" y="0" width="34" height="338" rx="6" fill="#c98a3a"/>
<rect x="600" y="0" width="34" height="338" rx="6" fill="#c98a3a"/>
<path d="M14 40 L30 40 M608 40 L626 40" stroke="#9a6235"/>`))

  // Striped, scalloped awning.
  const AW = 720, AH = 170
  let stripes = ''
  const n = 10, sw = 70, tw = 62
  for (let i = 0; i < n; i++) {
    const x = 10 + i * sw
    const c = i % 2 ? '#fffcf5' : '#167d8d'
    stripes += `<path d="M${50 + i * tw} 10 L${50 + (i + 1) * tw} 10 L${x + sw} 120 L${x} 120 Z" fill="${c}" stroke="none"/>`
    stripes += `<path d="M${x} 118 Q${x + sw / 2} 170 ${x + sw} 118 Z" fill="${c}"/>`
  }
  put('awning', svg(AW, AH, `
<path d="M50 10 L670 10 L710 120 L10 120 Z" fill="#fffcf5"/>${stripes}
<path d="M50 10 L670 10 L710 120 L10 120 Z" fill="none"/>
<path d="M50 10 L670 10" stroke-width="6"/>`))

  // Sign with a lemon slice.
  put('sign', svg(220, 170, `
<path d="M60 150 L60 120 M160 150 L160 120" stroke-width="6"/>
<rect x="10" y="10" width="200" height="116" rx="18" fill="#f2bb45"/>
<rect x="24" y="22" width="172" height="92" rx="12" fill="#fffcf5" stroke-width="3"/>
<circle cx="110" cy="68" r="38" fill="#ffd84a"/>
<circle cx="110" cy="68" r="29" fill="#fff6c2" stroke-width="3"/>
<path d="M110 40 L110 96 M82 68 L138 68 M90 48 L130 88 M130 48 L90 88" stroke="#ffd84a" stroke-width="5"/>
<circle cx="110" cy="68" r="5" fill="#ffd84a" stroke="none"/>`))

  // Counter front with planks and a light top.
  let cplanks = ''
  for (let x = 70; x < 640; x += 64) cplanks += `<path d="M${x} 32 L${x} 134" stroke="#d9952b" stroke-width="3"/>`
  put('counter', svg(660, 140, `
<rect x="10" y="26" width="640" height="110" rx="6" fill="#f2bb45"/>${cplanks}
<path d="M14 118 L646 118 L646 130 Q646 136 640 136 L20 136 Q14 136 14 130 Z" fill="#d9952b" stroke="none"/>
<rect x="10" y="26" width="640" height="110" rx="6" fill="none"/>
<rect x="2" y="6" width="656" height="26" rx="10" fill="#f9d77e"/>
<circle cx="330" cy="76" r="26" fill="#fffcf5" stroke-width="3"/>
<circle cx="330" cy="76" r="17" fill="#ffd84a" stroke-width="3"/>`))
}

// ---------------------------------------------------------------- counter items
put('jug', svg(130, 160, `
<path d="M100 50 Q128 52 126 86 Q124 116 98 118" fill="none" stroke-width="9"/>
<path d="M100 50 Q128 52 126 86 Q124 116 98 118" fill="none" stroke="#e8f6fb" stroke-width="3"/>
<path d="M24 20 L104 20 L100 40 Q108 70 106 120 Q104 150 84 154 L44 154 Q24 150 22 120 Q20 70 28 40 Z" fill="#e8f6fb" fill-opacity="0.25"/>
<path d="M18 18 L30 26 M24 20 L104 20" stroke-width="5"/>
<path d="M40 60 Q34 100 42 136" fill="none" stroke="#ffffff" stroke-width="7" stroke-opacity="0.9"/>`))
// Liquid inside the jug; scaled vertically by the fill level (anchor bottom).
put('jug-fill', svg(80, 100, `
<path d="M4 0 L76 0 Q80 50 76 80 Q72 98 56 100 L24 100 Q8 98 4 80 Q0 50 4 0 Z" fill="#ffe066" stroke="none"/>
<path d="M4 0 L76 0" stroke="#f5c93a" stroke-width="6"/>
<circle cx="30" cy="40" r="12" fill="#fff6c2" stroke="#f5c93a" stroke-width="3"/>
<circle cx="54" cy="66" r="10" fill="#fff6c2" stroke="#f5c93a" stroke-width="3"/>`))
put('cup', svg(50, 64, `
<path d="M6 10 L44 10 L38 60 L12 60 Z" fill="#fffcf5"/>
<path d="M9 22 L41 22 L38 58 L12 58 Z" fill="#ffe066" stroke="none"/>
<path d="M6 10 L44 10 L38 60 L12 60 Z" fill="none"/>
<path d="M30 2 L24 26" stroke="#e9584a" stroke-width="5"/>`))
put('cup-empty', svg(50, 64, `
<path d="M6 10 L44 10 L38 60 L12 60 Z" fill="#fffcf5"/>
<path d="M10 22 L40 22" stroke="#9fd8f0" stroke-width="5"/>`))
put('press', svg(120, 80, `
<path d="M8 40 L112 40 Q108 76 60 76 Q12 76 8 40 Z" fill="#e9584a"/>
<path d="M8 40 L112 40" stroke-width="5"/>
<path d="M60 4 Q80 30 82 40 L38 40 Q40 30 60 4 Z" fill="#ffd84a"/>
<path d="M60 10 L60 38 M50 24 L54 38 M70 24 L66 38" stroke="#f5c93a" stroke-width="3"/>
<path d="M112 46 L126 44" stroke-width="5"/>`))
put('till', svg(120, 90, `
<path d="M10 30 L110 30 L114 86 L6 86 Z" fill="#2f7fb0"/>
<path d="M22 6 L98 6 L104 30 L16 30 Z" fill="#4f9fd0"/>
<rect x="30" y="12" width="60" height="12" rx="3" fill="#dff1f5" stroke-width="3"/>
<rect x="44" y="52" width="32" height="10" rx="3" fill="#1d5f86" stroke-width="3"/>`))
put('coin', svg(50, 50, `
<circle cx="25" cy="25" r="20" fill="#f2bb45"/>
<circle cx="25" cy="25" r="12" fill="none" stroke="#d99a1e" stroke-width="3"/>
<path d="M17 15 Q21 11 27 11" fill="none" stroke="#fff6c2" stroke-width="4"/>`))
put('coin-flat', svg(56, 22, `<ellipse cx="28" cy="11" rx="24" ry="8" fill="#f2bb45" stroke-width="3"/>`))

// ---------------------------------------------------------------- crate and lemons
put('crate-back', svg(190, 100, `<path d="M10 20 L180 20 L172 6 L18 6 Z" fill="#7a4a26"/><rect x="10" y="20" width="170" height="70" fill="#6a3d1e"/>`))
put('crate', svg(190, 90, `
<rect x="8" y="8" width="174" height="76" rx="6" fill="#c98a3a"/>
<path d="M8 34 L182 34 M8 58 L182 58" stroke="#9a6235" stroke-width="3"/>
<rect x="8" y="8" width="174" height="76" rx="6" fill="none"/>
<path d="M22 8 L22 84 M168 8 L168 84" stroke-width="5"/>`))
put('lemon', svg(56, 42, `
<path d="M4 21 Q4 4 28 4 Q52 4 52 21 Q52 38 28 38 Q4 38 4 21 Z" fill="#ffd84a"/>
<path d="M2 21 L6 21 M50 21 L54 21" stroke-width="4"/>
<path d="M16 12 Q24 8 32 10" fill="none" stroke="#fff6c2" stroke-width="4"/>`))

// ---------------------------------------------------------------- sugar jar
put('jar-back', svg(100, 120, `<rect x="8" y="24" width="84" height="90" rx="16" fill="#e8f6fb" fill-opacity="0.6"/>`))
put('jar', svg(100, 120, `
<rect x="8" y="24" width="84" height="90" rx="16" fill="#e8f6fb" fill-opacity="0.25"/>
<rect x="14" y="6" width="72" height="22" rx="6" fill="#167d8d"/>
<path d="M22 46 Q18 74 24 98" fill="none" stroke="#ffffff" stroke-width="6" stroke-opacity="0.9"/>`))
put('sugar', svg(30, 30, `<rect x="3" y="3" width="24" height="24" rx="4" fill="#ffffff" stroke-width="3"/><path d="M8 9 L14 9" stroke="#d6eaf2" stroke-width="3"/>`))

// ---------------------------------------------------------------- children
const kids = [
  { skin: '#f6d5b8', hair: '#8a4a26', style: 'pigtails', shirt: '#e9584a', bottom: '#f28aa6', skirt: true, shoe: '#5b3a24', extra: 'bag' },
  { skin: '#8d5a3b', hair: '#2b1d14', style: 'cap', shirt: '#2f7fb0', bottom: '#f2dca6', skirt: false, shoe: '#2b1d14', cap: '#167d8d' },
  { skin: '#f1c7a0', hair: '#e2a13a', style: 'hat', shirt: '#fff0a6', bottom: '#4f9fd0', skirt: true, shoe: '#e9584a', hat: '#f2dca6' },
  { skin: '#c98e62', hair: '#3d2a1c', style: 'short', shirt: '#5b963f', bottom: '#2f4f4a', skirt: false, shoe: '#5b3a24' },
]
kids.forEach((k, i) => {
  const W = 120, H = 240
  const cx = 60
  let back = '', front = ''
  if (k.style === 'pigtails') {
    back += `<circle cx="22" cy="60" r="16" fill="${k.hair}"/><circle cx="98" cy="60" r="16" fill="${k.hair}"/>`
    front += `<path d="M24 56 Q26 18 60 18 Q94 18 96 56 Q84 36 60 38 Q36 36 24 56 Z" fill="${k.hair}"/>`
    front += `<path d="M30 40 Q60 26 90 40" fill="none" stroke="#f2bb45" stroke-width="5"/>`
  } else if (k.style === 'cap') {
    front += `<path d="M26 50 Q28 18 60 18 Q92 18 94 50 Z" fill="${k.cap}"/><path d="M60 48 L106 50 Q104 58 92 56 L60 54 Z" fill="${k.cap}"/>`
  } else if (k.style === 'hat') {
    back += `<path d="M24 60 Q20 90 30 100 L40 70 Z M96 60 Q100 90 90 100 L80 70 Z" fill="${k.hair}"/>`
    front += `<ellipse cx="60" cy="38" rx="50" ry="10" fill="${k.hat}"/><path d="M32 36 Q34 8 60 8 Q86 8 88 36 Z" fill="${k.hat}"/><path d="M32 30 L88 30" stroke="#167d8d" stroke-width="6"/>`
  } else {
    front += `<path d="M24 58 Q22 16 60 16 Q100 16 96 58 Q90 38 72 36 Q66 46 50 42 Q34 42 24 58 Z" fill="${k.hair}"/>`
  }
  const legs = k.skirt
    ? `<rect x="40" y="168" width="14" height="50" rx="6" fill="${k.skin}"/><rect x="66" y="168" width="14" height="50" rx="6" fill="${k.skin}"/>`
    : `<rect x="38" y="160" width="18" height="58" rx="6" fill="${k.bottom}"/><rect x="64" y="160" width="18" height="58" rx="6" fill="${k.bottom}"/>`
  const bottom = k.skirt
    ? `<path d="M34 140 L86 140 L98 180 L22 180 Z" fill="${k.bottom}"/>`
    : `<path d="M34 140 L86 140 L86 170 L34 170 Z" fill="${k.bottom}"/>`
  const bag = k.extra === 'bag' ? `<path d="M40 92 L86 150" stroke="#8a5a35" stroke-width="5"/><rect x="80" y="138" width="22" height="26" rx="5" fill="#f2bb45"/>` : ''
  put(`kid-${i + 1}`, svg(W, H, `
${back}
${legs}
<ellipse cx="46" cy="222" rx="14" ry="8" fill="${k.shoe}"/><ellipse cx="74" cy="222" rx="14" ry="8" fill="${k.shoe}"/>
<path d="M28 102 Q20 130 24 146" fill="none" stroke-width="16"/><path d="M28 102 Q20 130 24 146" fill="none" stroke="${k.skin}" stroke-width="9"/>
<path d="M92 102 Q100 130 96 146" fill="none" stroke-width="16"/><path d="M92 102 Q100 130 96 146" fill="none" stroke="${k.skin}" stroke-width="9"/>
${bottom}
<path d="M30 96 Q60 84 90 96 L88 146 L32 146 Z" fill="${k.shirt}"/>
<path d="M50 90 Q60 100 70 90" fill="none" stroke-width="3"/>
${bag}
<rect x="52" y="76" width="16" height="16" fill="${k.skin}"/>
<circle cx="${cx}" cy="56" r="34" fill="${k.skin}"/>
<circle cx="26" cy="60" r="7" fill="${k.skin}"/><circle cx="94" cy="60" r="7" fill="${k.skin}"/>
${front}
<circle cx="48" cy="58" r="4.5" fill="${O}" stroke="none"/><circle cx="72" cy="58" r="4.5" fill="${O}" stroke="none"/>
<circle cx="49.5" cy="56.5" r="1.5" fill="#ffffff" stroke="none"/><circle cx="73.5" cy="56.5" r="1.5" fill="#ffffff" stroke="none"/>
<ellipse cx="40" cy="70" rx="7" ry="4" fill="#f28aa6" fill-opacity="0.7" stroke="none"/><ellipse cx="80" cy="70" rx="7" ry="4" fill="#f28aa6" fill-opacity="0.7" stroke="none"/>
<path d="M50 72 Q60 82 70 72" fill="none" stroke-width="3.5"/>`))
})


// ---------------------------------------------------------------- open / closed sign
// Hangs on the counter. Closed: red with a white bar. Open: green with a cup and a tick.
const hang = (face) => svg(110, 110, `
<path d="M30 30 L55 6 L80 30" fill="none" stroke-width="4"/>
<circle cx="55" cy="6" r="4" fill="#8a5a35"/>
<rect x="8" y="28" width="94" height="76" rx="12" fill="#c98a3a"/>
${face}`)
put('sign-closed', hang(`<circle cx="55" cy="66" r="30" fill="#e9584a"/><rect x="36" y="59" width="38" height="14" rx="4" fill="#fffcf5"/>`))
put('sign-open', hang(`<circle cx="55" cy="66" r="30" fill="#5b963f"/>
<path d="M42 50 L64 50 L61 82 L45 82 Z" fill="#fffcf5" stroke-width="3"/><path d="M44 60 L62 60 L60 80 L46 80 Z" fill="#ffe066" stroke="none"/>
<path d="M66 46 L72 52 L84 38" fill="none" stroke="#fffcf5" stroke-width="5"/>`))

// ---------------------------------------------------------------- "I want a cup" bubble
put('want', svg(90, 84, `
<path d="M10 10 L80 10 Q86 10 86 16 L86 56 Q86 62 80 62 L40 62 L24 80 L28 62 L10 62 Q4 62 4 56 L4 16 Q4 10 10 10 Z" fill="#fffcf5"/>
<path d="M32 20 L58 20 L54 54 L36 54 Z" fill="#fffcf5" stroke-width="3"/>
<path d="M34 30 L56 30 L54 52 L36 52 Z" fill="#ffe066" stroke="none"/>
<path d="M50 14 L46 34" stroke="#e9584a" stroke-width="4"/>`))

for (const [name, s] of Object.entries(files)) writeFileSync(`${OUT}/${name}.svg`, s)
console.log(Object.keys(files).length, 'files')
