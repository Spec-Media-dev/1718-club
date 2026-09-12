'use client';

import { useState } from 'react';
import { ArrowRight, Bell, ChevronRight, Gift, Heart, QrCode, Sparkles, UserRound } from 'lucide-react';

const rewards = [
  { title: 'Signature Coffee', points: '1,500 pts', detail: 'A signature cup, on us.' },
  { title: '1718 Treat', points: '2,500 pts', detail: 'Choose a coffee or tea favourite.' },
  { title: 'Club Reward', points: '5,000 pts', detail: 'EGP 500 toward your next visit.' },
];

export default function Home() {
  const [tab, setTab] = useState('Home');
  const [toast, setToast] = useState('');
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2200); };

  return (
    <main className="shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">17<span>8</span></div>
          <div className="brand-sub">SPECIALTY<br />COFFEE</div>
        </div>
        <div className="top-actions">
          <button className="circle-button" onClick={() => notify('You are all caught up.')} aria-label="Notifications"><Bell size={17}/></button>
          <button className="circle-button" onClick={() => notify('Your membership profile is ready.')} aria-label="Profile"><UserRound size={17}/></button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">WELCOME BACK</p>
          <h1>Your place<br /><em>at 1718.</em></h1>
          <p className="intro">Coffee, discoveries and a few things we keep just for the Club.</p>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <div className="parrot-line"><span className="parrot-eye" /></div>
          <span className="orbit-dot dot-one" /><span className="orbit-dot dot-two" />
          <span className="hero-number">18</span>
        </div>
      </section>

      <section className="member-card">
        <div className="card-shine" />
        <div className="card-top"><span>1718 CLUB</span><span className="level">GOLD MEMBER</span></div>
        <div className="card-center">
          <div><span className="balance-label">CLUB BALANCE</span><strong>2,840</strong><span className="balance-unit">POINTS</span></div>
          <button className="card-qr" onClick={() => notify('Membership QR opened.')} aria-label="Show membership QR"><QrCode size={31}/></button>
        </div>
        <div className="progress"><div style={{width:'71%'}} /></div>
        <div className="card-bottom"><span>160 points to your next reward</span><button onClick={() => notify('Membership card opened.')}>VIEW CARD <ChevronRight size={13}/></button></div>
      </section>

      <section className="feature-product">
        <div className="product-visual">
          <div className="sun-glow" />
          <div className="cup"><div className="cup-logo">17<span>8</span><small>SPECIALTY COFFEE</small></div></div>
          <div className="branch branch-a" /><div className="branch branch-b" />
          <div className="mascot-badge">PARROT<br /><small>1718</small></div>
          <button className="heart" onClick={() => notify('Added to favourites.')} aria-label="Favourite"><Heart size={18}/></button>
        </div>
        <div className="product-info">
          <div><p className="eyebrow">TODAY AT 1718</p><h2>Iced Matcha Latte</h2><p>Cold · Creamy · Made to order</p></div>
          <button className="round-arrow" onClick={() => notify('Opening Iced Matcha Latte.') }><ArrowRight size={18}/></button>
        </div>
      </section>

      <section className="quick-actions">
        <button onClick={() => notify('Rewards are ready to explore.')}><Gift/><span>Rewards</span></button>
        <button onClick={() => notify('Secret Menu unlocked for Gold members.')}><Sparkles/><span>Secret Menu</span></button>
        <button onClick={() => notify('Your personal invite is ready.')}><span className="invite-icon">1718</span><span>Invite</span></button>
      </section>

      <section className="section-head"><div><p className="eyebrow">CURATED FOR YOU</p><h2>Rewards worth keeping.</h2></div><button onClick={() => setTab('Rewards')}>View all <ArrowRight size={15}/></button></section>
      <div className="reward-list">
        {rewards.map((reward, index) => <article className="reward" key={reward.title}><div className="reward-index">0{index + 1}</div><div><h3>{reward.title}</h3><p>{reward.detail}</p></div><strong>{reward.points}</strong></article>)}
      </div>

      <section className="secret-banner" onClick={() => notify('Secret Menu opened.')}>
        <div className="secret-art"><span>🦜</span></div>
        <div className="secret-copy"><p className="eyebrow">GOLD & BLACK ONLY</p><h2>The Secret Menu</h2><p>Drinks the parrot keeps to himself.</p></div>
        <ArrowRight size={19}/>
      </section>

      <nav className="nav">
        {['Home','Rewards','Club','Menu','Profile'].map((item) => <button key={item} className={tab===item?'active':''} onClick={() => setTab(item)}><span>{item}</span></button>)}
      </nav>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
