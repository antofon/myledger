# Getting Plaid access: what I actually did

Plaid's plans change over time. This is how it went for me in early 2026; check the [Plaid docs](https://plaid.com/docs/) for the current options before following it.

## 1. Sandbox first

I started in Sandbox: free keys straight from the Dashboard, simulated institutions, and the test login `user_good` / `pass_good`. The whole pipeline (fetch, dedupe, categorize, write to Sheets) was built and tested against Sandbox data before I connected a real bank.

Sandbox is great for wiring, but it doesn't reproduce every institution's quirks. Some banks that don't return pending transactions in Production will return them in Sandbox, for example. Most of the data handling decisions in the README only showed up once real transactions came through.

## 2. Why Link needs a small server

Plaid Link runs in a browser, but two calls around it have to happen server-side with the client secret: `/link/token/create` to start Link, and `/item/public_token/exchange` to turn the short-lived `public_token` into a long-lived `access_token`. Calling Plaid directly from a browser is blocked by CORS anyway, and the secret should never be shipped to a client.

Since this only has to happen once per bank, I kept it to a tiny local Express server (`link-server/`). It creates the `link_token`, the page opens Link, and the server does the exchange. Because it's a local, single-user tool, the page shows each `access_token` so I can paste it into Apps Script's Script Properties. In a multi-user app the access token would stay on the server.

## 3. Applying for Production

Full Production access is requested from the Dashboard. The application covered:

- **A company / application profile**, even for a single-user personal project
- **A security questionnaire**: how credentials and data are stored, encryption, access control, vulnerability management, and data retention and deletion
- **Supporting documents**: I wrote short security, access control, privacy and data retention policies scoped to a single-user app

The questionnaire was easier to answer honestly because the architecture was simple. Everything lives inside Google's managed environment, there are no servers of mine holding data, and there's a clear deletion path: delete the workbook, clear Script Properties, and remove the Items. The application was approved in mid-March 2026.

## 4. Going live

Going live was mostly configuration: switch `PLAID_ENV` to `production` with the Production secret, re-run Link against my real institutions, move the four access tokens into Script Properties, and add the two time-driven triggers (Wednesday and Sunday, 8 AM).

## 5. Running into the call cap

My runs used Plaid's free API allowance, and calls count against it whether they succeed or fail. On Aug 26, 2026 the allowance ran out. Rather than let the trigger keep firing failed calls, I added a `PLAID_PAUSED` Script Property that `runFetch` checks before calling Plaid, and set it to `true`. Resuming is a matter of flipping it back, with no code changes.

## Note for new developers

Plaid teams created on or after April 15, 2026 in the US and Canada get a free **Trial plan** for testing with real Production data, in place of the older Limited Production tier. See Plaid's docs on Trial plans for the current limits.

## If I did it again

I'd use `/transactions/sync` with a stored cursor instead of fixed date windows. Writing this up turned up the gaps in my windowed `/transactions/get` approach (see Known issues in the README), and a cursor-based sync is exactly what avoids them.
