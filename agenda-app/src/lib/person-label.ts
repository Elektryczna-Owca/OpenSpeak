// How a participant is shown everywhere: guests who registered via the QR code
// get a "(Guest)" suffix.
export function personLabel(person: { name: string; isGuest: boolean }) {
  return person.isGuest ? `${person.name} (Guest)` : person.name
}

export const GUEST_NAME_MAX = 32
export const GUEST_CONTACT_MAX = 100
