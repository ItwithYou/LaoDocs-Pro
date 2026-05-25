# 🛠️ Hostinger Deployment & Google Sign-In Setup Guide (ຄູ່ມືການຕິດຕັ້ງເທິງ Hostinger)

This guide provides a comprehensive step-by-step walkthrough to successfully run **LaoDocs Pro** on your Hostinger domain (`https://laodocs.com`) with full backend capabilities (Express APIs for Gemini) and secure Google Authentication.

---

## ບັນຫາທີ 1: Google login popup ປາກົດຂຶ້ນແລ້ວຫາຍໄປທັນທີ (Popup Disappears)

### 🔴 ສາເຫດ (Root Cause)
ເມື່ອມີການກົດປຸ່ມ Google Sign-In, Firebase ຈະເປີດປ໊ອບອັບຂຶ້ນມາ. ຖ້າໂດເມນ `laodocs.com` ຍັງບໍ່ໄດ້ເຊື່ອມຕໍ່ ຫຼື ຍັງບໍ່ໄດ້ຮັບອະນຸຍາດໃນ **Firebase Console**, Firebase ຈະບລັອກການເຊື່ອມຕໍ່ນັ້ນທັນທີ ເຮັດໃຫ້ປ໊ອບອັບປິດລົງເອງ.

### 🟢 ວິທີແກ້ໄຂ (How to Fix)

1. **ເຂົ້າໄປທີ່ Firebase Console:**
   - ໄປທີ່ເວັບໄຊ [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - ເລືອກໂຄງການ (Project) ຂອງທ່ານທີ່ໃຊ້ກັບແອັບນີ້.

2. **ເພີ່ມໂດເມນຮັບອະນຸຍາດ (Add Authorized Domains):**
   - ໄປທີ່ເມນູ **Authentication** ຢູ່ແຖບດ້ານຊ້າຍ.
   - ຄລິກໃສ່ແຖບ **Settings** (ດ້ານເທິງ).
   - ຄລິກໃສ່ເມນູ **Authorized domains** (ໂດເມນທີ່ໄດ້ຮັບອະນຸຍາດ).
   - ຄລິກປຸ່ມ **Add domain** ແລ້ວເພີ່ມ:
     * `laodocs.com`
     * `www.laodocs.com`

3. **ເພີ່ມໃນ Google Cloud Console OAuth (ຖ້າຈຳເປັນ):**
   - ໄປທີ່ [https://console.cloud.google.com/](https://console.cloud.google.com/)
   - ເລືອກໂຄງການດຽວກັນ, ແລ້ວໄປທີ່ **APIs & Services > Credentials**.
   - ຄລິກແກ້ໄຂ **OAuth 2.0 Client ID** ຂອງທ່ານ.
   - ຢູ່ທີ່ **Authorized JavaScript origins**, ເພີ່ມ:
     * `https://laodocs.com`
     * `https://www.laodocs.com`
   - ກົດ **Save**.

---

## ບັນຫາທີ 2: ຟັງຊັນການແປງເອກະສານບໍ່ເຮັດວຽກ / "Unexpected token '<'..." / API returns HTML page

### 🔴 ສາເຫດ (Root Cause)
ໃນຮູບໜ້າຈໍ Hostinger ຂອງທ່ານ, ທ່ານໄດ້ຕັ້ງຄ່າ **Framework Preset** ເປັນ **"Vite"**. 
* **Vite Preset** ຈະຖືກ Hostinger ຮັບຮູ້ວ່າເປັນ **"Static SPA Web"** (ເວັບໄຊ້ສະຖິຕິ). ມັນຈະທຳການ compile ແລ້ວສົ່ງໄຟລ໌ static ໃນໂຟເດີ `dist/` ໃຫ້ກັບຜູ້ໃຊ້ໂດຍກົງ.
* ມັນຈະ **ບໍ່ເປີດໃຊ້ງານ backend server (Express/Node.js)** ທີ່ຢູ່ໃນໄຟລ໌ `server.ts` / `dist/server.cjs` ຂອງທ່ານເລີຍ.
* ດັ່ງນັ້ນ, ທຸກໆຄັ້ງທີ່ແອັບພລິເຄຊັນຮ້ອງຂໍ API ໄປຫາ `/api/gemini/convert`, Nginx ຂອງ Hostinger ທີ່ບໍ່ຮູ້ຈັກ API ນີ້ ຈະສົ່ງໄຟລ໌ `index.html` ຂອງ React ຕອບກັບມາແທນ. ຕົວແປງ JSON ຈຶ່ງພົບຂໍ້ຜິດພາດ ເພາະມັນໄດ້ຮັບໄຟລ໌ HTML (ເລີ່ມຕົ້ນດ້ວຍ `<!DOCTYPE html>...`) ແທນທີ່ຈະຮັບຄ່າ JSON!

---

### 🟢 ວິທີແກ້ໄຂ: ປ່ຽນການຕິດຕັ້ງເທິງ Hostinger ໃຫ້ເປັນ Node.js Application

ເພື່ອໃຫ້ຟັງຊັນທັງໝົດ (OCR, Translate, Format) ເຮັດວຽກໄດ້, ທ່ານຈຳເປັນຕ້ອງໃຊ້ບໍລິການ **Node.js** ຂອງ Hostinger ບໍ່ແມ່ນ Static Vite.

#### ຂັ້ນຕອນທີ 1: ສ້າງໂຄງການ Node.js ໃນ hPanel
1. ເຂົ້າໄປທີ່ **Hostinger hPanel**.
2. ຄົ້ນຫາຄຳວ່າ **Node.js** ຢູ່ໃນແຖບຄົ້ນຫາ hPanel ຫຼື ເລືອກ **VPS / Advanced > Node.js**.
3. ຄລິກສ້າງ **Node.js Application** ໃໝ່ ຫຼື ຕັ້ງຄ່າ Node.js Settings ໃຫ້ກັບໂດເມນ `laodocs.com`.
4. ກຳນົດຄ່າດັ່ງນີ້:
   - **Node.js Version:** ເລືອກເວີຊັນ `20.x` ຫຼື `22.x` (ກົງກັບໃນ package.json ຂອງທ່ານ).
   - **Application Directory:** `laodocs.com` (ຫຼື ໂຟເດີທີ່ທ່ານເກັບໄຟລ໌ໂຄງການ).
   - **Application Startup File:** `dist/server.cjs` (ໄຟລ໌ນີ້ຖືກ bundle ຂຶ້ນມາໂດຍ esbuild ໃຫ້ໃຊ້ງານໄດ້ກັບ Node deployment).
   - **Run Command/Build:** `npm run build`
   - **Environment Variables:**
     * `NODE_ENV=production`
     * `GEMINI_API_KEY=YOUR_ACTUAL_API_KEY` (ເອົາຄ່າ Key ຕົວຈິງຂອງ Gemini ມາໃສ່)
     * `PORT=3000`

#### ຂັ້ນຕອນທີ 2: ການ Build ແລະ ສົ່ງໄຟລ໌ຂຶ້ນ Server (Build Process)
ເມື່ອທ່ານທຳການ Deploy ຜ່ານ GitHub ຫລື Upload ໄຟລ໌ຄູ່ມືດ້ວຍ File Manager:
1. ໃຫ້ແນ່ໃຈວ່າໄດ້ມີການ Run ຄຳສັ່ງ Build:
   ```bash
   npm run build
   ```
   *ຫມາຍເຫດ:* ຄໍາສັ່ງນີ້ຈະເຮັດການ Compile React App ໄປຫາ `/dist` ແລະ Bundle server ໄປຫາ `/dist/server.cjs`.
2. ໃນໂຟເດີໂຄງການເທິງ Hostinger:
   - ຕ້ອງມີໂຟເດີ `/dist` (ມີ `server.cjs` ແລະ assets ຂອງເວັບ).
   - ມີໄຟລ໌ `package.json` ແລະ `node_modules` ທີ່ໄດ້ຕິດຕັ້ງ dependencies ແລ້ວ.

#### ຂັ້ນຕອນທີ 3: ເປີດໃຊ້ງານ App (Start application)
- ຢູ່ໜ້າ Node.js App ໃນ Hostinger hPanel, ໃຫ້ກົດປຸ່ມ **Start** ຫຼື **Restart** ແອັບພລິເຄຊັນ.
- ກະລຸນາກວດສອບ **Runtime logs** ເທິງ Hostinger ເພື່ອເບິ່ງວ່າມີ Error ຫຼື ບໍ່.

---

## 💡 ແຜນວາງຜັງການເຮັດວຽກ (Visual Architecture Summary)

```
[ FRONTEND ] ──(fetch /api/gemini/convert)──> [ HOSTINGER NODE.JS RUNTIME ]
     │                                                     │
     │ (Firebase Auth PopUp)                               │ (Interacts with Gemini API)
     ▼                                                     ▼
[ FIREBASE AUTH SERVICE ] <──(Validates Domain)── [ GOOGLE AI STUDIO (GEMINI 3.5) ]
 (Authorized: laodocs.com)
```

## 📝 ວິທີການແກ້ໄຂໄຟລ໌ Configuration ຂອງ Hostinger `Settings` (ຈາກຮູບພາບຂອງທ່ານ)
ໃນປັດຈຸບັນ, ທ່ານໄດ້ຕັ້ງຄ່າ **Framework Preset** ໃນປ໊ອບອັບ `Settings and redeploy` (ຮູບທີ 3 ຂອງທ່ານ) ເປັນ `Vite`.
* ໃຫ້ທຳການລົບ ຫຼື ກົດປ່ຽນ Preset ນັ້ນ ຫາກ Hostinger ມີ Preset custom ຫຼື **Node.js**.
* ຫາກ Hostinger ບັງຄັບໃຫ້ໃຊ້ static deployment ຜ່ານ Git module ນີ້ເທົ່ານັ້ນ, ທ່ານຈະຕ້ອງແຍກ Runtime:
  1. ໂຮສ Frontend ຢູ່ໂດເມນ `laodocs.com` (ຜ່ານ static hosting ນີ້).
  2. ໂຮສ Backend (Express server) ຢູ່ Cloud hosting ທີ່ຮອງຮັບ Node (ເຊັ່ນ Render, Railway, Vercel, VPS) ແລ້ວປ່ຽນ URL fetch ໃນ `DocumentConverter.tsx` ໃຫ້ຊີ້ໄປຫາ Backend ດັ່ງກ່າວ.
  3. **ແຕ່ແນະນຳທີ່ສຸດ:** ປ່ຽນແພັກເກັດການໃຊ້ງານຂອງໂດເມນ `laodocs.com` ໃຫ້ເປັນ **Node.js Hosting** ເທິງ Hostinger ເພື່ອໃຫ້ມັນ Run ໄດ້ທັງ Frontend ແລະ Backend ພ້ອມກັນໃນບ່ອນດຽວ!
