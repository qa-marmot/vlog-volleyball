'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UserPrefsState {
  setEndReminderEnabled: boolean
}

interface UserPrefsActions {
  setSetEndReminderEnabled: (enabled: boolean) => void
}

type UserPrefsStore = UserPrefsState & UserPrefsActions

export const useUserPrefsStore = create<UserPrefsStore>()(
  persist(
    (set) => ({
      setEndReminderEnabled: true,
      setSetEndReminderEnabled: (enabled) => set({ setEndReminderEnabled: enabled }),
    }),
    {
      name: 'vlog-user-prefs',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
