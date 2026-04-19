import { PublicProfile } from "@/components/public-profile"

export function generateStaticParams() {
  return []
}

export const dynamicParams = true

export default async function UsernamePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  return <PublicProfile username={username} />
}
