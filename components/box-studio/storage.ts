import { sanitizePersisted, type Persisted } from "@/components/box-studio/types";

/** IndexedDB에 저장되는 개별 프로젝트 데이터 구조 */
export type SavedProject = {
  /** 고유 프로젝트 ID (UUID) */
  id: string;
  /** 프로젝트 이름 */
  name: string;
  /** 저장 일시 (Unix 타임스탬프 ms) */
  savedAt: number;
  /** 저장된 박스 모델 설정 데이터 */
  data: Persisted;
};

/** IndexedDB 데이터베이스 이름 */
const DB_NAME = "box-studio";
/** IndexedDB 오브젝트 스토어 이름 */
const STORE = "kv";

/**
 * IndexedDB 연결을 엽니다. 스토어가 없으면 새로 생성합니다.
 */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB 연결 실패"));
  });
}

/**
 * IndexedDB에서 특정 키의 값을 조회합니다.
 * @param key 조회할 키
 */
async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/**
 * IndexedDB에 키-값 쌍을 저장하거나 갱신합니다.
 * @param key 저장할 키
 * @param value 저장할 값
 */
async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/**
 * 로컬 저장소에서 자동 저장된 최근 작업 초안(Draft)을 불러옵니다.
 */
export async function loadDraft(): Promise<Persisted | null> {
  const raw = await idbGet<unknown>("draft");
  if (!raw) return null;
  return sanitizePersisted(raw);
}

/**
 * 현재 작업 중인 상태를 초안(Draft)으로 로컬 저장소에 저장합니다.
 * @param data 저장할 박스 설정 데이터
 */
export async function saveDraft(data: Persisted): Promise<void> {
  await idbSet("draft", data);
}

/**
 * 저장된 프로젝트 목록을 최신 저장순으로 정렬하여 반환합니다.
 */
export async function listProjects(): Promise<SavedProject[]> {
  const raw = await idbGet<SavedProject[]>("projects");
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item.id === "string" && item.data)
    .map((item) => ({
      id: item.id,
      name: item.name || "이름 없음",
      savedAt: Number(item.savedAt) || 0,
      data: sanitizePersisted(item.data),
    }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * 환경에 구애받지 않고 고유 식별자(UUID)를 생성합니다.
 */
function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * 현재 작업을 새로운 프로젝트로 저장합니다. (최대 12개 유지)
 * @param name 프로젝트 이름
 * @param data 저장할 박스 설정 데이터
 */
export async function saveProject(name: string, data: Persisted): Promise<void> {
  const projects = await listProjects();
  const next: SavedProject = {
    id: generateId(),
    name: name.trim() || "이름 없음",
    savedAt: Date.now(),
    data,
  };
  await idbSet("projects", [next, ...projects].slice(0, 12));
}

/**
 * 저장된 특정 프로젝트를 삭제합니다.
 * @param id 삭제할 프로젝트의 고유 ID
 */
export async function deleteProject(id: string): Promise<void> {
  const projects = await listProjects();
  await idbSet(
    "projects",
    projects.filter((item) => item.id !== id),
  );
}

/**
 * 이미지 내보내기 대상 디렉토리 핸들을 IndexedDB에 저장하거나 삭제합니다.
 * @param handle 디렉토리 핸들 (null이면 삭제)
 */
export async function saveExportDir(handle: FileSystemDirectoryHandle | null): Promise<void> {
  try {
    if (handle) {
      await idbSet("exportDir", handle);
    } else {
      const db = await openDb();
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).delete("exportDir");
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    }
  } catch (err) {
    console.warn("디렉토리 핸들 IndexedDB 저장 실패:", err);
  }
}

/**
 * IndexedDB에 저장된 이미지 내보내기 대상 디렉토리 핸들을 불러옵니다.
 */
export async function loadExportDir(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await idbGet<FileSystemDirectoryHandle>("exportDir");
    if (!handle || typeof handle !== "object" || !("name" in handle)) return null;
    return handle;
  } catch {
    return null;
  }
}
