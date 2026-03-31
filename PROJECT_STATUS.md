# AMY.SALON 專案狀態紀錄

最後更新：2025-07-15

## 1. 專案簡述

本專案為「AMY.SALON 美髮院管理系統」，用於管理預約、客戶資料、服務項目與排班的網頁應用程式。

- **前端技術棧**：React (with Hooks), TypeScript, Vite
- **UI/樣式**：Tailwind CSS（暖色奶油/棕色調）
- **後端與資料庫**：Firebase / Firestore（含離線持久化）
- **部署**：Vercel（自動部署）
- **原始碼**：GitHub `https://github.com/lingulin69-debug/hair-appointment-app.git`
- **線上網址**：`https://hair-appointment-app-nine.vercel.app`

## 2. 目前已完成功能

### 核心功能
- **日曆預約管理**：新增、檢視、刪除預約
- **顧客管理**：新增、編輯、刪除顧客，含電話撥打功能
- **服務與商品管理**：新增、編輯、刪除服務項目與產品
- **預約統計 Dashboard**：顯示預約總數、不重複顧客數

### UI/UX 功能
- **Modal 動畫系統**：統一的 Modal 進入/退出動畫（useModalAnimation hook）
- **計算機功能**：內建計算機 Modal
- **月份/年份選擇器**：快速切換日曆月份
- **預約詳情 Modal**：含兩步驟確認刪除按鈕
- **所有 Modal 手機滑動支援**：各 Modal 面板加入 `overflow-y-auto`
- **捲動提示指標**：
  - Modal 內容向下捲動指標（彈跳箭頭）
  - 導覽列標籤左右捲動指標（脈衝動畫箭頭）
  - 主內容區向下捲動指標

### 資料與效能
- **Firebase 離線持久化**：使用 `persistentLocalCache` + `persistentMultipleTabManager`
- **localStorage 快取**：預約、服務項目、顧客資料本地快取，首次之後秒開
- **同步資料按鈕**：手動確認所有資料已上傳至 Firebase（顯示 線上/同步中/已同步/離線 狀態）
- **懶載入**：ClientList、ServiceList、Dashboard 使用 `React.lazy` + `Suspense`

## 3. 已修正問題（歷史記錄）

### Firebase 相關
- **[修正] Firebase 400 Bad Request**：`MESSAGING_SENDER_ID` 少了前綴 `2`（35593383196 → 235593383196）
- **[修正] Firebase 手機端無法同步**：需將 Vercel 部署域名加入 Firebase Authorized Domains
- **[修正] Vercel 環境變數遺失**：重新設定 6 個 Firebase 環境變數

### Modal 自動關閉
- **[修正] 所有 Modal 儲存後不自動關閉**：
  - 改用 `try-finally` 結構，驗證通過後無論 Firebase 結果如何都關閉 Modal
  - 新增 `isSaving` 狀態防止重複點擊
  - 修正 `tempPrice` 未加入 `useCallback` 依賴陣列的 bug

### UI 問題
- **[修正] 手機版 Modal 底部按鈕被截斷**：所有 Modal 面板加入 `overflow-y-auto`
- **[修正] Navbar JSX 結構錯誤**：修正缺少的 `</div>` 關閉標籤
- **[修正] `.gitignore` 編碼問題**：PowerShell `echo >>` 產生錯誤編碼，改用 `[System.IO.File]::WriteAllText()`

### 資料層重構
- **[修正] `ReferenceError: COL is not defined`**：`useAppointments.ts` 缺少 `COL` 變數定義
- **[重構] Hooks 資料層統一**：所有 hooks 改為直接使用 Firestore SDK，路徑統一使用 `colPath`
- **[修正] `calcTotalPrice` 函式未定義**：加入正確實作

## 4. 品牌與部署

- **網站名稱**：AMY.SALON（從 H.SALON 改名）
- **Open Graph 標籤**：已加入社群分享預覽（og:title, og:description, og:url）
- **Dashboard**：已移除「平均客單」統計卡，改為 2 欄格線

## 5. 檔案結構重點

```
src/
  hooks/
    useAppointments.ts  — 預約 CRUD + 快取
    useClients.ts       — 顧客 CRUD + 快取
    useStoreItems.ts    — 服務/商品 CRUD + 快取
    useLeaves.ts        — 休假管理
    useSync.ts          — 手動同步 + 連線狀態
    useModalAnimation.ts — Modal 動畫控制
  config/
    firebase.ts         — Firebase 初始化 + 離線持久化
  utils/
    cache.ts            — localStorage 快取層
    performance.ts      — 效能計時工具
    schedule.ts         — 日期範圍工具
```

- **[修復] 預覽版日曆未顯示**：
  - 問題主因是 `src/components/Calendar/Calendar.tsx` 內容被 placeholder 取代，實際上沒有渲染完整月曆格線與日期內容。
  - 同時 `useLeaves.ts` 回傳的 `leaveSet` 為函式而非 `Set<string>`，與 Calendar 的使用方式不一致。
  - 已補回月曆 UI、日期選取、預約顯示與休假切換，並修正 `leaveSet` 的資料型別。

## 4. 尚未完成

- **其餘 Modal 動畫整併**：`NewApptModal` 等其餘彈窗仍待併入共用動畫規範。
- **交互體驗優化 (Polish)**：元件之間的交互、載入狀態、空狀態、錯誤提示等細節尚未完全打磨。
- **Firebase 資料結構驗證**：目前的 Firestore 資料模型是基於初期需求建立的，尚未經過完整的功能驗證，未來可能需要調整。

## 5. 待優化

- **Modal 動畫體驗**：新增預約等彈窗的動畫可以參考 iOS 原生風格，使其更流暢、現代。
- **UX 流程驗證**：服務項目與價格目前是分開的，需要在實際操作中驗證此設計是否符合使用者習慣。
- **動畫邏輯共用**：應將 Modal 動畫抽離為共用邏輯（例如 custom hook 或 transition 元件），避免在每個 Modal 中重複撰寫 `animate-in`, `slide-in-from-bottom` 等 class。
- **TypeScript 型別**：專案中仍有部分 `any` 型別，可逐步收緊，提升程式碼健壯性。
- **共用型別定義**：雖然有 `src/types` 目錄，但可考慮建立一個更全面的 `types.ts` 或 `types/index.ts` 作為單一來源 (Single Source of Truth)，統一管理所有共用型別。

## 6. 已知風險 / 注意事項

- **避免大規模重構**：目前核心功能剛恢復運作，應避免對現有 Hooks (`useAppointments` 等) 或 `App.tsx` 的 props 傳遞流程進行大規模重構。
- **資料流穩定性優先**：若需修改，應優先確保 `App.tsx` -> `Calendar` -> `Modal` 之間的資料流穩定，避免破壞現有功能。
- **動畫 Class 驗證**：專案中可能看到 `animate-in`, `zoom-in-95`, `slide-in-from-bottom-*` 等 Tailwind 動畫類名，但 `tailwind.config.ts` 未必已正確配置。使用前需確認 `tailwindcss-animate` 套件與相關設定是否已安裝並生效。
- **漸進式優化**：若要優化 UI 或動畫，建議採用小步、漸進式修改，不要為了一個小功能而重構整個 UI 架構。

## 7. 建議下一步

1.  **完成剩餘 Modal 動畫整併**：將 `NewApptModal` 等尚未接入的彈窗統一改為共用動畫邏輯。
2.  **驗證行動裝置體驗**：在手機等小螢幕尺寸上完整測試目前的所有功能，特別是 Modal 的顯示與滾動行為。
3.  **審核型別與資料流**：回頭檢視各元件的 props 與 state 型別定義，確保資料流的穩定性與可預測性。
4.  **驗證 Firebase 資料模型**：持續確認 Firestore 欄位與前端 UI/流程是否一致，避免後續擴充時產生結構落差。

## 8. 已修改檔案紀錄

以下為本次交接前已確認修改的核心檔案：

- `src/hooks/useAppointments.ts`
- `src/hooks/useClients.ts`
- `src/hooks/useLeaves.ts`
- `src/hooks/useModalAnimation.ts`
- `src/styles/modalAnimation.ts`
- `src/components/Calendar/Calendar.tsx`

## 9. 2026-03-29 本輪進度摘要

- 已完成 `App.tsx`、`ClientList.tsx`、`ServiceList.tsx`、`NewApptModal.tsx` 的資料流整理。
- 目前 `useStoreItems`、`useClients`、`useAppointments` 已集中由 `App.tsx` 頂層呼叫，再以 props 傳入頁面組件。
- `ClientList.tsx` 與 `ServiceList.tsx` 已收斂為展示型組件，僅接收 props，不再在子層重複取資料。
- `App.tsx` 的 `openNewAppointmentModal` 已改為直接開啟 Modal，不再用 `try...catch` 在錯誤時主動關閉。
- `NewApptModal.tsx` 已放寬為即使 `clients` / `storeItems` 為空陣列時也能顯示視窗，並在窗內呈現 loading 提示。
- `Calendar.tsx` 已補上 `appointments` 的空值防護，避免 `.filter()` 或排序時因 `undefined` 造成日曆網格渲染失敗。
- 已執行 `npm run build`，當時建置成功。

## 10. 目前未修項目

- 原先「點擊日曆新增按鈕後可能觸發錯誤邊界」的問題已於本輪修復，詳見下方第 12 節。
- 目前本輪未發現新的阻斷性錯誤，但仍建議持續驗證：
  - 小螢幕裝置上的 Modal 顯示與滾動行為。
  - `NewApptModal` 在 clients / services 尚未載入完成時的實機操作流程。

## 11. 下一步建議

1. 先檢查 `NewApptModal.tsx` 是否有任何 hook 放在條件式 `return` 之後。
2. 確認 `App.tsx -> Calendar.tsx -> NewApptModal.tsx` 的開窗鏈路中，沒有額外的 early return 或錯誤吞沒。
3. 若要正式修復，建議先從 `NewApptModal.tsx` 做最小變更，再回測日曆 `+` 按鈕。

## 12. 2026-03-29 Modal 崩潰修復摘要

- **已確認根因**：
  - `src/components/Calendar/NewApptModal.tsx` 在 `if (!shouldRender) return null` 之後才宣告 `useMemo` / `useEffect`。
  - 當 Modal 先以關閉狀態 render，再切換為開啟狀態時，React 會因 hook 呼叫數量改變而拋出 `Rendered more hooks than during the previous render.`。
- **已完成修復**：
  - 保留原本 `shouldRender` 控制掛載/退場的行為。
  - 將 early return 移到所有 hooks 宣告之後，確保每次 render 的 hook 順序固定一致。
- **已補回歸測試**：
  - 新增 `src/components/Calendar/NewApptModal.test.tsx`。
  - 測試內容為：元件先以 `isOpen=false` render，再 rerender 成 `isOpen=true`，驗證 Modal 可正常顯示，不再觸發 hook 順序錯誤。
  - 此測試在修復前實際失敗，錯誤訊息即為 `Rendered more hooks than during the previous render.`，修復後轉為通過。
- **測試與驗證結果**：
  - `npm test -- NewApptModal`：通過。
  - `npm run build`：通過。
- **本輪新增/修改檔案**：
  - `src/components/Calendar/NewApptModal.tsx`
  - `src/components/Calendar/NewApptModal.test.tsx`
  - `src/test/setup.ts`
  - `vite.config.ts`
  - `package.json`

## 13. 2026-03-29 首屏與頁面載入效能修正

- **已修正問題**：
  - `App.tsx` 原本會在首屏同時啟動 `appointments`、`clients`、`storeItems`、`leaves` 四條 Firestore 訂閱，不論目前是否真的需要該頁資料。
  - `useAppointments.ts` 與 `useLeaves.ts` 原本是全量 collection 訂閱，資料量上升後會直接拖慢日曆頁初次載入。
  - `Calendar.tsx` 原本在渲染每一個日期格時都對整份 `appointments` 再做一次 `.filter()`，而且排序邏輯在 hook 與 UI 端重複執行。
- **本輪修正內容**：
  - `App.tsx` 已改為按頁面/Modal 需求啟動資料訂閱：
    - Calendar / NewApptModal 才載入 `appointments`
    - Services / ItemModal / NewApptModal 才載入 `storeItems`
    - Clients / ClientForm / NewApptModal 才載入 `clients`
    - Calendar 才載入 `leaves`
  - `useAppointments.ts` 已支援以日期區間查詢，日曆頁只抓當前可視月份資料。
  - `Dashboard` 所需預約資料改為最近 7 天區間，而非整包預約資料。
  - `useLeaves.ts` 已支援日期區間查詢，避免把所有休假資料全量載入。
  - `Calendar.tsx` 改為先依 `dateStr` 分組，再讓每個日期格直接讀取該日資料，移除重複排序與重複掃描。
- **驗證結果**：
  - `npm test`：通過。
  - `npm run build`：通過。
- **本輪新增/修改檔案**：
  - `src/utils/schedule.ts`
  - `src/utils/schedule.test.ts`
  - `src/App.tsx`
  - `src/hooks/useAppointments.ts`
  - `src/hooks/useClients.ts`
  - `src/hooks/useLeaves.ts`
  - `src/hooks/useStoreItems.ts`
  - `src/components/Calendar/Calendar.tsx`

## 14. 2026-03-29 第二輪載入效能修正

- **問題背景**：
  - 第一輪雖已縮小 Firestore 查詢範圍與頁面訂閱數量，但使用者實測「日曆」與「服務與商品」體感載入仍未改善。
  - 判斷剩餘瓶頸主要在於：
    - 首次遠端資料回應前沒有可立即顯示的本地資料。
    - Firestore 採用即時訂閱作為首屏資料來源，導致冷啟動仍需等待通道建立。
    - 首包仍載入過多頁面與第三方依賴。
- **本輪修正內容**：
  - 新增 `src/utils/cache.ts`，提供版本化 `localStorage` 快取讀寫能力。
  - `useStoreItems.ts` 改為 cache-first：
    - 先讀本地快取立即顯示。
    - 再以 `getDocs()` 背景刷新。
    - 新增/刪除項目後直接同步本地 state，避免依賴下一次遠端回傳才更新畫面。
  - `useAppointments.ts` 改為 cache-first：
    - 先讀目前日期區間的本地快取。
    - 再以 `getDocs()` 取得最新資料。
    - 新增/修改/改期/刪除預約後直接更新本地 state 與快取。
  - `useLeaves.ts` 改為 cache-first：
    - 移除首屏即時訂閱。
    - 改為本地快取 + `getDocs()` 背景刷新。
    - 休假新增/刪除直接更新本地 state。
  - `src/config/firebase.ts` 已優先啟用 Firestore `persistentLocalCache` 與 multi-tab manager，若初始化失敗才退回預設模式。
  - `App.tsx` 已將 `ClientList`、`ServiceList`、`Dashboard` 改為 lazy loading。
  - `vite.config.ts` 已新增 `manualChunks`，把 `react`、`firebase`、`lucide` 拆成獨立 chunk。
- **測試與驗證結果**：
  - `npm test`：通過。
  - `npm run build`：通過。
  - build 結果顯示主入口 `index` chunk 已明顯縮小，改為由 `react-vendor` / `firebase` 等獨立 chunk 承載共用依賴。
- **本輪新增/修改檔案**：
  - `src/utils/cache.ts`
  - `src/utils/cache.test.ts`
  - `src/hooks/useAppointments.ts`
  - `src/hooks/useLeaves.ts`
  - `src/hooks/useStoreItems.ts`
  - `src/config/firebase.ts`
  - `src/App.tsx`
  - `vite.config.ts`

## 15. 2026-03-29 第三輪體感載入修正

- **問題背景**：
  - 使用者回報日曆仍需約 20 秒才「看起來出現」，代表除了資料等待外，UI 本身仍把 loading 狀態表現成整個頁面延後顯示。
- **本輪修正內容**：
  - `Calendar.tsx` 改為即使 `isLoading=true` 也先渲染完整月曆格線與日期骨架，只在頂部顯示同步提示，並於空白日期格內顯示輕量 shimmer。
  - `ServiceList.tsx` 重寫為乾淨版本，改成頁面框架先顯示、資料背景同步，不再以 loading 阻塞整個主畫面。
  - 新增 `src/utils/performance.ts`，在 `useAppointments.ts`、`useStoreItems.ts`、`useLeaves.ts` 中記錄實際遠端資料載入耗時，開發模式下可從瀏覽器 console 直接看到對應毫秒數。
- **測試與驗證結果**：
  - `npm test`：通過。
  - `npm run build`：通過。
- **本輪新增/修改檔案**：
  - `src/components/Calendar/Calendar.tsx`
  - `src/components/Services/ServiceList.tsx`
  - `src/utils/performance.ts`
  - `src/hooks/useAppointments.ts`
  - `src/hooks/useStoreItems.ts`
  - `src/hooks/useLeaves.ts`

## 16. 2026-03-29 待辦優化清單

- **語系統一**：
  - 將介面中所有英文文案改為中文，包含頁面標題、按鈕、欄位標籤、空狀態、提示訊息、統計面板與 Modal 內容。

- **預約時間選單擴充**：
  - `NewApptModal` 的小時下拉選單新增 `08`、`09`、`21`、`22`、`23`。
  - 需同步確認佔用時間判定與可選分鐘邏輯仍正確。

- **日曆格資訊視覺重設**：
  - 日曆方格內的顧客資訊改為圓形 avatar 樣式，縮減佔位並提高閱讀性。
  - 圓圈內顯示顧客姓氏，需定義中文姓名與非中文姓名的取字規則。

- **日曆資料顯示效能優化**：
  - 目前月曆格線出現速度已改善，但顧客資訊顯示仍慢。
  - 需進一步拆分「日曆框架 render」與「預約內容 hydrate / 顯示」的瓶頸，優化預約卡/圓點內容渲染策略。

- **服務與商品卡片功能補強**：
  - 每張服務/商品資訊卡新增「刪除」與「撥通電話」功能。
  - 「撥通電話」需二次確認，避免誤觸。
  - 需先確認服務/商品資料是否已有對應電話欄位；若沒有，需決定電話來源或資料結構調整方式。

- **顧客與服務卡片編輯/刪除功能**：
  - 顧客資訊卡新增「編輯」與「刪除」按鈕。
  - 服務資訊卡新增「編輯」與「刪除」按鈕。
  - 刪除操作需二次確認，避免誤觸。

- **統計頁命名調整**：
  - 將「營收休假」更名為「預約統計」。
  - 需同步調整 Navbar、頁面標題與所有相關文案。

- **統計頁時間範圍切換**：
  - 在既有「近 7 天客流量」基礎上新增時間分頁標籤：
    - 30 天
    - 6 個月
    - 1 年
  - 需定義不同區間的統計聚合方式與 X 軸顯示粒度。

- **顧客目錄卡片視覺簡化**：
  - 顧客資訊卡取消漸層效果。
  - 配色改為與整體背景、按鈕同色系的簡潔樣式。

- **顧客目錄卡片縮小與改互動模式**：
  - 顧客資訊卡改為更緊湊版本：
    - 卡上直接顯示姓名
    - 下方顯示縮小電話號碼
  - 點擊卡片後改開啟彈窗，不在卡片內展開內容。
  - 彈窗視覺風格改為長方形 iOS 美學。
  - 彈窗內容至少包含：
    - 姓名
    - 電話
    - 喜好 PREFERENCE
    - 慣用商品 PRODUCT



 # Bug 原因與修復策略

  斷點 1：前端 POST Request 資料結構

  Bug A — 使用者自訂價格被靜默丟棄（嚴重）

  App.tsx:309 中 handleSaveAppointment 計算 totalPrice 時：
  totalPrice: matchedService.price * tempPax,
  完全忽略了使用者在 NewApptModal 中手動修改的 tempPrice。使用者改了價格，儲存後仍是服務項目的預設價格 × 人數。

  修復策略： 改用 tempPrice * tempPax 取代 matchedService.price * tempPax。

  ---
  斷點 2：後端 Schema 對齊

  無重大問題。 addAppointment 寫入 Firestore 的欄位與 Appointment type 完全對齊。dateStr 使用 YYYY-MM-DD
  字串格式，無時區偏移問題（formatDateString 與 isExactDateString 都使用本地時間方法）。

  ---
  斷點 3：前端 GET → State → UI 渲染

  Bug B — onSelectAppt 未接線（中等）

  App.tsx:481-490 的 <Calendar> 沒有傳入 onSelectAppt。使用者點擊日曆上的預約
  badge（客戶姓名首字圓圈），什麼事都不會發生。無法查看或編輯現有預約。

  修復策略： 視業務需求決定——可接到開啟預約詳情 modal，或至少打開該日期的預約列表。

## 17. 2026-03-29 Bug A / Bug B 修復

- **Bug A — 使用者自訂價格被靜默丟棄（嚴重）**
  - **根因**：`App.tsx` 的 `handleSaveAppointment` 計算 `totalPrice` 時使用 `matchedService.price * tempPax`，完全忽略使用者在 `NewApptModal` 中手動修改的 `tempPrice`。導致儲存後價格永遠是服務項目的預設價格 × 人數。
  - **修復方式**：將 `matchedService.price * tempPax` 改為 `tempPrice * tempPax`，確保使用者手動調整的價格會被正確寫入。
  - **修改檔案**：`src/App.tsx`（第 309 行）

- **Bug B — onSelectAppt 未接線（中等）**
  - **根因**：`App.tsx` 渲染 `<Calendar>` 時未傳入 `onSelectAppt` prop。使用者點擊日曆上的預約 badge（客戶姓名首字圓圈），什麼事都不會發生，無法查看或編輯現有預約。
  - **修復方式**：在 `<Calendar>` 補上 `onSelectAppt` 回呼，目前以 `alert` 佔位顯示預約基本資訊（客戶名、服務、時間）。後續應替換為開啟預約詳情 Modal。
  - **修改檔案**：`src/App.tsx`（第 489–494 行）

- **驗證狀態**：兩項修改皆為最小變更，不影響其他邏輯流程。
- **後續待辦**：Bug B 的 `alert` 佔位應在預約詳情 Modal 完成後替換為正式的開窗邏輯。

  ---
  附帶發現

  - AppointmentModal.tsx 是死碼 — 未在 App.tsx 中引用，僅 NewApptModal 在使用。
  - useAppointments 使用 getDocs（一次性讀取）而非 onSnapshot（即時監聽），多裝置同步需手動重整。但這可能是刻意的效能取捨。

## 18. 2026-03-29 需求處理結果

【需求 1：休假按鈕的 Toggle 邏輯】
- **狀態**：已確認先前已實作完畢，無需修改。
- `useLeaves.ts` 的 `toggleLeave` 函式（第 159-169 行）已具備切換邏輯：檢查 `isLeaveDay(date)` 決定呼叫 `removeLeave` 或 `addLeave`。
- `App.tsx` 第 489 行已傳入 `onToggleLeave={toggleLeave}`。
- `Calendar.tsx` 第 217 行已正確呼叫 `onToggleLeave(dateStr)`，並有對應的視覺狀態切換。

【需求 2：送出預約後自動關閉 Modal】
- **狀態**：已確認先前已實作完畢，無需修改。
- `App.tsx` 的 `handleSaveAppointment`（第 269-335 行）在 `addAppointment` 成功返回 `appointmentId` 後，第 317 行呼叫 `closeNewAppointmentModal()`。
- `closeNewAppointmentModal` 會將 `isNewApptModalOpen` 設為 `false` 並重置所有暫存欄位。

【需求 3：處理附帶發現的優化項目】
- **3a. 死碼清理**：已刪除 `src/components/Calendar/AppointmentModal.tsx`。確認專案中無任何殘留引用。
- **3b. 即時監聽升級**：已將 `useAppointments.ts` 的資料讀取從 `getDocs`（一次性讀取）改為 `onSnapshot`（即時監聽）。
  - 保留 cache-first 策略：首次渲染先讀本地快取，再由 `onSnapshot` 即時接收 Firestore 變更。
  - 多裝置 / 多分頁同步：任一裝置新增、修改、刪除預約，其他裝置的日曆會即時更新，避免重複預約。
  - cleanup：組件卸載時自動取消訂閱。

- **驗證結果**：
  - `tsc --noEmit`：通過。
  - `npm run build`：通過。
  - `npm test`：3 個測試檔案、9 個測試全數通過。

- **本輪修改/刪除檔案**：
  - `src/hooks/useAppointments.ts`（getDocs → onSnapshot）
  - `src/components/Calendar/AppointmentModal.tsx`（已刪除）