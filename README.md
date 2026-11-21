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
