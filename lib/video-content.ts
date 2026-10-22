export type VideoScene = {
  title: string;
  accent: string;
  text: string;
  visual: "orb" | "account" | "ledger" | "assets" | "network" | "address" | "receipt" | "withdraw" | "timeline";
  label: string;
};

export type AureonVideo = {
  id: string;
  title: string;
  category: "Introduction" | "Guide" | "Brand film";
  description: string;
  sceneSeconds: number;
  action: { label: string; href: string };
  scenes: VideoScene[];
};

export const aureonVideos: AureonVideo[] = [
  {
    id: "introduction",
    title: "Meet AUREON",
    category: "Introduction",
    description: "A first look at the workspace, its records and the distinction between available funds and estimates.",
    sceneSeconds: 8,
    action: { label: "Discover the approach", href: "/about" },
    scenes: [
      { title: "A new", accent: "perspective.", label: "WELCOME TO AUREON", visual: "orb", text: "Meet a workspace for digital-asset deposit instructions, investment records and account activity." },
      { title: "Your account.", accent: "One clear view.", label: "THE INVESTOR WORKSPACE", visual: "ledger", text: "Review available funds, active investment principal and transaction status in your dashboard." },
      { title: "Every status", accent: "has a meaning.", label: "RECORDS WITH CONTEXT", visual: "receipt", text: "A submitted deposit awaits operator verification. It is credited only after approval." },
      { title: "Begin with", accent: "understanding.", label: "A CONSIDERED BEGINNING", visual: "orb", text: "Read the terms and risk disclosure. Target returns are estimates, not available funds. Capital can be lost." },
    ],
  },
  {
    id: "getting-started",
    title: "Set up your account",
    category: "Guide",
    description: "Registration, email verification, identity review and authenticator setup, step by step.",
    sceneSeconds: 8,
    action: { label: "Open account settings", href: "/dashboard/account" },
    scenes: [
      { title: "Your first", accent: "steps.", label: "GUIDE 01 / ACCOUNT SETUP", visual: "account", text: "Start with the account setup checklist. Keep your login and authenticator information private." },
      { title: "Create your", accent: "account.", label: "01 / REGISTER", visual: "account", text: "Choose Create an account. Enter your name, email and a unique password, then review the terms." },
      { title: "Verify your", accent: "email.", label: "02 / CHECK YOUR INBOX", visual: "account", text: "Open the verification link sent to your email, then sign in. Check spam if the message is missing." },
      { title: "Complete", accent: "identity review.", label: "03 / ACCOUNT SETTINGS", visual: "account", text: "Open Account settings and submit the required identity details. Wait for an approved KYC review." },
      { title: "Add another", accent: "layer.", label: "04 / AUTHENTICATOR SETUP", visual: "account", text: "Investor two-factor authentication is optional. Enable it in Account settings for codes at sign-in and withdrawal requests." },
      { title: "Know before", accent: "you proceed.", label: "05 / UNDERSTAND THE PROCESS", visual: "ledger", text: "Funding requires verified email, approved KYC and enabled platform funding. Investor authenticator enrollment is optional." },
    ],
  },
  {
    id: "deposit-guide",
    title: "Understand the deposit process",
    category: "Guide",
    description: "Set your USD amount, preview the live crypto conversion, then send and report your transfer.",
    sceneSeconds: 8,
    action: { label: "Open deposit workspace", href: "/dashboard/wallets" },
    scenes: [
      { title: "A careful", accent: "beginning.", label: "GUIDE 02 / DEPOSITS", visual: "assets", text: "Open Deposit funds. Complete account checks first, and confirm deposits are open before sending anything." },
      { title: "Set your", accent: "amount.", label: "01 / AMOUNT AND CURRENCY", visual: "assets", text: "Enter your USD deposit amount and select an available cryptocurrency. Review the coin amount calculated from the current market price." },
      { title: "Match the", accent: "network.", label: "02 / CHECK BOTH SIDES", visual: "network", text: "Your sending wallet must use the exact selected network. USDT on TRC20 and ERC20 are different routes." },
      { title: "Proceed to", accent: "payment.", label: "03 / YOUR PAYMENT WINDOW", visual: "address", text: "Choose Proceed to payment. Copy the receiving address and exact coin amount, or scan the address QR code and enter the amount separately." },
      { title: "Send the", accent: "exact amount.", label: "04 / YOUR SENDING WALLET", visual: "address", text: "Use the matching network and allow for wallet fees so the recipient receives the amount shown. The coin amount stays fixed; USD credit is confirmed during review." },
      { title: "Return and", accent: "choose Done.", label: "05 / REPORT YOUR TRANSFER", visual: "receipt", text: "Return to the payment window, paste your blockchain transaction hash, confirm the transfer and choose Done. No authenticator code is needed for deposits." },
      { title: "Follow the", accent: "review.", label: "06 / TRANSACTION HISTORY", visual: "receipt", text: "Track the pending deposit in activity. A hash alone never credits your balance; the operator must verify and approve it." },
    ],
  },
  {
    id: "withdrawal-guide",
    title: "Request and track a withdrawal",
    category: "Guide",
    description: "Available balance, destination checks, authenticator confirmation and the meaning of a pending request.",
    sceneSeconds: 8,
    action: { label: "Open withdrawals", href: "/dashboard/withdrawals" },
    scenes: [
      { title: "Plan your", accent: "next step.", label: "GUIDE 03 / WITHDRAWALS", visual: "withdraw", text: "Open Withdraw funds. Requests require approved identity, verified email and enabled funding. An authenticator code is needed only when you enabled two-factor protection." },
      { title: "Check what", accent: "is available.", label: "01 / AVAILABLE BALANCE", visual: "ledger", text: "Enter an amount within your available USD balance. Active investment principal and target estimates are not available funds." },
      { title: "Confirm your", accent: "destination.", label: "02 / ASSET AND NETWORK", visual: "withdraw", text: "Select the supported asset and network. Enter your external wallet address and check every detail." },
      { title: "Review, then", accent: "request.", label: "03 / AUTHENTICATOR CONFIRMATION", visual: "withdraw", text: "If two-factor protection is enabled, enter your current six-digit code. Confirm the destination details and choose Request withdrawal." },
      { title: "Pending is", accent: "under review.", label: "04 / REQUEST STATUS", visual: "timeline", text: "The requested amount is reserved while the request is pending. Approval alone does not send cryptocurrency." },
      { title: "Track the", accent: "outcome.", label: "05 / TRANSACTION HISTORY", visual: "timeline", text: "Check transaction activity for the outcome and payment reference when recorded. Contact support if you need help." },
    ],
  },
  {
    id: "a-clearer-perspective",
    title: "A clearer perspective",
    category: "Brand film",
    description: "A short introduction to the AUREON experience: considered design and clearly presented records.",
    sceneSeconds: 5,
    action: { label: "Explore AUREON", href: "/how-it-works" },
    scenes: [
      { title: "Pause.", accent: "Find perspective.", label: "AUREON / THE SHORT FILM", visual: "orb", text: "Digital assets move quickly. Take time to understand what you see." },
      { title: "Your records.", accent: "In focus.", label: "A CONSIDERED WORKSPACE", visual: "ledger", text: "Account activity. Deposit instructions. Investment records." },
      { title: "Clarity in", accent: "the details.", label: "UNDERSTAND EVERY STEP", visual: "orb", text: "Explore the process and understand the risks before making a decision." },
      { title: "AUREON.", accent: "Explore the view.", label: "DISCOVER THE PLATFORM", visual: "orb", text: "Learn how the workspace works. Digital assets involve risk, including loss of your entire investment." },
    ],
  },
];

export function videoDuration(video: AureonVideo) {
  return video.sceneSeconds * video.scenes.length;
}

export function videoTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
