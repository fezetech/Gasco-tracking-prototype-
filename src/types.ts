export type FuelType = 'Petrol' | 'Diesel' | 'Kerosene' | 'V-Power';

export type PaymentMethod = 'cash' | 'mobile_money' | 'bank_transfer' | 'credit' | 'prepaid_wallet';

export type TransactionCategory = 'fuel' | 'shop' | 'lubricants' | 'expense';

export type StaffRole = 'manager' | 'attendant';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  depositBalance: number; // For prepaid prepaid card wallet
  creditLimit: number; // Max allowable credit limit
  creditBalance: number; // Current credit utilized (debt)
  bonusPoints: number; // Loyalty bonus points
  tier: 'Bronze' | 'Silver' | 'Gold' | 'VIP'; // Bronze, Silver, Gold, VIP Loyalty ranking
  createdAt: number;
  companyName?: string;
}

export interface BlindUnlockRequest {
  id: string;
  shiftId: string;
  attendantId: string;
  attendantName: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'declined';
  reason: string;
  approvedBy?: string;
}

export interface Staff {
  uid: string;
  name: string;
  role: StaffRole;
  pinCode: string;
  email: string;
  avatarColor: string;
}

export interface Tank {
  id: string;
  name: string;
  fuelType: FuelType;
  capacity: number; // in litres
  currentLevel: number; // in litres
  lowThereshold: number; // in litres for alerts
  pricePerLitre: number; // in local currency (e.g., KES or GHS or UGX)
}

export interface Pump {
  id: string;
  name: string;
  tankId: string;
  fuelType: FuelType;
  lastReading: number; // cumulative meter reading in litres
}

export interface Transaction {
  id: string;
  shiftId: string;
  timestamp: number; // epoch timestamp
  type: 'sale' | 'expense';
  category: TransactionCategory;
  paymentMethod: PaymentMethod;
  amount: number; // base reference value (KES)
  quantity?: number; // litres sold (if fuel)
  fuelType?: FuelType;
  pumpId?: string;
  notes?: string;
  synced: boolean; // offline sync tracking
  attendantId: string;
  attendantName: string;
  customerId?: string; // Optional linked loyalty customer
  customerName?: string;
  currency?: string; // Currency selection (e.g. UGX, KES, USD)
  exchangeRate?: number; // Converstion rate relative to KES base
}

export interface Shift {
  id: string;
  attendantId: string;
  attendantName: string;
  startTime: number;
  endTime: number | null;
  status: 'active' | 'completed' | 'verified';
  startPumpReadings: Record<string, number>; // pumpId -> reading
  endPumpReadings: Record<string, number>; // pumpId -> reading
  dipLevelStart: Record<string, number>; // tankId -> level
  dipLevelEnd: Record<string, number>; // tankId -> level
  totalSales: number;
  totalExpenses: number;
  revenueBreakdown: Record<PaymentMethod, number>;
  taxCalculated: number; // Automated Tax calculation
  verifiedBy?: string;
  verifiedAt?: number;
  notes?: string;
  synced: boolean;
  // Blind balancing properties
  blindUnlocked?: boolean;
  unlockReason?: string;
  unlockRequestPending?: boolean;
  attendantCounts?: Record<PaymentMethod, number>; // Attendant physical count entries
  varianceBreakdown?: Record<PaymentMethod, number>; // Variance relative to system calculated breakdown
}

export interface StationStats {
  totalSales: number;
  totalExpenses: number;
  netRevenue: number;
  salesByMethod: Record<PaymentMethod, number>;
  salesByFuel: Record<FuelType, number>;
  salesByCategory: Record<TransactionCategory, number>;
}
