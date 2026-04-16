export function formatMinutes(min: number): string {
  const hours = Math.floor(min / 60)
  const minutes = min % 60
  if (hours === 0) return `${minutes}분`
  if (minutes === 0) return `${hours}시간`
  return `${hours}시간 ${minutes}분`
}
