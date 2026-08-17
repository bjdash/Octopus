# ⚡ Octopus Energy Tracker

A modern dark-mode React application to track and visualize live **Octopus Energy** smart meter consumption, settlement intervals, and tariff costs.

---

## 🌟 Key Features

- **⚡ Electricity Dashboard**:
  - Interactive **Calendar Date Picker** to inspect any historical day.
  - Horizontally scrollable bar chart across all **48 half-hour settlement periods**.
  - **Off-Peak Tariff Matrix (00:30 – 05:30)** highlighted in emerald green.
  - Real-time cost estimation based on configurable unit rates and daily standing charge.
  - **Half-Hourly Interval Log** in a stylish list view with quick filter pills.
- **🔥 Gas Dashboard**:
  - Live gas consumption tracking with standard CV thermal conversion.
- **⚙️ Settings & Configuration**:
  - Securely store API keys, meter MPANs/MPRNs, serial numbers, and unit rates locally in your browser (`localStorage`).
- **💎 Cyber Glassmorphism UI**:
  - Glowing dark-mode aesthetic with an ultra-sleek transparent glass bottom navigation bar.

---

## 🛠️ Tech Stack

- **React 18** + **Vite**
- **React Router v6**
- **Lucide Icons**
- **Canvas Confetti**
- **Vanilla CSS** (Custom Glassmorphic Cyber Theme)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Configure Credentials
Navigate to `/settings` and enter your Octopus Energy **API Key**, **Electricity MPAN**, and **Meter Serial Number** to begin pulling live smart meter data.

---

## 🌐 GitHub Pages Deployment

1. Run `npm run build` to generate the production static files into the `/docs` folder.
2. In your GitHub repository, navigate to **Settings** > **Pages**.
3. Under **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` (or your default branch)
   - **Folder**: `/docs`
4. Click **Save**. GitHub Pages will automatically serve the app.

---

## 📜 License

MIT License.
