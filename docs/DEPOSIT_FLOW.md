# Amount-first deposit flow

Both Deposit funds and Add funds open `/dashboard/wallets`. The investor enters
a USD amount, selects an active cryptocurrency and network, and sees its current
coin equivalent. Prices refresh every 30 seconds; a missing or expired price
prevents proceeding. USDT uses its actual market price rather than a dollar peg.
The six operator-supplied receiving addresses are unchanged.

Proceed requests fresh server-signed payment instructions and opens a centered,
keyboard-accessible payment window. It shows the USD amount, transferable coin
figure, exact network, receiving address and address-only QR code. Separate
buttons copy the address and coin amount without locale separators. Wallet fees
are separate; the recipient must receive the displayed coin amount.

The amount remains fixed while paying. Instructions and a partially entered hash
are retained in session storage for this account and browser tab. Closing the
window or reloading offers Resume payment. Starting another deposit discards
the local instructions. The token is scoped to reporting this pending deposit;
it does not authorize a wallet transfer or a balance change.

After sending, the investor pastes the blockchain transaction hash, confirms the
network and chooses Done. The server verifies the signed owner, amount and
wallet mapping, normalizes the hash and records a pending deposit with captured
pricing details in its note and a durable audit record. Invalid or duplicate
references preserve the payment window.
An administrator must independently verify receipt, claimant attribution and
the USD credit. A conversion is not a guaranteed exchange or settlement rate.

Pricing uses a bounded, deduplicated 25-second cache of Coinbase USD spot prices,
with timestamp-checked CoinGecko as an alternate. When neither provider supplies
valid data, the API returns 503. Live-price expiry only gates starting a payment;
existing instructions remain reportable for seven days after issuance. Contact
support if an older transfer needs reporting or the receiving mapping changed.

Identity review is optional for deposit quotes, submissions and reviewed deposit
credits. Newly registered, email-verified accounts can fund without submitting
identity details or waiting for identity approval. Existing identity statuses
are preserved; pending or rejected identity review does not block deposits.
Investments and withdrawals retain their identity-approval requirements.

Investor two-factor preferences, email verification, funding controls,
administrator proof and independent transfer review remain in effect. The English
deposit guide and all interface catalogs follow this flow. Existing dated PDF
editions are unchanged snapshots.

Regression validation uses `npm run test:integration -- --deposit-identity`
against a separate disposable PostgreSQL database. It exercises no identity
record, pending, rejected and approved review states, signed quotes, pending
deposits without auto-credit, and actual operator-approved funding. Email and
funding gates remain enforced; investment/withdrawal identity gates still apply.
The dedicated identity case is isolated from the MFA suite to preserve the
existing financial request limit and avoid leaking test state between cases.
