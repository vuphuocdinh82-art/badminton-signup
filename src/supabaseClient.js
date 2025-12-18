import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ✅ 关键：用代码打印，别在浏览器 Console 直接写 import.meta
console.log("SUPABASE_URL =", supabaseUrl);
console.log("SUPABASE_KEY exists =", Boolean(supabaseAnonKey));

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
