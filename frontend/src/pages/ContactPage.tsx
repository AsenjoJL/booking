import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-t pt-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">Contact</p>
        <div className="mt-6 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h1 className="font-serif text-5xl leading-none text-foreground sm:text-6xl">
              We’re Here To
              <br />
              Help You Choose.
            </h1>
            <p className="mt-8 max-w-xl text-[1.1rem] leading-10 text-foreground/78">
              Questions about sizing, delivery, or what to start with? Send us a note and we’ll help you find the
              clearest next step.
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <div className="rounded-sm border bg-card p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d36d3d]">Email</p>
                <p className="mt-4 text-lg text-foreground">hello@jlaeveryday.com</p>
              </div>
              <div className="rounded-sm border bg-card p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d36d3d]">Hours</p>
                <p className="mt-4 text-lg text-foreground">Mon - Sat, 9:00 AM - 6:00 PM</p>
              </div>
            </div>
          </div>

          <form className="rounded-sm border bg-card p-8">
            <div className="grid gap-5">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Name</span>
                <Input className="h-12 rounded-none bg-white" placeholder="Your name" />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Email</span>
                <Input className="h-12 rounded-none bg-white" placeholder="you@example.com" />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Message</span>
                <textarea
                  className="min-h-40 w-full rounded-none border border-input bg-white px-3 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Tell us what you need help with"
                />
              </label>
              <Button className="mt-2 h-14 rounded-none bg-[#cf6c3e] text-sm uppercase tracking-[0.22em] hover:bg-[#ba5d33]">
                Send message
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
