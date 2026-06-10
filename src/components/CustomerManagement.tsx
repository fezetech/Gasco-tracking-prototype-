import { useState, FormEvent } from 'react';
import { useStore } from '../services/store';
import { useGoogleWorkspace } from '../services/googleWorkspace';
import { Customer } from '../types';
import { 
  UserPlus, 
  Wallet, 
  Milestone, 
  ShieldCheck, 
  TrendingUp, 
  HandCoins, 
  Building2, 
  Search, 
  Zap, 
  CheckCircle2, 
  XCircle,
  FileSpreadsheet,
  ExternalLink,
  Loader2
} from 'lucide-react';

export default function CustomerManagement() {
  const { customers, addCustomer, depositToCustomerWallet, formatCurrency } = useStore();
  const { googleAccessToken, exportCustomersToSheets, exporting: googleExporting } = useGoogleWorkspace();

  const [syncedUrl, setSyncedUrl] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>('');

  const handleExportCRM = async () => {
    if (!googleAccessToken) {
      setSyncStatus('Google Workspace not connected. Please connect your Google account in the Insights Dashboard first.');
      return;
    }
    setSyncStatus('');
    setSyncedUrl(null);
    try {
      const url = await exportCustomersToSheets(customers);
      setSyncedUrl(url);
      setSyncStatus('Loyalty CRM exported successfully to Google Sheets!');
    } catch (err: any) {
      setSyncStatus(err?.message || 'Error occurred during CRM backup');
    }
  };

  // New Customer states
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [creditLimit, setCreditLimit] = useState('500000'); // Default UGX style limit (approx ~15,000 KES base)
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Deposit states
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState<'cash' | 'mobile_money' | 'bank_transfer'>('cash');
  const [depositSuccess, setDepositSuccess] = useState('');
  const [depositError, setDepositError] = useState('');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');

  // Submit new customer
  const handleCreateCustomer = (e: FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Customer name is required.');
      return;
    }

    const limitVal = parseFloat(creditLimit);
    if (isNaN(limitVal) || limitVal < 0) {
      setErrorMsg('Please enter a valid Credit Limit.');
      return;
    }

    const newCust: Partial<Customer> = {
      name: name.trim(),
      phone: phoneNumber.trim(),
      email: email.trim() || undefined,
      companyName: companyName.trim() || undefined,
      depositBalance: 0,
      creditLimit: limitVal,
      creditBalance: 0,
      bonusPoints: 0,
      tier: limitVal > 40000 ? 'VIP' : limitVal > 20000 ? 'Gold' : limitVal > 5000 ? 'Silver' : 'Bronze',
    };

    const res = addCustomer(newCust);
    if (res.success) {
      setSuccessMsg('Loyalty account opened successfully!');
      setName('');
      setPhoneNumber('');
      setEmail('');
      setCompanyName('');
      setCreditLimit('500000');
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.message);
    }
  };

  // Submit Deposit
  const handleDepositSubmit = (e: FormEvent) => {
    e.preventDefault();
    setDepositSuccess('');
    setDepositError('');

    if (!selectedCustomerId) {
      setDepositError('Please select a customer loyalty account.');
      return;
    }

    const depAmt = parseFloat(depositAmount);
    if (isNaN(depAmt) || depAmt <= 0) {
      setDepositError('Please provide a valid deposit sum.');
      return;
    }

    const res = depositToCustomerWallet(selectedCustomerId, depAmt);
    if (res.success) {
      setDepositSuccess(`Top-up complete! Prepaid Card Wallet refreshed in real-time.`);
      setDepositAmount('');
      setTimeout(() => setDepositSuccess(''), 4000);
    } else {
      setDepositError(res.message);
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter((c) => {
    const matchSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm) || 
      (c.companyName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchTier = selectedTier === 'all' || c.tier === selectedTier;
    return matchSearch && matchTier;
  });

  // Calculate dynamic credit risk & bonus eligibility
  const analyzeEligibility = (c: Customer) => {
    // Score based on rewards points & debt history
    const isOverdueRisk = c.creditBalance > c.creditLimit * 0.85;
    const isEligibleForBonus = c.bonusPoints >= 100;

    let decision = 'Standard Access';
    let color = 'text-slate-400';
    let score = 'Good';

    if (c.tier === 'VIP' || c.tier === 'Gold') {
      if (isOverdueRisk) {
        decision = 'Suspend Credit Line (Limit Exceeded)';
        color = 'text-rose-400';
        score = 'High Risk';
      } else {
        decision = 'Pre-Approved for 2,000,000 UGX Extension';
        color = 'text-emerald-400';
        score = 'Excellent';
      }
    } else if (c.tier === 'Silver') {
      decision = 'Temporary Fuel-only Line Permitted';
      color = 'text-blue-400';
      score = 'Moderate';
    } else {
      decision = 'Prepaid Only (Earn Points to Unlock Credit)';
      color = 'text-amber-400 font-medium';
      score = 'Standard Cash';
    }

    return { decision, color, score, isEligibleForBonus };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Account Opening + Deposit Form Panel */}
      <div className="lg:col-span-12 xl:col-span-5 space-y-6">
        
        {/* Account Opening Form */}
        <div className="bg-[#16191E] border border-slate-800 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-bold text-white text-base">Register Prepaid Client</h2>
              <p className="text-xs text-slate-500">Gasco Energy Ltd, Soroti Loyalty Portal</p>
            </div>
          </div>

          <form onSubmit={handleCreateCustomer} className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
                Account Holder Name <span className="text-rose-450 font-bold">*</span>
              </label>
              <input
                type="text"
                placeholder="E.g. Soroti Transport Sacco, John Okello"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs bg-[#111418] border border-slate-800 focus:border-emerald-500 focus:outline-none text-white rounded-lg p-2"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="+256 700 000000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full text-xs bg-[#111418] border border-slate-800 focus:border-emerald-500 focus:outline-none text-white rounded-lg p-2"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
                  Company / Affiliation
                </label>
                <div className="relative">
                  <Building2 className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-600" />
                  <input
                    type="text"
                    placeholder="E.g. Gasco Fleet"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full text-xs bg-[#111418] border border-[#1e293b] focus:border-emerald-500 focus:outline-none text-white rounded-lg p-2 pl-8"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="client@soroti-gasco.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs bg-[#111418] border border-slate-800 focus:border-emerald-500 focus:outline-none text-white rounded-lg p-2"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
                Approved Credit Limit (KES Base Equivalent)
              </label>
              <input
                type="number"
                placeholder="E.g. 50000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full text-xs bg-[#111418] border border-slate-800 focus:border-emerald-500 focus:outline-none text-white rounded-lg p-2 font-mono"
              />
              <p className="text-[9px] text-slate-500 mt-1">
                Customers with KES &gt; 20,000 credit headroom qualify as VIP and are pre-approved for active billing terms.
              </p>
            </div>

            {errorMsg && <p className="text-xs text-rose-450 font-medium">{errorMsg}</p>}
            {successMsg && <p className="text-xs text-emerald-400 font-medium">{successMsg}</p>}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-lg py-2.5 transition active:scale-[98%] cursor-pointer shadow-md mt-2 border border-emerald-700/50"
            >
              Issue Digital Account Card
            </button>
          </form>
        </div>

        {/* Account Deposit and Card Loading */}
        <div className="bg-[#16191E] border border-slate-805 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
            <Wallet className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="font-bold text-white text-base">Prepaid Wallet Top-up</h2>
              <p className="text-xs text-slate-500">Load customer digital deposit ledger instantly</p>
            </div>
          </div>

          <form onSubmit={handleDepositSubmit} className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-slate-505 text-slate-500 block mb-1">
                Select Loyalty Account
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-[#111418] border border-slate-800 p-2 text-xs text-white rounded-lg focus:border-teal-500 focus:outline-none"
              >
                <option value="">-- Choose Account --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - Bal: {formatCurrency(c.depositBalance)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
                  Payment Source
                </label>
                <select
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value as any)}
                  className="w-full bg-[#111418] border border-slate-800 p-2 text-xs text-white rounded-lg focus:border-teal-500 focus:outline-none"
                >
                  <option value="cash">Cash Tendered</option>
                  <option value="mobile_money">Mobile Money Pegged</option>
                  <option value="bank_transfer">Bank Wire Transfer</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
                  Deposit Amount (Local Currency)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full text-xs font-mono bg-[#111418] border border-slate-800 focus:border-teal-500 focus:outline-none text-white rounded-lg p-2"
                />
              </div>
            </div>

            {depositError && <p className="text-xs text-rose-455 text-rose-450 font-medium">{depositError}</p>}
            {depositSuccess && <p className="text-xs text-teal-400 font-medium">{depositSuccess}</p>}

            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-black text-xs uppercase rounded-lg py-2.5 transition active:scale-[98%] cursor-pointer shadow-md mt-2 border border-teal-700/50"
            >
              Verify & Complete Deposit
            </button>
          </form>
        </div>

      </div>

      {/* Customer Registry list & Eligibility Analysis Panel */}
      <div className="lg:col-span-12 xl:col-span-7 bg-[#16191E] border border-slate-805 rounded-2xl shadow-sm p-5 h-full space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 id="crm-header" className="font-bold text-white text-base">Prepaid & Loyalty Directory</h2>
            <p className="text-xs text-slate-500 mt-0.5">Automated scoring models for Soroti Client Base</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
            <button
              id="btn-crm-export"
              onClick={handleExportCRM}
              disabled={googleExporting}
              className="flex items-center gap-1.5 bg-emerald-600/10 hover:bg-emerald-600/25 disabled:bg-slate-800/45 text-emerald-400 disabled:text-slate-550 border border-emerald-500/20 hover:border-emerald-500/45 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer select-none transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{googleExporting ? 'Exporting...' : 'Export to Sheets'}</span>
            </button>

            <span className="text-xs font-mono bg-teal-500/10 text-teal-400 py-1.5 px-2.5 rounded-lg border border-teal-500/20 font-bold">
              {filteredCustomers.length} Active Accounts
            </span>
          </div>
        </div>

        {syncStatus && (
          <div className={`p-2.5 rounded-lg text-xs font-medium border ${syncedUrl ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'} flex items-center justify-between gap-2`}>
            <span>{syncStatus}</span>
            {syncedUrl && (
              <a
                href={syncedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-emerald-400 font-extrabold hover:underline underline-offset-2 uppercase text-[10px]"
              >
                <span>Open Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Simple Filter Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="sm:col-span-7 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, phone, company affiliation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-[#111418] border border-slate-800 focus:border-teal-500 focus:outline-none text-white rounded-lg pl-8 p-2 placeholder:text-slate-600"
            />
          </div>
          <div className="sm:col-span-5">
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full text-slate-300 text-xs bg-[#111418] border border-slate-800 rounded-lg p-2 focus:border-teal-500 focus:outline-none"
            >
              <option value="all">Display All Membership Levels</option>
              <option value="VIP">Premium VIP Status</option>
              <option value="Gold">Gold Partner Tier</option>
              <option value="Silver">Silver Standard Tier</option>
              <option value="Bronze">Bronze Standard Tier</option>
            </select>
          </div>
        </div>

        {/* Customer Directory List */}
        <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xs text-slate-500">No registered accounts matching the criteria.</p>
            </div>
          ) : (
            filteredCustomers.map((cust) => {
              const { decision, color, score, isEligibleForBonus } = analyzeEligibility(cust);
              return (
                <div
                  key={cust.id}
                  className="bg-[#111418]/45 border border-slate-850 hover:border-slate-800 rounded-xl p-4 space-y-3.5 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-2">
                    <div>
                      <h3 className="text-xs font-black text-white flex items-center gap-1.5 flex-wrap">
                        {cust.name}
                        {cust.companyName && (
                          <span className="text-[10px] bg-slate-850 text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            {cust.companyName}
                          </span>
                        )}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{cust.phone || 'No registered contact phone'}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-amber-500/10 text-yellow-500 px-2 py-0.5 rounded-md border border-yellow-500/20 font-bold font-mono">
                        {cust.bonusPoints} PTS
                      </span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-md border border-emerald-500/20 font-black tracking-wide font-mono">
                        {cust.tier} Member
                      </span>
                    </div>
                  </div>

                  {/* Ledger Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                    <div className="bg-[#0A0B0D] p-2 rounded-lg border border-slate-800/65">
                      <span className="text-[8px] text-slate-505 text-slate-500 block uppercase font-bold">Unused Deposits</span>
                      <span className="font-bold text-emerald-400 text-sm">{formatCurrency(cust.depositBalance)}</span>
                    </div>
                    <div className="bg-[#0A0B0D] p-2 rounded-lg border border-slate-800/65">
                      <span className="text-[8px] text-slate-500 block uppercase font-bold">Outstanding Credit</span>
                      <span className="font-bold text-rose-450 text-sm">{formatCurrency(cust.creditBalance)}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-1 bg-[#0A0B0D] p-2 rounded-lg border border-slate-800/65">
                      <span className="text-[8px] text-slate-500 block uppercase font-bold">Total Approved Credit</span>
                      <span className="font-bold text-slate-100 text-sm">{formatCurrency(cust.creditLimit)}</span>
                    </div>
                  </div>

                  {/* Realtime Scoring Engine */}
                  <div className="bg-[#0A0B0D]/50 border border-slate-850 p-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5 animate-bounce" />
                      <div className="text-[10px]">
                        <p className="text-slate-500 font-bold uppercase tracking-wider">Credit Scoring Decision</p>
                        <p className={`font-semibold ${color} mt-0.5`}>{decision}</p>
                      </div>
                    </div>

                    <div className="text-[10px] text-right font-mono sm:self-center">
                      <span className="text-slate-500">Risk Assessment: </span>
                      <span className={`font-bold uppercase ${score === 'Excellent' ? 'text-emerald-400' : score === 'High Risk' ? 'text-rose-450' : 'text-slate-300'}`}>
                        {score}
                      </span>
                    </div>
                  </div>

                  {/* Loyalty Incentives Tracker */}
                  {isEligibleForBonus ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 flex items-center gap-2 text-[10px] text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span><strong>Loyalty Rewards Bonus Approved!</strong> Fully eligible for the Soroti customer promotional fuel voucher program.</span>
                    </div>
                  ) : (
                    <div className="bg-slate-800/30 border border-slate-800/40 rounded-lg p-2 flex items-center gap-2 text-[10px] text-slate-400">
                      <XCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span>Eligible for promo reward vouchers at <strong>100 Points</strong> limit (Currently {cust.bonusPoints}/100 Points).</span>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
