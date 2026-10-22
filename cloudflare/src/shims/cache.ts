// next/cache: the browser has no server cache to tag or expire. revalidatePath in an action re-renders what is on
// screen in Next (saveProfile's and saveSettings' revalidatePath("/", "layout")), so here it refreshes; the rest do nothing.
import { refresh } from "./navigation";

export function revalidatePath(_path: string, _type?: "layout" | "page") { refresh(); }
export function revalidateTag(_tag: string, _profile?: string) {}
export function cacheTag(..._tags: string[]) {}
export function cacheLife(_profile: string) {}
