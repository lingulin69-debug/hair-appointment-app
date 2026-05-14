# AMY.SALON 手機版 UI 排查 SOP

更新日期：2026-05-14

## 目的

這份 SOP 專門用來排查手機版最常見的兩類問題：

1. 內容明明超出畫面，但頁面或 modal 滑不動
2. 長字串、按鈕或卡片內容把版面撐出框外

這份文件優先處理 AMY.SALON 目前最常見的版型：

- body 不直接捲動，而是由中間主內容區自己捲動
- modal 有最大高度限制，但需要內部內容自己捲動
- 卡片內會出現 email、帳號、備註、交易摘要等長字串

## 一分鐘先判斷是哪一類問題

### 類型 A：整個頁面或區塊滑不動

常見現象：

- 顧客目錄清單有很多卡片，但往下滑沒有反應
- modal 打開後只能看到上半部，下半部永遠滑不到
- Android 特別容易出現內容超高卻無法往下拉

### 類型 B：文字或按鈕超出框架

常見現象：

- 長 email 把卡片撐寬
- 按鈕列被擠出框外
- 標題或備註在窄螢幕換行時把版面破壞

## 排查順序

### 1. 先找誰才是真正的 scroll owner

先確認目前是誰負責捲動：

- 是 body 在捲
- 是 App 主內容區在捲
- 是 modal 內部內容區在捲

如果 body 已經被設成 overflow hidden，那就不能再期待整頁會自己滑；一定要找到真正有 overflow-y-auto 的那個容器。

## 2. 只要是 flex 版型，先檢查滾動鏈有沒有 min-h-0

這是目前最常見根因。

只要結構長這樣：

- 外層是 flex / flex-col
- 中間某一層想用 overflow-y-auto 自己捲動

就要一路往上檢查：

- 直接父層是不是 flex item
- 中間每一層有沒有被預設 min-height: auto 卡住

實務規則：

- 需要承接捲動的 flex item，優先補 min-h-0
- 需要承接橫向壓縮的 flex item，優先補 min-w-0

如果少了這兩個設定，很容易出現：

- 內容超高但不觸發捲動
- 長字串把兄弟欄位往外擠爆

## 3. modal 問題不要只看 max-height

只有設定 max-h-[92dvh] 還不夠。

如果 modal 內容可能超高，標準結構要接近這樣：

1. modal panel 本身用 flex flex-col
2. panel 本身用 overflow-hidden
3. 中間內容區用 flex-1
4. 中間內容區用 overflow-y-auto

白話講：

- max-height 只是限制它不要超出視窗
- 真正能不能滑，取決於裡面有沒有一塊獨立的滾動區

## 4. 長字串超框先檢查這三件事

遇到 email、帳號、備註、產品名稱、交易摘要時，先看：

1. 文字所在 flex item 有沒有 min-w-0
2. 文字本身有沒有 break-all 或 break-words
3. 是否被錯誤套了 whitespace-nowrap 或過大的固定字級

實務規則：

- email、帳號這種不可預測長度的字串，手機版優先用 break-all
- 一般說明文字優先用 break-words 或自然換行
- truncate 只適合「本來就只想顯示一行」的資訊

## 5. 先用最小修法，不要一開始就大改版型

優先順序：

1. 補 min-h-0 / min-w-0
2. 補 overflow-y-auto 或獨立 scroll 區
3. 補 break-all / break-words
4. 最後才考慮改整個 Grid、卡片尺寸、字級

這樣比較不容易把桌機版一起打壞。

## 6. AMY.SALON 目前的高頻檢查點

遇到手機版 UI 問題時，優先看這幾個檔案：

- src/App.tsx
用途：主內容區滾動鏈；顧客目錄整頁滑不動時先看這裡

- src/components/Auth/AccessControlPanel.tsx
用途：預約統計頁權限卡片；長 email、按鈕擠壓、卡片超框時先看這裡

- src/components/Client/ClientDetailModal.tsx
用途：顧客詳情展開視窗；modal 超高卻滑不動時先看這裡

- src/components/Auth/LoginScreen.tsx
用途：已修過 Android 小螢幕不能滑的案例，可拿來對照處理方式

## 7. 每次修完都要做的驗證

至少驗這 4 件事：

1. Android 或手機模擬器能否正常上下滑
2. 同一頁桌機版排版有沒有被擠壞
3. 長 email 或長備註有沒有再把卡片撐破
4. npm run build 是否通過

## 8. 快速口訣

看到滑不動，先查誰在捲，再補 min-h-0。

看到字超框，先補 min-w-0，再補 break-all。

看到 modal 超高，別只加 max-height，要真的做內部 scroll 區。