/**
 * 사용자가 업로드하거나 붙여넣은 이미지 파일을 읽어 최대 1600px 크기로 다운스케일링한 후 Data URL로 변환합니다.
 * 대용량 이미지로 인한 메모리 부족 및 IndexedDB 용량 초과를 방지합니다.
 *
 * @param file 업로드된 이미지 파일
 * @returns 0.92 퀄리티로 압축된 base64 이미지 Data URL
 */
export function ingestImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("파일 읽기 실패"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // 긴 변 기준 최대 1600px로 제한
        const max = 1600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("2D 캔버스 컨텍스트 생성 실패"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // 원본이 PNG면 PNG, 그 외에는 JPEG(품질 0.92)로 인코딩
        const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
        resolve(canvas.toDataURL(mime, 0.92));
      };
      img.onerror = () => reject(new Error("이미지 디코딩 실패"));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Base64 Data URL 문자열을 바이너리 Blob 객체로 변환합니다.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(parts[1] || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Blob 데이터를 브라우저에서 다운로드합니다.
 * DOM에 link를 임시 부착하여 보안 제약을 우회하고 다운로드를 보장합니다.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try {
      document.body.removeChild(link);
    } catch {}
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Data URL 형식의 이미지 데이터를 지정된 파일명으로 클라이언트 PC에 다운로드합니다.
 */
export function downloadDataUrl(url: string, filename: string) {
  try {
    const blob = dataUrlToBlob(url);
    downloadBlob(blob, filename);
  } catch (err) {
    console.warn("Blob 변환 다운로드 실패, fallback 시도:", err);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        document.body.removeChild(link);
      } catch {}
    }, 1000);
  }
}

/**
 * 브라우저가 File System Access API(디렉토리 선택)를 지원하는지 여부를 반환합니다.
 */
export function isDirectoryPickerSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === "function"
  );
}

/**
 * 디렉토리 핸들의 읽기/쓰기 권한을 확인하고 필요 시 사용자 제스처 컨텍스트에서 요청합니다.
 * 사용자 클릭 직후에 호출해야 브라우저의 User Gesture 보안을 통과합니다.
 */
export async function verifyDirectoryPermission(dirHandle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    const handleWithPerm = dirHandle as unknown as {
      queryPermission?: (opts: { mode: string }) => Promise<PermissionState>;
      requestPermission?: (opts: { mode: string }) => Promise<PermissionState>;
    };
    if (!handleWithPerm.queryPermission) return true;
    let state = await handleWithPerm.queryPermission({ mode: "readwrite" });
    if (state !== "granted" && handleWithPerm.requestPermission) {
      state = await handleWithPerm.requestPermission({ mode: "readwrite" });
    }
    return state === "granted";
  } catch {
    return false;
  }
}

/**
 * 사용자에게 OS 네이티브 폴더 선택 대화상자를 띄워 디렉토리 핸들을 반환합니다.
 * 사용자가 선택을 취소하면 null을 반환합니다.
 */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isDirectoryPickerSupported()) {
    throw new Error("UNSUPPORTED");
  }
  try {
    const handle = await (
      window as unknown as {
        showDirectoryPicker: (options?: { mode?: string; id?: string }) => Promise<FileSystemDirectoryHandle>;
      }
    ).showDirectoryPicker({
      mode: "readwrite",
      id: "box-studio-export",
    });
    return handle;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return null;
    }
    throw err;
  }
}

/**
 * Data URL 이미지 데이터를 지정된 디렉토리 핸들의 폴더에 파일로 직접 저장합니다.
 * @param dirHandle 대상 디렉토리 핸들
 * @param filename 저장할 파일명
 * @param dataUrl base64 Data URL 이미지
 * @returns 저장 성공 여부
 */
export async function saveToDirectory(
  dirHandle: FileSystemDirectoryHandle,
  filename: string,
  dataUrl: string,
): Promise<boolean> {
  try {
    const blob = dataUrlToBlob(dataUrl);
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (err) {
    console.warn("지정 폴더에 파일 저장 실패:", err);
    return false;
  }
}

/**
 * Data URL 이미지를 사용자가 지정한 폴더가 있으면 해당 폴더에 저장하고, 없거나 실패하면 브라우저 기본 다운로드로 저장합니다.
 * @returns 폴더에 직접 저장되었으면 true, 기본 브라우저 다운로드로 처리되었으면 false
 */
export async function saveImageFile(
  dataUrl: string,
  filename: string,
  dirHandle?: FileSystemDirectoryHandle | null,
): Promise<boolean> {
  if (dirHandle) {
    const ok = await saveToDirectory(dirHandle, filename, dataUrl);
    if (ok) return true;
  }
  downloadDataUrl(dataUrl, filename);
  return false;
}
