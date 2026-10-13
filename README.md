# Vaccine Distribution Inventory Control System and Cold Storage Thermal Tracking Hub (VaxTrack)

> **CSE Final / Mini Project** • Software-Only Implementation • Zero Physical Hardware Dependency

---

## 🌐 Live Application Links
* **Frontend Web Application:** **[http://localhost:5173](http://localhost:5173)**
* **Backend REST API:** **[http://127.0.0.1:5000/api/health](http://127.0.0.1:5000/api/health)**
* **One-Click Startup:** Double click `run_project.bat` in the project root folder.

---

## 📊 Real-World Cold-Chain Telemetry Dataset (batch001)
The system now integrates the real-world cold-chain dataset tracking **Batch `batch001` (Jharkhand)** across its 3-phase cold-chain lifecycle:
1. **Phase 1: Ultra-Low Temperature (ULT) Storage (-70°C to -65°C):** 380 hours recorded, reaching 720 hours maximum ULT capacity.
2. **Phase 2: Thawed Standard Refrigeration (2°C to 4°C):** 119 hours recorded with active thawed shelf-life countdown (120h down to 0h).
3. **Phase 3: Thermal Excursion Breach (14°C) & Discard Hop:** System automatically detects out-of-bound temperature, flags expiry, locks batch, and routes to `dest_discarded_vaccine_storage_unit`.

Because physical IoT sensors (ESP32, DHT22, RFID) are outside the pure-software scope of a CSE degree, this system implements **Method A: The Virtual Cold Storage Simulator**, which models the thermodynamics of refrigeration units, heat loss events, and compressor failures entirely in software.

---

### 🔐 Dual Role-Based Authentication & Separate Login Pages
1. **Portal Gateway Landing (`/`):** Professional portal selector allowing users to choose their designated portal door.
2. **Hospital / Pharmacy Login Page:**
   - Dedicated medical-themed authentication portal strictly for healthcare and pharmacy personnel.
   - Specific fields for Hospital Staff Email, Password, and Clinical Station / Department Code.
   - Pre-configured 1-click viva credentials for CityCare General Hospital and Green Valley Clinic.
   - Direct switch link to the Manufacturer login page.
3. **Manufacturer Login Page:**
   - Dedicated industrial-themed authentication portal strictly for vaccine manufacturers and distributors.
   - Specific fields for Corporate Email, Password, and Manufacturing Plant ID / License Number.
   - Pre-configured 1-click viva credential for Apex Biologics & Vaccines Ltd.
   - Direct switch link to the Hospital login page.

### 🏭 Manufacturer Features
1. **Executive Operations Dashboard:** National aggregate demand, unfulfilled order backlog, active production lots, and freight shipments.
2. **Aggregate Demand Planning:** Cross-facility demand synthesis to calculate recommended production batch sizes.
3. **Hospital Request Fulfillment:** Triage hospital replenishment orders: Approve, Dispatch with cold-packaging parameters, or Reject.
4. **Supply & Production Scheduling:** Schedule automated vial filling runs and track lot release dates.
5. **Cold-Chain Transit Tracking:** Monitor passive phase-change freight in transit with simulated continuous temperature tracking (4.2°C).
6. **Raw Material & Packaging Calculator:** Automatically calculates required borosilicate glass vials, elastomeric stoppers, aluminum seals, and isothermal shipping boxes.
7. **Hospital Query Desk:** Resolve hospital inquiries regarding cold-chain compliance and batch documentation.

---

## 🧮 Mathematical & AI Algorithms

### 1. Mean Kinetic Temperature (WHO / USP Arrhenius Equation)
Rather than simple arithmetic averaging, pharmaceutical protein degradation follows non-linear Arrhenius kinetics:

$$T_k = \frac{\frac{\Delta H}{R}}{-\ln \left(\frac{1}{n} \sum_{i=1}^{n} \exp\left(-\frac{\Delta H}{R \cdot T_i}\right)\right)} - 273.15$$

Where:
- $\Delta H = 83.144 \text{ kJ/mol}$ (Activation energy for biological proteins)
- $R = 8.3144 \times 10^{-3} \text{ kJ/(mol}\cdot\text{K)}$ (Universal gas constant)
- $T_i$ = Absolute temperature in Kelvin

### 2. Time-Series Demand Forecasting
Combines polynomial trend estimation with day-of-week seasonality multipliers (capturing weekday pediatric clinic peaks and weekend reduced operation):

$$\hat{D}_t = (\alpha \cdot t + \beta) \times S_{\text{dow}(t)}$$

### 3. Inventory Reorder Point (ROP) & Safety Stock
- $\text{Safety Stock} = \text{Daily Burn Rate} \times 7 \text{ days}$
- $\text{Reorder Point (ROP)} = (\text{Daily Burn Rate} \times \text{Lead Time}) + \text{Safety Stock}$

---

## 🛠️ Technology Stack
- **Frontend:** React 19, Vite, Tailwind CSS, Recharts, Lucide Icons
- **Backend API:** Python 3.11, Flask REST API (Modular architecture)
- **Database:** SQLite3 (`vaccine_system.db`, file-based relational DB with foreign keys)
- **Data Science:** NumPy, Scikit-Learn, Pandas

---

## 💻 How to Run the Project

### Option A: One-Click Startup (Recommended)
Double-click `run_project.bat` in the project root directory. It will:
1. Start the Flask Backend on `http://127.0.0.1:5000`
2. Start the React Frontend on `http://localhost:5173`
3. Launch your web browser automatically!

### Option B: Manual Terminal Execution

#### Terminal 1 — Backend:
```bash
python -m backend.app.main
```
*(Runs on http://127.0.0.1:5000)*

#### Terminal 2 — Frontend:
```bash
cd frontend
npm.cmd run dev
```
*(Runs on http://localhost:5173)*

---

## 🔑 Pre-Configured Demo Accounts (For Viva/Demo)
Use the 1-Click Role Switcher buttons at the top of the screen or sign in with:

| Role | Facility Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Hospital** | CityCare General Hospital | `hospital@citycare.org` | `hospital123` |
| **Clinic** | Green Valley Community Health | `clinic@greenvalley.org` | `clinic123` |
| **Manufacturer** | Apex Biologics & Vaccines Ltd. | `manufacturer@serumlab.com` | `admin123` |

---

## 🎓 Sample Viva / Presentation Questions & Answers

**Q1: How did you implement cold-chain temperature tracking without hardware?**
> *Answer:* We developed Method A: A Virtual Cold Storage Thermodynamic Simulator. It models the thermal physics of refrigeration units in software (including compressor failures, door opening heat intrusion, and freezing faults). It calculates the WHO standard Mean Kinetic Temperature (MKT) using the Arrhenius equation and triggers automated quarantine locks on degraded vaccine batches.

**Q2: Why use Mean Kinetic Temperature instead of simple average temperature?**
> *Answer:* Biological vaccines degrade exponentially at higher temperatures according to chemical kinetics. Simple arithmetic mean underestimates thermal degradation. MKT weights higher excursion temperatures higher, giving a true clinical representation of vaccine shelf-life stability.

**Q3: How does the AI demand forecasting work?**
> *Answer:* The forecasting engine analyzes 60 days of historical daily administration logs. It decomposes consumption into an underlying trend line and seasonal day-of-week multipliers (accounting for scheduled immunization clinics vs weekend emergency operation), predicting 7, 30, and 90-day needs with 95% confidence intervals.

**Q4: How does inter-hospital redistribution prevent vaccine wastage?**
> *Answer:* When a hospital has an active batch whose remaining shelf life is shorter than its local depletion velocity, the smart redistribution algorithm detects this and pairs the batch with a neighboring hospital suffering from an imminent stockout for that vaccine.
