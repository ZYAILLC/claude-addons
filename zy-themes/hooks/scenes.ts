// The animated scenes. Each is one SVG that fills any window (`xMidYMid slice`): a painted picture, embedded as a JPEG,
// drifts slowly (a Ken Burns move), and a layer drawn on top moves through the CSS in the SVG's own <style>. A scene runs
// no script and loads nothing. Motion stops when the system asks for reduced motion.

import { FIREFLY_FOREST } from './art/firefly-forest'
import { PETAL_BREEZE } from './art/petal-breeze'
import { STARLIT_SEA } from './art/starlit-sea'

const W = 1600
const H = 1000

const STILL = '@media (prefers-reduced-motion: reduce){*{animation:none!important}}'

// The same layout at every draw: a small seeded generator, not Math.random.
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

const f = (n: number) => n.toFixed(1)

/** The picture, drifting and slowly zooming, under whatever moves on top. */
const scene = (jpeg: string, style: string, layer: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<style>
.bg{transform-origin:${W / 2}px ${H / 2}px;animation:kb 70s ease-in-out infinite alternate}
@keyframes kb{from{transform:scale(1.04) translate(-14px,-8px)}to{transform:scale(1.13) translate(16px,10px)}}
${style}
${STILL}
</style>
<image class="bg" href="data:image/jpeg;base64,${jpeg}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>
${layer}
</svg>`

// Fireflies: soft glowing dots that wander and pulse, most of them low and toward the sides.
export const fireflyScene = (): string => {
  const next = seeded(11)
  const flies: string[] = []
  for (let i = 0; i < 26; i++) {
    const side = next() < 0.5 ? next() * 0.32 : 0.68 + next() * 0.32
    const x = side * W
    const y = H * (0.42 + next() * 0.5)
    const r = 2 + next() * 2.4
    const dur = 7 + next() * 9
    const blink = 2.5 + next() * 3.5
    const delay = next() * 10
    const path = `wander${i % 4}`
    flies.push(
      `<g style="animation:${path} ${f(dur)}s ease-in-out -${f(delay)}s infinite alternate"><circle class="fly" cx="${f(x)}" cy="${f(y)}" r="${f(r * 3.2)}" fill="url(#glow)" style="animation-duration:${f(blink)}s;animation-delay:-${f(delay)}s"/><circle class="fly" cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.55)}" fill="#fbffd6" style="animation-duration:${f(blink)}s;animation-delay:-${f(delay)}s"/></g>`,
    )
  }
  const style = `
.fly{animation:pulse ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.15}50%{opacity:1}}
@keyframes wander0{from{transform:translate(0,0)}to{transform:translate(38px,-26px)}}
@keyframes wander1{from{transform:translate(0,0)}to{transform:translate(-30px,-40px)}}
@keyframes wander2{from{transform:translate(0,0)}to{transform:translate(24px,30px)}}
@keyframes wander3{from{transform:translate(0,0)}to{transform:translate(-42px,18px)}}`
  const defs = `<defs><radialGradient id="glow"><stop offset="0" stop-color="#f6ffb8" stop-opacity=".9"/><stop offset=".35" stop-color="#d9f77a" stop-opacity=".35"/><stop offset="1" stop-color="#b8f05a" stop-opacity="0"/></radialGradient></defs>`
  return scene(FIREFLY_FOREST, style, defs + flies.join(''))
}

// Petals: cherry petals drift down on the breeze, turning as they fall.
export const petalScene = (): string => {
  const next = seeded(23)
  const petals: string[] = []
  for (let i = 0; i < 22; i++) {
    const x = next() * W * 1.1 - W * 0.05
    const size = 7 + next() * 7
    const fall = 16 + next() * 14
    const delay = next() * fall
    const spin = 5 + next() * 6
    const tone = ['#ffd3e2', '#ffc2d6', '#fbe3ec', '#f7b6cc'][i % 4]
    petals.push(
      `<g style="animation:fall ${f(fall)}s linear -${f(delay)}s infinite"><g transform="translate(${f(x)} -40)"><g style="animation:sway ${f(spin)}s ease-in-out -${f(delay)}s infinite alternate"><path d="M0 ${f(-size)} C ${f(size * 0.9)} ${f(-size * 0.6)} ${f(size * 0.7)} ${f(size * 0.6)} 0 ${f(size)} C ${f(-size * 0.7)} ${f(size * 0.6)} ${f(-size * 0.9)} ${f(-size * 0.6)} 0 ${f(-size)} Z" fill="${tone}" opacity=".85"/></g></g></g>`,
    )
  }
  const style = `
@keyframes fall{from{transform:translate(0,0)}to{transform:translate(-260px,${H + 120}px)}}
@keyframes sway{from{transform:translateX(-26px) rotate(-35deg)}to{transform:translateX(26px) rotate(55deg)}}`
  return scene(PETAL_BREEZE, style, petals.join(''))
}

// Stars: the sky twinkles and now and then a shooting star crosses it.
export const starScene = (): string => {
  const next = seeded(37)
  const stars: string[] = []
  for (let i = 0; i < 70; i++) {
    const x = next() * W
    const y = next() * H * 0.55
    const r = 0.8 + next() * 1.6
    const dur = 2.5 + next() * 4
    stars.push(
      `<circle class="star" cx="${f(x)}" cy="${f(y)}" r="${f(r)}" style="animation-duration:${f(dur)}s;animation-delay:-${f(next() * dur)}s"/>`,
    )
  }
  const style = `
.star{fill:#f4f0ff;animation:twinkle ease-in-out infinite}
@keyframes twinkle{0%,100%{opacity:.15}50%{opacity:.95}}
.shoot{stroke:url(#trail);stroke-width:2.2;stroke-linecap:round;opacity:0;animation:shoot 13s ease-in infinite}
.s2{animation-delay:-6.5s;animation-duration:17s}
@keyframes shoot{0%,88%{opacity:0;transform:translate(0,0)}90%{opacity:1}100%{opacity:0;transform:translate(-520px,260px)}}`
  const defs = `<defs><linearGradient id="trail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`
  const shooting = `<line class="shoot" x1="1380" y1="90" x2="1520" y2="20"/><line class="shoot s2" x1="980" y1="150" x2="1110" y2="85"/>`
  return scene(STARLIT_SEA, style, defs + stars.join('') + shooting)
}
