// Browser version of web/lib/run.ts: each operation runs in the Pages Function (functions/api/op/[name].ts) as the user
// whose session cookie this is, so the page receives what it shows and nothing about where it came from.
import type { Op } from "@/lib/ops";
import { api } from "./supabase";

export const op: Op = (name, ...args) => api(`/api/op/${name}`, args) as never;
