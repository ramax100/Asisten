// Shared greeting helpers used by both the cron endpoint and the webhook
// (opportunistic greeting on group activity).

// 3 default text variations per time slot - picked at random when no custom
// message/templates are configured.
export const DEFAULT_GREETINGS: Record<string, string[]> = {
  pagi: [
    '🌅 Selamat pagi semuanya! Semoga hari ini penuh berkah dan semangat. 💪',
    '☕ Pagi! Awali harimu dengan senyuman dan semangat baru ya. 😊',
    '🌞 Selamat pagi! Semoga harimu lancar dan menyenangkan. Tetap semangat! 🔥',
  ],
  siang: [
    '☀️ Selamat siang! Jangan lupa istirahat dan makan siang ya. 🍽️',
    '🥗 Siang semuanya! Sudah makan belum? Jangan sampai telat ya. 😋',
    '🌤️ Selamat siang! Semangat terus menjalani aktivitas hari ini. 💼',
  ],
  sore: [
    '🌇 Selamat sore! Semoga aktivitas hari ini berjalan lancar. 🙏',
    '🍵 Sore semuanya! Waktunya rehat sejenak dan ngeteh dulu. ☕',
    '🌆 Selamat sore! Sisa hari ini semoga tetap menyenangkan ya. 😄',
  ],
  malam: [
    '🌙 Selamat malam! Istirahat yang cukup ya, besok semangat lagi. 😴',
    '✨ Malam semuanya! Terima kasih untuk hari ini, selamat beristirahat. 🌟',
    '🌃 Selamat malam! Jangan begadang ya, jaga kesehatan. 💤',
  ],
}

// Determine greeting time slot based on WIB time (UTC+7).
export function getGreetingSlot(): string {
  const now = new Date()
  const wibHour = (now.getUTCHours() + 7) % 24
  if (wibHour >= 5 && wibHour < 10) return 'pagi'
  if (wibHour >= 10 && wibHour < 15) return 'siang'
  if (wibHour >= 15 && wibHour < 18) return 'sore'
  return 'malam'
}

// Today's date in WIB (YYYY-MM-DD) - used in dedup keys so each slot fires
// once per group per day.
export function getWibDateKey(): string {
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 3600 * 1000)
  return wib.toISOString().split('T')[0]
}

export function pickDefaultGreeting(slot: string): string {
  const list = DEFAULT_GREETINGS[slot] || DEFAULT_GREETINGS.pagi
  return list[Math.floor(Math.random() * list.length)]
}

// Resolve the greeting text for a slot given a bot document.
// Priority: custom variations (random) -> single custom message -> default (random).
// Returns null if the slot is disabled.
export function resolveGreetingText(bot: any, slot: string): string | null {
  const single: string = {
    pagi: bot.greetingPagi,
    siang: bot.greetingSiang,
    sore: bot.greetingSore,
    malam: bot.greetingMalam,
  }[slot]

  if (single === '__disabled__') return null

  const templates: string[] = {
    pagi: bot.greetingTemplatesPagi || [],
    siang: bot.greetingTemplatesSiang || [],
    sore: bot.greetingTemplatesSore || [],
    malam: bot.greetingTemplatesMalam || [],
  }[slot] || []

  const custom = templates.filter((t: string) => t && t.trim())
  if (custom.length > 0) return custom[Math.floor(Math.random() * custom.length)]
  if (single) return single
  return pickDefaultGreeting(slot)
}

export const greetingDedupKey = (groupId: string | number, slot: string, date: string) =>
  `greeting_${groupId}_${slot}_${date}`
