# AFTERFORM

AFTERFORM is an interactive e-commerce prototype for a fictional fashion and accessories brand. The package includes the English/USD storefront, checkout, customer account and an admin workspace that shares the demo catalog and orders.

## Run on Windows

Double-click `Start AFTERFORM.cmd` from the extracted folder. You can also start the launcher in PowerShell from this folder.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\launcher.ps1
```

The launcher serves the files at `http://127.0.0.1:8137/` and opens the storefront in your default browser. It uses Windows PowerShell and .NET without application dependencies. Keep the terminal open while you browse. Press `Ctrl+C` to stop the server.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\launcher.ps1 -Port 9000 -NoBrowser
```

If the requested port is occupied, the launcher prints an available address. Use that address for both storefront and admin. Use the same address, port and browser profile throughout a demo so the two views share their local data.

## Routes

| Screen | Path after the local address |
| --- | --- |
| Home | `/` |
| Shop, new arrivals and outerwear | `/#/shop`, `/#/collection/new`, `/#/category/outerwear` |
| Drift Bomber and the lookbook | `/#/product/drift-bomber`, `/#/gallery` |
| Saved items, bag and checkout | `/#/saved`, `/#/bag`, `/#/checkout` |
| Sign in, register, account and track an order | `/#/login`, `/#/register`, `/#/account`, `/#/track` |
| Store Desk and Orders | `/admin.html`, `/admin.html#orders` |
| Products, Inventory and Analytics | `/admin.html#products`, `/admin.html#inventory`, `/admin.html#analytics` |
| Customers and Discounts | `/admin.html#customers`, `/admin.html#discounts` |

## Try the complete flow

1. Open the Drift Bomber, select an available size and add it to your bag.
2. Use `AFTER10` for a 10% demo discount. Continue as a guest or sign in with `demo@afterform.test` and `Afterform123`.
3. Enter a fictional US delivery address and choose standard or express shipping. Select **Place demo order** and save the confirmation number.
4. Open **Store Desk → Orders** in a second tab at the same local address. Search for the confirmation number, open the order and change its fulfillment status.
5. Return to the storefront, open **Track an order**, and enter the confirmation number and checkout email. Signed-in shoppers can also find their orders under **Account**.

## Data and customization

The prototype uses browser storage. A different browser profile, private window or port has independent data. For a clean demo, open the local URL in a new private session. Use fictional customer information and demo-only passwords. Payments, shipping and admin access are simulated, and checkout uses sample US shipping rates with no tax calculation. The admin starts with example operational data and incorporates orders created in the same browser profile.

Change the brand, market, catalog, lookbook and shipping configuration in `data.js`. Use `assets/` for campaign and product media. The storefront and order/account views have their own CSS and JavaScript, and the admin is served from `admin.html`. The design handoff covers research, screen contracts and production integration. The photography brief contains the original image prompts. [Design handoff](DESIGN.md) · [Photography brief](assets/ART-DIRECTION.md)


## Phase 1: API-first storefront bootstrap (frontend)

The storefront and admin now wait for one **public backend bootstrap** before rendering. The original fashion catalog, lookbook, and store experience in `data.js` remain as the demo fallback. No server is implemented in this frontend repository.

- Backend repository / implementation TODO: [afterform-be](https://github.com/trminhkhoi76-code/afterform-be)
- Backend contract: [afterform-be/docs/bootstrap-contract.md](https://github.com/trminhkhoi76-code/afterform-be/blob/main/docs/bootstrap-contract.md)
- Bootstrap route: `GET /api/v1/public/stores/{storeSlug}/bootstrap`
- Store routing: `index.html?store=beauty` and `admin.html?store=beauty` (defaults to `afterform`).
- Runtime settings: `runtime-config.js` is **public**; do not add credentials or private keys.

### Connect the backend later

Update the existing `runtime-config.js`:

```js
window.AF_RUNTIME = {
  apiBaseUrl: 'https://your-backend.example.com',
  defaultStore: 'afterform',
  timeoutMs: 4000
};
```

The frontend requests `https://your-backend.example.com/api/v1/public/stores/beauty/bootstrap` for `?store=beauty`. Configure backend CORS for the frontend origin and use HTTPS in production. Deploying changes to product data requires **no frontend deployment** after the backend has been connected.

### Loading and fallback behavior

| Situation | Behavior |
| --- | --- |
| No `apiBaseUrl` configured | Render existing fashion demo immediately |
| Network error, non-2xx, invalid JSON / schema, or timeout | Render the fashion demo (recorded in `window.AF.source.reason`) |
| Valid response with products | Render the API catalog and store config |
| Valid response with `products: []` | Show an intentionally empty API store, **not** dummy products |
| Response for another `store.slug` | Reject and fall back, preventing cross-store catalog mix-ups |

Use `window.AF.source.mode` (`dummy` / `api`) and `window.AF.source.storeId` to inspect the current state. In dummy mode, legacy localStorage and demo checkout behavior remain available; browser-local data is namespaced by store. When fetching a different store that is not yet available, the UI explicitly labels the demo fallback.

**Phase 1 is read-only for remote stores.** Catalogs hydrate from the public API; admin mutating actions are disabled, checkout/accounts/order tracking are disabled, and all existing production-looking checkout/payment flows stay demo-only. Backend write APIs, authentication, live orders, stock transactions, and real payment integration are tracked in `afterform-be` as TODO. Never treat a browser-local demo order as paid.

### Regression checks

```sh
node --test tests/*.test.js
node --check data.js
node --check store-loader.js
node --check app.js
node --check admin.js
node --check checkout.js
```
