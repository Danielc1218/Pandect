/** Save immediately, then coalesce changes made during that request into the next write.
 * A caller resolves only once a write containing its change has completed. Writes never overlap. */
export function createSaveQueue<T>(save: (value: T) => Promise<unknown>) {
  type Waiter = { resolve: () => void; reject: (error: unknown) => void };
  let next: { value: T; waiters: Waiter[] } | undefined;
  let running = false;

  async function drain() {
    if (running) return;
    running = true;
    while (next) {
      const job = next;
      next = undefined;
      try {
        await save(job.value);
        job.waiters.forEach(({ resolve }) => resolve());
      } catch (error) {
        job.waiters.forEach(({ reject }) => reject(error));
      }
    }
    running = false;
  }

  return (value: T): Promise<void> => new Promise((resolve, reject) => {
    if (next) next.value = value;
    else next = { value, waiters: [] };
    next.waiters.push({ resolve, reject });
    void drain();
  });
}
