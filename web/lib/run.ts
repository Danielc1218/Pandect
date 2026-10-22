import "server-only";
import { allSections, allTests, BANK_NAME, typeCounts } from "./bank";
import { ops, type Op } from "./ops";
import { requireUser } from "./supabase";

/** Runs one of lib/ops.ts's operations here on the server as the signed-in user, with the cached bank index. */
export const op: Op = async (name, ...args) => {
  const { db, user } = await requireUser();
  // @ts-expect-error each name's arguments are checked at the call site by Op
  return ops[name]({ db, user, bank: { name: BANK_NAME, typeCounts, allTests, allSections } }, ...args);
};
