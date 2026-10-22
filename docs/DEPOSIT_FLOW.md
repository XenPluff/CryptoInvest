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

Investor two-factor preferences, email/KYC requirements, funding controls,
administrator proof and independent review rules remain in effect. The English
deposit guide and all interface catalogs follow this flow. Existing dated PDF
editions are unchanged snapshots.
