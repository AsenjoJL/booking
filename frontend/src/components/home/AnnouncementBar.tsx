const announcementItems = [
  '✦ NEW — Spring / Summer 2026 collection now live',
  'Free shipping on orders over ₱1,500',
  'New wardrobe edits landing every week',
  '4.9 ★ average customer rating',
  'Live stock checks through cart and checkout',
  '30-day easy returns on all orders',
]

export function AnnouncementBar() {
  const duplicatedItems = [...announcementItems, ...announcementItems]

  return (
    <div
      className="relative z-50 overflow-hidden border-b border-white/10"
      style={{ background: 'var(--fashion-dark)' }}
    >
      <div className="announcement-wrapper overflow-hidden py-[11px]">
        <div className="announcement-track flex min-w-max items-center gap-12">
          {duplicatedItems.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="flex items-center gap-12 whitespace-nowrap"
            >
              <span
                className="text-[11.5px] font-medium tracking-[0.12em] text-white/80"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {item}
              </span>
              <span className="h-[3px] w-[3px] rotate-45 bg-white/30 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
