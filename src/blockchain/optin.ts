import algosdk from "algosdk";

export const optInApp = async (
  sender: string,
  appId: number,
  peraWallet: any
) => {
  try {
    const algodClient = new algosdk.Algodv2(
      "",
      "https://testnet-api.algonode.cloud",
      ""
    );

    const params = await algodClient.getTransactionParams().do();

    const txn = algosdk.makeApplicationOptInTxnFromObject({
      sender,
      appIndex: appId,
      suggestedParams: params,
    });

    const txGroup = [{ txn, signers: [sender] }];

    const signedTxn = await peraWallet.signTransaction([txGroup]);

    await algodClient.sendRawTransaction(signedTxn).do();

    console.log("✅ Opt-in successful");

  } catch (error) {
    console.error("Opt-in failed:", error);
  }
};