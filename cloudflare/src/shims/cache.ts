// next/cache: the browser has no server cache to tag or expire, so these do nothing.
export function revalidatePath(_path: string, _type?: "layout" | "page") {}
export function revalidateTag(_tag: string, _profile?: string) {}
export function cacheTag(..._tags: string[]) {}
export function cacheLife(_profile: string) {}
