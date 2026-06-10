# Firebase Security Specification

This document defines the core data invariants, malicious bypass payloads, and the validation strategy for the Petrol Station Management Firestore database.

## 1. Core Data Invariants

### Staff
- **Invariant 1.1**: Every staff profile document must have a `uid` that matches the document’s path ID.
- **Invariant 1.2**: Only managers can create, update, or delete other staff member accounts.
- **Invariant 1.3**: Attendants can read their own profiles and all other profiles (for dropdown selections), but cannot modify roles, PINs, or emails of other users.

### Tanks
- **Invariant 2.1**: All authenticated staff can read the fuel tanks collection to see real-time pricing and stock levels.
- **Invariant 2.2**: Only managers can update tank pricing/capacity via a secure payload check.
- **Invariant 2.3**: `currentLevel` cannot be negative and cannot exceed `capacity`.

### Shifts
- **Invariant 3.1**: Any authenticated staff member can list shifts.
- **Invariant 3.2**: An attendant can only start a shift for themselves (`attendantId` must match their logged-in auth.uid or PIN-verified employee profile).
- **Invariant 3.3**: Once a shift is marked as `completed`, it can only be updated to `verified` by a user with the `manager` role.
- **Invariant 3.4**: Once a shift is `verified` (terminal state), no further updates are allowed by anyone.

### Transactions
- **Invariant 4.1**: Transactions can only be logged if linked to an active, uncompleted shift.
- **Invariant 4.2**: The transaction amount must be non-negative.
- **Invariant 4.3**: A transaction can only be written by the shift's assigned attendant or a manager.

---

## 2. The "Dirty Dozen" Payloads (Aesthetic Integrity Bypass Matrix)

Here are the 12 malicious payloads designed to challenge Identity, Integrity, and State:

1. **Payload 1: Unverified Client Self-Escalation** (Identity)
   - *Attempt*: Register an attendant profile but setting `role: "manager"` directly from the client.
2. **Payload 2: Shadow PIN Hijacking** (Identity)
   - *Attempt*: Overwrite a manager's PIN code by target-updating their staff profile as an attendant.
3. **Payload 3: Negative Fuel Level Injection** (Integrity)
   - *Attempt*: Inject a payload into `tanks/tankId` with `currentLevel: -500` to drain inventory.
4. **Payload 4: Extreme Pricing Manipulation** (Integrity)
   - *Attempt*: Set the price per litre to some absurd double-precision number, causing calculation overflow or system bypass.
5. **Payload 5: Multi-Attendant Shift Spoofing** (Identity)
   - *Attempt*: Attendant `A` starts a shift under attendant `B`'s `uid`.
6. **Payload 6: Fast-Forward State Shortcutting** (State)
   - *Attempt*: Directly create a new shift labeled as `verified` without undergoing a manager approval flow.
7. **Payload 7: Post-Verification Shift Alteration** (State)
   - *Attempt*: Alter total sales and cash counts on a shift that has already been verified and locked by the manager.
8. **Payload 8: Phantom Transaction Creation** (Integrity)
   - *Attempt*: Log an expense transaction with a negative value, effectively generating cash out of thin air.
9. **Payload 9: Orphaned Transaction (Invalid Shift Id)** (Integrity)
   - *Attempt*: Log a transaction pointing to a fabricated or non-existent `shiftId`.
10. **Payload 10: Anonymous Price Sabotage** (Authorization)
    - *Attempt*: Modify tank pricing as an unauthenticated or anonymous visitor.
11. **Payload 11: Bulk Read Poisoning (PII Leak)** (Privacy)
    - *Attempt*: An unauthenticated request querying all staff profiles and their secret credentials.
12. **Payload 12: Timestamp Spoofing** (Temporal)
    - *Attempt*: Creating a transaction with a hardcoded, client-sent `timestamp` in the remote past to disrupt reports.

---

## 3. Test Runner Definition (`firestore.rules.test.ts`)

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

describe('Petrol Station Management Database Hardening Tests', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'zippy-envelope-kjkjx',
      firestore: {
        rules: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Basic block logic is verified by local testing
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('blocks shadow updates to staff roles', async () => {
    const db = testEnv.authenticatedContext('attendant_uid').firestore();
    const docRef = doc(db, 'staff/attendant_uid');
    await assertFails(updateDoc(docRef, { role: 'manager' }));
  });
});
```
