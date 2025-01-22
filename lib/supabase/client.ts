"use client";

import { createBrowserClient } from "@supabase/ssr";
import { mockAuth, mockDatabase } from "./mock-auth";

const USE_MOCK = true; // Toggle this to switch between mock and real Supabase

export const createClient = () => {
  if (USE_MOCK) {
    return {
      auth: mockAuth,
      from: mockDatabase.from,
    };
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};