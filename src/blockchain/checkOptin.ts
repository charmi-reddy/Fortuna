import algosdk from "algosdk";

export const isOptedIn = async (
  address: string,
  appId: number
): Promise<boolean> => {
  const algodClient = new algosdk.Algodv2(
    "",
    "https://testnet-api.algonode.cloud",
    ""
  );

  const accountInfo = await algodClient.accountInformation(address).do();

  const appsLocalState = (accountInfo as any)["apps-local-state"] || [];

  return appsLocalState.some((app: any) => app.id === appId);
};