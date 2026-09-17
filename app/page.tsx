'use client';
import { useEffect, useMemo, useState, type ReactNode, type CSSProperties } from 'react';
import { Bell, ChevronRight, Coffee, Crown, Flame, Gift, Home as HomeIcon, MapPin, MoreHorizontal, Package, QrCode, Search, ShoppingBag, Sparkles, Star, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Item = { id: number; cat: number; name: string; recipe: string; price: number; calories: number | null; image: string };
type Category = { id: number; name: string };
type Menu = { categories: Category[]; items: Item[]; settings?: { cafeName?: string; currency?: string } };

const egp = (n: number) => `EGP ${n}`;
const imgUrl = (u: string, w = 600) => (u ? `${u}${u.includes('?') ? '&' : '?'}w=${w}&auto=format,compress&fit=crop` : '');
const photoBg = (u: string, w = 600): CSSProperties => (u ? { backgroundImage: `url("${imgUrl(u, w)}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {});
const splitName = (n: string) => { const p = n.trim().split(/\s+/); return p.length < 2 ? { head: '', tail: n } : { head: p.slice(0, -1).join(' '), tail: p[p.length - 1] }; };

function useMenu(): Menu | null {
  const [m, setM] = useState<Menu | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/data/menu.json').then(r => r.json()).then(d => { if (live) setM(d); }).catch(() => {});
    return () => { live = false; };
  }, []);
  return m;
}

// Curated signatures — showcased with the commissioned 1718 branded-cup photography.
const SIGNATURES = [
  { img: '/brand/photos/product_matcha.jpg', id: 19, name: 'Iced Matcha Latte', price: 140 },
  { img: '/brand/photos/product_spanish_latte.jpg', id: 6, name: 'Spanish Latte', price: 145 },
  { img: '/brand/photos/product_cascara_orange.jpg', id: 118, name: 'Cascara Orange', price: 180 },
];

const rewards = [
  { title: 'Free Drink on Us', detail: 'Redeem a signature drink on your next visit.', points: '1,500', icon: Coffee, tone: '' },
  { title: 'Secret Menu Access', detail: 'A private selection created for Club members.', points: '2,000', icon: Sparkles, tone: 'dark' },
  { title: 'EGP 250 Club Credit', detail: 'Put your points toward your next 1718 ritual.', points: '3,500', icon: Gift, tone: 'warm' },
];

export default function Home() {
  const menu = useMenu();
  const [tab, setTab] = useState('Home');
  const [item, setItem] = useState<Item | null>(null);
  const [card, setCard] = useState(false);
  const [toast, setToast] = useState('');
  const notify = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 2200); };
  const go = (t: string) => { setTab(t); window.scrollTo({ top: 0 }); };
  const catName = useMemo(() => new Map((menu?.categories ?? []).map(c => [c.id, c.name])), [menu]);

  return <main className="app-shell">
    {tab === 'Home' && <HomeView menu={menu} go={go} notify={notify} setCard={setCard} onItem={setItem} />}
    {tab === 'Menu' && <MenuView menu={menu} catName={catName} onItem={setItem} />}
    {tab === 'Order' && <OrderView menu={menu} onItem={setItem} />}
    {tab === 'Rewards' && <RewardsView notify={notify} />}
    {tab === 'Club' && <ClubView />}
    {tab === 'More' && <MoreView onCard={() => setCard(true)} />}
    <nav className="bottom-nav">
      <Nav active={tab === 'Home'} label="Home" icon={HomeIcon} onClick={() => go('Home')} />
      <Nav active={tab === 'Menu'} label="Menu" icon={Coffee} onClick={() => go('Menu')} />
      <Nav active={tab === 'Order'} label="Order" icon={ShoppingBag} onClick={() => go('Order')} />
      <Nav active={tab === 'Rewards'} label="Rewards" icon={Gift} onClick={() => go('Rewards')} />
      <Nav active={tab === 'More'} label="More" icon={MoreHorizontal} onClick={() => go('More')} />
    </nav>
    {card && <CardModal close={() => setCard(false)} />}
    {item && <ProductSheet item={item} catName={catName.get(item.cat) ?? '1718'} close={() => setItem(null)} add={() => { notify(`${item.name} added to your order.`); setItem(null); }} />}
    {toast && <div className="toast">{toast}</div>}
  </main>;
}

function HomeView({ menu, go, notify, setCard, onItem }: { menu: Menu | null; go: (t: string) => void; notify: (m: string) => void; setCard: (v: boolean) => void; onItem: (i: Item) => void }) {
  const items = menu?.items ?? [];
  const hero = items.find(i => /matcha/i.test(i.name) && /latte/i.test(i.name)) ?? items.find(i => i.cat === 2) ?? items[0];
  const heroName = hero ? splitName(hero.name) : { head: 'Iced', tail: 'Matcha' };
  return <>
    <header className="app-header"><Brand /><div className="header-actions"><button className="icon-btn" onClick={() => notify('No new notifications.')}><Bell size={17} /></button><button className="avatar" onClick={() => go('More')}>MH</button></div></header>
    <section className="welcome"><div><p className="eyebrow">GOOD MORNING</p><h1>Welcome back</h1><p className="welcome-sub">Good coffee brings better days.</p></div><button className="icon-btn" onClick={() => go('Menu')}><Search size={17} /></button></section>
    <section className="club-card" onClick={() => setCard(true)}><div className="card-noise" /><div className="club-card-top"><Brand light /><span className="gold-pill"><Crown size={11} /> GOLD MEMBER</span></div><div className="club-card-mid"><div><span>MEMBER</span><strong>1718 Club Member</strong><small>Digital Club Card</small></div><div className="mini-qr"><QrCode size={34} /></div></div><div className="club-card-bottom"><span>1,240 <small>POINTS</small></span><span>760 to Black</span><ChevronRight size={15} /></div></section>
    <section className="quick-stats"><button onClick={() => go('Rewards')}><Star /><b>1,240</b><span>Points</span></button><button onClick={() => go('Rewards')}><Gift /><b>2</b><span>Free Drinks</span></button><button onClick={() => go('Club')}><Crown /><b>Gold</b><span>Your Tier</span></button></section>
    <SectionTitle eyebrow="TODAY AT 1718" title="Made for you" action="See all" onClick={() => go('Menu')} />
    {hero && <section className="hero-product" onClick={() => onItem(hero)}><div className="hero-image"><div className="hero-copy"><span>SIGNATURE · 1718</span><h2>{heroName.head}{heroName.head && <br />}<em>{heroName.tail}</em></h2><p>{hero.recipe || 'A 1718 signature, crafted with care.'}</p><b>{egp(hero.price)}</b></div></div><button className="round-arrow"><ChevronRight /></button></section>}
    <SectionTitle eyebrow="THE 1718 RITUAL" title="Signatures" action="Full menu" onClick={() => go('Menu')} compact />
    <div className="signatures">{SIGNATURES.map(s => { const it = items.find(i => i.id === s.id); return <button className="sig-card" key={s.id} onClick={() => it && onItem(it)}><div className="sig-photo" style={{ backgroundImage: `url("${s.img}")` }} /><div className="sig-copy"><small>SIGNATURE</small><strong>{s.name}</strong><b>{egp(s.price)}</b></div></button>; })}</div>
    <section className="brand-story"><div className="story-photo"><img src="/api/media/brand_story" alt="1718 parrot mascot" onError={e => { const t = e.currentTarget; if (!t.src.includes('parrot-hero')) t.src = '/brand/1718-parrot-hero.svg'; }} /></div><div><p className="eyebrow">THE 1718 WAY</p><h2>More than coffee.<br /><em>A community.</em></h2><p>Good coffee brings better people together.</p></div><button onClick={() => go('Club')}><ChevronRight /></button></section>
  </>;
}

function Brand({ light = false }: { light?: boolean }) { return <div className={`brand ${light ? 'light' : ''}`}><span className="brand-1718">17<sup>18</sup></span><span className="brand-sub">CLUB</span></div>; }
function SectionTitle({ eyebrow, title, action, onClick, compact = false }: { eyebrow: string; title: string; action: string; onClick: () => void; compact?: boolean }) { return <section className={`section-title ${compact ? 'compact' : ''}`}><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action && <button onClick={onClick}>{action}<ChevronRight size={15} /></button>}</section>; }
function Nav({ active, label, icon: Icon, onClick }: { active: boolean; label: string; icon: LucideIcon; onClick: () => void }) { return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}><Icon size={18} /><span>{label}</span></button>; }
function Page({ title, eyebrow, subtitle, children }: { title: string; eyebrow: string; subtitle: string; children: ReactNode }) { return <section className="page"><header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{subtitle}</p></div><button className="icon-btn"><Bell size={17} /></button></header>{children}</section>; }

function MenuView({ menu, catName, onItem }: { menu: Menu | null; catName: Map<number, string>; onItem: (i: Item) => void }) {
  const [cat, setCat] = useState<number | 'all'>('all');
  const [q, setQ] = useState('');
  const cats = (menu?.categories ?? []).filter(c => (menu?.items ?? []).some(i => i.cat === c.id));
  const term = q.trim().toLowerCase();
  const items = (menu?.items ?? []).filter(i => (cat === 'all' || i.cat === cat) && (!term || i.name.toLowerCase().includes(term) || i.recipe.toLowerCase().includes(term)));
  return <Page title="Menu" eyebrow="1718 COFFEE · ROASTERY" subtitle="Roasted in house. Ordered from your table.">
    <div className="menu-search"><Search size={15} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search the menu…" /></div>
    <div className="chips"><button className={cat === 'all' ? 'selected' : ''} onClick={() => setCat('all')}>All</button>{cats.map(c => <button key={c.id} className={cat === c.id ? 'selected' : ''} onClick={() => setCat(c.id)}>{c.name}</button>)}</div>
    {!menu ? <p className="menu-empty">Loading the menu…</p> : items.length === 0 ? <p className="menu-empty">No items match your search.</p> :
      <div className="menu-grid">{items.map(p => <button className="menu-product" key={p.id} onClick={() => onItem(p)}><div className="product-photo large" style={photoBg(p.image, 400)} /><small>{catName.get(p.cat)}</small><strong>{p.name}</strong>{p.recipe && <em className="menu-recipe">{p.recipe}</em>}<b>{egp(p.price)}</b></button>)}</div>}
  </Page>;
}

function OrderView({ menu, onItem }: { menu: Menu | null; onItem: (i: Item) => void }) {
  const [mode, setMode] = useState<'Pickup' | 'Delivery'>('Pickup');
  const featured = (menu?.items ?? []).filter(i => [2, 1, 3].includes(i.cat)).slice(0, 6);
  return <Page title="Order" eyebrow="YOUR NEXT CUP" subtitle="Freshly roasted. Made to order.">
    <div className="order-toggle"><button className={mode === 'Pickup' ? 'selected' : ''} onClick={() => setMode('Pickup')}>Pickup</button><button className={mode === 'Delivery' ? 'selected' : ''} onClick={() => setMode('Delivery')}>Delivery</button></div>
    <div className="location-card"><MapPin /><div><small>{mode === 'Pickup' ? 'Pickup from' : 'Deliver from'}</small><strong>1718 Coffee &amp; Roastery</strong><span>5–10 min · Change</span></div><ChevronRight /></div>
    <SectionTitle eyebrow="FEATURED" title="Start with a favorite" action="" onClick={() => {}} />
    <div className="order-grid">{featured.map(p => <button key={p.id} className="order-item" onClick={() => onItem(p)}><div className="product-photo large" style={photoBg(p.image, 400)} /><strong>{p.name}</strong><b>{egp(p.price)}</b><span className="add-circle">+</span></button>)}</div>
  </Page>;
}

function RewardsView({ notify }: { notify: (m: string) => void }) { return <Page title="Rewards" eyebrow="1718 CLUB" subtitle="The more you enjoy, the more you get back."><div className="points-banner"><div><small>YOUR POINTS</small><strong>1,240</strong><span>points</span><p>760 points to your next tier</p></div><div className="ring"><span>83%</span></div></div><div className="reward-tabs"><button className="selected">Available</button><button>My Rewards</button><button>History</button></div><div className="reward-cards">{rewards.map(r => { const Icon = r.icon; return <article className={`reward-card ${r.tone}`} key={r.title}><div className="reward-art" /><div className="reward-copy"><small>{r.points} POINTS</small><h3>{r.title}</h3><p>{r.detail}</p><button onClick={() => notify('Reward reserved in your Club account.')}>Redeem <ChevronRight size={14} /></button></div><Icon className="reward-icon" /></article>; })}</div></Page>; }
function ClubView() { return <Page title="The Club" eyebrow="1718 CLUB" subtitle="More than coffee. A community."><div className="club-hero"><div className="club-hero-photo"><img src="/api/media/club_hero" alt="1718 mascot" onError={e => { const t = e.currentTarget; if (!t.src.includes('parrot-hero')) t.src = '/brand/1718-parrot-hero.svg'; }} /></div><p>YOUR MEMBERSHIP</p><h2>Gold</h2><span>1,240 points</span></div><div className="tier-list"><div><b>Member</b><span>0 – 1,999 points</span></div><div className="current"><b>Gold</b><span>2,000 – 4,999 points</span><Crown /></div><div><b>Black</b><span>5,000+ points · Invitation</span></div></div><p className="club-note">Priority access, secret menu drinks, member-only events and surprises.</p></Page>; }
function MoreView({ onCard }: { onCard: () => void }) { return <Page title="Profile" eyebrow="YOUR 1718" subtitle="Everything in one place."><div className="profile-head"><div className="profile-avatar">MH</div><div><h2>Club Member</h2><span>Gold Member · 1,240 points</span></div></div><div className="profile-actions"><button onClick={onCard}><QrCode /><span>My Club Card</span><ChevronRight /></button><button><Package /><span>My Orders</span><ChevronRight /></button><button><Gift /><span>My Rewards</span><ChevronRight /></button><button><Sparkles /><span>Refer a Friend</span><ChevronRight /></button></div><div className="parrot-note"><img src="/api/media/profile_mascot" alt="" onError={e => { const t = e.currentTarget; if (!t.src.includes('parrot-hero')) t.src = '/brand/1718-parrot-hero.svg'; }} /><span>Good coffee<br /><em>brings better people.</em></span></div></Page>; }
function CardModal({ close }: { close: () => void }) { return <div className="modal-backdrop" onClick={close}><div className="card-modal" onClick={e => e.stopPropagation()}><button className="close" onClick={close}><X /></button><div className="big-card"><Brand light /><small>GOLD MEMBER</small><div className="big-qr"><QrCode size={126} /></div><strong>1718 Club Member</strong><span>Scan at the counter</span></div></div></div>; }

function ProductSheet({ item, catName, close, add }: { item: Item; catName: string; close: () => void; add: () => void }) {
  const name = splitName(item.name);
  return <div className="sheet-backdrop" onClick={close}><div className="product-sheet" onClick={e => e.stopPropagation()}>
    <button className="sheet-close" onClick={close}><X /></button>
    <div className="sheet-photo" style={photoBg(item.image, 900)} />
    <div className="sheet-content">
      <small>{catName.toUpperCase()} · 1718</small>
      <h2>{name.head} <em>{name.tail}</em></h2>
      {item.recipe && <p>{item.recipe}</p>}
      <div className="price-line"><strong>{egp(item.price)}</strong>{item.calories != null && <span className="cal-badge"><Flame size={12} /> {item.calories} cal</span>}</div>
      <button className="primary-btn" onClick={add}>Add to Order <ShoppingBag size={17} /></button>
    </div>
  </div></div>;
}
