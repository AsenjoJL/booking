const announcementItems = [
  'Free shipping on orders over P1,500',
  'New wardrobe edits landing weekly',
  '4.9 average customer rating',
  'Live stock checks through cart and checkout',
]

export function AnnouncementBar() {
  const duplicatedItems = [...announcementItems, ...announcementItems]

  return (
    <div className="border-b bg-foreground text-background">
      <div className="mx-auto max-w-7xl overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="announcement-track flex min-w-max items-center gap-10 py-3 text-sm">
          {duplicatedItems.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-center gap-10 whitespace-nowrap">
              <span>{item}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-background/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
