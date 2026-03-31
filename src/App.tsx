import { useEffect, useRef, useState } from "react";
import "./App.css";
import { deployContract } from "./blockchain/deploy";
import { depositAlgo } from "./blockchain/deposit";
import { getSavings } from "./blockchain/read"; // 
import { isOptedIn } from "./blockchain/checkOptin";
import { optInApp } from "./blockchain/optin";

type WalletPlatform = "mobile" | "web" | null;

type WalletConnector = {
  on: (event: string, listener: () => void) => void;
};

type WalletInstance = {
  connect: () => Promise<string[]>;
  reconnectSession: () => Promise<string[]>;
  disconnect: () => Promise<void>;
  connector?: WalletConnector | null;
  platform: WalletPlatform;
};

const CONNECT_MODAL_CLOSED = "CONNECT_MODAL_CLOSED";

function App() {
  const walletRef = useRef<WalletInstance | null>(null);

  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Loading wallet...");

  const [appId, setAppId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [savings, setSavings] = useState(0); // ⭐ NEW

  const shortAddress = accountAddress
    ? `${accountAddress.slice(0, 6)}...${accountAddress.slice(-6)}`
    : "Not connected";

  function handleDisconnect() {
    const wallet = walletRef.current;
    if (!wallet) return;

    void wallet.disconnect();
    setAccountAddress(null);
    setStatusMessage("Wallet disconnected.");
  }

  async function ensureWallet() {
    if (walletRef.current) return walletRef.current;

    const module = await import("@perawallet/connect");

    const wallet = new module.PeraWalletConnect({
      shouldShowSignTxnToast: false,
    }) as WalletInstance;

    walletRef.current = wallet;
    return wallet;
  }

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const wallet = await ensureWallet();
        const accounts = await wallet.reconnectSession();

        if (!isMounted) return;

        wallet.connector?.on("disconnect", handleDisconnect);

        if (accounts.length) {
          setAccountAddress(accounts[0]);
          setStatusMessage("Session restored.");
        } else {
          setStatusMessage("Connect wallet.");
        }
      } catch (err) {
        console.error(err);
        setStatusMessage("Wallet init failed.");
      } finally {
        if (isMounted) setIsBusy(false);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleConnect() {
    setIsBusy(true);

    try {
      const wallet = await ensureWallet();
      const accounts = await wallet.connect();

      wallet.connector?.on("disconnect", handleDisconnect);

      setAccountAddress(accounts[0]);
      setStatusMessage("Connected.");
    } catch (error) {
      const connectError = error as { data?: { type?: string } };

      if (connectError?.data?.type === CONNECT_MODAL_CLOSED) {
        setStatusMessage("Cancelled.");
      } else {
        console.error(error);
        setStatusMessage("Connection failed.");
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function fetchSavings() {
    if (!accountAddress || !appId) return;

    const value = await getSavings(
      accountAddress,
      Number(appId)
    );

    setSavings(value / 1_000_000); // microAlgo → ALGO
  }

  async function handleDeploy() {
    if (!accountAddress) return;

    setStatusMessage("Deploying...");

    const deployedAppId = await deployContract(
      accountAddress,
      walletRef.current
    );

    if (deployedAppId !== null) {
      setAppId(deployedAppId.toString());
      setStatusMessage("Deployed successfully!");
      await fetchSavings(); // ⭐ NEW
    } else {
      setStatusMessage("Deployment failed.");
    }
  }

  async function handleDeposit() {
  if (!accountAddress || !appId || !amount) return;

  const optedIn = await isOptedIn(
    accountAddress,
    Number(appId)
  );

  // 🔥 Auto opt-in if needed
  if (!optedIn) {
    setStatusMessage("Opting in...");

    await optInApp(
      accountAddress,
      Number(appId),
      walletRef.current
    );
  }

  setStatusMessage("Processing deposit...");

  await depositAlgo(
    accountAddress,
    Number(appId),
    Number(amount),
    walletRef.current
  );

  await fetchSavings();

  setStatusMessage("Deposit complete!");
  setAmount("");
}

  const isConnected = Boolean(accountAddress);

  return (
    <main style={{ padding: "40px", maxWidth: "600px", margin: "auto" }}>
      <h1>Savings Vault 💰</h1>

      {/* Wallet */}
      <div style={{ marginBottom: "20px" }}>
        <button onClick={handleConnect} disabled={isBusy || isConnected}>
          Connect Wallet
        </button>

        <button onClick={handleDisconnect} disabled={!isConnected}>
          Disconnect
        </button>
      </div>

      <p><strong>Account:</strong> {shortAddress}</p>

      {/* Deploy */}
      <div style={{ marginTop: "20px" }}>
        <button onClick={handleDeploy} disabled={!isConnected}>
          Deploy Contract
        </button>

        {appId && (
          <p>
            <strong>App ID:</strong> {appId}
          </p>
        )}
      </div>

      {/* Deposit */}
      <div style={{ marginTop: "30px" }}>
        <h3>Deposit ALGO</h3>

        <input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ padding: "8px", marginRight: "10px" }}
        />

        <button onClick={handleDeposit} disabled={!appId}>
          Deposit
        </button>
      </div>

      {/* Savings */}
      <div style={{ marginTop: "30px" }}>
        <h3>Your Savings</h3>
        <p>{savings} ALGO</p>
      </div>

      <p style={{ marginTop: "20px" }}>{statusMessage}</p>
    </main>
  );
}

export default App;