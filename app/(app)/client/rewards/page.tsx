import ClientRewardProgress from "@/app/components/clients/ClientRewardProgress";

export default function ClientRewardsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <section>
        <p className="text-label text-primary-light">Staż treningowy</p>
        <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
          Nagrody
        </h1>
        <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
          Sprawdzaj kolejne progi, odebrane nagrody i te, które czekają na odbiór u Twojego trenera.
        </p>
      </section>

      <ClientRewardProgress access="client" variant="full" />
    </div>
  );
}
