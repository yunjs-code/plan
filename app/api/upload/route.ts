import { writeFile } from 'fs/promises'
import { join } from 'path'

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return Response.json({ error: '파일이 없습니다' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return Response.json({ error: '이미지 파일만 업로드 가능합니다' }, { status: 400 })
  }

  const MAX_SIZE = 10 * 1024 * 1024 // 10MB
  if (file.size > MAX_SIZE) {
    return Response.json({ error: '파일 크기는 10MB 이하여야 합니다' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'wrong-items')
  const filepath = join(uploadDir, filename)

  const bytes = await file.arrayBuffer()
  await writeFile(filepath, Buffer.from(bytes))

  return Response.json({ url: `/uploads/wrong-items/${filename}` }, { status: 201 })
}
