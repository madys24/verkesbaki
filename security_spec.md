# Firebase Security Specification (`security_spec.md`)

This security specification defines the access control constraints, data structures, invariants, and validation rules for the PKH Health Verification application.

---

## 1. Data Invariants and Integrity Rules

1. **Master KPM Integrity**:
   - `MasterKPM` records contain critical demographic metrics regarding recipient families.
   - Any insertion or update to `MasterKPM` must conform exactly to structural constraints and must be restricted purely to verified administrative identities.
   - Non-administrators must have read-only access to search and view KPM records.

2. **Verification Submissions (`VerifikasiPKH`)**:
   - Every verification document must link to a valid `KPMID` and have standard status `Tersubmit` upon creation.
   - The status field can only be moved to `Tervalidasi` or `Ditolak` by verified administrators.

3. **Subcollection Atomicity and Relational Integrity**:
   - Detail components (`DetailKomponenVerifikasi`) and verification evidence documents (`DokumenVerifikasi`) exist as hierarchical subcollections under `verifikasi/{verifikasiId}`.
   - Read/write access on children elements requires authorization on the parent transaction.

---

## 2. "Dirty Dozen" Threat Vectors (Malicious Payloads)

Below is the directory of attack vectors designed to bypass security controls, and which must be blocked securely by the ruleset:

1. **Identity Spoofing on User Profile / Admin Claim**:
   - Attempting to update or write an entity while claiming to be an administrator without being the verified user (`androsendy@gmail.com`).
2. **Master KPM Poisoning / Direct Client Hijack**:
   - A non-admin client attempting to delete or overwrite KPM database records directly.
3. **Ghost Fields Injection**:
   - Submitting extra properties (e.g. `isVerifiedAdmin: true`) into the KPM record during creation.
4. **Invalid Subcollection Parent Insertion**:
   - Submitting verification detail logs directly without a valid parent `verifikasiId` or under an arbitrary document identifier.
5. **Denial of Wallet (Huge String ID)**:
   - Injecting a 2MB long random-character string as a document ID to crash or bloat Firestore index memory.
6. **Self-Validating Reports**:
   - A standard user trying to create/update a verification report with the `Status` field pre-set to `Tervalidasi`.
7. **Privilege Escalation on User Status**:
   - Attempting to bypass the administrator checks by mutating `Status` from `Tersubmit` to `Tervalidasi` on a report with a non-admin account.
8. **Malicious Content Injection (Huge payload size)**:
   - Attempting to slide in a description or file URL exceeding reasonable character counts (e.g. 1MB description).
9. **Timestamp Spoofing**:
   - Uploading reports with a custom client-provided fake timestamp (e.g. Year 2045) to manipulate metrics.
10. **Orphaned Subコレクション Creation**:
    - Adding component details targeting a non-existent parent `verifikasiId`.
11. **Spoofed Email / Email Verification Bypass**:
    - Requesting admin authorization with an unverified email address matching the admin's name.
12. **Foreign Data Harvesting / Mass Exfiltration**:
    - Attempting a query-scraping scan to extract confidential recipient addresses without active session authentication.

---

## 3. Test Assertions

| Target Scenario | Operations Allowed | Blocked Violations | Security Assertion |
| :--- | :--- | :--- | :--- |
| **KPM Collection** | `read` (signed-in user) | `create`, `update`, `delete` (non-admin) | Non-admins cannot modify master recipient tables. |
| **Verification Reports** | `create`, `read`, `update` (logged-in user) | Modify fields pre-set to finalized outcomes (non-admin) | Only admins can transition statuses to `Tervalidasi`. |
| **Verification Subcollection** | `read`, `create` (associated user) | Unbounded collections or unvalidated schema | Structural validation helpers verify nested documents. |
