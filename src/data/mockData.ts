import { Staff, Tank, Pump, Transaction, Shift } from '../types';

export const INITIAL_STAFF: Staff[] = [
  {
    uid: 'staff-1',
    name: 'David Mwenge (Manager)',
    role: 'manager',
    pinCode: '1111',
    email: 'david.mwenge@fuelstation.com',
    avatarColor: 'bg-indigo-600',
  },
  {
    uid: 'staff-2',
    name: 'Sarah Amondi',
    role: 'attendant',
    pinCode: '2222',
    email: 'sarah.amondi@fuelstation.com',
    avatarColor: 'bg-teal-600',
  },
  {
    uid: 'staff-3',
    name: 'John Kamau',
    role: 'attendant',
    pinCode: '3333',
    email: 'john.kamau@fuelstation.com',
    avatarColor: 'bg-amber-600',
  },
];

export const INITIAL_TANKS: Tank[] = [
  {
    id: 'tank-1',
    name: 'Main Petrol Tank (UG-1)',
    fuelType: 'Petrol',
    capacity: 25000,
    currentLevel: 18450,
    lowThereshold: 5000,
    pricePerLitre: 185, // in local cents/currency per litre
  },
  {
    id: 'tank-2',
    name: 'Main Diesel Tank (UG-2)',
    fuelType: 'Diesel',
    capacity: 20000,
    currentLevel: 4200, // Trigger low warning level
    lowThereshold: 4500,
    pricePerLitre: 168,
  },
  {
    id: 'tank-3',
    name: 'Kerosene Underground (UG-3)',
    fuelType: 'Kerosene',
    capacity: 10000,
    currentLevel: 8200,
    lowThereshold: 2000,
    pricePerLitre: 145,
  },
  {
    id: 'tank-4',
    name: 'Premium V-Power Tank (UG-4)',
    fuelType: 'V-Power',
    capacity: 15000,
    currentLevel: 11150,
    lowThereshold: 3000,
    pricePerLitre: 198,
  },
];

export const INITIAL_PUMPS: Pump[] = [
  {
    id: 'pump-1',
    name: 'Petrol Pump A',
    tankId: 'tank-1',
    fuelType: 'Petrol',
    lastReading: 124500, // cumulative litres
  },
  {
    id: 'pump-2',
    name: 'Petrol Pump B',
    tankId: 'tank-1',
    fuelType: 'Petrol',
    lastReading: 98120,
  },
  {
    id: 'pump-3',
    name: 'Diesel Pump A',
    tankId: 'tank-2',
    fuelType: 'Diesel',
    lastReading: 156320,
  },
  {
    id: 'pump-4',
    name: 'Diesel Pump B',
    tankId: 'tank-2',
    fuelType: 'Diesel',
    lastReading: 73450,
  },
  {
    id: 'pump-5',
    name: 'Kerosene Pump',
    tankId: 'tank-3',
    fuelType: 'Kerosene',
    lastReading: 32410,
  },
  {
    id: 'pump-6',
    name: 'V-Power Pump',
    tankId: 'tank-4',
    fuelType: 'V-Power',
    lastReading: 48900,
  },
];

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const now = Date.now();

// Generate high-fidelity seed transactions from yesterday
export const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-101',
    shiftId: 'shift-99',
    timestamp: now - ONE_DAY_MS + 2 * 3600 * 1000,
    type: 'sale',
    category: 'fuel',
    paymentMethod: 'cash',
    amount: 9250,
    quantity: 50,
    fuelType: 'Petrol',
    pumpId: 'pump-1',
    synced: true,
    attendantId: 'staff-2',
    attendantName: 'Sarah Amondi',
  },
  {
    id: 'tx-102',
    shiftId: 'shift-99',
    timestamp: now - ONE_DAY_MS + 3 * 3600 * 1000,
    type: 'sale',
    category: 'fuel',
    paymentMethod: 'mobile_money',
    amount: 14850,
    quantity: 75,
    fuelType: 'V-Power',
    pumpId: 'pump-6',
    synced: true,
    attendantId: 'staff-2',
    attendantName: 'Sarah Amondi',
  },
  {
    id: 'tx-103',
    shiftId: 'shift-99',
    timestamp: now - ONE_DAY_MS + 4 * 3600 * 1000,
    type: 'sale',
    category: 'shop',
    paymentMethod: 'cash',
    amount: 1200,
    synced: true,
    attendantId: 'staff-2',
    attendantName: 'Sarah Amondi',
  },
  {
    id: 'tx-104',
    shiftId: 'shift-99',
    timestamp: now - ONE_DAY_MS + 5 * 3600 * 1000,
    type: 'expense',
    category: 'expense',
    paymentMethod: 'cash',
    amount: 450,
    notes: 'Bought office stationeries & water',
    synced: true,
    attendantId: 'staff-2',
    attendantName: 'Sarah Amondi',
  },
  {
    id: 'tx-105',
    shiftId: 'shift-99',
    timestamp: now - ONE_DAY_MS + 6 * 3600 * 1000,
    type: 'sale',
    category: 'fuel',
    paymentMethod: 'bank_transfer',
    amount: 25200,
    quantity: 150,
    fuelType: 'Diesel',
    pumpId: 'pump-3',
    synced: true,
    attendantId: 'staff-2',
    attendantName: 'Sarah Amondi',
  },
  {
    id: 'tx-106',
    shiftId: 'shift-99',
    timestamp: now - ONE_DAY_MS + 7 * 3600 * 1000,
    type: 'sale',
    category: 'lubricants',
    paymentMethod: 'mobile_money',
    amount: 3200,
    notes: 'Engine Oil Shell Helix 4L',
    synced: true,
    attendantId: 'staff-2',
    attendantName: 'Sarah Amondi',
  },
  {
    id: 'tx-107',
    shiftId: 'shift-99',
    timestamp: now - ONE_DAY_MS + 8 * 3600 * 1000,
    type: 'sale',
    category: 'fuel',
    paymentMethod: 'credit',
    amount: 32000,
    quantity: 190.47,
    fuelType: 'Diesel',
    pumpId: 'pump-4',
    notes: 'Trans-East Logistics Co. Account',
    synced: true,
    attendantId: 'staff-2',
    attendantName: 'Sarah Amondi',
  },
];

export const SEED_SHIFTS: Shift[] = [
  {
    id: 'shift-99',
    attendantId: 'staff-2',
    attendantName: 'Sarah Amondi',
    startTime: now - ONE_DAY_MS,
    endTime: now - ONE_DAY_MS + 9 * 3600 * 1000,
    status: 'verified',
    startPumpReadings: {
      'pump-1': 124450,
      'pump-3': 156170,
      'pump-4': 73260,
      'pump-6': 48825,
    },
    endPumpReadings: {
      'pump-1': 124500, // Sold 50L Petrol
      'pump-3': 156320, // Sold 150L Diesel
      'pump-4': 73450,  // Sold 190L Diesel
      'pump-6': 48900,  // Sold 75L V-Power
    },
    dipLevelStart: {
      'tank-1': 14800,
      'tank-2': 4540,
      'tank-4': 11225,
    },
    dipLevelEnd: {
      'tank-1': 14750,
      'tank-2': 4200,
      'tank-4': 11150,
    },
    totalSales: 85700,
    totalExpenses: 450,
    revenueBreakdown: {
      cash: 10450,
      mobile_money: 18050,
      bank_transfer: 25200,
      credit: 32000,
      prepaid_wallet: 0,
    },
    taxCalculated: 11813.79, // VAT (16% of sale amount standard calculation e.g. base_sales * 0.16)
    verifiedBy: 'staff-1',
    verifiedAt: now - ONE_DAY_MS + 10 * 3600 * 1000,
    notes: 'Shift completed with perfect reconciliation budget. Verified tank dips matched meter counters at Soroti Station.',
    synced: true,
  },
];

export const INITIAL_CUSTOMERS = [
  {
    id: 'cust-1',
    name: 'Michael Okello',
    phone: '+256 772 123456',
    email: 'michael.okello@gascogroup.com',
    depositBalance: 7500, // In KES Base
    creditLimit: 20000,
    creditBalance: 0,
    bonusPoints: 750,
    tier: 'Gold',
    createdAt: Date.now() - 30 * 24 * 3600 * 1000,
    companyName: 'Gasco Soroti Fleet'
  },
  {
    id: 'cust-2',
    name: 'Florence Ajok',
    phone: '+256 782 987654',
    email: 'florence.ajok@sorotihospital.org',
    depositBalance: 1800,
    creditLimit: 5000,
    creditBalance: 1200,
    bonusPoints: 180,
    tier: 'Silver',
    createdAt: Date.now() - 15 * 24 * 3600 * 1000,
    companyName: 'Soroti Hospital Ambulance'
  },
  {
    id: 'cust-3',
    name: 'Soroti Sugarcane Transit',
    phone: '+256 392 456789',
    email: 'logistics@sorotisugar.co.ug',
    depositBalance: 0,
    creditLimit: 120000,
    creditBalance: 45000,
    bonusPoints: 2400,
    tier: 'VIP',
    createdAt: Date.now() - 90 * 24 * 3600 * 1000,
    companyName: 'Soroti Sugar Works'
  }
];
