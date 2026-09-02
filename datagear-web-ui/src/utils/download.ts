/**
 * 文件下载工具：blob + Content-Disposition 文件名解析（复用现有导出/下载端点）。
 * P2 组合函数 useDownload() 的底层实现，见《方案》§6.3。
 */

/** 从 Content-Disposition 解析文件名（后端用 ISO-8859-1 编码中文，见 AbstractController.toResponseAttachmentFileName） */
export function parseFilenameFromDisposition(disposition: string | undefined): string {
  if (!disposition) return ''
  const match = /filename="?([^";]+)"?/i.exec(disposition)
  if (!match) return ''
  // 后端中文文件名以 UTF-8 字节转 ISO-8859-1 下发，此处还原
  try {
    return decodeURIComponent(escape(match[1]))
  } catch {
    return match[1]
  }
}

/** 触发浏览器下载 blob */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
