'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Send,
  Mail,
  User,
  MessageSquare,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LandingContact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedMessage = message.trim()

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      toast.error('Please fill in all fields before sending.')
      return
    }

    if (!trimmedEmail.includes('@')) {
      toast.error('Please provide a valid email address.')
      return
    }

    setIsSubmitting(true)

    // Simulate clean local/mock response
    setTimeout(() => {
      setIsSubmitting(false)
      toast.success('Thank you! Your message has been recorded.', {
        description: "We'll follow up regarding the Railway Block Planning system implementation.",
      })
      setName('')
      setEmail('')
      setMessage('')
    }, 400)
  }

  return (
    <section id="contact" className="py-16 sm:py-24 bg-slate-50/70 border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
            Inquiries
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Have Questions About the Solution?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Interested in learning more about the Railway Block Planning prototype?
            Send an inquiry to review technical specifications or schedule a demonstration.
          </p>
        </div>

        {/* Contact Form Card */}
        <div className="mt-12 mx-auto max-w-xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Name Field */}
              <div className="space-y-1.5">
                <Label htmlFor="contact-name" className="text-xs font-semibold text-slate-700">
                  Your Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <Input
                    id="contact-name"
                    type="text"
                    placeholder="e.g. S. Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
                    required
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-1.5">
                <Label htmlFor="contact-email" className="text-xs font-semibold text-slate-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="e.g. officer@railnet.gov.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
                    required
                  />
                </div>
              </div>

              {/* Message Field */}
              <div className="space-y-1.5">
                <Label htmlFor="contact-message" className="text-xs font-semibold text-slate-700">
                  Message / Questions
                </Label>
                <div className="relative">
                  <textarea
                    id="contact-message"
                    rows={4}
                    placeholder="Ask about block bundling algorithms, corridor integration, or prototype capabilities…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full gap-2 bg-primary hover:bg-primary/95 text-white font-semibold py-2.5 h-11 shadow-xs"
              >
                <Send className="size-4" />
                <span>{isSubmitting ? 'Sending Message…' : 'Send Message'}</span>
              </Button>

              <div className="pt-2 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
                <HelpCircle className="size-3.5 text-slate-400" />
                <span>Mock prototype form &middot; Instant confirmation response</span>
              </div>

            </form>
          </div>
        </div>

      </div>
    </section>
  )
}
