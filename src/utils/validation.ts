const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

export function isHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value)
}
