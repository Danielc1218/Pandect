#!/usr/bin/env bash
# Checks the encrypted bank. Usage: check-bank-gate.sh <origin> <user-token>
# Set ID / TYPE to a question id and type slug that exist in the deployed bank.
origin=$1; user=$2
ID=${ID:-$(ls "$(dirname "$0")/../public/bank/q" | head -1 | sed 's/\.json$//')}
TYPE=${TYPE:-flaw}
sig="${user##*.}"; mid=$(( ${#sig} / 2 ))
forged="${user%.*}.${sig:0:mid}$([ "${sig:mid:1}" = A ] && echo B || echo A)${sig:mid+1}"   # a middle signature character changed
fail=0
result() { if [ "$1" = ok ]; then echo "PASS $2"; else echo "FAIL $2"; fail=1; fi; }

# raw <path>: the public file, whatever the spelling, must not contain plaintext keys.
raw() {
  body=$(curl -s --path-as-is "$origin$1")
  if grep -qE '"(prompt|correct_answer|explanation|options)"' <<<"$body"; then result bad "raw $1 leaks plaintext"; else result ok "raw $1 has no plaintext"; fi
}
# api <label> <expected status> <token or empty> <path> [expected text in body]
api() {
  out=$(curl -s --path-as-is -w '\n%{http_code}' ${3:+-H "Authorization: Bearer $3"} "$origin$4")
  code=${out##*$'\n'}; body=${out%$'\n'*}
  if [ "$code" != "$2" ]; then result bad "$1 $4: wanted $2, got $code"
  elif [ -n "$5" ] && ! grep -q "$5" <<<"$body"; then result bad "$1 $4: body lacks $5"
  elif grep -q '"correct_answer"' <<<"$body"; then result bad "$1 $4: answer leaked"
  else result ok "$1 $4 ($code)"; fi
}

for p in "/bank/q/$ID.json" "/bank/answers/$ID.json" "//bank/answers/$ID.json" "/%62ank/answers/$ID.json" "/BANK/answers/$ID.json"; do raw "$p"; done
for t in "" wrong "$forged" ew.e30.AAAA; do api "token '${t:0:8}'" 401 "$t" "/api/bank/q/$ID"; done
api "user" 200 "$user" "/api/bank/q/$ID" '"prompt"'
api "user" 200 "$user" "/api/bank/types/lr/$TYPE" '"snippet"'
api "user" 404 "$user" "/api/bank/q/..%2F..%2Fbank%2Fanswers%2F$ID"
api "user" 404 "$user" "/api/bank/q/$ID.json"
api "user" 404 "$user" "/api/bank/types/lr/..%2F..%2Fanswers"
api "user" 404 "$user" "/api/bank/answers/$ID"
api "user" 404 "$user" "/api/bank/q/00000000-0000-4000-8000-000000000000"
exit $fail
