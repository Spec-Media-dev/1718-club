import Link from "next/link";

const rewards = [
  { title: "Signature on us", points: "500 CLUB points", detail: "Redeem on your next visit." },
  { title: "Private tasting", points: "1,500 CLUB points", detail: "A curated 1718 tasting experience." },
  { title: "The Black Table", points: "Invitation", detail: "Reserved experiences for our most loyal members." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#171614] text-[#f3eee5]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-10 pt-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="font-serif text-2xl tracking-[0.28em]">1718</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.34em] text-[#b9ad99]">Coffee & Roastery</p>
          </div>
          <span className="rounded-full border border-[#5b5144] px-3 py-1 text-[9px] uppercase tracking-[0.2em] text-[#cbbda7]">CLUB</span>
        </header>

        <section className="mt-14">
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#a89578]">Your membership</p>
          <h1 className="mt-3 font-serif text-5xl leading-none">More than coffee.</h1>
          <p className="mt-5 max-w-sm text-sm leading-6 text-[#bdb5a9]">A private layer of the 1718 experience — rewards, access, and moments reserved for members.</p>
        </section>

        <section className="mt-10 rounded-[28px] border border-[#675b4b] bg-[#24211d] p-6 shadow-2xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.28em] text-[#b7a88f]">Member</p>
              <p className="mt-2 font-serif text-2xl">1718 CLUB</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-[0.28em] text-[#b7a88f]">Balance</p>
              <p className="mt-2 text-2xl font-medium">0</p>
            </div>
          </div>
          <div className="mt-10 h-px bg-[#51493e]" />
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.22em] text-[#8e8578]">Status</p>
              <p className="mt-1 text-sm text-[#e0d7c9]">Member · Welcome</p>
            </div>
            <p className="font-serif text-lg tracking-[0.16em] text-[#c8b89d]">1718</p>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link href="/join" className="rounded-2xl bg-[#d8c9b0] px-5 py-4 text-center text-xs font-medium uppercase tracking-[0.16em] text-[#171614] transition hover:bg-[#eee3d0]">Join CLUB</Link>
          <Link href="/rewards" className="rounded-2xl border border-[#5b5144] px-5 py-4 text-center text-xs font-medium uppercase tracking-[0.16em] text-[#ded4c5] transition hover:bg-[#24211d]">View rewards</Link>
        </div>

        <section className="mt-12">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#a89578]">Selected for members</p>
              <h2 className="mt-2 font-serif text-3xl">The rewards</h2>
            </div>
            <Link href="/rewards" className="text-[10px] uppercase tracking-[0.2em] text-[#bcae97]">See all</Link>
          </div>
          <div className="mt-5 space-y-3">
            {rewards.map((reward) => (
              <article key={reward.title} className="rounded-2xl border border-[#38332d] bg-[#1e1c19] p-5">
                <div className="flex justify-between gap-4">
                  <div><h3 className="font-serif text-xl">{reward.title}</h3><p className="mt-1 text-xs leading-5 text-[#918a80]">{reward.detail}</p></div>
                  <span className="shrink-0 text-[9px] uppercase tracking-[0.16em] text-[#bba989]">{reward.points}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="mt-auto pt-14 text-center text-[9px] uppercase tracking-[0.25em] text-[#6f695f]">Roasted in house · Ordered from your table</footer>
      </div>
    </main>
  );
}
