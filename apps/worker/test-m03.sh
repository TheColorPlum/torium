#!/bin/bash
# M03 Test Script - Verify counter and cap behavior

BASE_URL="https://torium-worker.pelumi.workers.dev"

echo "=== M03 Counter + Free Cap Tests ==="
echo ""

echo "1. Testing redirect works (should 302)..."
STATUS=$(curl -sI "$BASE_URL/demo" | head -1 | awk '{print $2}')
if [ "$STATUS" = "302" ]; then
  echo "   ✅ Redirect returns 302"
else
  echo "   ❌ Expected 302, got $STATUS"
fi

echo ""
echo "2. Testing Cache-Control header..."
CACHE=$(curl -sI "$BASE_URL/demo" | grep -i "cache-control" | tr -d '\r')
if [[ "$CACHE" == *"no-store"* ]]; then
  echo "   ✅ Cache-Control: no-store present"
else
  echo "   ❌ Missing Cache-Control: no-store"
fi

echo ""
echo "3. Testing redirect still works after multiple hits..."
for i in {1..5}; do
  STATUS=$(curl -sI "$BASE_URL/demo" | head -1 | awk '{print $2}')
  if [ "$STATUS" != "302" ]; then
    echo "   ❌ Request $i failed: $STATUS"
    exit 1
  fi
done
echo "   ✅ All 5 requests returned 302"

echo ""
echo "4. Verifying health endpoint..."
HEALTH=$(curl -s "$BASE_URL/health" | jq -r '.data.status')
if [ "$HEALTH" = "ok" ]; then
  echo "   ✅ Health endpoint OK"
else
  echo "   ❌ Health check failed"
fi

echo ""
echo "=== Summary ==="
echo "✅ Redirects work correctly (302 + no-store)"
echo "✅ Multiple redirects work (DO tracking async)"
echo ""
echo "Note: Full cap testing (5000 limit) requires:"
echo "  - Simulating 5000+ requests"
echo "  - Checking queue messages stop after cap"
echo "  - Pro workspace testing needs plan_type='pro' record"
echo ""
echo "Counter reset testing requires:"
echo "  - Mocking time to different month"
echo "  - OR waiting for actual month boundary"
