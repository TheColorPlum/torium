#!/bin/bash
# Test M04: Rollups + Analytics
# Run against the deployed worker

set -e

API_URL="${API_URL:-https://torium-worker.pelumi.workers.dev}"
DB_ID="a0983129-1b80-4161-9257-9dd454bfb844"

echo "=== M04 Rollups + Analytics Test ==="
echo "API: $API_URL"
echo ""

# Check that we need a session token for analytics
echo "1. Test authentication requirement..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/analytics/overview")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "401" ]; then
  echo "   ✓ Analytics requires authentication (401)"
else
  echo "   ✗ Expected 401, got $HTTP_CODE"
fi
echo ""

# Verify rollup tables exist via D1 query
echo "2. Verify rollup tables exist in D1..."
CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN:-pc0S1mTv3BnPropK4edQ-T45Rm7u8fhRybsFg5gn}

TABLES=$(npx wrangler d1 execute torium-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'rollup%' OR name = 'aggregation_state'" 2>&1 | grep -E "(rollup|aggregation)" || true)

if echo "$TABLES" | grep -q "rollup_daily_workspace"; then
  echo "   ✓ rollup_daily_workspace exists"
else
  echo "   ✗ rollup_daily_workspace missing"
fi

if echo "$TABLES" | grep -q "rollup_daily_link"; then
  echo "   ✓ rollup_daily_link exists"
else
  echo "   ✗ rollup_daily_link missing"
fi

if echo "$TABLES" | grep -q "rollup_referrer_daily"; then
  echo "   ✓ rollup_referrer_daily exists"
else
  echo "   ✗ rollup_referrer_daily missing"
fi

if echo "$TABLES" | grep -q "rollup_country_daily"; then
  echo "   ✓ rollup_country_daily exists"
else
  echo "   ✗ rollup_country_daily missing"
fi

if echo "$TABLES" | grep -q "rollup_device_daily"; then
  echo "   ✓ rollup_device_daily exists"
else
  echo "   ✗ rollup_device_daily missing"
fi

if echo "$TABLES" | grep -q "aggregation_state"; then
  echo "   ✓ aggregation_state exists"
else
  echo "   ✗ aggregation_state missing"
fi
echo ""

# Verify aggregation_state has initial row
echo "3. Verify aggregation_state initialized..."
STATE=$(npx wrangler d1 execute torium-db --remote --command "SELECT * FROM aggregation_state" 2>&1)
if echo "$STATE" | grep -q "1970-01-01"; then
  echo "   ✓ aggregation_state has initial row"
else
  echo "   ℹ aggregation_state row: $STATE"
fi
echo ""

# Check scheduled triggers
echo "4. Verify scheduled triggers configured..."
grep -q '*/5 \* \* \* \*' wrangler.toml && echo "   ✓ Aggregation cron (*/5 * * * *) configured"
grep -q '0 3 \* \* \*' wrangler.toml && echo "   ✓ Retention cron (0 3 * * *) configured"
echo ""

# Test health endpoint still works
echo "5. Verify health endpoint..."
HEALTH=$(curl -s "$API_URL/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "   ✓ Health endpoint responding"
else
  echo "   ✗ Health endpoint failed: $HEALTH"
fi
echo ""

echo "=== M04 Test Complete ==="
echo ""
echo "Notes:"
echo "- Aggregation runs every 5 minutes automatically"
echo "- Retention runs daily at 3 AM UTC"
echo "- Analytics endpoints require authenticated session"
echo "- To test with real data: create clicks, wait for aggregation, query analytics"
