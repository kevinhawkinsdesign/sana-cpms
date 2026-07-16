// Shared feature flags and constants

// Controls whether the EBM popup is shown when ending a session.
// Set NEXT_PUBLIC_SHOW_EBM_POPUP=true in your environment to enable.
const rawShowEbmPopup = (process.env.NEXT_PUBLIC_SHOW_EBM_POPUP ?? "")
  .toString()
  .trim()
  .replace(/^["']|["']$/g, "")
  .toLowerCase()

export const SHOW_EBM_POPUP =
  rawShowEbmPopup === "true" || rawShowEbmPopup === "1" || rawShowEbmPopup === "yes"

