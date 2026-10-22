#!/usr/bin/env bash
# Checks who can read /bank/*. Usage: check-bank-gate.sh <origin> <user-token> <bank-secret>
# Needs a real question id and type slug that exist in the deployed bank (set ID / TYPE to override).
origin=$1; user=$2; secret=$3
ID=${ID:-$(ls "$(dirname "$0")/../public/bank/q" | head -1 | sed 's/\.json$//')}
TYPE=${TYPE:-flaw}
forged="${user%?}$([ "${user: -1}" = a ] && echo b || echo a)"   # one character of the signature changed
fail=0
# check <label> <expected status> <token or empty> <path>
check() {
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' ${3:+-H "Authorization: Bearer $3"} "$origin$4")
  if [ "$code" = "$2" ]; then echo "PASS $1 ($code)"; else echo "FAIL $1: wanted $2, got $code"; fail=1; fi
}
for p in "/bank/q/$ID.json" "/bank/types/lr/$TYPE.json"; do
  check "no header     $p" 401 "" "$p"
  check "wrong secret  $p" 401 wrong "$p"
  check "forged token  $p" 401 "$forged" "$p"
  check "user token    $p" 200 "$user" "$p"
  check "server secret $p" 200 "$secret" "$p"
done
a="/bank/answers/$ID.json"
check "no header     $a" 404 "" "$a"
check "user token    $a" 404 "$user" "$a"
check "server secret $a" 200 "$secret" "$a"
# A user's question file must not carry the answer.
if curl -s -H "Authorization: Bearer $user" "$origin/bank/q/$ID.json" | grep -q correct_answer; then echo "FAIL question file has correct_answer"; fail=1; else echo "PASS question file has no correct_answer"; fi
exit $fail
