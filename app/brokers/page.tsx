import { BrokersShell } from "@/components/brokers-shell";


type BrokersPageProps = {
  searchParams?: Promise<{
    broker?: string;
    broker_status?: string;
    message?: string;
  }>;
};


export default async function BrokersPage({ searchParams }: BrokersPageProps) {
  const params = (await searchParams) ?? {};
  return <BrokersShell brokerQuery={params} />;
}
