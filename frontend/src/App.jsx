import { useEffect, useState } from "react";

const COLORS = {
  blue: "#213F95",
  pink: "#F6E3E5",
};

function OmniGridLogo({ className = "h-9 w-9 text-white" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-label="OmniGRID logo" role="img">
      <path d="M8 12h14M8 22h11M8 32h14M8 40h10" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="m31 5-11 22h9l-4 16 15-25h-10l5-13Z" fill="currentColor" />
    </svg>
  );
}

const stats = [
  {
    title: "Total Meter Balance",
    value: "balance",
    description: "Across your saved meters",
    icon: "▣",
  },
  {
    title: "Saved Meters",
    value: "meters",
    description: "Electricity, water, and gas",
    icon: "ϟ",
  },
  {
    title: "Total Meter Loans",
    value: "loan",
    description: "Across your saved meters",
    icon: "৳",
  },
];

const actions = [
  {
    title: "Recharge Meter",
    description: "Add balance to your meter",
    icon: "+",
  },
  {
    title: "Pay Meter Bill",
    description: "Clear your bill easily",
    icon: "ϟ",
  },
  {
    title: "Take Loan On Meter",
    description: "Get emergency loan",
    icon: "৳",
  },
  {
    title: "View Transactions",
    description: "Check your history",
    icon: "☷",
  },
];

function formatTransactions(records) {
  return records.map((transaction) => {
    const utcDate = new Date(transaction.date.replace(" ", "T") + "Z");
    return {
      ...transaction,
      date: Number.isNaN(utcDate.getTime())
        ? transaction.date
        : utcDate.toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
          }),
    };
  });
}

function App() {
  const [activeCustomerId, setActiveCustomerId] = useState("");
  const [customer, setCustomer] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [loginCustomerId, setLoginCustomerId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [savedCustomerIds, setSavedCustomerIds] = useState(() => {
    try {
      const ids = JSON.parse(window.localStorage.getItem("omnigrid.savedCustomerIds.v1") || "[]");
      return Array.isArray(ids) ? ids.filter((id) => typeof id === "string").slice(0, 8) : [];
    } catch {
      return [];
    }
  });
  const [signupName, setSignupName] = useState("");
  const [signupNotice, setSignupNotice] = useState("");
  const [signupAge, setSignupAge] = useState("");
  const [signupMobile, setSignupMobile] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionError, setTransactionError] = useState("");

  useEffect(() => {
    let isCurrentRequest = true;
    fetch("/api/me")
      .then(async (response) => {
        if (response.status === 401) return null;
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Could not restore your session.");
        }
        return data.customer;
      })
      .then((account) => {
        if (!isCurrentRequest || !account) return;
        setCustomer(account);
        setActiveCustomerId(String(account.customer_id));
        setIsLoggedIn(true);

        fetch("/api/customer/" + account.customer_id + "/transactions")
          .then(async (response) => {
            const data = await response.json();
            if (!response.ok || !data.success) {
              throw new Error(data.message || "Could not load transaction history.");
            }
            return data.transactions;
          })
          .then((records) => {
            if (isCurrentRequest) {
              setTransactions(formatTransactions(records));
              setTransactionError("");
            }
          })
          .catch((error) => {
            if (isCurrentRequest) setTransactionError(error.message);
          });
      })
      .catch((error) => {
        if (isCurrentRequest) setLoginError(error.message);
      })
      .finally(() => {
        if (isCurrentRequest) setAuthChecked(true);
      });

  return () => {
      isCurrentRequest = false;
    };
  }, []);

  const [apiMessage, setApiMessage] = useState("Connecting to Python...");

  useEffect(() => {
    fetch("/api/status")
      .then((response) => response.json())
      .then((data) => {
        setApiMessage(data.api_version === 5 ? data.message : "Restart backend to load the latest updates.");
      })
      .catch(() => {
        setApiMessage("Could not connect to Python backend.");
      });
  }, []);

  const [activePage, setActivePage] = useState("Dashboard");

  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeEmail, setRechargeEmail] = useState("");
  const [rechargeCategory, setRechargeCategory] = useState("electricity");
  const [rechargeMeterNumber, setRechargeMeterNumber] = useState("");
  const [savedRechargeMeters, setSavedRechargeMeters] = useState([]);
  const [showRechargeMeterSuggestions, setShowRechargeMeterSuggestions] = useState(false);
  const [rechargeMessage, setRechargeMessage] = useState("");
  const [recharging, setRecharging] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState("");
  useEffect(() => {
    const paymentResult = new URLSearchParams(window.location.search).get("payment");
    if (!paymentResult) return;
    setPaymentNotice(paymentResult === "success"
      ? "Payment received. Your meter balance has been updated."
      : paymentResult === "cancelled"
        ? "Payment was cancelled. Your meter balance was not changed."
        : "Payment was not completed. Your meter balance was not changed.");
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const [showLoan, setShowLoan] = useState(false);
  const [loanAmount, setLoanAmount] = useState("");
  const [loanCategory, setLoanCategory] = useState("electricity");
  const [loanMeterNumber, setLoanMeterNumber] = useState("");
  const [savedLoanMeters, setSavedLoanMeters] = useState([]);
  const [showLoanMeterSuggestions, setShowLoanMeterSuggestions] = useState(false);
  const [loanMessage, setLoanMessage] = useState("");
  const [takingLoan, setTakingLoan] = useState(false);

  const [showBill, setShowBill] = useState(false);
  const [billUnits, setBillUnits] = useState("");
  const [billMeterNumber, setBillMeterNumber] = useState("");
  const [billMessage, setBillMessage] = useState("");
  const [processingBill, setProcessingBill] = useState(false);
  const [breakdownType, setBreakdownType] = useState("");
  const savedElectricityMeters = (customer?.registered_meters || []).filter((meter) => meter.category === "electricity");
  const selectedBillMeterNumber = billMeterNumber || (savedElectricityMeters.length === 1 ? savedElectricityMeters[0].meter_number : "");
  const selectedElectricityMeter = savedElectricityMeters.find((meter) => meter.meter_number === selectedBillMeterNumber);

  useEffect(() => {
    if (!showRecharge || !activeCustomerId) return undefined;
    let current = true;
    fetch(`/api/customer/${activeCustomerId}/meters?category=${rechargeCategory}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Could not load saved meters.");
        return data.meter_numbers;
      })
      .then((meters) => { if (current) setSavedRechargeMeters(meters); })
      .catch(() => { if (current) setSavedRechargeMeters([]); });
    return () => { current = false; };
  }, [showRecharge, activeCustomerId, rechargeCategory]);

  useEffect(() => {
    if (!showLoan || !activeCustomerId) return undefined;
    let current = true;
    fetch(`/api/customer/${activeCustomerId}/meters?category=${loanCategory}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Could not load saved meters.");
        return data.meter_numbers;
      })
      .then((meters) => { if (current) setSavedLoanMeters(meters); })
      .catch(() => { if (current) setSavedLoanMeters([]); });
    return () => { current = false; };
  }, [showLoan, activeCustomerId, loanCategory]);

  const apiConnected = apiMessage === "OmniGRID API v5 is running!";
  const apiConnecting = apiMessage === "Connecting to Python...";
  const connectionTone = apiConnected
    ? "text-emerald-600"
    : apiConnecting
      ? "text-amber-600"
      : "text-red-500";
  const connectionPillTone = apiConnected
    ? "bg-emerald-100 text-emerald-700"
    : apiConnecting
      ? "bg-amber-100 text-amber-700"
      : "bg-red-100 text-red-600";

  const rememberCustomerId = (customerId) => {
    const updatedIds = [customerId, ...savedCustomerIds.filter((id) => id !== customerId)].slice(0, 8);
    setSavedCustomerIds(updatedIds);
    try {
      window.localStorage.setItem("omnigrid.savedCustomerIds.v1", JSON.stringify(updatedIds));
    } catch {
      // Suggestions remain available for this page session if storage is unavailable.
    }
  };

  const completeSignIn = (account) => {
    setCustomer(account);
    setActiveCustomerId(String(account.customer_id));
    setTransactions([]);
    setTransactionError("");
    setIsLoggedIn(true);
    setAuthMode("login");
    setLoginCustomerId("");
    setLoginPassword("");
    setSignupPassword("");
    setLoginError("");
    loadTransactions(String(account.customer_id));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoggingIn(true);
    setLoginError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: loginCustomerId,
          password: loginPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Sign in failed.");
      }

      rememberCustomerId(data.customer.customer_id);
      completeSignIn(data.customer);
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setSigningUp(true);
    setLoginError("");
    setSignupNotice("");

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName,
          age: signupAge,
          mobile_number: signupMobile,
          password: signupPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Account creation failed.");
      }

      const assignedCustomerId = data.customer.customer_id;
      rememberCustomerId(assignedCustomerId);
      setLoginCustomerId(assignedCustomerId);
      setLoginPassword("");
      setSignupNotice(`Account created! Your Customer ID is ${assignedCustomerId}. Sign in using this ID and the password you created.`);
      setAuthMode("login");
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setSigningUp(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      setIsLoggedIn(false);
      setCustomer(null);
      setActiveCustomerId("");
      setTransactions([]);
      setTransactionError("");
      setActivePage("Dashboard");
      setShowRecharge(false);
      setShowLoan(false);
      setShowBill(false);
      setLoginCustomerId("");
      setLoginPassword("");
      setLoginError("");
      setAuthMode("login");
    }
  };

  const loadTransactions = async (accountId = activeCustomerId) => {
    try {
      const response = await fetch("/api/customer/" + accountId + "/transactions");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load transactions.");
      }

      setTransactions(formatTransactions(data.transactions));
      setTransactionError("");
    } catch (error) {
      setTransactionError(error.message || "Could not load transactions.");
      console.error(error);
    }
  };

  const handleRecharge = async () => {
    const amount = Number(rechargeAmount);

    if (!/^\d{4,32}$/.test(rechargeMeterNumber.trim())) {
      setRechargeMessage("Enter a valid meter number with 4–32 digits.");
      return;
    }
    if (!amount || amount < 10 || amount > 500000) {
      setRechargeMessage("Enter an amount between BDT 10 and BDT 500,000.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rechargeEmail.trim())) {
      setRechargeMessage("Enter a valid email address for the payment.");
      return;
    }

    setRecharging(true);
    setRechargeMessage("");

    try {
      const response = await fetch(
        `/api/customer/${activeCustomerId}/recharge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            category: rechargeCategory,
            meter_number: rechargeMeterNumber.trim(),
            email: rechargeEmail.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Recharge failed.");
      }
      if (data.redirect_url) {
        window.location.assign(data.redirect_url);
        return;
      }

      setCustomer(data.customer);
      await loadTransactions();

      setRechargeMessage(data.message);
      setRechargeAmount("");
      setRechargeMeterNumber("");

      setTimeout(() => {
        setShowRecharge(false);
        setRechargeMessage("");
      }, 1500);
    } catch (error) {
      setRechargeMessage(error.message);
    } finally {
      setRecharging(false);
    }
  };

  const handleTakeLoan = async () => {
    const amount = Number(loanAmount);

    if (!/^\d{4,32}$/.test(loanMeterNumber.trim())) {
      setLoanMessage("Enter a valid meter number with 4–32 digits.");
      return;
    }
    if (!amount || amount < 10 || amount > 500000) {
      setLoanMessage("Please enter a valid loan amount.");
      return;
    }

    setTakingLoan(true);
    setLoanMessage("");

    try {
      const response = await fetch(
        `/api/customer/${activeCustomerId}/loan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            category: loanCategory,
            meter_number: loanMeterNumber.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Loan request failed.");
      }

      setCustomer(data.customer);
      await loadTransactions();

      setLoanMessage(data.message);
      setLoanAmount("");
      setLoanMeterNumber("");

      setTimeout(() => {
        setShowLoan(false);
        setLoanMessage("");
      }, 1500);
    } catch (error) {
      setLoanMessage(error.message);
    } finally {
      setTakingLoan(false);
    }
  };

  const handleProcessBill = async () => {
    const units = Number(billUnits);

    if (!selectedBillMeterNumber) {
      setBillMessage("Choose a saved electricity meter before paying the bill.");
      return;
    }

    if (!units || units <= 0) {
      setBillMessage("Please enter a valid number of units.");
      return;
    }

    setProcessingBill(true);
    setBillMessage("");

    try {
      const response = await fetch(
        `/api/customer/${activeCustomerId}/bill`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ units, category: "electricity", meter_number: selectedBillMeterNumber }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Bill payment failed.");
      }

      setCustomer(data.customer);
      await loadTransactions();

      setBillMessage(data.message);
      setBillUnits("");

      if (activePage !== "Billing") {
        setTimeout(() => {
          setShowBill(false);
          setBillMessage("");
        }, 1800);
      }
    } catch (error) {
      setBillMessage(error.message);
    } finally {
      setProcessingBill(false);
    }
  };

  return (
    <div
      className="min-h-screen font-sans"
      style={{ backgroundColor: COLORS.pink, color: COLORS.blue }}
    >
      {!authChecked ? (
        <main className="flex min-h-screen items-center justify-center p-5">
          <section className="rounded-3xl bg-white/70 px-8 py-10 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#213F95]">
              <OmniGridLogo />
            </div>
            <p className="font-semibold text-[#53649C]">Checking your sign-in...</p>
          </section>
        </main>
      ) : !isLoggedIn ? (
        <main className="flex min-h-screen items-center justify-center p-5">
          <section className="w-full max-w-md rounded-3xl border border-white/70 bg-white/70 p-8 shadow-xl backdrop-blur">
            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#213F95]">
                <OmniGridLogo />
              </div>
              <div>
                <h1 className="text-xl font-extrabold">OmniGRID</h1>
                <p className="text-sm text-[#53649C]">
                  {authMode === "login" ? "Customer sign in" : "Create your account"}
                </p>
              </div>
            </div>

            <h2 className="text-3xl font-extrabold">
              {authMode === "login" ? "Welcome back" : "Get started"}
            </h2>
            <p className="mt-2 text-sm text-[#53649C]">
              {authMode === "login"
                ? "Sign in with your customer ID and password."
                : "Create your customer account to manage your utility services."}
            </p>

            {authMode === "login" && signupNotice && (
              <p role="status" className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
                {signupNotice}
              </p>
            )}

            <form
              onSubmit={authMode === "login" ? handleLogin : handleSignup}
              className="mt-6 space-y-4"
            >
              {authMode === "signup" && (
                <div>
                  <label htmlFor="signup-name" className="mb-2 block text-sm font-bold">
                    Full name
                  </label>
                  <input
                    id="signup-name"
                    value={signupName}
                    onChange={(event) => setSignupName(event.target.value)}
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={80}
                    className="w-full rounded-xl border border-[#D6C9D8] bg-white px-4 py-3 outline-none focus:border-[#213F95]"
                  />
                </div>
              )}

              {authMode === "login" && (
                <div>
                  <label htmlFor="customer-id" className="mb-2 block text-sm font-bold">
                    Customer ID
                  </label>
                  <div className="relative">
                    <input
                      id="customer-id"
                      value={loginCustomerId}
                      onFocus={() => setShowCustomerSuggestions(true)}
                      onChange={(event) => {
                        setLoginCustomerId(event.target.value.toUpperCase());
                        setShowCustomerSuggestions(true);
                      }}
                      onBlur={() => window.setTimeout(() => setShowCustomerSuggestions(false), 120)}
                      placeholder="Enter or choose your customer ID"
                      autoComplete="username"
                      required
                      minLength={3}
                      maxLength={20}
                      aria-autocomplete="list"
                      aria-expanded={showCustomerSuggestions && savedCustomerIds.length > 0}
                      className="w-full rounded-xl border border-[#D6C9D8] bg-white px-4 py-3 outline-none focus:border-[#213F95]"
                    />
                    {showCustomerSuggestions && savedCustomerIds.some((id) => !loginCustomerId || id.toUpperCase().includes(loginCustomerId.toUpperCase())) && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-[#D6C9D8] bg-white shadow-lg">
                        <p className="px-4 py-2 text-xs font-semibold text-[#53649C]">Saved customer IDs</p>
                        {savedCustomerIds
                          .filter((id) => !loginCustomerId || id.toUpperCase().includes(loginCustomerId.toUpperCase()))
                          .map((id) => (
                            <button
                              key={id}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setLoginCustomerId(id);
                                setShowCustomerSuggestions(false);
                              }}
                              className="block w-full px-4 py-3 text-left font-semibold text-[#213F95] hover:bg-[#F6E3E5] focus:bg-[#F6E3E5] focus:outline-none"
                            >
                              {id}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#53649C]">
                    Choose a saved ID or enter yours. Your password is required every time.
                  </p>
                </div>
              )}

              {authMode === "signup" && (
                <>
                  <div>
                    <label htmlFor="signup-age" className="mb-2 block text-sm font-bold">
                      Age
                    </label>
                    <input
                      id="signup-age"
                      type="number"
                      value={signupAge}
                      onChange={(event) => setSignupAge(event.target.value)}
                      placeholder="18 or older"
                      required
                      min="18"
                      max="120"
                      className="w-full rounded-xl border border-[#D6C9D8] bg-white px-4 py-3 outline-none focus:border-[#213F95]"
                    />
                  </div>
                  <div>
                    <label htmlFor="signup-mobile" className="mb-2 block text-sm font-bold">
                      Mobile number
                    </label>
                    <input
                      id="signup-mobile"
                      type="tel"
                      value={signupMobile}
                      onChange={(event) => setSignupMobile(event.target.value)}
                      placeholder="e.g. 01712345678"
                      autoComplete="tel"
                      required
                      minLength={7}
                      maxLength={20}
                      className="w-full rounded-xl border border-[#D6C9D8] bg-white px-4 py-3 outline-none focus:border-[#213F95]"
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="customer-password" className="mb-2 block text-sm font-bold">
                  Password
                </label>
                <input
                  id="customer-password"
                  type="password"
                  value={authMode === "login" ? loginPassword : signupPassword}
                  onChange={(event) => {
                    if (authMode === "login") setLoginPassword(event.target.value);
                    else setSignupPassword(event.target.value);
                  }}
                  placeholder={authMode === "signup" ? "At least 8 characters" : "Enter your password"}
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  required
                  minLength={authMode === "signup" ? 8 : undefined}
                  maxLength={128}
                  className="w-full rounded-xl border border-[#D6C9D8] bg-white px-4 py-3 outline-none focus:border-[#213F95]"
                />
              </div>

              {authMode === "signup" && (
                <p className="rounded-xl bg-[#EDE4EF] px-4 py-3 text-xs leading-5 text-[#53649C]">
                  We will assign your unique customer ID after signup. Use it with
                  the password you create to sign in. Enter your own meter number
                  during a recharge or loan; it will be saved to your account.
                </p>
              )}

              {loginError && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={loggingIn || signingUp}
                className="w-full rounded-xl bg-[#213F95] px-4 py-3 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingIn || signingUp
                  ? authMode === "login" ? "Signing in..." : "Creating account..."
                  : authMode === "login" ? "Sign in" : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#53649C]">
              {authMode === "login" ? "New customer?" : "Already registered?"}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "login" ? "signup" : "login");
                  setLoginError("");
                  setSignupNotice("");
                }}
                className="ml-1 font-bold text-[#213F95] underline underline-offset-2"
              >
                {authMode === "login" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </section>
        </main>
      ) : (
      <div className="flex min-h-screen flex-col md:flex-row">
        {/* Sidebar */}
        <aside
          className="flex w-full flex-col p-5 text-white md:fixed md:inset-y-0 md:left-0 md:z-40 md:h-screen md:w-64 md:overflow-y-auto md:p-6"
          style={{ backgroundColor: COLORS.blue }}
        >
          {/* Brand */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <OmniGridLogo className="h-10 w-10 text-white" />
            </div>

            <div>
              <h1 className="text-xl font-extrabold leading-tight">OmniGRID</h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {["Dashboard", "Billing", "Transactions", "Settings"].map(
              (item) => (
                <button
                  key={item}
                  onClick={() => setActivePage(item)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-semibold transition ${
                    activePage === item
                      ? "bg-[#F6E3E5] text-[#213F95]"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  <span className="text-xl">
                    {item === "Dashboard" && "⌂"}
                    {item === "Billing" && "▤"}
                    {item === "Transactions" && "↔"}
                    {item === "Settings" && "⚙"}
                  </span>

                  {item}
                </button>
              )
            )}
          </nav>

          <section className="mt-5 overflow-hidden rounded-2xl bg-white/95 p-4 text-[#213F95] shadow-sm">
            <h2 className="text-lg font-extrabold leading-tight">Powering a Brighter Tomorrow</h2>
            <p className="mt-2 text-xs font-semibold text-[#53649C]">Reliable · Safe · Always</p>
            <div className="relative mt-3 flex h-20 items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-b from-[#E9D4E2] to-[#DCCCE8]">
              <div className="absolute left-3 top-2 h-5 w-5 rounded-full bg-white/80" />
              <div className="absolute bottom-0 h-7 w-full bg-[#B5A9D6]" />
              <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-2xl font-black text-[#213F95]" aria-label="Electricity">⚡</div>
              <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/85" aria-label="Water">
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#213F95]" aria-hidden="true">
                  <path d="M12 2.5C9.2 6.4 5.5 10.4 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10.4 14.8 6.4 12 2.5Z" />
                </svg>
              </div>
              <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/85" aria-label="Gas">
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#213F95]" aria-hidden="true">
                  <path d="M13.2 2.5c.5 4-1.2 5.4-3 7.4-1.2 1.3-2.2 2.6-2.2 4.6a4 4 0 0 0 8 0c0-1.2-.5-2.3-1.3-3.3.1 2-1 2.8-1.8 3.1.1-3.7 2-5.4 2.7-7.8 2.1 2.2 3.9 5.1 3.9 8a7.5 7.5 0 0 1-15 0c0-4.4 3.7-7.8 8.7-12Z" />
                </svg>
              </div>
            </div>
          </section>

          {/* Logout */}
          <button
            className="mt-4 flex items-center gap-3 rounded-xl px-4 py-3 text-left text-white transition hover:bg-white/10"
            onClick={handleLogout}
          >
            <span className="text-xl">⇥</span>
            Logout
          </button>
        </aside>

        {/* Main Area */}
        <main className="min-w-0 flex-1 p-5 md:ml-64 md:p-8">
          {/* Header */}
          <header className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p
                className="mb-2 text-sm font-bold uppercase tracking-wide"
                style={{ color: COLORS.blue }}
              >
                Overview
              </p>

              <h2 className="text-3xl font-extrabold md:text-4xl">
                Welcome! {customer?.name || "Customer"}
              </h2>

              <p className="mt-2 text-sm text-[#53649C] md:text-base">
                Manage your utility services from one place.
              </p>

              <p
                className={`mt-3 text-sm font-semibold ${connectionTone}`}
              >
                ● {apiMessage}
              </p>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${connectionPillTone}`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    apiConnected
                      ? "bg-emerald-500"
                      : apiConnecting
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                />
                {apiConnected ? "Connected" : apiConnecting ? "Connecting" : "Offline"}
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#213F95] text-xl text-white">
                ◉
              </div>

              <div className="hidden text-sm lg:block">
                <p className="font-bold">{customer?.name || "Customer"}</p>
                <p className="text-[#53649C]">
                  Customer ID: {customer?.customer_id || "Loading..."}
                </p>
              </div>
            </div>
          </header>

          {paymentNotice && (
            <div className={`mb-6 rounded-xl px-4 py-3 font-semibold ${paymentNotice.startsWith("Payment received") ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
              {paymentNotice}
            </div>
          )}
          {activePage === "Transactions" ? (
            <section className="rounded-2xl border border-white/70 bg-white/55 p-5 shadow-sm backdrop-blur md:p-6">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-[#53649C]">
                    Account Activity
                  </p>
                  <h3 className="mt-1 text-3xl font-extrabold">
                    All Transaction History
                  </h3>
                  <p className="mt-2 text-sm text-[#53649C]">
                    Complete transaction history saved to the account database.
                  </p>
                </div>

                <button
                  onClick={() => setActivePage("Dashboard")}
                  className="rounded-xl bg-[#213F95] px-4 py-3 font-bold text-white transition hover:opacity-90"
                >
                  ← Back to Dashboard
                </button>
              </div>

              <div className="mb-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-[#EDE4EF] p-4">
                  <p className="text-sm font-semibold text-[#53649C]">
                    Total Transactions
                  </p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {transactions.length}
                  </p>
                </div>

                <div className="rounded-xl bg-[#EDE4EF] p-4">
                  <p className="text-sm font-semibold text-[#53649C]">Credits</p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {transactions.filter((transaction) => transaction.positive).length}
                  </p>
                </div>

                <div className="rounded-xl bg-[#EDE4EF] p-4">
                  <p className="text-sm font-semibold text-[#53649C]">Debits</p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {transactions.filter((transaction) => !transaction.positive).length}
                  </p>
                </div>
              </div>

              {transactionError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                  <p className="font-bold text-red-600">Transaction history unavailable</p>
                  <p className="mt-2 text-sm text-red-500">{transactionError}</p>
                  <button
                    onClick={loadTransactions}
                    className="mt-4 rounded-xl bg-[#213F95] px-4 py-2 font-bold text-white transition hover:opacity-90"
                  >
                    Try again
                  </button>
                </div>
              ) : transactions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#D6C9D8] bg-white/50 p-10 text-center">
                  <p className="text-lg font-bold">No transactions yet</p>
                  <p className="mt-2 text-sm text-[#53649C]">
                    Recharge your meter, take a loan, or pay a bill to create
                    transaction history.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#E6DDE8]">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="bg-[#EDE4EF]">
                        <th className="px-4 py-4">Type</th>
                        <th className="px-4 py-4">Description</th>
                        <th className="px-4 py-4">Date</th>
                        <th className="px-4 py-4">Amount</th>
                        <th className="px-4 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/35">
                      {transactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-t border-[#E6DDE8]"
                        >
                          <td className="px-4 py-5 font-semibold">
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-lg text-white ${
                                  transaction.positive
                                    ? "bg-emerald-500"
                                    : "bg-red-400"
                                }`}
                              >
                                {transaction.positive ? "+" : "−"}
                              </span>
                              {transaction.type}
                            </div>
                          </td>
                          <td className="px-4 py-5 text-[#53649C]">
                            {transaction.description}
                          </td>
                          <td className="px-4 py-5 text-[#53649C]">
                            {transaction.date}
                          </td>
                          <td
                            className={`px-4 py-5 font-extrabold ${
                              transaction.positive
                                ? "text-emerald-600"
                                : "text-red-500"
                            }`}
                          >
                            {transaction.amount}
                          </td>
                          <td className="px-4 py-5">
                            <span className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-600">
                              Completed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : activePage === "Billing" ? (
            <section className="space-y-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-[#53649C]">
                  Meter services
                </p>
                <h3 className="mt-1 text-3xl font-extrabold">Billing &amp; Usage</h3>
                <p className="mt-2 text-sm text-[#53649C]">
                  Calculate your electricity bill and review recent charges.
                </p>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <section className="rounded-2xl border border-white/70 bg-white/60 p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="text-xl font-extrabold">Pay Meter Bill</h4>
                      <p className="mt-1 text-sm text-[#53649C]">
                        Enter the units used for this meter.
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#EDE4EF] px-4 py-3 text-right">
                      <p className="text-xs font-semibold text-[#53649C]">Rate per unit</p>
                      <p className="font-extrabold">৳5.50</p>
                    </div>
                  </div>

                  <label htmlFor="billing-meter-number" className="mb-2 mt-6 block text-sm font-bold">Electricity meter</label>
                  <select
                    id="billing-meter-number"
                    value={selectedBillMeterNumber}
                    onChange={(event) => setBillMeterNumber(event.target.value)}
                    disabled={!savedElectricityMeters.length}
                    className="w-full rounded-xl border border-[#D6C9D8] bg-white px-4 py-3 outline-none focus:border-[#213F95] disabled:bg-gray-100"
                  >
                    <option value="">{savedElectricityMeters.length ? "Select a saved meter" : "No saved electricity meters"}</option>
                    {savedElectricityMeters.map((meter) => (
                      <option key={meter.meter_number} value={meter.meter_number}>
                        Meter Number: {meter.meter_number} — Balance ৳{meter.balance.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-[#53649C]">
                    {selectedElectricityMeter
                      ? `This meter has ৳${selectedElectricityMeter.balance.toFixed(2)} available and ৳${selectedElectricityMeter.loan.toFixed(2)} outstanding loan.`
                      : "Save an electricity meter with a recharge or loan before paying its bill."}
                  </p>
                  <label htmlFor="billing-units" className="mb-2 mt-6 block text-sm font-bold">
                    Units consumed
                  </label>
                  <input
                    id="billing-units"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Enter units consumed"
                    value={billUnits}
                    onChange={(event) => setBillUnits(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleProcessBill();
                    }}
                    className="w-full rounded-xl border border-[#D6C9D8] bg-white px-4 py-3 outline-none focus:border-[#213F95]"
                  />

                  <div className="mt-5 flex items-center justify-between rounded-xl bg-[#F6E3E5] p-4">
                    <div>
                      <p className="text-sm font-semibold text-[#53649C]">Estimated total</p>
                      <p className="text-xs text-[#53649C]">Units × ৳5.50</p>
                    </div>
                    <p className="text-2xl font-extrabold">
                      ৳{((Number(billUnits) || 0) * 5.5).toFixed(2)}
                    </p>
                  </div>

                  {billMessage && (
                    <p
                      className={`mt-4 whitespace-pre-line rounded-xl px-4 py-3 text-sm font-semibold ${
                        /valid|failed|required|error/i.test(billMessage)
                          ? "bg-red-50 text-red-600"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {billMessage}
                    </p>
                  )}

                  <button
                    onClick={handleProcessBill}
                    disabled={processingBill || !selectedBillMeterNumber}
                    className="mt-5 w-full rounded-xl bg-[#213F95] px-4 py-3 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {processingBill ? "Processing bill..." : "Pay bill"}
                  </button>
                </section>

                <aside className="space-y-4">
                  <section className="rounded-2xl bg-[#213F95] p-6 text-white shadow-sm">
                    <p className="text-sm text-blue-100">Current account</p>
                    <h4 className="mt-1 text-xl font-extrabold">
                      {customer?.name || "Loading..."}
                    </h4>
                    <p className="mt-1 text-sm text-blue-100">
                      Customer ID: {customer?.customer_id || "Loading..."}
                    </p>
                    <div className="mt-6 border-t border-white/25 pt-5">
                      <p className="text-sm text-blue-100">Available balance</p>
                      <p className="mt-1 text-3xl font-extrabold">
                        {customer ? `৳${customer.balance.toFixed(2)}` : "Loading..."}
                      </p>
                    </div>
                    <div className="mt-4 border-t border-white/25 pt-4">
                      <p className="text-sm text-blue-100">Outstanding loan</p>
                      <p className="mt-1 text-xl font-bold">
                        {customer ? `৳${customer.loan.toFixed(2)}` : "Loading..."}
                      </p>
                    </div>
                  </section>
                  {transactionError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                      Bill history unavailable: {transactionError}
                    </div>
                  )}
                </aside>
              </div>

              <section className="rounded-2xl border border-white/70 bg-white/60 p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xl font-extrabold">Recent Bills</h4>
                    <p className="mt-1 text-sm text-[#53649C]">
                      Electricity bill activity for this customer account.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#EDE4EF] px-3 py-2 text-sm font-bold">
                    {transactions.filter((item) => item.type === "Electricity Bill").length} bills
                  </span>
                </div>

                {transactions.filter((item) => item.type === "Electricity Bill").length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#D6C9D8] p-8 text-center">
                    <p className="font-bold">No bills recorded yet</p>
                    <p className="mt-1 text-sm text-[#53649C]">
                      Your completed bill payments will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[#E6DDE8]">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead>
                        <tr className="bg-[#EDE4EF]">
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Details</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions
                          .filter((item) => item.type === "Electricity Bill")
                          .slice(0, 5)
                          .map((bill) => (
                            <tr key={bill.id} className="border-t border-[#E6DDE8]">
                              <td className="px-4 py-4 text-[#53649C]">{bill.date}</td>
                              <td className="px-4 py-4">{bill.description}</td>
                              <td className="px-4 py-4 font-extrabold text-red-500">
                                {bill.amount}
                              </td>
                              <td className="px-4 py-4">
                                <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                  Completed
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </section>
          ) : activePage === "Settings" ? (
            <section className="space-y-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-[#53649C]">
                  Preferences
                </p>
                <h3 className="mt-1 text-3xl font-extrabold">Account Settings</h3>
                <p className="mt-2 text-sm text-[#53649C]">
                  Review your account details and the meters you have saved.
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-white/70 bg-white/60 p-6 shadow-sm">
                  <h4 className="text-xl font-extrabold">Customer Profile</h4>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-xl bg-[#EDE4EF] p-4">
                      <p className="text-sm font-semibold text-[#53649C]">Name</p>
                      <p className="mt-1 font-bold">{customer?.name || "Loading..."}</p>
                    </div>
                    <div className="rounded-xl bg-[#EDE4EF] p-4">
                      <p className="text-sm font-semibold text-[#53649C]">Customer ID</p>
                      <p className="mt-1 font-bold">{customer?.customer_id || "Loading..."}</p>
                    </div>
                    <div className="rounded-xl bg-[#EDE4EF] p-4">
                      <p className="text-sm font-semibold text-[#53649C]">Saved Utility Meters</p>
                      <p className="mt-1 font-bold">{customer ? customer.meter_count : "Loading..."}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/70 bg-white/60 p-6 shadow-sm">
                  <h4 className="text-xl font-extrabold">Meter Details</h4>
                  <p className="mt-2 text-sm text-[#53649C]">
                    Meter numbers are saved to this account when you complete a recharge or loan.
                  </p>
                  <div className="mt-5 space-y-3">
                    {customer?.registered_meters?.length ? customer.registered_meters.map((meter) => (
                      <div key={`${meter.category}-${meter.meter_number}`} className="rounded-xl bg-[#EDE4EF] p-4">
                        <p className="font-bold text-[#213F95]">{meter.category.charAt(0).toUpperCase() + meter.category.slice(1)} meter</p>
                        <p className="mt-1 text-sm text-[#53649C]">Meter number: {meter.meter_number}</p>
                      </div>
                    )) : <p className="rounded-xl bg-[#EDE4EF] p-4 text-sm text-[#53649C]">No meters saved yet. Enter one during recharge or loan.</p>}
                  </div>
                  <div className="mt-8 border-t border-[#D6C9D8] pt-6">
                    <h4 className="font-extrabold">Session</h4>
                    <p className="mt-1 text-sm text-[#53649C]">
                      Sign out of this customer account on this device.
                    </p>
                    <button
                      onClick={handleLogout}
                      className="mt-4 rounded-xl border border-red-200 px-4 py-3 font-bold text-red-600 transition hover:bg-red-50"
                    >
                      Log out
                    </button>
                  </div>
                </section>
              </div>
            </section>
          ) : (
            <>
              {/* Main Grid */}
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_290px]">
                <div className="min-w-0">
                  {/* Statistics */}
                  <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {stats.map((stat) => (
                      <div
                        key={stat.title}
                        role="button"
                        tabIndex={0}
                        aria-label={stat.value === "meters" ? "View saved utility meters" : `View ${stat.title.toLowerCase()} breakdown`}
                        onClick={() => {
                          if (stat.value === "meters") setActivePage("Settings");
                          else setBreakdownType(stat.value);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            if (stat.value === "meters") setActivePage("Settings");
                            else setBreakdownType(stat.value);
                          }
                        }}
                        className="cursor-pointer rounded-2xl border border-white/70 bg-white/55 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#213F95]"
                      >
                        <div className="mb-5 flex items-center justify-between">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEDBE5] text-2xl font-bold">
                            {stat.icon}
                          </div>

                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEDBE5] font-bold">
                            ›
                          </span>
                        </div>

                        <p className="text-sm font-semibold">{stat.title}</p>

                        <h3 className="mt-2 text-3xl font-extrabold">
                          {stat.value === "balance"
                            ? customer
                              ? `৳${customer.balance.toFixed(2)}`
                              : "Loading..."
                            : stat.value === "meters"
                              ? customer ? customer.meter_count : "Loading..."
                              : customer
                                ? `৳${customer.loan.toFixed(2)}`
                                : "Loading..."}
                        </h3>

                        <p className="mt-2 text-sm text-[#53649C]">
                          {stat.description}
                        </p>
                      </div>
                    ))}
                  </section>

                  {/* Quick Actions */}
                  <section className="mt-8">
                    <h3 className="mb-4 text-2xl font-extrabold">
                      Quick Actions
                    </h3>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {actions.map((action) => (
                        <button
                          key={action.title}
                          onClick={() => {
                            if (action.title === "Recharge Meter") {
                              setShowRecharge(true);
                              setRechargeMessage("");
                            } else if (action.title === "Take Loan On Meter") {
                              setShowLoan(true);
                              setLoanMessage("");
                            } else if (action.title === "Pay Meter Bill") {
                              setShowBill(true);
                              setBillMessage("");
                            } else if (action.title === "View Transactions") {
                              setActivePage("Transactions");
                            } else {
                              alert(`${action.title} will be connected later.`);
                            }
                          }}
                          className="group rounded-2xl p-5 text-left text-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl"
                          style={{ backgroundColor: COLORS.blue }}
                        >
                          <div className="relative h-12">
                            <span className="absolute left-0 top-0 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F6E3E5] text-3xl font-bold leading-none text-[#213F95]">
                              {action.icon}
                            </span>

                            <span className="absolute right-0 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#F6E3E5] text-lg font-semibold leading-none text-[#213F95]">
                              →
                            </span>
                          </div>

                          <h4 className="mt-5 font-bold">{action.title}</h4>

                          <p className="mt-2 text-sm text-blue-100">
                            {action.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Transactions */}
                  <section className="mt-8 rounded-2xl border border-white/70 bg-white/55 p-5 shadow-sm backdrop-blur md:p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="text-xl font-extrabold">
                        Recent Transactions
                      </h3>

                      <span className="text-sm text-[#53649C]">
                        Live activity
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px] text-left text-sm">
                        <thead>
                          <tr className="bg-[#EDE4EF]">
                            <th className="rounded-l-xl px-3 py-3">Type</th>
                            <th className="px-3 py-3">Description</th>
                            <th className="px-3 py-3">Date</th>
                            <th className="px-3 py-3">Amount</th>
                            <th className="rounded-r-xl px-3 py-3">Status</th>
                          </tr>
                        </thead>

                        <tbody>
                          {transactions.slice(0, 5).map((transaction) => (
                            <tr
                              key={transaction.id}
                              className="border-b border-[#E6DDE8] last:border-0"
                            >
                              <td className="px-3 py-5 font-semibold">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`flex h-8 w-8 items-center justify-center rounded-full text-lg text-white ${
                                      transaction.positive
                                        ? "bg-emerald-500"
                                        : "bg-red-400"
                                    }`}
                                  >
                                    {transaction.positive ? "+" : "−"}
                                  </span>

                                  {transaction.type}
                                </div>
                              </td>

                              <td className="px-3 py-5 text-[#53649C]">
                                {transaction.description}
                              </td>

                              <td className="px-3 py-5 text-[#53649C]">
                                {transaction.date}
                              </td>

                              <td
                                className={`px-3 py-5 font-extrabold ${
                                  transaction.positive
                                    ? "text-emerald-600"
                                    : "text-red-500"
                                }`}
                              >
                                {transaction.amount}
                              </td>

                              <td className="px-3 py-5">
                                <span className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-600">
                                  Completed
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>

                {/* Right Panel */}
                <aside className="space-y-6">
                  {/* Account Card */}
                  <section className="overflow-hidden rounded-2xl shadow-sm">
                    <div className="bg-white/60 p-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#213F95] text-3xl text-white">
                          ◉
                        </div>

                        <div>
                          <h3 className="font-extrabold">
                            {customer?.name || "Customer"}
                          </h3>
                          <p className="text-sm text-[#53649C]">
                            Customer ID: {customer?.customer_id || "Loading..."}
                          </p>

                          <p className="mt-1 text-sm text-emerald-600">
                            ● Active
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-xl bg-[#EDE4EF] p-4">
                        <p className="text-sm font-semibold text-[#53649C]">Saved utility meters</p>
                        <p className="mt-1 font-bold">{customer ? customer.meter_count : "Loading..."}</p>
                      </div>
                    </div>

                    <div
                      className="space-y-5 p-6 text-white"
                      style={{ backgroundColor: COLORS.blue }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-100">
                            Current Balance
                          </p>
                          <p className="mt-1 text-xl font-bold">
                            {customer
                              ? `৳${customer.balance.toFixed(2)}`
                              : "Loading..."}
                          </p>
                        </div>

                        <span className="text-2xl">▣</span>
                      </div>

                      <div className="border-t border-white/25 pt-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-100">Total Loan</p>
                            <p className="mt-1 text-xl font-bold">
                              {customer
                                ? `৳${customer.loan.toFixed(2)}`
                                : "Loading..."}
                            </p>
                          </div>

                          <span className="text-2xl">ϟ</span>
                        </div>
                      </div>

                    </div>
                  </section>

                </aside>
              </div>
            </>
          )}

          {breakdownType && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onMouseDown={(event) => { if (event.target === event.currentTarget) setBreakdownType(""); }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="meter-breakdown-title"
                className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id="meter-breakdown-title" className="text-2xl font-extrabold text-[#213F95]">
                      {breakdownType === "balance" ? "Total Meter Balance" : "Total Meter Loan"}
                    </h2>
                    <p className="mt-1 text-sm text-[#53649C]">Breakdown by utility category and meter</p>
                  </div>
                  <button type="button" onClick={() => setBreakdownType("")} aria-label="Close breakdown" className="rounded-full px-3 py-1 text-2xl leading-none text-[#53649C] hover:bg-[#F6E3E5]">×</button>
                </div>

                <div className="mt-5 space-y-4">
                  {["electricity", "water", "gas"].map((category) => {
                    const meters = (customer?.registered_meters || []).filter((meter) => meter.category === category);
                    if (!meters.length) return null;
                    const amountKey = breakdownType === "balance" ? "balance" : "loan";
                    return (
                      <div key={category} className="rounded-xl bg-[#F6E3E5] p-4">
                        <div className="mb-3">
                          <h3 className="font-extrabold capitalize text-[#213F95]">{category}</h3>
                        </div>
                        <div className="space-y-2">
                          {meters.map((meter) => (
                            <div key={`${meter.category}-${meter.meter_number}`} className="flex items-center justify-between gap-3 border-t border-[#D6C9D8] pt-3">
                              <span className="text-base font-semibold text-[#213F95]">Meter Number: {meter.meter_number}</span>
                              <span className="text-lg font-extrabold text-[#213F95]">৳{Number(meter[amountKey] || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {!customer?.registered_meters?.length && (
                    <p className="rounded-xl bg-[#F6E3E5] p-4 text-sm text-[#53649C]">No saved meters yet. Your meter breakdown will appear after a recharge or loan.</p>
                  )}
                </div>

                <button type="button" onClick={() => setBreakdownType("")} className="mt-5 w-full rounded-xl bg-[#213F95] px-4 py-3 font-bold text-white hover:opacity-90">Done</button>
              </section>
            </div>
          )}

          {showRecharge && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <h2 className="text-2xl font-extrabold text-[#213F95]">
                  Recharge Meter
                </h2>

                <p className="mt-2 text-sm text-[#53649C]">
                  Enter the amount you want to add to your meter.
                </p>

                <label className="mt-5 block text-sm font-bold text-[#213F95]" htmlFor="recharge-category">Utility category</label>
                <select
                  id="recharge-category"
                  value={rechargeCategory}
                  onChange={(event) => { setRechargeCategory(event.target.value); setRechargeMeterNumber(""); }}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#213F95]"
                >
                  <option value="electricity">Electricity</option>
                  <option value="water">Water</option>
                  <option value="gas">Gas</option>
                </select>
                <label className="mt-4 block text-sm font-bold text-[#213F95]" htmlFor="recharge-meter-number">Meter number</label>
                <div className="relative mt-2">
                  <input
                    id="recharge-meter-number"
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter or choose a saved meter"
                    value={rechargeMeterNumber}
                    onFocus={() => setShowRechargeMeterSuggestions(true)}
                    onBlur={() => window.setTimeout(() => setShowRechargeMeterSuggestions(false), 120)}
                    onChange={(event) => {
                      setRechargeMeterNumber(event.target.value.replace(/\D/g, "").slice(0, 32));
                      setShowRechargeMeterSuggestions(true);
                    }}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#213F95]"
                    autoComplete="off"
                  />
                  {showRechargeMeterSuggestions && savedRechargeMeters.some((meter) => !rechargeMeterNumber || meter.includes(rechargeMeterNumber)) && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-[#D6C9D8] bg-white shadow-lg">
                      <p className="px-4 py-2 text-xs font-semibold text-[#53649C]">Saved meters</p>
                      {savedRechargeMeters.filter((meter) => !rechargeMeterNumber || meter.includes(rechargeMeterNumber)).map((meter) => (
                        <button key={meter} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setRechargeMeterNumber(meter); setShowRechargeMeterSuggestions(false); }} className="block w-full px-4 py-3 text-left font-semibold text-[#213F95] hover:bg-[#F6E3E5] focus:bg-[#F6E3E5] focus:outline-none">{meter}</button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-[#53649C]">
                  {savedRechargeMeters.length ? "Choose a meter you used before or enter a new one." : "Your meter will be saved to your account after this transaction."}
                </p>
                <label className="mt-4 block text-sm font-bold text-[#213F95]" htmlFor="recharge-email">Payment email</label>
                <input
                  id="recharge-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={rechargeEmail}
                  onChange={(event) => setRechargeEmail(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#213F95]"
                />
                <label className="mt-4 block text-sm font-bold text-[#213F95]" htmlFor="recharge-amount">Recharge amount</label>
                <input
                  id="recharge-amount"
                  type="number"
                  min="10"
                  step="0.01"
                  placeholder="Enter amount"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleRecharge();
                    }
                  }}
                  className="mt-5 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#213F95]"
                  autoFocus
                />

                {rechargeMessage && (
                  <p
                    className={`mt-3 text-sm font-semibold ${
                      rechargeMessage.toLowerCase().includes("successful")
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}
                  >
                    {rechargeMessage}
                  </p>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      setShowRecharge(false);
                      setRechargeAmount("");
                      setRechargeMessage("");
                    }}
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-bold text-gray-700 transition hover:bg-gray-100"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleRecharge}
                    disabled={recharging}
                    className="flex-1 rounded-xl bg-[#213F95] px-4 py-3 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {recharging ? "Connecting..." : "Continue to payment"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showBill && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <h2 className="text-2xl font-extrabold text-[#213F95]">
                  Pay Meter Bill
                </h2>

                <p className="mt-2 text-sm text-[#53649C]">
                  Enter the units consumed. Your bill is calculated at ৳5.50 per unit.
                </p>

                <label htmlFor="quick-bill-meter-number" className="mt-5 block text-sm font-bold text-[#213F95]">Electricity meter</label>
                <select
                  id="quick-bill-meter-number"
                  value={selectedBillMeterNumber}
                  onChange={(event) => setBillMeterNumber(event.target.value)}
                  disabled={!savedElectricityMeters.length}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#213F95] disabled:bg-gray-100"
                >
                  <option value="">{savedElectricityMeters.length ? "Select a saved meter" : "No saved electricity meters"}</option>
                  {savedElectricityMeters.map((meter) => (
                    <option key={meter.meter_number} value={meter.meter_number}>
                      Meter Number: {meter.meter_number} — Balance ৳{meter.balance.toFixed(2)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[#53649C]">
                  {selectedElectricityMeter
                    ? `Available balance: ৳${selectedElectricityMeter.balance.toFixed(2)}`
                    : "Save an electricity meter with a recharge or loan before paying its bill."}
                </p>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Enter units consumed"
                  value={billUnits}
                  onChange={(e) => setBillUnits(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleProcessBill();
                    }
                  }}
                  className="mt-5 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#213F95]"
                  autoFocus
                />

                {billUnits && Number(billUnits) > 0 && (
                  <div className="mt-4 rounded-xl bg-[#F6E3E5] px-4 py-3">
                    <p className="text-sm font-semibold text-[#53649C]">
                      Estimated Bill
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-[#213F95]">
                      ৳{(Number(billUnits) * 5.5).toFixed(2)}
                    </p>
                  </div>
                )}

                {billMessage && (
                  <p
                    className={`mt-3 whitespace-pre-line text-sm font-semibold ${
                      billMessage.toLowerCase().includes("bill paid") ||
                      billMessage.toLowerCase().includes("successful")
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}
                  >
                    {billMessage}
                  </p>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      setShowBill(false);
                      setBillUnits("");
                      setBillMessage("");
                    }}
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-bold text-gray-700 transition hover:bg-gray-100"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleProcessBill}
                    disabled={processingBill || !selectedBillMeterNumber}
                    className="flex-1 rounded-xl bg-[#213F95] px-4 py-3 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processingBill ? "Processing..." : "Pay Bill"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showLoan && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <h2 className="text-2xl font-extrabold text-[#213F95]">
                  Take Loan
                </h2>

                <p className="mt-2 text-sm text-[#53649C]">
                  The loan amount is credited to your selected meter and added to your outstanding loan.
                </p>

                <label className="mt-5 block text-sm font-bold text-[#213F95]" htmlFor="loan-category">Utility category</label>
                <select
                  id="loan-category"
                  value={loanCategory}
                  onChange={(event) => { setLoanCategory(event.target.value); setLoanMeterNumber(""); }}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#213F95]"
                >
                  <option value="electricity">Electricity</option>
                  <option value="water">Water</option>
                  <option value="gas">Gas</option>
                </select>
                <label className="mt-4 block text-sm font-bold text-[#213F95]" htmlFor="loan-meter-number">Meter number</label>
                <div className="relative mt-2">
                  <input
                    id="loan-meter-number"
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter or choose a saved meter"
                    value={loanMeterNumber}
                    onFocus={() => setShowLoanMeterSuggestions(true)}
                    onBlur={() => window.setTimeout(() => setShowLoanMeterSuggestions(false), 120)}
                    onChange={(event) => {
                      setLoanMeterNumber(event.target.value.replace(/\D/g, "").slice(0, 32));
                      setShowLoanMeterSuggestions(true);
                    }}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#213F95]"
                    autoComplete="off"
                  />
                  {showLoanMeterSuggestions && savedLoanMeters.some((meter) => !loanMeterNumber || meter.includes(loanMeterNumber)) && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-[#D6C9D8] bg-white shadow-lg">
                      <p className="px-4 py-2 text-xs font-semibold text-[#53649C]">Saved meters</p>
                      {savedLoanMeters.filter((meter) => !loanMeterNumber || meter.includes(loanMeterNumber)).map((meter) => (
                        <button key={meter} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setLoanMeterNumber(meter); setShowLoanMeterSuggestions(false); }} className="block w-full px-4 py-3 text-left font-semibold text-[#213F95] hover:bg-[#F6E3E5] focus:bg-[#F6E3E5] focus:outline-none">{meter}</button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-[#53649C]">
                  {savedLoanMeters.length ? "Choose a meter you used before or enter a new one." : "Your meter will be saved to your account after this transaction."}
                </p>
                <label className="mt-4 block text-sm font-bold text-[#213F95]" htmlFor="loan-amount">Loan amount</label>
                <input
                  id="loan-amount"
                  type="number"
                  min="10"
                  step="0.01"
                  placeholder="Enter loan amount"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleTakeLoan();
                    }
                  }}
                  className="mt-5 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#213F95]"
                  autoFocus
                />

                {loanMessage && (
                  <p
                    className={`mt-3 text-sm font-semibold ${
                      loanMessage.toLowerCase().includes("successful")
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}
                  >
                    {loanMessage}
                  </p>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      setShowLoan(false);
                      setLoanAmount("");
                      setLoanMessage("");
                    }}
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-bold text-gray-700 transition hover:bg-gray-100"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleTakeLoan}
                    disabled={takingLoan}
                    className="flex-1 rounded-xl bg-[#213F95] px-4 py-3 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {takingLoan ? "Processing..." : "Take Loan"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      )}
    </div>
  );
}

export default App;
