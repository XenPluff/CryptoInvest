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
    profileTitle: "Real Estate Management",
    summary: "We evaluate income-producing real estate and property-related businesses, including property management, leasing, asset improvement and selected property investments.",
    revenue: "Potential sources of revenue include rental income, property-management fees, leasing services and realised gains on property disposals.",
    margin: "Vacancy, maintenance, insurance, management expenses, property taxes, financing and transaction costs affect the net result.",
    risk: "Property valuations can fluctuate, and rental assets may face vacancy, maintenance, financing, insurance, taxation and liquidity risks.",
    evidence: "Management mandates or title documents, property schedules, leases, rent reconciliations, operating expenses and independent valuations where appropriate.",
    imageAlt: "AI-generated illustration of contemporary managed residential buildings with the AUREON logo",
  },
  {
    id: "agriculture", number: "04", title: "Agriculture", theme: "PRODUCTIVE LAND",
    profileTitle: "Agriculture and Agricultural Assets",
    summary: "We evaluate agricultural enterprises, farming operations, food production, processing, storage and related supply-chain opportunities.",
    revenue: "Potential sources of revenue include crop sales, livestock products, processing, distribution and agricultural service contracts.",
    margin: "Land access, seeds, fertilizer, water, labor, equipment, storage, transport and financing must be measured across the full production cycle.",
    risk: "Risks include weather, disease, input prices, transport costs, spoilage, commodity-price movements and changes in agricultural policy.",
    evidence: "Land or operating agreements, production records, harvest and inventory reports, purchase orders, buyer contracts and reconciled sales receipts.",
    imageAlt: "AI-generated illustration of cultivated agricultural fields at sunrise with the AUREON logo",
  },
  {
    id: "solar-energy", number: "05", title: "Solar energy", theme: "ENERGY & INFRASTRUCTURE",
    profileTitle: "Solar Energy and Renewable Infrastructure",
    summary: "We evaluate solar-energy assets, renewable-energy infrastructure and associated commercial opportunities.",
    revenue: "Potential revenue sources include electricity sales, contracted energy services, equipment leasing and other permitted energy-related activities.",
    margin: "Project development, equipment, grid connection, maintenance, land costs, financing and taxes shape the economics over the asset's operating life.",
    risk: "Project viability depends on installation costs, energy yields, equipment performance, grid arrangements, contractual terms, maintenance and applicable energy regulations.",
    evidence: "Project rights, commissioning records, permits, power-purchase agreements, meter data, maintenance records and reconciled customer payments.",
    imageAlt: "AI-generated illustration of a solar panel installation in warm evening light with the AUREON logo",
  },
  {
    id: "physical-assets", number: "06", title: "Tangible physical assets", theme: "ASSET-BACKED ACTIVITY",
    profileTitle: "Tangible Physical Assets",
    summary: "We may invest in productive equipment, industrial assets and other physical assets that support commercial operations or generate contracted income.",
    revenue: "Potential economic benefits include leasing revenue, service fees, operating income and realised disposal proceeds.",
    margin: "Acquisition cost, utilization, depreciation, maintenance, storage, logistics, insurance and financing determine the economic return.",
    risk: "Asset selection considers maintenance, depreciation, utilisation, insurance, resale value and the cost of capital.",
    evidence: "Asset registers, ownership and lien checks, leases, utilization reports, insurance terms, inspection records and valuation or disposal evidence.",
    imageAlt: "AI-generated illustration of industrial equipment and organized warehouse inventory with the AUREON logo",
  },
  {
    id: "natural-resources", number: "07", title: "Natural resources & metals", theme: "MATERIALS OF VALUE",
    profileTitle: "Natural Resources and Precious Metals",
    summary: "We may evaluate exposure to precious and industrial metals (gold, silver and copper) and natural-resource-related assets, subject to appropriate ownership, custody, environmental, legal and commercial due diligence.",
    revenue: "Potential economic benefits may arise from operating income, contractual revenue, permitted trading activities or realised gains on asset sales.",
    margin: "Acquisition or production costs, processing, transport, storage, financing, royalties and taxes must be accounted for against realized sales.",
    risk: "Commodity prices can be volatile. Physical holdings also introduce storage, insurance, transportation, authenticity and counterparty risks.",
    evidence: "Ownership or supply contracts, relevant permits, provenance and assay records, verified quantities, storage or shipment records and reconciled sales.",
    imageAlt: "AI-generated illustration of gold, silver and copper materials with the AUREON logo",
  },
  {
    id: "arbitrage", number: "08", title: "Arbitrage", theme: "RELATIVE VALUE",
    profileTitle: "Arbitrage and Market Inefficiencies",
    summary: "We evaluate lawful arbitrage opportunities where price differences may exist between markets, instruments, venues or related assets.",
    revenue: "Potential returns depend on execution quality and the difference between purchase and sale prices after fees, spreads, funding, hedging and other costs.",
    margin: "Trading and transfer fees, borrowing, settlement delays, slippage and any hedging costs can consume or reverse the apparent spread.",
    risk: "Arbitrage is not risk-free. Price discrepancies can disappear, transactions can fail, settlement may be delayed and counterparties may default.",
    evidence: "Timestamped trade confirmations, venue and custody statements, fees, transfer records, exposure limits and net results reconciled across both sides.",
    imageAlt: "AI-generated conceptual illustration of paired market venues and trade routes with the AUREON logo",
  },
  {
    id: "ai-robotics", number: "09", title: "Artificial intelligence & robotics", theme: "INTELLIGENT TECHNOLOGY",
    profileTitle: "Artificial Intelligence and Robotics",
    summary: "We evaluate opportunities in AI-enabled business software, automation, robotics, computing infrastructure and technology-related enterprises.",
    revenue: "Potential revenue sources include software subscriptions, licensing, technology services, automation contracts and returns from investments in relevant businesses.",
    margin: "Investment fees, dilution, follow-on funding, taxes and exit costs affect net returns. Investee businesses also face research, computing, hardware, deployment and support costs.",
    risk: "Technology investments may face rapid obsolescence, competitive pressure, intellectual-property disputes, cybersecurity threats and uncertainty regarding commercial adoption.",
    evidence: "Named investments and ownership interests, investment agreements, capitalization records, valuation methods, investee financial reports and evidence of any dividends, distributions or realized exit proceeds.",
    imageAlt: "AI-generated illustration of a modern robotics laboratory with AI computing infrastructure and the AUREON logo",
  },
  {
    id: "strategic-business", number: "10", title: "Strategic Business Investments", theme: "STRATEGIC CAPITAL",
    summary: "AUREON may evaluate equity interests, partnerships, acquisitions and other commercial investments in businesses that align with its investment mandate.",
    revenue: "Potential returns may arise from dividends, operating distributions, contractual income or realised capital gains.",
    margin: "Acquisition valuation, transaction costs, financing, operating performance, taxes and the terms of any distributions or exit affect net returns.",
    risk: "These investments may be illiquid and may involve minority-ownership, governance, valuation and business-execution risks.",
    evidence: "Investment agreements, ownership registers, partnership terms, governance rights, financial statements, valuation methods and records of distributions or realised disposals.",
    imageAlt: "Conceptual illustration of a boardroom with business models and connected investment interests, carrying the AUREON logo",
  },
];
