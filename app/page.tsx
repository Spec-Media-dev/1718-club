'use client';

import { useState } from 'react';
import { ArrowRight, Gift, QrCode, Sparkles, Star, Ticket, UserRound } from 'lucide-react';

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
      <div className="grain" />
      <header className="topbar">
        <div className="brand"><span>1718</span><small>CLUB</small></div>
        <button className="icon-button" onClick={() => notify('Your membership card is ready.') } aria-label="Profile"><UserRound size={18}/></button>
      </header>

      <section className="hero">
        <p className="eyebrow">WELCOME BACK</p>
        <h1>More than<br/><em>coffee.</em></h1>
        <p className="intro">Your place at 1718. Earn, discover and enjoy a little more with every visit.</p>
      </section>

      <section className="member-card">
        <div className="card-top"><span>1718 CLUB</span><span className="level">GOLD MEMBER</span></div>
        <div className="balance"><strong>2,840</strong><span>CLUB POINTS</span></div>
        <div className="progress"><div style={{width:'71%'}} /></div>
        <div className="card-bottom"><span>160 pts to next reward</span><button onClick={() => notify('Membership QR opened.')}> <QrCode size={16}/> SHOW CARD</button></div>
      </section>

      <section className="quick-actions">
        <button onClick={() => notify('Rewards are ready to explore.')}><Gift/><span>Rewards</span></button>
        <button onClick={() => notify('Secret Menu unlocked for Gold members.')}><Sparkles/><span>Secret Menu</span></button>
        <button onClick={() => notify('Your referral code: CLUB1718')}><Ticket/><span>Invite</span></button>
      </section>

      <section className="section-head"><div><p className="eyebrow">FOR YOU</p><h2>Your rewards</h2></div><button onClick={() => setTab('Rewards')}>View all <ArrowRight size={16}/></button></section>
      <div className="reward-list">
        {rewards.map((reward) => <article className="reward" key={reward.title}><div className="reward-mark"><Star size={17}/></div><div><h3>{reward.title}</h3><p>{reward.detail}</p></div><strong>{reward.points}</strong></article>)}
      </div>

      <section className="secret-banner" onClick={() => notify('Secret Menu opened.')}>
        <div><p className="eyebrow">GOLD & BLACK ONLY</p><h2>The Secret Menu</h2><p>Discover drinks reserved for the Club.</p></div><ArrowRight size={20}/>
      </section>

      <nav className="nav">
        {['Home','Rewards','Club','Menu','Profile'].map((item) => <button key={item} className={tab===item?'active':''} onClick={() => setTab(item)}>{item}</button>)}
      </nav>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
