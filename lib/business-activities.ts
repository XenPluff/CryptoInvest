export type BusinessActivity = {
  id: string;
  number: string;
  title: string;
  profileTitle?: string;
  theme: string;
  summary: string;
  revenue: string;
  considerations?: string;
  margin: string;
  risk: string;
  operatingLimits?: string;
  evidence: string;
  imageAlt: string;
};

// Business descriptions supplied and confirmed by the owner in chat.
// This catalog is not independent operating, financial or credential verification.
export const businessActivities: BusinessActivity[] = [
  {
    id: "crypto-mining", number: "01", title: "Crypto mining", theme: "DIGITAL INFRASTRUCTURE",
    profileTitle: "1. Cryptocurrency Mining and Digital Infrastructure",
    summary: "We evaluate cryptocurrency mining opportunities involving computing infrastructure, mining equipment, energy efficiency, hosting arrangements and digital-asset operations.",
    revenue: "Potential sources of revenue include mining rewards, transaction fees attributable to mining operations, hosting services and related infrastructure activities where actually conducted.",
    considerations: "Key performance considerations include network difficulty, digital-asset prices, electricity costs, hardware efficiency, equipment depreciation, maintenance, mining-pool arrangements and regulatory developments.",
    margin: "Electricity, equipment efficiency, hardware depreciation, hosting, pool fees and network difficulty determine whether mining revenue translates into a positive net result.",
    risk: "Mining revenue is variable and may fall below operating costs. The company does not represent mining revenue as a guaranteed source of profit.",
    evidence: "Facility or hosting agreements, energy bills, equipment inventory, hashrate records and reconciled pool payouts linked to controlled wallets.",
    imageAlt: "AI-generated illustration of a cryptocurrency mining equipment aisle with the AUREON logo",
  },
  {
    id: "market-trading", number: "02", title: "Financial market trading", theme: "MARKETS & EXECUTION",
    profileTitle: "Financial Market Trading",
    summary: "Where appropriately authorised and commercially suitable, AUREON may use approved strategies involving financial instruments and markets.",
    revenue: "Potential results may arise from realised trading gains, permitted investment income and changes in the market value of positions.",
    margin: "Execution costs, spreads, financing, slippage, hedging costs and losing positions must be included when assessing net performance.",
    risk: "Trading can result in substantial losses. Leverage, volatility, liquidity shortages, execution errors and counterparty failures can magnify negative outcomes.",
    operatingLimits: "Trading activities must remain within approved risk limits and applicable regulatory permissions.",
    evidence: "Named trader biographies and verifiable experience, trading mandates, broker or exchange statements, risk limits and independently reconciled realized profit and loss.",
    imageAlt: "AI-generated illustration of a professional market research desk with the AUREON logo",
  },
  {
    id: "real-estate", number: "03", title: "Real estate management", theme: "PROPERTY & OPERATIONS",
    summary: "Property income begins with occupancy, sound management and documented rights.",
    revenue: "Property management can earn contracted service fees. Where a documented ownership or investment interest exists, rental income and realized disposal gains may also contribute.",
    margin: "Vacancy, maintenance, insurance, management expenses, property taxes, financing and transaction costs affect the net result.",
    risk: "Property is often illiquid. Tenant defaults, repairs, valuation changes, legal disputes and interest-rate movements can reduce income or capital value.",
    evidence: "Management mandates or title documents, property schedules, leases, rent reconciliations, operating expenses and independent valuations where appropriate.",
    imageAlt: "AI-generated illustration of contemporary managed residential buildings with the AUREON logo",
  },
  {
    id: "agriculture", number: "04", title: "Agriculture", theme: "PRODUCTIVE LAND",
    summary: "Working with seasonal production, responsible resource use and routes to market.",
    revenue: "Agricultural activity can generate revenue from the sale of crops, produce and contracted agricultural services. Receipts depend on actual production, quality and delivery.",
    margin: "Land access, seeds, fertilizer, water, labor, equipment, storage, transport and financing must be measured across the full production cycle.",
    risk: "Weather, pests, disease, input-price changes, water availability and commodity prices can materially affect yields and profitability.",
    evidence: "Land or operating agreements, production records, harvest and inventory reports, purchase orders, buyer contracts and reconciled sales receipts.",
    imageAlt: "AI-generated illustration of cultivated agricultural fields at sunrise with the AUREON logo",
  },
  {
    id: "solar-energy", number: "05", title: "Solar energy", theme: "ENERGY & INFRASTRUCTURE",
    summary: "Electricity generation evaluated through measured output and contractual cash flows.",
    revenue: "Solar projects can earn revenue from metered electricity sales under power-purchase agreements or applicable market arrangements. Contract terms determine pricing and payment rights.",
    margin: "Project development, equipment, grid connection, maintenance, land costs, financing and taxes shape the economics over the asset's operating life.",
    risk: "Irradiation, degradation, grid curtailment, equipment failures, buyer credit and policy changes can reduce generation or receipts.",
    evidence: "Project rights, commissioning records, permits, power-purchase agreements, meter data, maintenance records and reconciled customer payments.",
    imageAlt: "AI-generated illustration of a solar panel installation in warm evening light with the AUREON logo",
  },
  {
    id: "physical-assets", number: "06", title: "Tangible physical assets", theme: "ASSET-BACKED ACTIVITY",
    summary: "Productive equipment and inventory valued for what they can deliver, not just what they cost.",
    revenue: "Physical assets can generate contracted leasing income, service income or realized resale margins when the company has the relevant ownership or contractual rights.",
    margin: "Acquisition cost, utilization, depreciation, maintenance, storage, logistics, insurance and financing determine the economic return.",
    risk: "Assets may depreciate, become obsolete or be difficult to sell. Damage, utilization shortfalls and lessee default can impair cash flow.",
    evidence: "Asset registers, ownership and lien checks, leases, utilization reports, insurance terms, inspection records and valuation or disposal evidence.",
    imageAlt: "AI-generated illustration of industrial equipment and organized warehouse inventory with the AUREON logo",
  },
  {
    id: "natural-resources", number: "07", title: "Natural resources & metals", theme: "MATERIALS OF VALUE",
    summary: "Gold, silver, copper and other resources assessed through provenance, rights and realized economics.",
    revenue: "Documented resource activities can earn revenue through permitted production, processing or trading. A commodity holding itself does not create recurring income or guarantee appreciation.",
    margin: "Acquisition or production costs, processing, transport, storage, financing, royalties and taxes must be accounted for against realized sales.",
    risk: "Commodity-price movements, title disputes, assay differences, environmental obligations, permitting and counterparty exposure can create substantial losses.",
    evidence: "Ownership or supply contracts, relevant permits, provenance and assay records, verified quantities, storage or shipment records and reconciled sales.",
    imageAlt: "AI-generated illustration of gold, silver and copper materials with the AUREON logo",
  },
  {
    id: "arbitrage", number: "08", title: "Arbitrage", theme: "RELATIVE VALUE",
    summary: "Small price differences assessed against the full cost and risk of execution.",
    revenue: "Arbitrage seeks to capture price differences between related assets or venues through coordinated transactions. An observed spread becomes a result only after execution and reconciliation.",
    margin: "Trading and transfer fees, borrowing, settlement delays, slippage and any hedging costs can consume or reverse the apparent spread.",
    risk: "Execution is not guaranteed. Price changes, failed transfers, exchange restrictions, illiquidity and counterparty failure mean arbitrage is not risk-free.",
    evidence: "Timestamped trade confirmations, venue and custody statements, fees, transfer records, exposure limits and net results reconciled across both sides.",
    imageAlt: "AI-generated conceptual illustration of paired market venues and trade routes with the AUREON logo",
  },
  {
    id: "ai-robotics", number: "09", title: "Artificial intelligence & robotics", theme: "INTELLIGENT TECHNOLOGY",
    summary: "An investment focus spanning modern artificial intelligence, intelligent automation and robotics.",
    revenue: "Investments can generate dividends or distributions where declared, or realized gains when an ownership interest is sold. Licensing, software subscriptions and robotics services may support investee-company revenue; those receipts are separate from AUREON’s own investment returns.",
    margin: "Investment fees, dilution, follow-on funding, taxes and exit costs affect net returns. Investee businesses also face research, computing, hardware, deployment and support costs.",
    risk: "Technology may fail to commercialize or become obsolete. Competition, data and intellectual-property restrictions, cybersecurity, robot safety, regulation and illiquidity can lead to partial or total loss.",
    evidence: "Named investments and ownership interests, investment agreements, capitalization records, valuation methods, investee financial reports and evidence of any dividends, distributions or realized exit proceeds.",
    imageAlt: "AI-generated illustration of a modern robotics laboratory with AI computing infrastructure and the AUREON logo",
  },
];
