import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const claimRouteSource = await readFile(
  new URL('../app/api/procurement/orders/[pidOrder]/claim/route.ts', import.meta.url),
  'utf8',
);
const orderListSource = await readFile(
  new URL('../app/(dashboard)/dashboard/procurement/components/OrdersBoxProcurement.tsx', import.meta.url),
  'utf8',
);

test('claiming is authenticated, limited to pending orders, and atomic', () => {
  assert.match(claimRouteSource, /requireAdminServiceAccess\('procurement', 'edit'\)/);
  assert.match(claimRouteSource, /updateMany/);
  assert.match(claimRouteSource, /status: 'pending'/);
  assert.match(claimRouteSource, /pidAdmin: null/);
  assert.match(claimRouteSource, /claimedAt/);
});

test('pending-order UI shows claimant identity and timestamp', () => {
  assert.match(orderListSource, /Claim order/);
  assert.match(orderListSource, /Claimed by \{order\.claimedByAdmin\.adminName\}/);
  assert.match(orderListSource, /formatClaimedAt\(order\.claimedByAdmin\.claimedAt\)/);
  assert.match(orderListSource, /selectedOrder\.claimedByAdmin\.adminName/);
  assert.match(orderListSource, /formatClaimedAt\(\s*selectedOrder\.claimedByAdmin\.claimedAt/);
  assert.match(orderListSource, /claimOrder\(selectedOrder\.pidOrder\)/);
  assert.match(orderListSource, /status === "pending"/);
  assert.doesNotMatch(orderListSource, /hidden rounded-md border border-primary\/20/);
  assert.match(orderListSource, /max-w-full rounded-lg border border-primary\/20/);
});
