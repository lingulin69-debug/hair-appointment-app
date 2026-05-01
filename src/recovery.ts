import { collection, getDocsFromCache } from 'firebase/firestore';
import { APP_ID, colPath, db } from './config/firebase';

type LocalStorageEntry = {
  key: string;
  raw: string;
  parsed: unknown;
  parseError: string | null;
};

type FirestoreCollectionDump = {
  name: string;
  docs: unknown[];
  error: string | null;
};

type ScanResult = {
  exportedAt: string;
  origin: string;
  appId: string;
  localStorage: {
    entries: LocalStorageEntry[];
    merged: {
      clients: unknown[];
      appointments: unknown[];
      leaves: unknown[];
      storeItems: unknown[];
    };
  };
  firestoreCache: FirestoreCollectionDump[];
};

const scanButton = document.querySelector<HTMLButtonElement>('#scan-btn');
const exportButton = document.querySelector<HTMLButtonElement>('#export-btn');
const statusEl = document.querySelector<HTMLElement>('#status');
const detailsEl = document.querySelector<HTMLElement>('#details');
const statKeysEl = document.querySelector<HTMLElement>('#stat-keys');
const statClientsEl = document.querySelector<HTMLElement>('#stat-clients');
const statAppointmentsEl = document.querySelector<HTMLElement>('#stat-appointments');
const statLeavesEl = document.querySelector<HTMLElement>('#stat-leaves');
const backupPanelEl = document.querySelector<HTMLElement>('#backup-panel');
const backupHintEl = document.querySelector<HTMLElement>('#backup-hint');
const backupTextEl = document.querySelector<HTMLTextAreaElement>('#backup-text');
const copyButton = document.querySelector<HTMLButtonElement>('#copy-btn');
const shareButton = document.querySelector<HTMLButtonElement>('#share-btn');
const chunkSummaryEl = document.querySelector<HTMLElement>('#chunk-summary');
const chunkListEl = document.querySelector<HTMLElement>('#chunk-list');

let latestResult: ScanResult | null = null;
let isRunning = false;
let latestBackupText = '';
let latestBackupFilename = '';

const BACKUP_CHUNK_SIZE = 5500;

function isLineInAppBrowser(): boolean {
  const userAgent = navigator.userAgent;
  return /Line\//i.test(userAgent) || /LIAPP/i.test(userAgent);
}

const prefersInlineBackup = isLineInAppBrowser();
const exportIdleLabel = prefersInlineBackup ? '掃描並準備備份' : '掃描並下載備份';

function buildBackupFileName(result: ScanResult): string {
  const timestamp = result.exportedAt.replace(/[:.]/g, '-');
  return `amy-salon-recovery-${timestamp}.json`;
}

function buildBackupText(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}

function buildBackupChunks(text: string): string[] {
  if (text.length <= BACKUP_CHUNK_SIZE) {
    return [text];
  }

  const chunks: string[] = [];

  for (let start = 0; start < text.length; start += BACKUP_CHUNK_SIZE) {
    chunks.push(text.slice(start, start + BACKUP_CHUNK_SIZE));
  }

  return chunks;
}

async function copyTextWithFallback(text: string, successMessage: string, fallbackMessage: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setStatus(successMessage);
      return true;
    }
  } catch {
    // Fall through to manual copy.
  }

  return false;
}

function renderBackupChunks(text: string) {
  if (!chunkListEl || !chunkSummaryEl) {
    return;
  }

  const chunks = buildBackupChunks(text);
  chunkSummaryEl.textContent =
    chunks.length === 1
      ? '這份備份目前只有 1 段，直接複製完整內容即可。'
      : `這份備份已自動分成 ${chunks.length} 段。請依照順序，從第 1 段開始一段一段複製貼回 LINE。`;

  chunkListEl.innerHTML = '';

  chunks.forEach((chunk, index) => {
    const chunkNumber = index + 1;
    const wrappedChunk = [`[AMY-SALON-BACKUP ${chunkNumber}/${chunks.length}]`, chunk].join('\n');

    const card = document.createElement('section');
    card.className = 'chunk-card';

    const heading = document.createElement('h4');
    heading.className = 'chunk-title';
    heading.textContent = `第 ${chunkNumber} 段 / 共 ${chunks.length} 段`;

    const actionRow = document.createElement('div');
    actionRow.className = 'chunk-actions';

    const actionButton = document.createElement('button');
    actionButton.type = 'button';
    actionButton.className = chunkNumber === 1 ? 'primary' : 'secondary';
    actionButton.textContent = `複製第 ${chunkNumber} 段`;
    actionButton.addEventListener('click', () => {
      void (async () => {
        const copied = await copyTextWithFallback(
          wrappedChunk,
          `<strong class="good">已複製第 ${chunkNumber} 段。</strong> 請把這一段貼到 LINE，然後再回來複製下一段。`,
          `<strong class="warn">無法自動複製第 ${chunkNumber} 段。</strong> 請手動選取下方這段文字後再複製。`
        );

        if (copied) {
          return;
        }

        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);

        try {
          const fallbackCopied = document.execCommand('copy');
          if (fallbackCopied) {
            setStatus(
              `<strong class="good">已複製第 ${chunkNumber} 段。</strong> 請把這一段貼到 LINE，然後再回來複製下一段。`
            );
            return;
          }
        } catch {
          // Ignore and show manual guidance below.
        }

        setStatus(
          `<strong class="warn">無法自動複製第 ${chunkNumber} 段。</strong> 已幫您選取這一段文字，請長按後選「複製」。`
        );
      })();
    });

    const info = document.createElement('span');
    info.className = 'chunk-meta';
    info.textContent = `約 ${wrappedChunk.length} 個字元`;

    actionRow.append(actionButton, info);

    const textarea = document.createElement('textarea');
    textarea.className = 'backup-text chunk-text';
    textarea.readOnly = true;
    textarea.spellcheck = false;
    textarea.value = wrappedChunk;
    textarea.setAttribute('aria-label', `備份第 ${chunkNumber} 段`);

    card.append(heading, actionRow, textarea);
    chunkListEl.append(card);
  });
}

function revealBackupPanel(result: ScanResult) {
  latestBackupText = buildBackupText(result);
  latestBackupFilename = buildBackupFileName(result);

  if (backupTextEl) {
    backupTextEl.value = latestBackupText;
  }

  renderBackupChunks(latestBackupText);

  if (backupHintEl) {
    backupHintEl.innerHTML = prefersInlineBackup
      ? '偵測到 LINE 內建瀏覽器，這裡會直接顯示完整備份內容。請先按「複製備份內容」，再貼到 LINE 聊天室、記事本或傳回給我們。'
      : '如果手機沒有跳出下載提示，請直接按「複製備份內容」，把備份貼到 LINE 聊天室、記事本或其他地方先存起來。';
  }

  if (shareButton) {
    shareButton.hidden = typeof navigator.share !== 'function';
  }

  if (backupPanelEl) {
    backupPanelEl.hidden = false;
  }
}

function selectBackupText() {
  if (!backupTextEl) {
    return;
  }

  backupTextEl.focus();
  backupTextEl.select();
  backupTextEl.setSelectionRange(0, backupTextEl.value.length);
}

async function copyBackupText() {
  if (!latestBackupText) {
    setStatus('<strong class="warn">還沒有備份內容。</strong> 請先按「掃描並準備備份」或「掃描並下載備份」。');
    return;
  }

  const copied = await copyTextWithFallback(
    latestBackupText,
    '<strong class="good">已複製備份內容。</strong> 現在可以把內容貼到 LINE 聊天室、記事本或 Email 先存起來。',
    '<strong class="warn">無法自動複製。</strong> 已幫您選取下方備份內容，請長按文字後選「複製」。'
  );

  if (copied) {
    return;
  }

  selectBackupText();

  try {
    const copied = document.execCommand('copy');
    if (copied) {
      setStatus('<strong class="good">已複製備份內容。</strong> 現在可以把內容貼到 LINE 聊天室、記事本或 Email 先存起來。');
      return;
    }
  } catch {
    // Ignore and show manual copy guidance below.
  }

  setStatus('<strong class="warn">無法自動複製。</strong> 已幫您選取下方備份內容，請長按文字後選「複製」。');
}

async function shareBackupText() {
  if (!latestBackupText || typeof navigator.share !== 'function') {
    setStatus('<strong class="warn">這支手機暫時不支援分享。</strong> 請直接使用下方的「複製備份內容」。');
    return;
  }

  try {
    if (typeof File !== 'undefined') {
      const file = new File([latestBackupText], latestBackupFilename, {
        type: 'application/json;charset=utf-8',
      });

      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'AMY.SALON 備份檔',
          text: '這是手機本地資料備份 JSON。',
        });
        setStatus('<strong class="good">已開啟分享面板。</strong> 請把備份檔傳到安全的地方。');
        return;
      }
    }

    await navigator.share({
      title: 'AMY.SALON 備份內容',
      text: latestBackupText,
    });
    setStatus('<strong class="good">已開啟分享面板。</strong> 請把備份內容傳到安全的地方。');
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return;
    }

    setStatus('<strong class="warn">分享失敗。</strong> 請改用下方的「複製備份內容」。');
  }
}

function tryDownloadBackup(result: ScanResult): boolean {
  try {
    const blob = new Blob([buildBackupText(result)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = buildBackupFileName(result);
    link.click();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    return true;
  } catch {
    return false;
  }
}

function setBusy(nextBusy: boolean) {
  isRunning = nextBusy;

  if (scanButton) {
    scanButton.disabled = nextBusy;
    scanButton.textContent = nextBusy ? '掃描中...' : '掃描本地資料';
  }

  if (exportButton) {
    exportButton.disabled = nextBusy;
    exportButton.textContent = nextBusy ? '整理備份中...' : exportIdleLabel;
  }
}

function setStatus(html: string) {
  if (statusEl) {
    statusEl.innerHTML = html;
  }
}

function safeJsonParse(raw: string): { parsed: unknown; parseError: string | null } {
  try {
    return { parsed: JSON.parse(raw), parseError: null };
  } catch (error) {
    return {
      parsed: raw,
      parseError: error instanceof Error ? error.message : 'Unknown parse error',
    };
  }
}

function readHairSalonLocalStorage(): LocalStorageEntry[] {
  const entries: LocalStorageEntry[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith('hair-salon:')) {
      continue;
    }

    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      continue;
    }

    const { parsed, parseError } = safeJsonParse(raw);
    entries.push({ key, raw, parsed, parseError });
  }

  return entries.sort((left, right) => left.key.localeCompare(right.key, 'zh-TW'));
}

function toEnvelopeData(value: unknown): unknown[] {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const maybeEnvelope = value as { data?: unknown };
  return Array.isArray(maybeEnvelope.data) ? maybeEnvelope.data : [];
}

function dedupeRecords(records: unknown[]): unknown[] {
  const seen = new Set<string>();
  const merged: unknown[] = [];

  for (const record of records) {
    if (!record || typeof record !== 'object') {
      continue;
    }

    const data = record as Record<string, unknown>;
    const fingerprint = [
      typeof data.id === 'string' ? data.id : '',
      typeof data.dateStr === 'string' ? data.dateStr : '',
      typeof data.time === 'string' ? data.time : '',
      typeof data.date === 'string' ? data.date : '',
      typeof data.clientName === 'string' ? data.clientName : '',
      typeof data.name === 'string' ? data.name : '',
      typeof data.type === 'string' ? data.type : '',
    ].join('|');

    if (seen.has(fingerprint)) {
      continue;
    }

    seen.add(fingerprint);
    merged.push(record);
  }

  return merged;
}

function mergeLocalEntries(entries: LocalStorageEntry[]) {
  const clients = entries
    .filter((entry) => entry.key === 'hair-salon:clients')
    .flatMap((entry) => toEnvelopeData(entry.parsed));

  const appointments = entries
    .filter((entry) => entry.key.startsWith('hair-salon:appointments:'))
    .flatMap((entry) => toEnvelopeData(entry.parsed));

  const leaves = entries
    .filter((entry) => entry.key.startsWith('hair-salon:leaves:'))
    .flatMap((entry) => toEnvelopeData(entry.parsed));

  const storeItems = entries
    .filter((entry) => entry.key === 'hair-salon:store-items')
    .flatMap((entry) => toEnvelopeData(entry.parsed));

  return {
    clients: dedupeRecords(clients),
    appointments: dedupeRecords(appointments),
    leaves: dedupeRecords(leaves),
    storeItems: dedupeRecords(storeItems),
  };
}

async function readCollectionFromCache(name: string): Promise<FirestoreCollectionDump> {
  try {
    const snapshot = await getDocsFromCache(collection(db, colPath(name)));
    return {
      name,
      docs: snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })),
      error: null,
    };
  } catch (error) {
    return {
      name,
      docs: [],
      error: error instanceof Error ? error.message : 'Unknown Firestore cache error',
    };
  }
}

async function scanRecoveryData(): Promise<ScanResult> {
  const entries = readHairSalonLocalStorage();
  const firestoreCache = await Promise.all([
    readCollectionFromCache('clients'),
    readCollectionFromCache('appointments'),
    readCollectionFromCache('leaves'),
    readCollectionFromCache('storeItems'),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    origin: window.location.origin,
    appId: APP_ID,
    localStorage: {
      entries,
      merged: mergeLocalEntries(entries),
    },
    firestoreCache,
  };
}

function getFirestoreDocCount(result: ScanResult, collectionName: string): number {
  return result.firestoreCache.find((entry) => entry.name === collectionName)?.docs.length ?? 0;
}

function updateSummary(result: ScanResult) {
  const localClients = result.localStorage.merged.clients.length;
  const localAppointments = result.localStorage.merged.appointments.length;
  const localLeaves = result.localStorage.merged.leaves.length;
  const firestoreClients = getFirestoreDocCount(result, 'clients');
  const firestoreAppointments = getFirestoreDocCount(result, 'appointments');
  const firestoreLeaves = getFirestoreDocCount(result, 'leaves');
  const keyCount = result.localStorage.entries.length;

  if (statKeysEl) statKeysEl.textContent = String(keyCount);
  if (statClientsEl) statClientsEl.textContent = String(Math.max(localClients, firestoreClients));
  if (statAppointmentsEl) {
    statAppointmentsEl.textContent = String(Math.max(localAppointments, firestoreAppointments));
  }
  if (statLeavesEl) statLeavesEl.textContent = String(Math.max(localLeaves, firestoreLeaves));

  const cacheWarnings = result.firestoreCache
    .filter((entry) => entry.error)
    .map((entry) => `${entry.name}: ${entry.error}`);

  setStatus(
    [
      '<strong class="good">掃描完成。</strong>',
      `找到 ${keyCount} 個 localStorage 快取鍵。`,
      `顧客 ${Math.max(localClients, firestoreClients)} 筆、預約 ${Math.max(localAppointments, firestoreAppointments)} 筆、休假 ${Math.max(localLeaves, firestoreLeaves)} 筆。`,
      cacheWarnings.length > 0
        ? `<span class="warn">Firestore cache 讀取警告：${cacheWarnings.join(' / ')}</span>`
        : 'Firestore cache 讀取正常。',
    ].join(' ')
  );

  if (detailsEl) {
    detailsEl.textContent = JSON.stringify(
      {
        exportedAt: result.exportedAt,
        origin: result.origin,
        appId: result.appId,
        localStorageKeys: result.localStorage.entries.map((entry) => entry.key),
        localStorageMergedCounts: {
          clients: localClients,
          appointments: localAppointments,
          leaves: localLeaves,
          storeItems: result.localStorage.merged.storeItems.length,
        },
        firestoreCacheCounts: Object.fromEntries(
          result.firestoreCache.map((entry) => [entry.name, entry.docs.length])
        ),
        firestoreCacheErrors: Object.fromEntries(
          result.firestoreCache
            .filter((entry) => entry.error)
            .map((entry) => [entry.name, entry.error])
        ),
      },
      null,
      2
    );
  }
}

async function runScan(shouldDownload: boolean) {
  if (isRunning) {
    return;
  }

  setBusy(true);
  setStatus('<strong>掃描中...</strong> 正在整理 localStorage 與 Firestore cache。');

  try {
    const result = await scanRecoveryData();
    latestResult = result;
    updateSummary(result);

    if (shouldDownload) {
      const baseStatus = statusEl?.innerHTML ?? '';
      revealBackupPanel(result);

      if (prefersInlineBackup) {
        setStatus(
          `${baseStatus} <strong class="warn">偵測到 LINE 內建瀏覽器。</strong> 這個瀏覽器會擋掉檔案下載，請直接按下方「複製備份內容」把 JSON 存起來。`
        );
      } else if (tryDownloadBackup(result)) {
        setStatus(
          `${baseStatus} JSON 備份已嘗試下載；如果手機沒有跳出下載提示，請直接按下方「複製備份內容」。`
        );
      } else {
        setStatus(
          `${baseStatus} <strong class="warn">這支手機沒有成功啟動下載。</strong> 請直接按下方「複製備份內容」。`
        );
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown recovery error';
    setStatus(`<strong class="warn">掃描失敗。</strong> ${message}`);

    if (detailsEl) {
      detailsEl.textContent = message;
    }
  } finally {
    setBusy(false);
  }
}

scanButton?.addEventListener('click', () => {
  void runScan(false);
});

exportButton?.addEventListener('click', () => {
  void runScan(true);
});

copyButton?.addEventListener('click', () => {
  void copyBackupText();
});

shareButton?.addEventListener('click', () => {
  void shareBackupText();
});

if (exportButton) {
  exportButton.textContent = exportIdleLabel;
}

if (latestResult === null) {
  setStatus(
    prefersInlineBackup
      ? '<strong>尚未掃描。</strong> 這個頁面只讀取本機資料，不會寫回雲端。偵測到 LINE 內建瀏覽器，等一下按「掃描並準備備份」後，請直接複製下方產生的 JSON。'
      : '<strong>尚未掃描。</strong> 這個頁面只讀取本機資料，不會寫回雲端。請先按掃描，再下載備份。'
  );
}