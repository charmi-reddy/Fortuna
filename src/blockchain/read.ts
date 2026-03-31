import algosdk from "algosdk";

export const getSavings = async (
  address: string,
  appId: number
): Promise<number> => {
  try {
    const algodClient = new algosdk.Algodv2(
      "",
      "https://testnet-api.algonode.cloud",
      ""
    );

    const accountInfo = await algodClient.accountInformation(address).do();

    const appsLocalState = (accountInfo as any)["apps-local-state"] || [];

    const app = appsLocalState.find(
      (a: any) => a.id === appId
    );

    if (!app) return 0;

    const keyValue = (app as any)["key-value"] || [];

    for (const item of keyValue) {
      const key = atob(item.key);

      if (key === "totalSaved") {
        return item.value.uint || 0;
      }
    }

    return 0;

  } catch (error) {
    console.error("Error fetching savings:", error);
    return 0;
  }
};