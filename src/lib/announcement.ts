import type { Locale } from "@/lib/i18n/dictionaries";

export type AnnouncementItem = {
  name: string;
  recipients: {
    slot: number;
    displayName: string;
    inGameId: string | null;
    quantityRequested: number;
    quantityAllocated: number;
    status: "proposed" | "auctioned" | "received" | "forfeited" | "skipped";
  }[];
};

const copy: Record<
  Locale,
  {
    heading: string;
    empty: string;
    forfeited: string;
    skipped: string;
    footer: string;
  }
> = {
  en: {
    heading: "Queue results",
    empty: "nobody queued for this item",
    forfeited: "forfeited, not enough diamonds",
    skipped: "skipped, place carries to next round",
    footer:
      "Requested quantities are shown for the manager's review. Contact a guild manager in game after your auction is confirmed. Have your diamonds ready: if you cannot pay when your turn comes you forfeit this round.",
  },
  th: {
    heading: "ผลการจัดคิว",
    empty: "ยังไม่มีคนลงชื่อจองไอเทมนี้",
    forfeited: "สละสิทธิ เพชรไม่พอ",
    skipped: "ข้ามรอบนี้ คิวยกไปรอบถัดไป",
    footer:
      "แสดงจำนวนที่สมาชิกขอเพื่อให้ผู้จัดการตรวจสอบ กรุณาติดต่อผู้จัดการกิลด์ในเกมหลังยืนยันผลการประมูล และเตรียมเพชรให้พอ หากถึงคิวแล้วจ่ายไม่ได้จะถือว่าสละสิทธิในรอบนั้น",
  },
};

/**
 * Renders the draw result as a Discord-ready message, mirroring the list the
 * guild manager used to assemble by hand.
 */
export function buildAnnouncement({
  locale,
  roundName,
  items,
}: {
  locale: Locale;
  roundName: string;
  items: AnnouncementItem[];
}): string {
  const text = copy[locale] ?? copy.en;
  const lines: string[] = [`**${roundName} — ${text.heading}**`, ""];

  for (const item of items) {
    lines.push(`🎁 **${item.name}**`);

    const shown = item.recipients
      .filter((recipient) => recipient.status !== "forfeited")
      .sort((a, b) => a.slot - b.slot);

    if (shown.length === 0) {
      lines.push(`   — ${text.empty}`);
    } else {
      shown.forEach((recipient, index) => {
        const id = recipient.inGameId ? ` (${recipient.inGameId})` : "";
        const notes: string[] = [];

        if (recipient.status === "skipped") notes.push(text.skipped);

        const suffix = notes.length > 0 ? ` — ${notes.join(", ")}` : "";
        const amount =
          recipient.quantityAllocated > 1
            ? ` ×${recipient.quantityAllocated}`
            : "";

        lines.push(
          `   ${index + 1}. ${recipient.displayName}${id}${amount}${suffix}`,
        );
      });
    }

    lines.push("");
  }

  lines.push(text.footer);
  return lines.join("\n");
}

export type QueueAnnouncementItem = {
  name: string;
  queueLabel: string;
  imageUrl?: string | null;
  entries: {
    position: number;
    discordId: string | null;
    fallbackName: string;
    quantityRequested: number;
    carryDepth: number;
    status: string | null;
  }[];
};

const queueCopy: Record<
  Locale,
  {
    heading: string;
    empty: string;
    carried: string;
    footer: string;
    statuses: Record<string, string>;
  }
> = {
  en: {
    heading: "Current queue",
    empty: "nobody queued yet",
    carried: "carried",
    footer:
      "Queue positions are based on the current round. Carried entries remain ahead of new registrations. Use the button under each item to confirm you received your item.",
    statuses: {
      allocated: "awaiting result",
      auctioned: "auctioned",
      received: "received",
      forfeited: "forfeited",
      skipped: "skipped",
      unfilled: "missed out",
      penalized: "bid ban",
    },
  },
  th: {
    heading: "ลำดับคิวปัจจุบัน",
    empty: "ยังไม่มีคนลงชื่อ",
    carried: "ยกมาจากรอบก่อน",
    footer:
      "ลำดับนี้อ้างอิงจากรอบปัจจุบัน โดยคิวที่ยกมาจากรอบก่อนจะอยู่หน้าผู้ที่ลงชื่อใหม่ กดปุ่มใต้แต่ละไอเทมเพื่อยืนยันว่ารับของแล้ว",
    statuses: {
      allocated: "รอยืนยันผล",
      auctioned: "ประมูลแล้ว",
      received: "รับของแล้ว",
      forfeited: "สละสิทธิ",
      skipped: "ข้ามรอบ",
      unfilled: "ยังไม่ได้รับ",
      penalized: "ถูกตัดสิทธิ",
    },
  },
};

/**
 * Renders the current queue order for posting directly to Discord.
 */
export function buildQueueAnnouncement({
  locale,
  roundName,
  items,
}: {
  locale: Locale;
  roundName: string;
  items: QueueAnnouncementItem[];
}): string {
  const text = queueCopy[locale] ?? queueCopy.en;
  const lines: string[] = [`**${roundName} — ${text.heading}**`, ""];

  for (const item of items) {
    lines.push(`📦 **${item.name} — ${item.queueLabel}**`);

    if (item.entries.length === 0) {
      lines.push(`   — ${text.empty}`);
    } else {
      const positionWidth = Math.max(
        ...item.entries.map((entry) => String(entry.position).length),
      );

      [...item.entries]
        .sort((a, b) => a.position - b.position)
        .forEach((entry) => {
          const position = String(entry.position).padStart(
            positionWidth,
            "\u00a0",
          );
          const displayName = entry.discordId
            ? `<@${entry.discordId}>`
            : `@${entry.fallbackName}`;
          const details: string[] = [];

          if (entry.quantityRequested > 1) {
            details.push(`×${entry.quantityRequested}`);
          }
          if (entry.carryDepth > 0) {
            details.push(text.carried);
          }

          const status = entry.status ? text.statuses[entry.status] : null;
          if (status && entry.status !== "pending") {
            details.push(status);
          }

          const suffix = details.length > 0 ? ` — ${details.join(", ")}` : "";
          lines.push(`   **${position}.** ${displayName}${suffix}`);
        });
    }

    lines.push("");
  }

  lines.push(text.footer);
  return lines.join("\n");
}

/**
 * Discord limits webhook message content to 2,000 characters.
 * Split at line boundaries where possible so queue entries stay readable.
 */
export function splitDiscordMessage(
  content: string,
  maxLength = 2_000,
): string[] {
  if (content.length <= maxLength) return [content];

  const chunks: string[] = [];
  let current = "";

  for (const line of content.split("\n")) {
    if (line.length > maxLength) {
      if (current) chunks.push(current);
      for (let index = 0; index < line.length; index += maxLength) {
        chunks.push(line.slice(index, index + maxLength));
      }
      current = "";
      continue;
    }

    const next = current ? `${current}\n${line}` : line;
    if (next.length > maxLength) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export type AuctionResultsQueue = {
  queueLabel: string;
  bidders: {
    position: number;
    displayName: string;
    inGameId: string | null;
    discordMention: string | null;
    quantityRequested: number;
  }[];
};

const auctionCopy: Record<
  Locale,
  {
    heading: string;
    minStarstone: string;
    bidders: string;
    noBidders: string;
    emptyQueue: string;
    selfBidFooter: string;
    queueSection: string;
  }
> = {
  en: {
    heading: "Auction call",
    minStarstone: "Minimum starstone",
    bidders: "Selected bidders",
    noBidders: "No one selected to bid this round.",
    emptyQueue: "No queue — members may bid freely.",
    selfBidFooter:
      "Please coordinate and avoid bidding over each other. Bid at or above the minimum starstone.",
    queueSection: "Queue",
  },
  th: {
    heading: "ประกาศประมูล",
    minStarstone: "Starstone ขั้นต่ำ",
    bidders: "ผู้ที่อยู่ในคิวและพร้อมประมูล",
    noBidders: "ยังไม่มีผู้ถูกเลือกให้ประมูลในรอบนี้",
    emptyQueue: "ไม่มีคิว — สมาชิกสามารถประมูลกันเองได้",
    selfBidFooter:
      "กรุณาประสานกันและไม่ประมูลทับกัน เริ่มประมูลที่ Starstone ขั้นต่ำขึ้นไป",
    queueSection: "คิว",
  },
};

export function buildAuctionResultsAnnouncement({
  locale,
  roundName,
  itemName,
  minStarstone,
  queues,
  emptyQueue,
}: {
  locale: Locale;
  roundName: string;
  itemName: string;
  minStarstone: number | null;
  queues: AuctionResultsQueue[];
  emptyQueue: boolean;
}): string {
  const text = auctionCopy[locale] ?? auctionCopy.en;
  const lines: string[] = [`**${roundName} — ${text.heading}**`, "", `🎁 **${itemName}**`];

  if (minStarstone != null) {
    lines.push(`💎 ${text.minStarstone}: **${minStarstone.toLocaleString()}**`);
  }

  lines.push("");

  if (emptyQueue) {
    lines.push(`ℹ️ ${text.emptyQueue}`);
  } else {
    let hasBidder = false;
    for (const queue of queues) {
      if (queue.bidders.length === 0) continue;
      hasBidder = true;
      lines.push(`**${text.queueSection}: ${queue.queueLabel}**`);
      queue.bidders
        .sort((a, b) => a.position - b.position)
        .forEach((bidder, index) => {
          const id = bidder.inGameId ? ` (${bidder.inGameId})` : "";
          const mention = bidder.discordMention ?? bidder.displayName;
          const qty =
            bidder.quantityRequested > 1 ? ` ×${bidder.quantityRequested}` : "";
          lines.push(`   ${index + 1}. ${mention}${id}${qty}`);
        });
      lines.push("");
    }
    if (!hasBidder) {
      lines.push(`ℹ️ ${text.noBidders}`);
      lines.push("");
    }
  }

  lines.push(text.selfBidFooter);
  return lines.join("\n");
}
