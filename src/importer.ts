import { doc, writeBatch } from 'firebase/firestore';
import { colPath, db } from './config/firebase';

type ImportCollectionName = 'clients' | 'appointments' | 'leaves' | 'storeItems';

type ImportRecord = Record<string, unknown> & {
  id?: string;
};

type FirestoreCacheDump = {
  name: string;
  docs: ImportRecord[];
  error: string | null;
};

type BackupPayload = {
  exportedAt?: string;
  origin?: string;
  localStorage?: {
    merged?: Partial<Record<ImportCollectionName, ImportRecord[]>>;
  };
  firestoreCache?: FirestoreCacheDump[];
};

type SelectedCollection = {
  source: 'localStorage.merged' | 'firestoreCache';
  items: ImportRecord[];
  localCount: number;
  firestoreCount: number;
};

type SelectedImportMap = Record<ImportCollectionName, SelectedCollection>;

const COLLECTIONS: ImportCollectionName[] = ['clients', 'appointments', 'leaves', 'storeItems'];
const BATCH_LIMIT = 400;

const fileInput = document.querySelector<HTMLInputElement>('#backup-file');
const backupTextInput = document.querySelector<HTMLTextAreaElement>('#backup-text');
const loadButton = document.querySelector<HTMLButtonElement>('#load-btn');
const importButton = document.querySelector<HTMLButtonElement>('#import-btn');
const statusEl = document.querySelector<HTMLElement>('#status');
const collectionsGridEl = document.querySelector<HTMLElement>('#collections-grid');
const importLogEl = document.querySelector<HTMLOListElement>('#import-log');

const summaryElements: Record<ImportCollectionName, HTMLElement | null> = {
  clients: document.querySelector<HTMLElement>('#summary-clients'),
  appointments: document.querySelector<HTMLElement>('#summary-appointments'),
  leaves: document.querySelector<HTMLElement>('#summary-leaves'),
  storeItems: document.querySelector<HTMLElement>('#summary-storeItems'),
};

let parsedBackup: BackupPayload | null = null;
let selectedImportMap: SelectedImportMap | null = null;
let isBusy = false;

function setStatus(html: string) {
  if (statusEl) {
    statusEl.innerHTML = html;
  }
}

function setBusy(nextBusy: boolean) {
  isBusy = nextBusy;

  if (loadButton) {
    loadButton.disabled = nextBusy;
    loadButton.textContent = nextBusy ? '讀取中...' : '讀取備份';
  }

  if (importButton) {
    importButton.disabled = nextBusy || !selectedImportMap;
    importButton.textContent = nextBusy ? '匯入中...' : '開始匯入 Firebase';
  }
}

function dedupeById(records: ImportRecord[]): ImportRecord[] {
  const seen = new Set<string>();
  const deduped: ImportRecord[] = [];

  for (const record of records) {
    if (!record || typeof record !== 'object') {
      continue;
    }

    const id = typeof record.id === 'string' ? record.id.trim() : '';
    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    deduped.push(record);
  }

  return deduped;
}

function getFirestoreDocs(
  payload: BackupPayload,
  collectionName: ImportCollectionName
): ImportRecord[] {
  const docs = payload.firestoreCache?.find((entry) => entry.name === collectionName)?.docs ?? [];
  return Array.isArray(docs) ? dedupeById(docs) : [];
}

function getLocalDocs(payload: BackupPayload, collectionName: ImportCollectionName): ImportRecord[] {
  const docs = payload.localStorage?.merged?.[collectionName] ?? [];
  return Array.isArray(docs) ? dedupeById(docs) : [];
}

function selectImportSources(payload: BackupPayload): SelectedImportMap {
  return Object.fromEntries(
    COLLECTIONS.map((collectionName) => {
      const localDocs = getLocalDocs(payload, collectionName);
      const firestoreDocs = getFirestoreDocs(payload, collectionName);
      const source = localDocs.length > 0 ? 'localStorage.merged' : 'firestoreCache';
      const items = source === 'localStorage.merged' ? localDocs : firestoreDocs;

      return [
        collectionName,
        {
          source,
          items,
          localCount: localDocs.length,
          firestoreCount: firestoreDocs.length,
        } satisfies SelectedCollection,
      ];
    })
  ) as SelectedImportMap;
}

function resetSummary() {
  COLLECTIONS.forEach((collectionName) => {
    const element = summaryElements[collectionName];
    if (element) {
      element.textContent = '0';
    }
  });

  if (collectionsGridEl) {
    collectionsGridEl.innerHTML = '';
  }

  if (importLogEl) {
    importLogEl.innerHTML = '<li>尚未開始。</li>';
  }
}

function setImportLog(lines: string[]) {
  if (!importLogEl) {
    return;
  }

  importLogEl.innerHTML = '';

  lines.forEach((line) => {
    const item = document.createElement('li');
    item.textContent = line;
    importLogEl.append(item);
  });
}

function renderSummary(selectedMap: SelectedImportMap) {
  COLLECTIONS.forEach((collectionName) => {
    const element = summaryElements[collectionName];
    if (element) {
      element.textContent = String(selectedMap[collectionName].items.length);
    }
  });

  if (!collectionsGridEl) {
    return;
  }

  collectionsGridEl.innerHTML = '';

  COLLECTIONS.forEach((collectionName) => {
    const collection = selectedMap[collectionName];
    const card = document.createElement('article');
    card.className = 'collection-card';

    const title = document.createElement('h3');
    title.textContent = collectionName;

    const source = document.createElement('span');
    source.className = 'collection-meta';
    source.textContent = `匯入來源：${collection.source}`;

    const counts = document.createElement('span');
    counts.className = 'collection-meta';
    counts.textContent = `local ${collection.localCount} 筆 / firestore ${collection.firestoreCount} 筆 / 實際匯入 ${collection.items.length} 筆`;

    card.append(title, source, counts);
    collectionsGridEl.append(card);
  });
}

function stripImportRecordId(record: ImportRecord): Record<string, unknown> {
  const { id: _id, ...rest } = record;
  return rest;
}

function parseBackupText(raw: string): BackupPayload {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('沒有讀到備份內容。');
  }

  const parsed = JSON.parse(trimmed) as BackupPayload;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('備份格式不正確。');
  }

  return parsed;
}

async function readBackupSource(): Promise<string> {
  const pasted = backupTextInput?.value.trim() ?? '';
  if (pasted) {
    return pasted;
  }

  const file = fileInput?.files?.[0] ?? null;
  if (!file) {
    throw new Error('請先選擇備份檔，或把備份內容貼到文字框。');
  }

  return file.text();
}

async function handleLoadBackup() {
  if (isBusy) {
    return;
  }

  setBusy(true);
  setStatus('<strong>讀取中...</strong> 正在解析備份 JSON。');

  try {
    const raw = await readBackupSource();
    parsedBackup = parseBackupText(raw);
    selectedImportMap = selectImportSources(parsedBackup);

    renderSummary(selectedImportMap);
    setImportLog([
      `備份時間：${parsedBackup.exportedAt ?? '未知'}`,
      `備份來源：${parsedBackup.origin ?? '未知'}`,
      '已完成資料摘要，現在可以開始匯入。',
    ]);
    setStatus(
      '<strong class="good">備份已讀取完成。</strong> 請確認下方筆數摘要，如果看起來正確，就按「開始匯入 Firebase」。'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown backup parse error';
    parsedBackup = null;
    selectedImportMap = null;
    resetSummary();
    setStatus(`<strong class="danger">讀取失敗。</strong> ${message}`);
  } finally {
    setBusy(false);
  }
}

async function commitBatch(batchRecords: Array<{ collectionName: ImportCollectionName; record: ImportRecord }>) {
  if (batchRecords.length === 0) {
    return;
  }

  const batch = writeBatch(db);

  batchRecords.forEach(({ collectionName, record }) => {
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    if (!id) {
      return;
    }

    batch.set(doc(db, colPath(collectionName), id), stripImportRecordId(record));
  });

  await batch.commit();
}

async function handleImport() {
  if (isBusy || !selectedImportMap) {
    return;
  }

  setBusy(true);
  setStatus('<strong>匯入中...</strong> 正在把備份資料回寫到 Firebase。請先不要關閉頁面。');

  try {
    const queue: Array<{ collectionName: ImportCollectionName; record: ImportRecord }> = [];
    const summaryLines: string[] = [];

    COLLECTIONS.forEach((collectionName) => {
      const selected = selectedImportMap?.[collectionName];
      if (!selected) {
        return;
      }

      selected.items.forEach((record) => {
        if (typeof record.id === 'string' && record.id.trim()) {
          queue.push({ collectionName, record });
        }
      });

      summaryLines.push(
        `${collectionName}：使用 ${selected.source}，準備匯入 ${selected.items.length} 筆。`
      );
    });

    for (let index = 0; index < queue.length; index += BATCH_LIMIT) {
      await commitBatch(queue.slice(index, index + BATCH_LIMIT));
    }

    summaryLines.push(`總共已寫入 ${queue.length} 筆文件。`);
    summaryLines.push('下一步請回主站檢查資料是否已恢復。');
    setImportLog(summaryLines);
    setStatus(
      `<strong class="good">匯入完成。</strong> 已把 ${queue.length} 筆資料回寫到 Firebase。現在可以回主站檢查資料是否恢復。`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Firebase import error';
    setStatus(`<strong class="danger">匯入失敗。</strong> ${message}`);
  } finally {
    setBusy(false);
  }
}

loadButton?.addEventListener('click', () => {
  void handleLoadBackup();
});

importButton?.addEventListener('click', () => {
  void handleImport();
});

resetSummary();