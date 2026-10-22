// Stand-in for web/lib/actions.ts until its actions are ported: same names, so shared components build.
const notPorted = (): never => { throw new Error("not ported yet"); };

export type SettingsState = { saved?: boolean; error?: string };

export async function answer(_questionId: string, _chosen: string) { return notPorted(); }
export async function startSection(_form: FormData) { return notPorted(); }
export async function startRandomSection(_form: FormData) { return notPorted(); }
export async function saveAnswer(_sessionId: string, _questionId: string, _chosen: string) { return notPorted(); }
export async function pauseSection(_sessionId: string) { return notPorted(); }
export async function resumeSection(_sessionId: string) { return notPorted(); }
export async function finishSection(_sessionId: string) { return notPorted(); }
export async function saveSettings(_: SettingsState, _form: FormData): Promise<SettingsState> { return notPorted(); }
export async function saveProfile(_: SettingsState, _form: FormData): Promise<SettingsState> { return notPorted(); }
export async function savePreferences(_prefs: unknown) { return notPorted(); }
