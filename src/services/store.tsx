import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Staff, Tank, Pump, Transaction, Shift, PaymentMethod, FuelType, TransactionCategory, Customer, BlindUnlockRequest } from '../types';
import { INITIAL_PUMPS, INITIAL_STAFF, INITIAL_TANKS, SEED_SHIFTS, SEED_TRANSACTIONS, INITIAL_CUSTOMERS } from '../data/mockData';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  getDocFromServer 
} from 'firebase/firestore';

interface StoreContextType {
  staff: Staff[];
  tanks: Tank[];
  pumps: Pump[];
  transactions: Transaction[];
  shifts: Shift[];
  customers: Customer[];
  blindUnlockRequests: BlindUnlockRequest[];
  currentUser: Staff | null;
  activeShift: Shift | null;
  isOnline: boolean;
  syncQueueCount: number;
  syncing: boolean;
  selectedCurrency: string;
  formatCurrency: (amountInKES: number, customCurrency?: string) => string;
  convertValueToKES: (amountInSelectedCurrency: number, currency?: string) => number;
  changeGlobalCurrency: (currency: string) => void;
  login: (pinCode: string) => { success: boolean; message: string; user?: Staff };
  logout: () => void;
  startNewShift: (startPumps: Record<string, number>, startDips: Record<string, number>) => void;
  submitShiftEnd: (endPumps: Record<string, number>, endDips: Record<string, number>, notes?: string, physicalCounts?: Record<PaymentMethod, number>) => void;
  verifyShiftReport: (shiftId: string, notes?: string) => void;
  addTransaction: (txData: {
    type: 'sale' | 'expense';
    category: TransactionCategory;
    paymentMethod: PaymentMethod;
    amount: number;
    quantity?: number;
    fuelType?: FuelType;
    pumpId?: string;
    notes?: string;
    customerId?: string;
    customerName?: string;
  }) => { success: boolean; message: string };
  updatePrice: (tankId: string, newPrice: number) => void;
  toggleConnectivity: () => void;
  addStaffMember: (name: string, email: string, role: 'manager' | 'attendant', pin: string) => { success: boolean; message?: string };
  // Customer Operations
  addCustomer: (name: string, phone: string, email?: string, creditLimit?: number, companyName?: string) => { success: boolean; message: string; customer?: Customer };
  depositToCustomerWallet: (customerId: string, amountInSelectedCurrency: number, paymentMethod: PaymentMethod) => { success: boolean; message: string };
  // Blind Balancing Request Handlers
  requestBlindUnlock: (shiftId: string, reason: string) => void;
  approveBlindUnlock: (requestId: string) => void;
  approveBlindUnlockForShift: (shiftId: string) => void;
  overrideBlindUnlockWithPIN: (shiftId: string, pin: string) => { success: boolean; message: string };
  resetAllData: () => void;
  syncOfflineDataFlag: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff[]>(() => {
    const local = localStorage.getItem('petrol_staff');
    return local ? JSON.parse(local) : INITIAL_STAFF;
  });

  const [tanks, setTanks] = useState<Tank[]>(() => {
    const local = localStorage.getItem('petrol_tanks');
    return local ? JSON.parse(local) : INITIAL_TANKS;
  });

  const [pumps, setPumps] = useState<Pump[]>(() => {
    const local = localStorage.getItem('petrol_pumps');
    return local ? JSON.parse(local) : INITIAL_PUMPS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const local = localStorage.getItem('petrol_transactions');
    return local ? JSON.parse(local) : SEED_TRANSACTIONS;
  });

  const [shifts, setShifts] = useState<Shift[]>(() => {
    const local = localStorage.getItem('petrol_shifts');
    return local ? JSON.parse(local) : SEED_SHIFTS;
  });

  const [currentUser, setCurrentUser] = useState<Staff | null>(() => {
    const local = localStorage.getItem('petrol_current_user');
    return local ? JSON.parse(local) : null;
  });

  const [isOnline, setIsOnline] = useState<boolean>(() => {
    const local = localStorage.getItem('petrol_is_online');
    return local ? JSON.parse(local) : true; // default online
  });

  const [syncing, setSyncing] = useState<boolean>(false);

  // Expanded State Hooks for Customer CRM & Blind Balancing
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const local = localStorage.getItem('petrol_customers');
    return local ? JSON.parse(local) : INITIAL_CUSTOMERS;
  });

  const [blindUnlockRequests, setBlindUnlockRequests] = useState<BlindUnlockRequest[]>(() => {
    const local = localStorage.getItem('petrol_blind_unlocks');
    return local ? JSON.parse(local) : [];
  });

  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    return localStorage.getItem('petrol_currency') || 'UGX';
  });

  const [fbUser, setFbUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // 1. Initialize Anonymous Firebase Auth in background and track auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
      setAuthChecking(false);
    });

    signInAnonymously(auth).catch((err) => {
      console.warn("Firebase Anonymous Auth failed: operating locally.", err);
      setAuthChecking(false);
      setIsOnline(false);
    });

    return () => unsub();
  }, []);

  // Determine if active cloud synchronization can be conducted safely
  const isSyncActive = isOnline && !authChecking && fbUser !== null;

  // 2. Test Connection to Firestore (Verify constraint)
  useEffect(() => {
    if (!isSyncActive) return;
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, [isSyncActive]);

  // 3. Sync Collection: staff
  useEffect(() => {
    if (!isSyncActive) return;

    const unsub = onSnapshot(collection(db, 'staff'), (snapshot) => {
      if (snapshot.empty) {
        // Seed default staff if empty in cloud
        INITIAL_STAFF.forEach((member) => {
          setDoc(doc(db, 'staff', member.uid), member).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `staff/${member.uid}`);
          });
        });
      } else {
        const list: Staff[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Staff);
        });
        setStaff(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'staff');
    });

    return () => unsub();
  }, [isSyncActive]);

  // 4. Sync Collection: tanks
  useEffect(() => {
    if (!isSyncActive) return;

    const unsub = onSnapshot(collection(db, 'tanks'), (snapshot) => {
      if (snapshot.empty) {
        // Seed default tanks if empty in cloud
        INITIAL_TANKS.forEach((tank) => {
          setDoc(doc(db, 'tanks', tank.id), tank).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `tanks/${tank.id}`);
          });
        });
      } else {
        const list: Tank[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Tank);
        });
        setTanks(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tanks');
    });

    return () => unsub();
  }, [isSyncActive]);

  // 5. Sync Collection: shifts
  useEffect(() => {
    if (!isSyncActive) return;

    const unsub = onSnapshot(collection(db, 'shifts'), (snapshot) => {
      const list: Shift[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Shift);
      });
      list.sort((a, b) => b.startTime - a.startTime);
      setShifts(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'shifts');
    });

    return () => unsub();
  }, [isSyncActive]);

  // 6. Sync Collection: transactions
  useEffect(() => {
    if (!isSyncActive) return;

    const unsub = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Transaction);
      });
      list.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transactions');
    });

    return () => unsub();
  }, [isSyncActive]);

  // 7. Sync Collection: customers
  useEffect(() => {
    if (!isSyncActive) return;

    const unsub = onSnapshot(collection(db, 'customers'), (snapshot) => {
      if (snapshot.empty) {
        // Seed default customers
        INITIAL_CUSTOMERS.forEach((customer) => {
          setDoc(doc(db, 'customers', customer.id), customer).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `customers/${customer.id}`);
          });
        });
      } else {
        const list: Customer[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Customer);
        });
        setCustomers(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'customers');
    });

    return () => unsub();
  }, [isSyncActive]);

  // 8. Sync Collection: blind_unlocks
  useEffect(() => {
    if (!isSyncActive) return;

    const unsub = onSnapshot(collection(db, 'blind_unlocks'), (snapshot) => {
      const list: BlindUnlockRequest[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as BlindUnlockRequest);
      });
      list.sort((a, b) => b.timestamp - a.timestamp);
      setBlindUnlockRequests(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'blind_unlocks');
    });

    return () => unsub();
  }, [isSyncActive]);

  // Sync state to localstorage for offline persistence
  useEffect(() => {
    localStorage.setItem('petrol_staff', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('petrol_tanks', JSON.stringify(tanks));
  }, [tanks]);

  useEffect(() => {
    localStorage.setItem('petrol_pumps', JSON.stringify(pumps));
  }, [pumps]);

  useEffect(() => {
    localStorage.setItem('petrol_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('petrol_shifts', JSON.stringify(shifts));
  }, [shifts]);

  useEffect(() => {
    localStorage.setItem('petrol_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('petrol_is_online', JSON.stringify(isOnline));
  }, [isOnline]);

  useEffect(() => {
    localStorage.setItem('petrol_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('petrol_blind_unlocks', JSON.stringify(blindUnlockRequests));
  }, [blindUnlockRequests]);

  useEffect(() => {
    localStorage.setItem('petrol_currency', selectedCurrency);
  }, [selectedCurrency]);

  // Derived state: check if active shift exists for current user (or globally if attendant)
  const activeShift = shifts.find(
    (s) => s.status === 'active' && (currentUser?.role === 'manager' || s.attendantId === currentUser?.uid)
  ) || null;

  // Number of items pending sync in the local cache
  const syncQueueCount =
    transactions.filter((t) => !t.synced).length + shifts.filter((s) => !s.synced).length;

  // Multi-Currency Converter Configuration & Uganda Rates (Soroti Station Base)
  // Base persistence currency is kept as KES for database backward-compatibility, and conversions are applied
  const CURRENCY_RATES: Record<string, number> = { KES: 1, UGX: 28.5, USD: 0.0075, EUR: 0.0069 };
  const CURRENCY_SYMBOLS: Record<string, string> = { KES: 'KES', UGX: 'UGX', USD: 'USD', EUR: '€' };

  const formatCurrency = (amountInKES: number, customCurrency?: string) => {
    const curr = customCurrency || selectedCurrency;
    const rate = CURRENCY_RATES[curr] || 1;
    const converted = amountInKES * rate;
    const symbol = CURRENCY_SYMBOLS[curr] || curr;
    if (curr === 'UGX') {
      return `${symbol} ${Math.round(converted).toLocaleString()}`;
    }
    return `${symbol} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const convertValueToKES = (amountInSelectedCurrency: number, currency?: string) => {
    const curr = currency || selectedCurrency;
    const rate = CURRENCY_RATES[curr] || 1;
    return amountInSelectedCurrency / rate;
  };

  const changeGlobalCurrency = (currency: string) => {
    if (CURRENCY_RATES[currency]) {
      setSelectedCurrency(currency);
    }
  };

  // Customer Management CRM Functions
  const addCustomer = (name: string, phone: string, email?: string, creditLimit?: number, companyName?: string) => {
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name,
      phone,
      email,
      depositBalance: 0,
      creditLimit: creditLimit || 10000,
      creditBalance: 0,
      bonusPoints: 0,
      tier: 'Bronze',
      createdAt: Date.now(),
      companyName,
    };

    setCustomers((prev) => [...prev, newCust]);

    if (isSyncActive) {
      setDoc(doc(db, 'customers', newCust.id), newCust).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `customers/${newCust.id}`);
      });
    }

    return { success: true, message: 'Loyalty Customer registered successfully.', customer: newCust };
  };

  const depositToCustomerWallet = (customerId: string, amountInSelectedCurrency: number, paymentMethod: PaymentMethod) => {
    const amountInKES = convertValueToKES(amountInSelectedCurrency);
    
    let updatedCustomer: Customer | null = null;
    
    // Create new temporary customers list to fetch name
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      return { success: false, message: 'Customer not found.' };
    }

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          const newBalance = c.depositBalance + amountInKES;
          let nextTier: 'Bronze' | 'Silver' | 'Gold' | 'VIP' = 'Bronze';
          if (newBalance >= 10000) nextTier = 'VIP';
          else if (newBalance >= 5000) nextTier = 'Gold';
          else if (newBalance >= 2000) nextTier = 'Silver';
          
          updatedCustomer = {
            ...c,
            depositBalance: newBalance,
            bonusPoints: c.bonusPoints + Math.floor(amountInKES / 10), // 1 point per 10 KES deposit bonus
            tier: nextTier,
          };
          return updatedCustomer;
        }
        return c;
      })
    );

    // Also register credit receipt sale
    addTransaction({
      type: 'sale',
      category: 'shop',
      paymentMethod: paymentMethod,
      amount: amountInKES,
      notes: `Prepaid Account Deposit: ${customer.name} (${customer.companyName || 'Soroti Gasco Retail'})`,
      customerId: customer.id,
      customerName: customer.name,
    });

    if (isSyncActive && updatedCustomer) {
      setDoc(doc(db, 'customers', customerId), updatedCustomer).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `customers/${customerId}`);
      });
    }

    return { success: true, message: `Deposited ${formatCurrency(amountInKES)} successfully.` };
  };

  // Blind balancing request functions
  const requestBlindUnlock = (shiftId: string, reason: string) => {
    if (!currentUser) return;
    const newReq: BlindUnlockRequest = {
      id: `req-${Date.now()}`,
      shiftId,
      attendantId: currentUser.uid,
      attendantName: currentUser.name,
      timestamp: Date.now(),
      status: 'pending',
      reason,
    };

    setBlindUnlockRequests((prev) => [newReq, ...prev]);

    // Also flag shift as pending unlock
    setShifts((prev) =>
      prev.map((s) => (s.id === shiftId ? { ...s, unlockRequestPending: true } : s))
    );

    if (isSyncActive) {
      setDoc(doc(db, 'blind_unlocks', newReq.id), newReq).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `blind_unlocks/${newReq.id}`);
      });
      updateDoc(doc(db, 'shifts', shiftId), { unlockRequestPending: true }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `shifts/${shiftId}`);
      });
    }
  };

  const approveBlindUnlock = (requestId: string) => {
    if (currentUser?.role !== 'manager') return;
    
    let shiftId = '';
    setBlindUnlockRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          shiftId = r.shiftId;
          const updated = { ...r, status: 'approved' as const, approvedBy: currentUser.name };
          if (isSyncActive) {
            updateDoc(doc(db, 'blind_unlocks', r.id), { status: 'approved', approvedBy: currentUser.name });
          }
          return updated;
        }
        return r;
      })
    );

    if (shiftId) {
      approveBlindUnlockForShift(shiftId);
    }
  };

  const approveBlindUnlockForShift = (shiftId: string) => {
    setShifts((prev) =>
      prev.map((s) => {
        if (s.id === shiftId) {
          const updated = { ...s, blindUnlocked: true, unlockRequestPending: false, unlockApprovedBy: currentUser?.name || 'Manager Overrule' };
          if (isSyncActive) {
            updateDoc(doc(db, 'shifts', shiftId), { blindUnlocked: true, unlockRequestPending: false, unlockApprovedBy: currentUser?.name || 'Manager Overrule' });
          }
          return updated;
        }
        return s;
      })
    );
  };

  const overrideBlindUnlockWithPIN = (shiftId: string, pin: string) => {
    const manager = staff.find(s => s.role === 'manager' && s.pinCode === pin);
    if (manager) {
      setShifts((prev) =>
        prev.map((s) => {
          if (s.id === shiftId) {
            const updated = { ...s, blindUnlocked: true, unlockApprovedBy: manager.name };
            if (isSyncActive) {
              updateDoc(doc(db, 'shifts', shiftId), { blindUnlocked: true, unlockApprovedBy: manager.name });
            }
            return updated;
          }
          return s;
        })
      );
      return { success: true, message: `Access granted by ${manager.name}.` };
    }
    return { success: false, message: 'Invalid Manager PIN Credentials.' };
  };

  const login = (pinCode: string) => {
    const found = staff.find((s) => s.pinCode === pinCode);
    if (found) {
      const firebaseUser = auth.currentUser;
      const loggedUser = { ...found };

      if (firebaseUser) {
        // Map PIN login session to the Firebase Auth authenticated UID securely
        loggedUser.uid = firebaseUser.uid;

        if (isSyncActive) {
          setDoc(doc(db, 'staff', firebaseUser.uid), loggedUser).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `staff/${firebaseUser.uid}`);
          });
        }
      }

      setCurrentUser(loggedUser);
      return { success: true, message: `Welcome back, ${found.name}`, user: loggedUser };
    }
    return { success: false, message: 'Invalid employee credential code or PIN.' };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const toggleConnectivity = async () => {
    const targetOnline = !isOnline;
    setIsOnline(targetOnline);
    if (targetOnline && syncQueueCount > 0) {
      await syncOfflineDataFlag();
    }
  };

  const syncOfflineDataFlag = async () => {
    if (syncQueueCount === 0 || syncing || !fbUser) return;
    setSyncing(true);

    try {
      // Find unsynced shifts
      const unsyncedShifts = shifts.filter((s) => !s.synced);
      for (const shift of unsyncedShifts) {
        await setDoc(doc(db, 'shifts', shift.id), { ...shift, synced: true });
      }

      // Find unsynced transactions
      const unsyncedTxs = transactions.filter((t) => !t.synced);
      for (const tx of unsyncedTxs) {
        await setDoc(doc(db, 'transactions', tx.id), { ...tx, synced: true });
      }

      // Update local states
      setTransactions((prev) => prev.map((t) => ({ ...t, synced: true })));
      setShifts((prev) => prev.map((s) => ({ ...s, synced: true })));
    } catch (err) {
      console.error("Failed to sync offline data to Firestore:", err);
    } finally {
      setSyncing(false);
    }
  };

  const addStaffMember = (name: string, email: string, role: 'manager' | 'attendant', pin: string) => {
    if (staff.some((s) => s.pinCode === pin)) {
      return { success: false, message: 'This PIN is already assigned!' };
    }
    const colors = ['bg-indigo-600', 'bg-teal-600', 'bg-amber-600', 'bg-purple-600', 'bg-rose-600', 'bg-emerald-600'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newStaff: Staff = {
      uid: `staff-${Date.now()}`,
      name,
      role,
      pinCode: pin,
      email,
      avatarColor: randomColor,
    };

    setStaff((prev) => [...prev, newStaff]);

    if (isSyncActive) {
      setDoc(doc(db, 'staff', newStaff.uid), newStaff).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `staff/${newStaff.uid}`);
      });
    }

    return { success: true, message: 'Staff member added successfully.' };
  };

  // Automated Tax and VAT calculation: VAT is typically 16%, Fuel Levies approx 5%
  const calculateCommittedTax = (salesAmount: number) => {
    const totalTaxRate = 0.16 + 0.05; // 21% combined
    return Number((salesAmount * (totalTaxRate / (1 + totalTaxRate))).toFixed(2));
  };

  const startNewShift = (startPumps: Record<string, number>, startDips: Record<string, number>) => {
    if (!currentUser) return;

    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      attendantId: currentUser.uid,
      attendantName: currentUser.name,
      startTime: Date.now(),
      endTime: null,
      status: 'active',
      startPumpReadings: startPumps,
      endPumpReadings: {},
      dipLevelStart: startDips,
      dipLevelEnd: {},
      totalSales: 0,
      totalExpenses: 0,
      revenueBreakdown: { cash: 0, mobile_money: 0, bank_transfer: 0, credit: 0, prepaid_wallet: 0 },
      taxCalculated: 0,
      synced: isSyncActive,
      blindUnlocked: false,
    };

    setShifts((prev) => [newShift, ...prev]);

    if (isSyncActive) {
      setDoc(doc(db, 'shifts', newShift.id), { ...newShift, synced: true }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `shifts/${newShift.id}`);
      });
    }
  };

  const submitShiftEnd = (
    endPumps: Record<string, number>, 
    endDips: Record<string, number>, 
    notes?: string,
    physicalCounts?: Record<PaymentMethod, number>
  ) => {
    if (!activeShift) return;

    // Calculate aggregated sales from active transactions logged for this shift
    const shiftTx = transactions.filter((t) => t.shiftId === activeShift.id);
    const salesTx = shiftTx.filter((t) => t.type === 'sale');
    const expensesTx = shiftTx.filter((t) => t.type === 'expense');

    const totalSales = salesTx.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expensesTx.reduce((sum, t) => sum + t.amount, 0);

    const breakdown: Record<PaymentMethod, number> = {
      cash: salesTx.filter((t) => t.paymentMethod === 'cash').reduce((sum, t) => sum + t.amount, 0),
      mobile_money: salesTx.filter((t) => t.paymentMethod === 'mobile_money').reduce((sum, t) => sum + t.amount, 0),
      bank_transfer: salesTx.filter((t) => t.paymentMethod === 'bank_transfer').reduce((sum, t) => sum + t.amount, 0),
      credit: salesTx.filter((t) => t.paymentMethod === 'credit').reduce((sum, t) => sum + t.amount, 0),
      prepaid_wallet: salesTx.filter((t) => t.paymentMethod === 'prepaid_wallet').reduce((sum, t) => sum + t.amount, 0),
    };

    let variance: Record<PaymentMethod, number> | undefined = undefined;
    if (physicalCounts) {
      variance = {
        cash: (physicalCounts.cash || 0) - breakdown.cash,
        mobile_money: (physicalCounts.mobile_money || 0) - breakdown.mobile_money,
        bank_transfer: (physicalCounts.bank_transfer || 0) - breakdown.bank_transfer,
        credit: (physicalCounts.credit || 0) - breakdown.credit,
        prepaid_wallet: (physicalCounts.prepaid_wallet || 0) - breakdown.prepaid_wallet,
      };
    }

    // Update local pump values in main list
    setPumps((prev) =>
      prev.map((pump) => {
        if (endPumps[pump.id] !== undefined) {
          return { ...pump, lastReading: endPumps[pump.id] };
        }
        return pump;
      })
    );

    // Update tanks levels based on dips
    setTanks((prev) =>
      prev.map((tank) => {
        if (endDips[tank.id] !== undefined) {
          const updatedLevel = endDips[tank.id];

          if (isSyncActive) {
            updateDoc(doc(db, 'tanks', tank.id), { currentLevel: updatedLevel }).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `tanks/${tank.id}`);
            });
          }

          return { ...tank, currentLevel: updatedLevel };
        }
        return tank;
      })
    );

    const updatedShift: Shift = {
      ...activeShift,
      status: 'completed',
      endTime: Date.now(),
      endPumpReadings: endPumps,
      dipLevelEnd: endDips,
      totalSales,
      totalExpenses,
      revenueBreakdown: breakdown,
      taxCalculated: calculateCommittedTax(totalSales),
      notes,
      synced: isSyncActive,
      blindUnlocked: false, // Default is blind-balancing locked
      attendantCounts: physicalCounts,
      varianceBreakdown: variance,
    };

    setShifts((prev) =>
      prev.map((s) => (s.id === activeShift.id ? updatedShift : s))
    );

    if (isSyncActive) {
      updateDoc(doc(db, 'shifts', activeShift.id), { ...updatedShift, synced: true }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `shifts/${activeShift.id}`);
      });
    }
  };

  const verifyShiftReport = (shiftId: string, notes?: string) => {
    if (currentUser?.role !== 'manager') return;

    let updatedShift: Shift | null = null;

    setShifts((prev) =>
      prev.map((s) => {
        if (s.id === shiftId) {
          const notesText = notes ? `${s.notes || ''}\nManager notes: ${notes}` : s.notes;
          updatedShift = {
            ...s,
            status: 'verified',
            verifiedBy: currentUser.name,
            verifiedAt: Date.now(),
            notes: notesText,
            synced: isSyncActive,
          };
          return updatedShift;
        }
        return s;
      })
    );

    if (isSyncActive && updatedShift) {
      updateDoc(doc(db, 'shifts', shiftId), { ...(updatedShift as Shift), synced: true }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `shifts/${shiftId}`);
      });
    }
  };

  const addTransaction = (txData: {
    type: 'sale' | 'expense';
    category: TransactionCategory;
    paymentMethod: PaymentMethod;
    amount: number;
    quantity?: number;
    fuelType?: FuelType;
    pumpId?: string;
    notes?: string;
    customerId?: string;
    customerName?: string;
  }) => {
    if (!activeShift) {
      return { success: false, message: 'No active shift is currently open. Start a shift first!' };
    }

    // Smart Validation for Prepaid and Credit-eligible Loyalty Accounts
    if (txData.customerId && txData.type === 'sale') {
      const customer = customers.find(c => c.id === txData.customerId);
      if (!customer) {
        return { success: false, message: 'Select Loyalty account credentials are invalid.' };
      }

      const amountVal = txData.amount; // Base currency comparison

      if (txData.paymentMethod === 'prepaid_wallet') {
        if (customer.depositBalance < amountVal) {
          return { 
            success: false, 
            message: `Checkout declined: Customer's Prepaid Balance is too low! Wallet contains only ${formatCurrency(customer.depositBalance)}. Missing ${formatCurrency(amountVal - customer.depositBalance)}.` 
          };
        }

        // Deduct and rewards accrue points
        const finalBalance = customer.depositBalance - amountVal;
        const rewardPoints = Math.max(1, Math.floor(amountVal / 100)); // 1 loyalty point per 100 KES base purchase
        const updatedCustomer = {
          ...customer,
          depositBalance: finalBalance,
          bonusPoints: customer.bonusPoints + rewardPoints,
        };

        setCustomers(prev => prev.map(c => c.id === customer.id ? updatedCustomer : c));
        if (isSyncActive) {
          setDoc(doc(db, 'customers', customer.id), updatedCustomer).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `customers/${customer.id}`);
          });
        }
      } else if (txData.paymentMethod === 'credit') {
        const remainingLimit = customer.creditLimit - customer.creditBalance;
        if (remainingLimit < amountVal) {
          return {
            success: false, 
            message: `Checkout declined: Invoice exceeds permissible Credit Account limit! Available Credit headroom is ${formatCurrency(remainingLimit)}.` 
          };
        }

        // Accrue outstanding credit debt
        const finalDebt = customer.creditBalance + amountVal;
        const updatedCustomer = {
          ...customer,
          creditBalance: finalDebt,
        };

        setCustomers(prev => prev.map(c => c.id === customer.id ? updatedCustomer : c));
        if (isSyncActive) {
          setDoc(doc(db, 'customers', customer.id), updatedCustomer).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `customers/${customer.id}`);
          });
        }
      } else {
        // Standard payment method loyalty accrual
        const rewardPoints = Math.max(1, Math.floor(amountVal / 200)); // 1 loyalty point per 200 KES standard purchase
        const updatedCustomer = {
          ...customer,
          bonusPoints: customer.bonusPoints + rewardPoints,
        };
        setCustomers(prev => prev.map(c => c.id === customer.id ? updatedCustomer : c));
        if (isSyncActive) {
          setDoc(doc(db, 'customers', customer.id), updatedCustomer).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `customers/${customer.id}`);
          });
        }
      }
    }

    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      shiftId: activeShift.id,
      timestamp: Date.now(),
      synced: isSyncActive,
      attendantId: activeShift.attendantId,
      attendantName: activeShift.attendantName,
    };

    setTransactions((prev) => [newTx, ...prev]);

    // Side effects on sales: Drip levels and inventory monitoring decrements
    if (txData.type === 'sale' && txData.quantity && txData.fuelType) {
      const soldQty = txData.quantity;

      // Update the fuel level of the tank supplying this fuelType
      setTanks((prev) =>
        prev.map((tank) => {
          if (tank.fuelType === txData.fuelType) {
            const nextLevel = Math.max(0, tank.currentLevel - soldQty);
            const resolvedLevel = Number(nextLevel.toFixed(2));

            if (isSyncActive) {
              updateDoc(doc(db, 'tanks', tank.id), { currentLevel: resolvedLevel }).catch(err => {
                handleFirestoreError(err, OperationType.WRITE, `tanks/${tank.id}`);
              });
            }

            return { ...tank, currentLevel: resolvedLevel };
          }
          return tank;
        })
      );

      // Increment respective pump reading
      if (txData.pumpId) {
        setPumps((prev) =>
          prev.map((p) => {
            if (p.id === txData.pumpId) {
              return { ...p, lastReading: Number((p.lastReading + soldQty).toFixed(2)) };
            }
            return p;
          })
        );
      }
    }

    if (isSyncActive) {
      setDoc(doc(db, 'transactions', newTx.id), { ...newTx, synced: true }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `transactions/${newTx.id}`);
      });
    }

    return { success: true, message: 'Transaction logged successfully.' };
  };

  const updatePrice = (tankId: string, newPrice: number) => {
    if (currentUser?.role !== 'manager') return;

    setTanks((prev) =>
      prev.map((tank) => {
        if (tank.id === tankId) {
          return { ...tank, pricePerLitre: newPrice };
        }
        return tank;
      })
    );

    if (isSyncActive) {
      updateDoc(doc(db, 'tanks', tankId), { pricePerLitre: newPrice }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `tanks/${tankId}`);
      });
    }
  };

  const resetAllData = () => {
    localStorage.removeItem('petrol_staff');
    localStorage.removeItem('petrol_tanks');
    localStorage.removeItem('petrol_pumps');
    localStorage.removeItem('petrol_transactions');
    localStorage.removeItem('petrol_shifts');
    localStorage.removeItem('petrol_current_user');

    setStaff(INITIAL_STAFF);
    setTanks(INITIAL_TANKS);
    setPumps(INITIAL_PUMPS);
    setTransactions(SEED_TRANSACTIONS);
    setShifts(SEED_SHIFTS);
    setCurrentUser(null);
  };

  return (
    <StoreContext.Provider
      value={{
        staff,
        tanks,
        pumps,
        transactions,
        shifts,
        customers,
        blindUnlockRequests,
        currentUser,
        activeShift,
        isOnline,
        syncQueueCount,
        syncing,
        selectedCurrency,
        formatCurrency,
        convertValueToKES,
        changeGlobalCurrency,
        login,
        logout,
        startNewShift,
        submitShiftEnd,
        verifyShiftReport,
        addTransaction,
        updatePrice,
        toggleConnectivity,
        addStaffMember,
        addCustomer,
        depositToCustomerWallet,
        requestBlindUnlock,
        approveBlindUnlock,
        approveBlindUnlockForShift,
        overrideBlindUnlockWithPIN,
        resetAllData,
        syncOfflineDataFlag,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}

