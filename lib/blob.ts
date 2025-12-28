import { put } from '@vercel/blob'

export async function uploadPdfToBlob(file: File, courseId: string): Promise<string> {
  const filename = `${courseId}/${Date.now()}-${file.name}`

  const blob = await put(filename, file, {
    access: 'public',
    contentType: 'application/pdf',
  })

  return blob.url
}
