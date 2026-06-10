import { useState, useEffect, FormEvent } from 'react';
import { useStore } from '../services/store';
import { FuelType, PaymentMethod, TransactionCategory } from '../types';
import { PlusCircle, Search, Filter, Fuel, ShoppingBag, Landmark, ArrowDownLeft, AlertTriangle, User, Wallet, Gift } from 'lucide-react';

export default function TransactionForm() {
  const { 
    tanks, 
    pumps, 
    addTransaction, 
    transactions, 
    activeShift, 
    isOnline, 
    customers, 
    formatCurrency, 
    selectedCurrency 
  } = useStore();

  const [type, setType] = useState<'sale' | 'expense'>('sale');
  const [category, setCategory] = useState<TransactionCategory>('fuel');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [fuelType, setFuelType] = useState<FuelType>('Petrol');
  const [pumpId, setPumpId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Auto-reset payment method if customer deselected and current is prepaid_wallet
  useEffect(() => {
    if (!selectedCustomerId && paymentMethod === 'prepaid_wallet') {
      setPaymentMethod('cash');
    }
  }, [selectedCustomerId, paymentMethod]);

  // Search & filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');

  // Filter pumps based on selected fuelType
  const filteredPumps = pumps.filter((p) => p.fuelType === fuelType);

  // Set default pump if pumps exist
  useEffect(() => {
    if (filteredPumps.length > 0) {
      setPumpId(filteredPumps[0].id);
    } else {
      setPumpId('');
    }
  }, [fuelType]);

  // Handle live conversion of Litres/Amount based on active currency
  const CURRENCY_RATES: Record<string, number> = { KES: 1, UGX: 28.5, USD: 0.0075, EUR: 0.0069 };
  const currentPrice = tanks.find((t) => t.fuelType === fuelType)?.pricePerLitre || 1;
  const priceInSelectedCurrency = currentPrice * (CURRENCY_RATES[selectedCurrency] || 1);

  const handleQuantityChange = (qtyStr: string) => {
    setQuantity(qtyStr);
    const qty = parseFloat(qtyStr);
    if (!isNaN(qty) && qty > 0) {
      setAmount((qty * priceInSelectedCurrency).toFixed(selectedCurrency === 'UGX' ? 0 : 2));
    } else {
      setAmount('');
    }
  };

  const handleAmountChange = (amtStr: string) => {
    setAmount(amtStr);
    const amt = parseFloat(amtStr);
    if (!isNaN(amt) && amt > 0) {
      setQuantity((amt / priceInSelectedCurrency).toFixed(2));
    } else {
      setQuantity('');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!activeShift) {
      setErrorMsg('Cannot log transactions. You must open a shift first!');
      return;
    }

    const amtInSelectedCurrency = parseFloat(amount);
    if (isNaN(amtInSelectedCurrency) || amtInSelectedCurrency <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    // Convert amount from selected currency back to base KES for backend synchronization consistency
    const amtNum = Number((amtInSelectedCurrency / (CURRENCY_RATES[selectedCurrency] || 1)).toFixed(2));

    let qtyNum: number | undefined = undefined;
    if (type === 'sale' && category === 'fuel') {
      qtyNum = parseFloat(quantity);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        setErrorMsg('Please enter a valid quantity of fuel in litres.');
        return;
      }

      // Check remaining tank level to prevent overselling
      const associatedTank = tanks.find((t) => t.fuelType === fuelType);
      if (associatedTank && associatedTank.currentLevel < qtyNum) {
        setErrorMsg(`Insufficient fuel quantity in tank. Only ${associatedTank.currentLevel}L available.`);
        return;
      }
    }

    const matchedCustomer = customers.find(c => c.id === selectedCustomerId);

    const payload = {
      type,
      category,
      paymentMethod,
      amount: amtNum,
      quantity: qtyNum,
      fuelType: category === 'fuel' ? fuelType : undefined,
      pumpId: category === 'fuel' && pumpId ? pumpId : undefined,
      notes: notes.trim() || undefined,
      customerId: matchedCustomer ? matchedCustomer.id : undefined,
      customerName: matchedCustomer ? matchedCustomer.name : undefined,
    };

    const res = addTransaction(payload);
    if (res.success) {
      setSuccessMsg('Transaction registered successfully.');
      setAmount('');
      setQuantity('');
      setNotes('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setErrorMsg(res.message);
    }
  };

  // Pre-filter shifts transactions
  const filteredTransactions = transactions
    .filter((tx) => tx.shiftId === activeShift?.id)
    .filter((tx) => {
      const matchSearch = tx.notes?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          tx.fuelType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tx.attendantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tx.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCategory = filterCategory === 'all' || tx.category === filterCategory;
      const matchPayment = filterPayment === 'all' || tx.paymentMethod === filterPayment;

      return matchSearch && matchCategory && matchPayment;
    });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Transaction Entry Form */}
      <div className="lg:col-span-12 xl:col-span-5 bg-[#16191E] border border-slate-800 rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-800/80 pb-3 justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-450 text-emerald-450 text-emerald-400" />
            <h2 id="log-tx-header" className="font-bold text-white text-base">New Entry Form</h2>
          </div>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono border border-emerald-500/20">
            {activeShift ? `Shift ${activeShift.id.slice(-6)}` : 'No Active Shift'}
          </span>
        </div>

        {!activeShift ? (
          <div className="bg-amber-950/20 rounded-xl p-4 border border-amber-900/40 flex gap-3 text-amber-500">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-pulse" />
            <div className="text-xs">
              <p className="font-bold">Terminal Locked</p>
              <p className="mt-0.5">Please navigate to the <strong>Shift Management</strong> tab to initiate a shift session before logging financial entries.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Entry Category Selector */}
            <div className="grid grid-cols-2 gap-2 bg-[#111418] border border-slate-800/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setType('sale');
                  setCategory('fuel');
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  type === 'sale'
                    ? 'bg-[#16191E] border border-slate-805 text-emerald-400 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Log Sales
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  setCategory('expense');
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-[#16191E] border border-slate-805 text-emerald-450 text-emerald-400 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Log Expenditures
              </button>
            </div>

            {/* Loyalty Customer Selector for Sales */}
            {type === 'sale' && (
              <div className="bg-[#111418]/45 border border-slate-800/80 p-3 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    Link Customer Account
                  </span>
                  {selectedCustomerId && (
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerId('')}
                      className="text-[10px] text-rose-400 hover:underline uppercase font-bold cursor-pointer"
                    >
                      Clear Link
                    </button>
                  )}
                </div>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-[#0A0B0D] border border-slate-800 text-white p-2 rounded-lg text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">-- Anonymous Cash Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.companyName || 'Corporate Owner'}) - Balance: {formatCurrency(c.depositBalance)}
                    </option>
                  ))}
                </select>

                {selectedCustomerId && (() => {
                  const cust = customers.find(c => c.id === selectedCustomerId);
                  if (!cust) return null;
                  return (
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 font-mono">
                      <div className="flex items-center gap-1 bg-[#0A0B0D] p-1.5 rounded border border-slate-800/40">
                        <Wallet className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <div>
                          <p className="text-[8px] text-slate-500 uppercase">Prepaid Wallet</p>
                          <p className="font-bold text-white text-[11px]">{formatCurrency(cust.depositBalance)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-[#0A0B0D] p-1.5 rounded border border-slate-800/40">
                        <Gift className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                        <div>
                          <p className="text-[8px] text-slate-500 uppercase">Rewards Points</p>
                          <p className="font-bold text-yellow-500 text-[11px]">{cust.bonusPoints} PTS</p>
                        </div>
                      </div>
                      <div className="col-span-2 text-center mt-1 text-[9px] text-[#A3E635]">
                        Tier Level: <span className="font-bold text-white px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">{cust.tier} Member</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Sub category selections for sales */}
            {type === 'sale' && (
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1.5">
                  Sale Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'fuel', label: 'Fuel Dispense', icon: Fuel },
                    { id: 'shop', label: 'Convenience Shop', icon: ShoppingBag },
                    { id: 'lubricants', label: 'Lubricant Oil', icon: ArrowDownLeft },
                  ].map((subCat) => {
                    const isSelected = category === subCat.id;
                    return (
                      <button
                        key={subCat.id}
                        type="button"
                        onClick={() => setCategory(subCat.id as TransactionCategory)}
                        className={`flex flex-col items-center p-2 rounded-xl border transition text-center cursor-pointer ${
                          isSelected
                            ? 'bg-[#111418] border-emerald-500 text-emerald-400 shadow-sm font-semibold'
                            : 'bg-[#111418]/45 border-slate-800 text-slate-400 hover:border-slate-705'
                        }`}
                      >
                        <subCat.icon className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-medium leading-tight">{subCat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment Method Selections */}
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1.5">
                {type === 'sale' ? 'Payment Method' : 'Funds Sourced From'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {(type === 'sale' && selectedCustomerId
                  ? [
                      { id: 'cash', label: 'Cash' },
                      { id: 'mobile_money', label: 'Mobile MM' },
                      { id: 'bank_transfer', label: 'Bank' },
                      { id: 'credit', label: 'Credit Account' },
                      { id: 'prepaid_wallet', label: 'Prepaid Wallet' },
                    ]
                  : [
                      { id: 'cash', label: 'Cash' },
                      { id: 'mobile_money', label: 'Mobile Money' },
                      { id: 'bank_transfer', label: 'Bank Transfer' },
                      { id: 'credit', label: 'Credit Account' },
                    ]
                ).map((pm) => {
                  const isSelected = paymentMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id as PaymentMethod)}
                      className={`py-1.5 px-0.5 rounded-lg border transition text-center text-[10px] font-bold cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-semibold'
                          : 'bg-[#111418]/50 border-slate-800 text-slate-400 hover:border-slate-705'
                      }`}
                    >
                      {pm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fuel Details Form Fields */}
            {type === 'sale' && category === 'fuel' && (
              <div className="bg-[#111418]/60 border border-slate-850 p-3.5 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Fuel Type</label>
                    <select
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value as FuelType)}
                      className="w-full bg-[#0A0B0D] border border-slate-800 focus:border-emerald-500 focus:outline-none text-white p-2 rounded-lg text-xs font-medium"
                    >
                      <option value="Petrol" className="bg-[#16191E]">Petrol</option>
                      <option value="Diesel" className="bg-[#16191E]">Diesel</option>
                      <option value="Kerosene" className="bg-[#16191E]">Kerosene</option>
                      <option value="V-Power" className="bg-[#16191E]">V-Power</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Select Pump</label>
                    <select
                      value={pumpId}
                      onChange={(e) => setPumpId(e.target.value)}
                      className="w-full bg-[#0A0B0D] border border-slate-800 focus:border-emerald-500 focus:outline-none text-white p-2 rounded-lg text-xs font-medium"
                    >
                      {filteredPumps.map((p) => (
                        <option key={p.id} value={p.id} className="bg-[#16191E]">
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded">
                    Current Rate: {formatCurrency(currentPrice)} / Litre
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Quantities (Litres)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      className="w-full bg-[#0A0B0D] border border-slate-800 focus:border-emerald-500 focus:outline-none text-white rounded-lg p-1.5 text-xs font-semibold"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Amount</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs font-semibold text-slate-500">{selectedCurrency}</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={amount}
                        className="w-full bg-[#0A0B0D] border border-slate-800 focus:border-emerald-500 focus:outline-none text-white rounded-lg p-1.5 pl-11 text-xs font-semibold"
                        placeholder="0.00"
                        onChange={(e) => handleAmountChange(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Standard Non-Fuel / Expense fields */}
            {!(type === 'sale' && category === 'fuel') && (
              <div className="bg-[#111418]/60 border border-slate-850 p-3.5 rounded-xl space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Transaction Value</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-xs font-medium text-slate-500">{selectedCurrency}</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={amount}
                      className="w-full bg-[#0A0B0D] border border-slate-800 focus:border-emerald-500 focus:outline-none text-white rounded-lg p-1.5 pl-11 text-xs font-semibold"
                      placeholder="0.00"
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Note description field */}
            <div>
              <label className="text-xs font-semibold text-slate-505 text-slate-500 block mb-1">Descriptions & Reference</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  category === 'expense'
                    ? 'Water utilities, maintenance repairs descriptions'
                    : 'Customer vehicle plate, phone references, shop items'
                }
                rows={2}
                className="w-full bg-[#111418] border border-slate-800 focus:border-emerald-500 focus:outline-none text-white rounded-lg p-2 text-xs placeholder:text-slate-600 transition"
              />
            </div>

            {/* Feedbacks alerts */}
            {errorMsg && <p className="text-xs text-rose-450 font-medium">{errorMsg}</p>}
            {successMsg && <p className="text-xs text-emerald-400 font-medium">{successMsg}</p>}

            <button
              id="btn-add-transaction"
              type="submit"
              className="w-full bg-[#111418] border border-[#16191E] hover:border-slate-700 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg py-2.5 text-xs tracking-wider transition uppercase active:scale-[98%] cursor-pointer mt-2 flex justify-center items-center shadow-md border-slate-800/50"
            >
              Commit Transaction {isOnline ? 'Cloud' : 'Offline'}
            </button>
          </form>
        )}
      </div>

      {/* Real-time Sales list for Active Shift */}
      <div className="lg:col-span-12 xl:col-span-7 bg-[#16191E] border border-slate-805 rounded-2xl shadow-sm p-5 h-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4 mb-4">
          <div>
            <h2 className="font-bold text-white text-base">Transactions Ledger</h2>
            <p className="text-xs text-slate-500 mt-0.5">Live items verified on current open shift session</p>
          </div>
          <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 py-1 px-2 rounded-xl border border-emerald-500/20 font-semibold">
            {filteredTransactions.length} Items this shift
          </span>
        </div>

        {/* Filter bars */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-4">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search references, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-[#111418] border border-slate-800 focus:border-emerald-500 focus:outline-none text-white rounded-lg pl-8 p-2 placeholder:text-slate-600"
            />
          </div>
          <div className="sm:col-span-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full text-[#E2E8F0] text-xs bg-[#111418] border border-slate-800 rounded-lg p-2 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all" className="bg-[#16191E]">Categories (All)</option>
              <option value="fuel" className="bg-[#16191E]">Fuel Dispensed</option>
              <option value="shop" className="bg-[#16191E]">Convenience Shop</option>
              <option value="lubricants" className="bg-[#16191E]">Lubricants</option>
              <option value="expense" className="bg-[#16191E]">Expenses</option>
            </select>
          </div>
          <div className="sm:col-span-4">
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="w-full text-[#E2E8F0] bg-[#111418] border border-slate-800 rounded-lg p-2 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all" className="bg-[#16191E]">Sourced/Payment (All)</option>
              <option value="cash" className="bg-[#16191E]">Cash</option>
              <option value="mobile_money" className="bg-[#16191E]">Mobile Money</option>
              <option value="bank_transfer" className="bg-[#16191E]">Bank Transfer</option>
              <option value="credit" className="bg-[#16191E]">Credit Accounts</option>
            </select>
          </div>
        </div>

        {/* List ledger */}
        <div className="overflow-y-auto max-h-[380px] space-y-2 pr-1">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs text-slate-500">No matching entries recorded in this session.</p>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isExpense = tx.type === 'expense';
              return (
                <div
                  key={tx.id}
                  className={`border rounded-xl p-3 flex justify-between items-center transition ${
                    isExpense
                      ? 'bg-rose-955/10 border-rose-900/30 hover:bg-rose-955/20'
                      : 'bg-[#111418]/45 border border-slate-850 hover:bg-[#111418]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[9px] font-mono uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${
                          isExpense ? 'bg-rose-950/20 text-rose-450 border-rose-900/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {tx.category}
                      </span>
                      <span className="text-[10px] bg-indigo-950/20 text-indigo-400 border border-indigo-900/40 uppercase px-1.5 py-0.5 rounded font-bold">
                        {tx.paymentMethod.replace('_', ' ')}
                      </span>
                      {tx.fuelType && (
                        <span className="text-[10px] bg-[#0A0B0D] text-emerald-400 border border-emerald-500/20 font-semibold px-2 py-0.5 rounded">
                          {tx.fuelType}
                        </span>
                      )}
                      {!tx.synced && (
                        <span className="text-[9px] bg-amber-955/30 text-amber-500 border border-amber-800/40 px-1.5 py-0.5 rounded animate-pulse">
                          Offline Queue
                        </span>
                      )}
                    </div>
                    {tx.notes && <p className="text-xs text-slate-200 font-semibold">{tx.notes}</p>}
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <span className="font-bold">{tx.attendantName}</span>
                      <span>•</span>
                      <span>{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {tx.quantity && <span>• {tx.quantity} Litres dispensed</span>}
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-black font-mono block ${isExpense ? 'text-rose-450' : 'text-slate-100'}`}
                    >
                      {isExpense ? '-' : ''}{formatCurrency(tx.amount)}
                    </span>
                    <span className="text-[9px] text-slate-500 block tracking-wider uppercase font-bold">
                      Tax levy included
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
