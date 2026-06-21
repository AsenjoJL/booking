import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { ArrowUpRight, Clock3, Image, Mail, MapPin, Phone, Send } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createSlideVariants, createStaggerContainer } from '@/lib/motion'

const containerVariants = createStaggerContainer()
const { left: slideLeftVariants, right: slideRightVariants } = createSlideVariants(48, 0.8)

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name'),
  email: z.string().trim().email('Enter a valid email'),
  subject: z.string().trim().min(2, 'Please enter a subject'),
  message: z.string().trim().min(12, 'Tell us a bit more so we can help properly'),
})

type ContactFormValues = z.output<typeof contactSchema>

const contactCards = [
  {
    icon: Mail,
    title: 'Email',
    detail: 'hello@jlaeveryday.com',
    helper: 'Replies usually within one business day.',
  },
  {
    icon: Phone,
    title: 'Call',
    detail: '+63 917 555 0142',
    helper: 'For sizing, orders, and delivery support.',
  },
  {
    icon: Clock3,
    title: 'Hours',
    detail: 'Mon - Sat, 9:00 AM - 6:00 PM',
    helper: 'We keep Sundays slower and offline.',
  },
  {
    icon: MapPin,
    title: 'Studio',
    detail: 'Cebu City, Philippines',
    helper: 'Available by scheduled appointment.',
  },
]

const socialLinks = [
  { label: 'Instagram', icon: Image },
  { label: 'Journal', icon: ArrowUpRight },
]

export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
  })

  const onSubmit = handleSubmit(async () => {
    await new Promise((resolve) => setTimeout(resolve, 700))
    setIsSubmitted(true)
    reset()
  })

  return (
    <section className="relative overflow-hidden bg-[#f6efe8]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(211,109,61,0.08),transparent_28%),linear-gradient(180deg,rgba(246,239,232,0.98)_0%,rgba(244,236,226,0.96)_100%)]" />

      <div className="lux-page-shell">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="lux-page-intro"
        >
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <motion.div variants={slideLeftVariants}>
              <p className="lux-eyebrow">Contact</p>
              <h1 className="lux-heading mt-4">
                We’re here to
                <br />
                help you choose.
              </h1>
              <p className="mt-8 max-w-xl text-[1.1rem] leading-10 text-[#322928]/78">
                Questions about sizing, delivery, or what to start with? Send us a note and we’ll help you find the clearest next step.
              </p>

              <div className="mt-10 grid gap-5 sm:grid-cols-2">
                {contactCards.map((item) => (
                  <motion.div
                    key={item.title}
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.28 }}
                    className="rounded-[24px] border border-[#eadfd3] bg-white/82 p-6 shadow-[0_16px_42px_rgba(56,34,21,0.05)]"
                  >
                    <div className="inline-flex rounded-2xl bg-[#f7ede5] p-3 text-[#d36d3d]">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <p className="mt-5 text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#d36d3d]">{item.title}</p>
                    <p className="mt-3 text-[1.05rem] font-medium text-[#1f1716]">{item.detail}</p>
                    <p className="mt-2 text-sm leading-7 text-[#322928]/66">{item.helper}</p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                {socialLinks.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-[#decfc1] bg-white/82 px-5 py-3 text-sm font-medium text-[#1f1716] shadow-[0_10px_22px_rgba(56,34,21,0.04)] transition duration-300 hover:-translate-y-0.5 hover:border-[#d36d3d]/40 hover:text-[#d36d3d]"
                  >
                    <item.icon className="h-4 w-4 text-[#d36d3d]" />
                    {item.label}
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div variants={slideRightVariants} className="grid gap-5">
              <motion.form
                onSubmit={onSubmit}
                className="lux-card p-8 backdrop-blur lg:p-10"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[#f7ede5] p-3 text-[#d36d3d]">
                    <Send className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-[#322928]/68">Tell us what you need and we’ll keep the reply clear.</p>
                </div>

                {isSubmitted ? (
                  <div className="mt-8 rounded-[24px] border border-[#d36d3d]/20 bg-[#fff6f1] px-5 py-4 text-sm leading-7 text-[#7c4a2f]">
                    Your message is ready. We’ll get back to you as soon as possible.
                  </div>
                ) : null}

                <div className="mt-8 grid gap-5">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-[#1f1716]">Name</span>
                    <Input
                      id="contact-name"
                      {...register('name')}
                      name="name"
                      autoComplete="name"
                      className="h-13 rounded-2xl border-[#e4d8cd] bg-white px-4 text-[15px] shadow-[0_8px_22px_rgba(56,34,21,0.04)] transition duration-300 focus:scale-[1.01] focus:border-[#d36d3d]"
                      placeholder="Your name"
                    />
                    {errors.name ? <p className="text-xs text-[#b45309]">{errors.name.message}</p> : null}
                  </label>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-[#1f1716]">Email</span>
                      <Input
                        id="contact-email"
                        {...register('email')}
                        name="email"
                        autoComplete="email"
                        className="h-13 rounded-2xl border-[#e4d8cd] bg-white px-4 text-[15px] shadow-[0_8px_22px_rgba(56,34,21,0.04)] transition duration-300 focus:scale-[1.01] focus:border-[#d36d3d]"
                        placeholder="you@example.com"
                      />
                      {errors.email ? <p className="text-xs text-[#b45309]">{errors.email.message}</p> : null}
                    </label>

                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-[#1f1716]">Subject</span>
                      <Input
                        id="contact-subject"
                        {...register('subject')}
                        name="subject"
                        className="h-13 rounded-2xl border-[#e4d8cd] bg-white px-4 text-[15px] shadow-[0_8px_22px_rgba(56,34,21,0.04)] transition duration-300 focus:scale-[1.01] focus:border-[#d36d3d]"
                        placeholder="Sizing, order help, delivery..."
                      />
                      {errors.subject ? <p className="text-xs text-[#b45309]">{errors.subject.message}</p> : null}
                    </label>
                  </div>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-[#1f1716]">Message</span>
                    <textarea
                      id="contact-message"
                      {...register('message')}
                      name="message"
                      autoComplete="off"
                      className="min-h-44 w-full rounded-[24px] border border-[#e4d8cd] bg-white px-4 py-4 text-sm outline-none shadow-[0_8px_22px_rgba(56,34,21,0.04)] transition duration-300 placeholder:text-[#9d8b7d] focus:scale-[1.01] focus:border-[#d36d3d]"
                      placeholder="Tell us what you need help with"
                    />
                    {errors.message ? <p className="text-xs text-[#b45309]">{errors.message.message}</p> : null}
                  </label>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 h-14 rounded-full bg-[#d36d3d] text-sm font-semibold uppercase tracking-[0.2em] text-white hover:bg-[#bf6034]"
                  >
                    {isSubmitting ? 'Sending...' : 'Send message'}
                  </Button>
                </div>
              </motion.form>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
