/**
 * Multipart upload to `/procurex/api/documents/upload-local`, with progress tracking
 * (XHR-based — fetch doesn't expose upload progress).
 *
 * Returns the absolute URL the file is served at.
 */
export interface LocalUploadOptions {
  documentId: string
  file: File
  onProgress?: (percentage: number) => void
}

export interface LocalUploadResult {
  ok: true
  documentId: string
  url: string
}

export function uploadFileLocally(
  options: LocalUploadOptions,
): Promise<LocalUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const form = new FormData()
    form.append("documentId", options.documentId)
    form.append("file", options.file)

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && options.onProgress) {
        options.onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener("load", () => {
      try {
        const body = JSON.parse(xhr.responseText) as
          | LocalUploadResult
          | { error?: string }
        if (xhr.status >= 200 && xhr.status < 300 && "ok" in body && body.ok) {
          resolve(body)
        } else {
          const msg =
            "error" in body && body.error
              ? body.error
              : `Upload failed (HTTP ${xhr.status})`
          reject(new Error(msg))
        }
      } catch {
        reject(new Error(`Upload failed (HTTP ${xhr.status})`))
      }
    })

    xhr.addEventListener("error", () => reject(new Error("Network error")))
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")))

    xhr.open("POST", "/procurex/api/documents/upload-local")
    xhr.send(form)
  })
}
