import { prisma } from "./db";
import { emailProviderStatus } from "./mail";

/** Deposits use the operator-supplied addresses stored in the wallet catalogue. */
export async function providerStatus() {
  return {
    email: emailProviderStatus(),
    deposits: {
      method: "provided_wallet_addresses" as const,
      confirmation: "manual_review" as const,
      wallets: await prisma.wallet.findMany({
        where: { active: true },
        orderBy: [{ asset: "asc" }, { network: "asc" }],
        select: { id: true, asset: true, network: true, address: true },
      }),
    },
  };
}
