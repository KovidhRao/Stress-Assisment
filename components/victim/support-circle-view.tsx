'use client'

import React, { useState } from 'react'
import {
  Users,
  Plus,
  PhoneCall,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  HeartHandshake,
  CheckCircle2,
  Lock,
  X,
  Send,
  UserPlus
} from 'lucide-react'
import { TrustedContact } from '@/types'
import { TeleCallModal } from '@/components/victim/tele-call-modal'
import { t } from '@/lib/i18n'

interface SupportCircleViewProps {
  contacts: TrustedContact[]
  currentLanguage?: string
  onAddContact: (contact: TrustedContact) => void
  onTriggerSOS: () => void
}

export function SupportCircleView({
  contacts,
  currentLanguage = 'en',
  onAddContact,
  onTriggerSOS
}: SupportCircleViewProps) {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRelationship, setNewRelationship] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newCategory, setNewCategory] = useState<'trusted' | 'professional' | 'emergency'>('trusted')

  // Tele-call state
  const [callModalOpen, setCallModalOpen] = useState(false)
  const [activeContact, setActiveContact] = useState<{ name: string; role: string; phone: string; color: string } | null>(null)

  // Message modal state
  const [messageModalOpen, setMessageModalOpen] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [messageSent, setMessageSent] = useState(false)

  const handleOpenCall = (contact: TrustedContact) => {
    setActiveContact({
      name: contact.name,
      role: contact.relationship,
      phone: contact.phone,
      color: contact.avatar_color || '#1d8272'
    })
    setCallModalOpen(true)
  }

  const handleOpenMessage = (contact: TrustedContact) => {
    setActiveContact({
      name: contact.name,
      role: contact.relationship,
      phone: contact.phone,
      color: contact.avatar_color || '#1d8272'
    })
    setMessageText('')
    setMessageSent(false)
    setMessageModalOpen(true)
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim()) return
    setMessageSent(true)
    setTimeout(() => {
      setMessageModalOpen(false)
      setMessageSent(false)
    }, 1500)
  }

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newPhone.trim()) return

    const colors = ['#1d8272', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#065f46']
    const created: TrustedContact = {
      id: `TC-${Date.now().toString().slice(-4)}`,
      name: newName.trim(),
      relationship: newRelationship.trim() || 'Trusted Contact',
      phone: newPhone.trim(),
      category: newCategory,
      avatar_color: colors[Math.floor(Math.random() * colors.length)],
      is_verified: false,
      description: 'Personal Support Circle Member'
    }

    onAddContact(created)
    setNewName('')
    setNewRelationship('')
    setNewPhone('')
    setAddModalOpen(false)
  }

  const professionalContacts = contacts.filter(c => c.category === 'professional')
  const trustedContacts = contacts.filter(c => c.category === 'trusted')
  const emergencyContacts = contacts.filter(c => c.category === 'emergency')

  return (
    <div className="mx-auto max-w-[1160px] space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end border-b border-[#e2ece7] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#1d8272] uppercase tracking-wider">
            <HeartHandshake size={14} />
            <span>{t('support_network_badge', currentLanguage)}</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#163a34]">{t('support_circle_title', currentLanguage)}</h1>
          <p className="mt-1.5 text-xs text-[#68857e]">
            {t('support_circle_desc', currentLanguage)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#1d8272] hover:bg-[#186f60] text-white px-5 py-3 text-xs font-bold shadow-md shadow-[#1d8272]/20 transition active:scale-95 shrink-0"
        >
          <UserPlus size={16} />
          <span>{t('add_trusted_contact', currentLanguage)}</span>
        </button>
      </div>

      {/* Section 1: Professional Support */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#183e38] flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#1d8272]" />
            <span>{t('professional_legal_support', currentLanguage)}</span>
          </h2>
          <span className="text-xs text-[#6d8a83]">{professionalContacts.length} {t('verified_officers', currentLanguage)}</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {professionalContacts.map((contact) => (
            <div
              key={contact.id}
              className="rounded-3xl border border-[#d6e5df] bg-white p-5 shadow-xs flex flex-col justify-between hover:border-[#b8dad0] transition"
            >
              <div>
                <div className="flex items-start gap-3">
                  <div
                    className="size-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs"
                    style={{ backgroundColor: contact.avatar_color || '#1d8272' }}
                  >
                    {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-xs sm:text-sm text-[#183e38] truncate">{contact.name}</h3>
                      {contact.is_verified && (
                        <span className="text-[#1d8272] shrink-0" title="Verified Officer">
                          <CheckCircle2 size={13} />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#557670] font-medium">{contact.relationship}</p>
                    <p className="text-[10px] text-[#789690] mt-0.5">{contact.description}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 pt-3 border-t border-[#edf4f0]">
                <button
                  type="button"
                  onClick={() => handleOpenCall(contact)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#1d8272] hover:bg-[#186f60] text-white py-2 text-xs font-bold transition shadow-xs"
                >
                  <PhoneCall size={13} />
                  <span>{t('call_btn', currentLanguage)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenMessage(contact)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#cfe3db] bg-[#f2f8f5] hover:bg-[#e4f2ec] text-[#1b5d52] py-2 text-xs font-bold transition"
                >
                  <MessageSquare size={13} />
                  <span>{t('message_btn', currentLanguage)}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Trusted Contacts (Family & Friends) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#183e38] flex items-center gap-2">
            <Users size={18} className="text-[#3b82f6]" />
            <span>{t('trusted_circle', currentLanguage)}</span>
          </h2>
          <span className="text-xs text-[#6d8a83]">{trustedContacts.length} {t('people', currentLanguage)}</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trustedContacts.map((contact) => (
            <div
              key={contact.id}
              className="rounded-3xl border border-[#d6e5df] bg-white p-5 shadow-xs flex flex-col justify-between hover:border-[#b8dad0] transition"
            >
              <div>
                <div className="flex items-start gap-3">
                  <div
                    className="size-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs"
                    style={{ backgroundColor: contact.avatar_color || '#8b5cf6' }}
                  >
                    {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-xs sm:text-sm text-[#183e38] truncate">{contact.name}</h3>
                    <p className="text-[11px] text-[#557670] font-medium">{contact.relationship}</p>
                    <p className="text-[10px] text-[#789690] mt-0.5">{contact.phone}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 pt-3 border-t border-[#edf4f0]">
                <button
                  type="button"
                  onClick={() => handleOpenCall(contact)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#1d8272] hover:bg-[#186f60] text-white py-2 text-xs font-bold transition shadow-xs"
                >
                  <PhoneCall size={13} />
                  <span>{t('call_btn', currentLanguage)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenMessage(contact)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#cfe3db] bg-[#f2f8f5] hover:bg-[#e4f2ec] text-[#1b5d52] py-2 text-xs font-bold transition"
                >
                  <MessageSquare size={13} />
                  <span>{t('message_btn', currentLanguage)}</span>
                </button>
              </div>
            </div>
          ))}

          {/* Quick Add Card Placeholder */}
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="rounded-3xl border-2 border-dashed border-[#cfe0d8] bg-[#fbfdfc] hover:bg-[#f2f8f5] p-6 text-center flex flex-col items-center justify-center min-h-[140px] transition group"
          >
            <div className="size-10 rounded-2xl bg-[#e4f4ef] text-[#1d8272] group-hover:bg-[#1d8272] group-hover:text-white flex items-center justify-center transition">
              <Plus size={18} />
            </div>
            <span className="mt-2 text-xs font-bold text-[#1d8272]">+ Add Another Person</span>
          </button>
        </div>
      </div>

      {/* Section 3: Emergency Support */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#991b1b] flex items-center gap-2">
            <ShieldAlert size={18} className="text-[#dc2626]" />
            <span>{t('national_emergency', currentLanguage)}</span>
          </h2>
          <span className="text-xs text-[#991b1b] font-semibold">{t('priority_response', currentLanguage)}</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {emergencyContacts.map((contact) => (
            <div
              key={contact.id}
              className="rounded-3xl border border-[#fca5a5] bg-[#fffbfb] p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start gap-3">
                  <div
                    className="size-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs"
                    style={{ backgroundColor: contact.avatar_color || '#dc2626' }}
                  >
                    {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-xs sm:text-sm text-[#991b1b] truncate">{contact.name}</h3>
                    <p className="text-[11px] text-[#b91c1c] font-medium">{contact.relationship}</p>
                    <p className="text-[10px] text-[#7f1d1d] mt-0.5">{contact.description}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 pt-3 border-t border-[#fee2e2]">
                <button
                  type="button"
                  onClick={() => handleOpenCall(contact)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white py-2 text-xs font-bold transition shadow-xs"
                >
                  <PhoneCall size={13} />
                  <span>Call {contact.phone}</span>
                </button>
                <button
                  type="button"
                  onClick={onTriggerSOS}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#fca5a5] bg-white hover:bg-[#fee2e2] text-[#991b1b] py-2 text-xs font-bold transition"
                >
                  <ShieldAlert size={13} />
                  <span>{t('sos_alert_btn', currentLanguage)}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Add Trusted Contact */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl border border-[#d6e5df] shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-[#edf4f0] pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-xl bg-[#e4f4ef] text-[#1d8272]">
                  <UserPlus size={16} />
                </span>
                <h3 className="font-bold text-base text-[#183e38]">{t('add_contact_modal_title', currentLanguage)}</h3>
              </div>
              <button onClick={() => setAddModalOpen(false)} className="text-[#718f88] hover:text-[#183e38]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#274f48]">{t('full_name_label', currentLanguage)}</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="mt-1 w-full rounded-xl border border-[#cfe0d8] bg-[#fbfdfc] p-2.5 text-xs text-[#1c403a] outline-none focus:border-[#1d8272]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#274f48]">{t('relationship_label', currentLanguage)}</label>
                <input
                  type="text"
                  value={newRelationship}
                  onChange={(e) => setNewRelationship(e.target.value)}
                  placeholder="e.g. Brother, College Roommate, Mentor"
                  className="mt-1 w-full rounded-xl border border-[#cfe0d8] bg-[#fbfdfc] p-2.5 text-xs text-[#1c403a] outline-none focus:border-[#1d8272]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#274f48]">{t('phone_label', currentLanguage)}</label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  className="mt-1 w-full rounded-xl border border-[#cfe0d8] bg-[#fbfdfc] p-2.5 text-xs text-[#1c403a] outline-none focus:border-[#1d8272]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#274f48]">{t('support_category_label', currentLanguage)}</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as 'trusted' | 'professional' | 'emergency')}
                  className="mt-1 w-full rounded-xl border border-[#cfe0d8] bg-[#fbfdfc] p-2.5 text-xs text-[#1c403a] outline-none focus:border-[#1d8272]"
                >
                  <option value="trusted">{t('category_trusted', currentLanguage)}</option>
                  <option value="professional">{t('category_professional', currentLanguage)}</option>
                  <option value="emergency">{t('category_emergency', currentLanguage)}</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#edf4f0]">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6e8e86]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-[#1d8272] hover:bg-[#186f60] text-white text-xs font-bold shadow-md transition"
                >
                  {t('save_to_circle', currentLanguage)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Message */}
      {messageModalOpen && activeContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl border border-[#d6e5df] shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-[#edf4f0] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#183e38]">{t('secure_message_to', currentLanguage).replace('{name}', activeContact.name)}</h3>
                <p className="text-[11px] text-[#6d8a83]">{activeContact.role}</p>
              </div>
              <button onClick={() => setMessageModalOpen(false)} className="text-[#718f88]">
                <X size={18} />
              </button>
            </div>

            {messageSent ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-[#10b981]" />
                <p className="text-xs font-bold text-[#183e38]">{t('message_sent', currentLanguage)}</p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-3">
                <textarea
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={t('message_placeholder', currentLanguage)}
                  className="w-full rounded-2xl border border-[#cfe0d8] bg-[#fbfdfc] p-3 text-xs text-[#1a433d] outline-none resize-none focus:border-[#1d8272]"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-[#718f88]">Encrypted via NHAA 14566 Relay</span>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-xl bg-[#1d8272] text-white px-4 py-2 text-xs font-bold hover:bg-[#186f60]"
                  >
                    <Send size={13} />
                    <span>{t('send_message', currentLanguage)}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Tele-Call Modal */}
      {activeContact && (
        <TeleCallModal
          isOpen={callModalOpen}
          onClose={() => setCallModalOpen(false)}
          recipientName={activeContact.name}
          recipientRole={activeContact.role}
          recipientPhone={activeContact.phone}
          recipientAvatarColor={activeContact.color}
        />
      )}
    </div>
  )
}
