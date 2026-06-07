/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from "@supabase/supabase-js";

// ============================================================================
// CONFIGURATION: REPLACE THESE WITH YOUR OWN SUPABASE CREDENTIALS IF NEEDED
// ============================================================================

// Your Supabase Project API URL
const SUPABASE_URL = "https://jnhvhmozkaqnlypwntpb.supabase.co";

// Your Supabase Project Anon/Public API Key
const SUPABASE_PUBLIC_KEY = "sb_publishable_SuMh9y4tbI1UgKW9gddQ3A_47SIilQk";

// Export the initialized client wrapper for use across the application modules
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
