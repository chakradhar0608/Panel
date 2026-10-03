#!/usr/bin/env bash
set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
CAMP_SLUG="${CAMP_SLUG:-non-existent-camp}"
CAMP_ID="${CAMP_ID:-999999}"
OFFER_ID="${OFFER_ID:-999999}"
LEAD_ID="${LEAD_ID:-999999}"
WITHDRAWAL_ID="${WITHDRAWAL_ID:-999999}"
REGISTER_EMAIL="${REGISTER_EMAIL:-api-check-$(date +%s)@example.com}"

PARTNER_EMAIL="${PARTNER_EMAIL:-}"
PARTNER_PASSWORD="${PARTNER_PASSWORD:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
TMP_DIR="$(mktemp -d)"
PARTNER_COOKIE_JAR="$TMP_DIR/partner.cookies"
ADMIN_COOKIE_JAR="$TMP_DIR/admin.cookies"
LAST_CODE=""
LAST_BODY_FILE=""

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

contains_status() {
  local actual="$1"
  local expected_csv="$2"
  IFS=',' read -r -a expected_arr <<<"$expected_csv"
  for expected in "${expected_arr[@]}"; do
    if [[ "$actual" == "$expected" ]]; then
      return 0
    fi
  done
  return 1
}

run_test() {
  local name="$1"
  local method="$2"
  local path="$3"
  local expected_csv="$4"
  local json_body="${5:-}"
  local cookie_jar="${6:-}"

  local body_file="$TMP_DIR/body.$RANDOM.txt"
  local code
  local -a curl_cmd
  curl_cmd=(curl -sS -o "$body_file" -w "%{http_code}" -X "$method" "$BASE_URL$path")

  if [[ -n "$json_body" ]]; then
    curl_cmd+=(-H "content-type: application/json" --data "$json_body")
  fi

  if [[ -n "$cookie_jar" ]]; then
    curl_cmd+=(-b "$cookie_jar" -c "$cookie_jar")
  fi

  code="$("${curl_cmd[@]}" 2>/dev/null || echo "000")"
  LAST_CODE="$code"
  LAST_BODY_FILE="$body_file"
  local body
  body="$(head -c 280 "$body_file" | tr '\n' ' ')"

  if contains_status "$code" "$expected_csv"; then
    printf 'PASS  %-42s %3s  (%s)\n' "$name" "$code" "$path"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    printf 'FAIL  %-42s %3s  (%s)\n' "$name" "$code" "$path"
    printf '      expected: [%s]\n' "$expected_csv"
    printf '      body: %s\n' "$body"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

skip_test() {
  local name="$1"
  local reason="$2"
  printf 'SKIP  %-42s      (%s)\n' "$name" "$reason"
  SKIP_COUNT=$((SKIP_COUNT + 1))
}

echo "API smoke check against $BASE_URL"
echo

if ! curl -sS "$BASE_URL" >/dev/null 2>&1; then
  echo "Server is not reachable at $BASE_URL"
  echo "Run: npm run dev"
  exit 1
fi

echo "Public endpoints"
run_test "platform-stats" "GET" "/api/platform-stats" "200"
REGISTER_PASSWORD="${REGISTER_PASSWORD:-Test@12345}"
run_test "partner-register" "POST" "/api/partner/auth/register" "200,409,422" "{\"email\":\"$REGISTER_EMAIL\",\"password\":\"$REGISTER_PASSWORD\",\"fullName\":\"API Check\"}"

if [[ "$LAST_CODE" == "200" ]]; then
  run_test "partner-login-new-user" "POST" "/api/partner/auth/login" "200" "{\"email\":\"$REGISTER_EMAIL\",\"password\":\"$REGISTER_PASSWORD\"}" "$PARTNER_COOKIE_JAR"
  run_test "partner-session-new-user" "GET" "/api/partner/auth/session" "200" "" "$PARTNER_COOKIE_JAR"
elif [[ "$LAST_CODE" == "409" ]]; then
  skip_test "partner-login-new-user" "generated email already exists; rerun to retry with a new email"
  skip_test "partner-session-new-user" "register was not a fresh create"
else
  skip_test "partner-login-new-user" "register failed; login flow skipped"
  skip_test "partner-session-new-user" "register failed; session flow skipped"
fi

run_test "partner-login-invalid" "POST" "/api/partner/auth/login" "401,422" "{\"email\":\"no-user@example.com\",\"password\":\"invalid\"}"
run_test "partner-forgot-password" "POST" "/api/partner/auth/forgot-password" "200" "{\"email\":\"no-user@example.com\"}"
run_test "partner-logout" "POST" "/api/partner/auth/logout" "200"
run_test "admin-login-invalid" "POST" "/api/admin/auth/login" "401" "{\"email\":\"no-admin@example.com\",\"password\":\"invalid\"}"
run_test "admin-logout" "POST" "/api/admin/auth/logout" "200"
run_test "camp-by-slug" "GET" "/api/camp/$CAMP_SLUG" "404"
run_test "camp-claim" "POST" "/api/camp/$CAMP_SLUG/claim" "404" "{\"upiId\":\"test@upi\"}"
run_test "camp-convert" "POST" "/api/camp/$CAMP_SLUG/convert" "404,422" "{\"click_id\":\"x1\",\"event\":\"install\"}"
run_test "camp-redirect-missing-token" "GET" "/api/camp/redirect" "400"

echo
echo "Protected endpoints (unauthenticated checks)"
run_test "partner-session" "GET" "/api/partner/auth/session" "401"
run_test "partner-offers" "GET" "/api/partner/offers" "401"
run_test "partner-offer-by-id" "GET" "/api/partner/offers/$OFFER_ID" "401"
run_test "partner-dashboard" "GET" "/api/partner/dashboard" "401"
run_test "partner-conversions" "GET" "/api/partner/conversions" "401"
run_test "partner-conversion-by-id" "GET" "/api/partner/conversions/$LEAD_ID" "401"
run_test "partner-camps-get" "GET" "/api/partner/camps" "401"
run_test "partner-camps-post" "POST" "/api/partner/camps" "401" "{\"offerId\":1}"
run_test "partner-camp-update" "PATCH" "/api/partner/camps/$CAMP_ID" "401" "{\"selectedEventName\":\"install\"}"
run_test "partner-camp-status" "PATCH" "/api/partner/camps/$CAMP_ID/status" "401" "{\"status\":\"PAUSED\"}"
run_test "partner-wallet" "GET" "/api/partner/wallet" "401"
run_test "partner-withdraw" "POST" "/api/partner/wallet/withdraw" "401" "{\"amount\":500,\"method\":\"UPI\",\"paymentDetails\":{\"upiId\":\"test@upi\"}}"
run_test "partner-postback-get" "GET" "/api/partner/postback" "401"
run_test "partner-postback-set" "POST" "/api/partner/postback" "401" "{\"postbackUrl\":\"https://example.com/postback\"}"
run_test "partner-postback-test" "POST" "/api/partner/postback/test" "401"
run_test "partner-reports" "GET" "/api/partner/reports?range=today" "401"
run_test "admin-me" "GET" "/api/admin/auth/me" "401"
run_test "admin-dashboard" "GET" "/api/admin/dashboard" "401"
run_test "admin-publishers" "GET" "/api/admin/publishers" "401"
run_test "admin-offers-get" "GET" "/api/admin/offers" "401"
run_test "admin-offers-create" "POST" "/api/admin/offers" "401" "{\"name\":\"T\",\"slug\":\"t\",\"category\":\"GEN\",\"payoutType\":\"CPA\",\"publisherPayout\":1,\"status\":\"ACTIVE\"}"
run_test "admin-offer-update" "PATCH" "/api/admin/offers/$OFFER_ID" "401" "{\"name\":\"Updated\"}"
run_test "admin-offer-delete" "DELETE" "/api/admin/offers/$OFFER_ID" "401"
run_test "admin-camp-leads" "GET" "/api/admin/camp-leads" "401"
run_test "admin-camp-lead-update" "PATCH" "/api/admin/camp-leads/$LEAD_ID" "401" "{\"status\":\"REJECTED\"}"
run_test "admin-withdrawals" "GET" "/api/admin/withdrawal-requests" "401"
run_test "admin-withdrawal-update" "PATCH" "/api/admin/withdrawal-requests/$WITHDRAWAL_ID" "401" "{\"status\":\"REJECTED\"}"

echo
echo "Authenticated checks (optional)"
if [[ -n "$PARTNER_EMAIL" && -n "$PARTNER_PASSWORD" ]]; then
  run_test "partner-login-valid" "POST" "/api/partner/auth/login" "200" "{\"email\":\"$PARTNER_EMAIL\",\"password\":\"$PARTNER_PASSWORD\"}" "$PARTNER_COOKIE_JAR"
  run_test "partner-session-auth" "GET" "/api/partner/auth/session" "200" "" "$PARTNER_COOKIE_JAR"
  run_test "partner-dashboard-auth" "GET" "/api/partner/dashboard" "200" "" "$PARTNER_COOKIE_JAR"
  run_test "partner-offers-auth" "GET" "/api/partner/offers" "200" "" "$PARTNER_COOKIE_JAR"
  run_test "partner-camps-auth" "GET" "/api/partner/camps" "200" "" "$PARTNER_COOKIE_JAR"
else
  skip_test "partner-auth-suite" "set PARTNER_EMAIL and PARTNER_PASSWORD"
fi

if [[ -n "$ADMIN_EMAIL" && -n "$ADMIN_PASSWORD" ]]; then
  run_test "admin-login-valid" "POST" "/api/admin/auth/login" "200" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" "$ADMIN_COOKIE_JAR"
  run_test "admin-me-auth" "GET" "/api/admin/auth/me" "200" "" "$ADMIN_COOKIE_JAR"
  run_test "admin-dashboard-auth" "GET" "/api/admin/dashboard" "200" "" "$ADMIN_COOKIE_JAR"
  run_test "admin-offers-auth" "GET" "/api/admin/offers" "200" "" "$ADMIN_COOKIE_JAR"
else
  skip_test "admin-auth-suite" "set ADMIN_EMAIL and ADMIN_PASSWORD"
fi

echo
echo "Summary: PASS=$PASS_COUNT FAIL=$FAIL_COUNT SKIP=$SKIP_COUNT"
if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi
