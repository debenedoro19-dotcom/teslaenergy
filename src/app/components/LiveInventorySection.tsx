'use client';
import React, { useState } from 'react';
import AppImage from '@/components/ui/AppImage';

type Category = 'All' | 'Vehicles' | 'Energy' | 'Robotics';

interface InventoryItem {
  id: number;
  name: string;
  price: string;
  badge: string;
  badgeType: 'new' | 'cpo' | 'energy' | 'robotics';
  category: Exclude<Category, 'All'>;
  image: string;
  alt: string;
  tag?: string;
}

const inventory: InventoryItem[] = [
// ── Vehicles ──────────────────────────────────────────────────────────────
{
  id: 1,
  name: '2025 Tesla Cybertruck AWD',
  price: '$79,990',
  badge: 'NEW',
  badgeType: 'new',
  category: 'Vehicles',
  image: "https://images.unsplash.com/photo-1715135755172-4605bd091ba2",
  alt: 'Tesla Cybertruck AWD stainless steel angular body parked on open road at dusk, dramatic sky'
},
{
  id: 2,
  name: '2025 Cybertruck Cyberbeast',
  price: '$99,990',
  badge: 'NEW',
  badgeType: 'new',
  category: 'Vehicles',
  image: "https://images.unsplash.com/photo-1715135755172-4605bd091ba2",
  alt: 'Tesla Cybertruck Cyberbeast tri-motor edition on desert terrain, stainless steel finish, golden hour lighting'
},
{
  id: 3,
  name: '2025 Model S Plaid',
  price: '$89,990',
  badge: 'NEW',
  badgeType: 'new',
  category: 'Vehicles',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_129321397-1772068784483.png",
  alt: 'Tesla Model S Plaid in midnight silver metallic, sleek aerodynamic sedan on dark studio background'
},
{
  id: 4,
  name: 'CPO Model S Long Range',
  price: '$69,990',
  badge: 'CPO',
  badgeType: 'cpo',
  category: 'Vehicles',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1997eb805-1767414403178.png",
  alt: 'Certified pre-owned Tesla Model S Long Range in pearl white, luxury electric sedan side profile on clean background'
},
{
  id: 5,
  name: '2025 Model 3 Highland Performance',
  price: '$54,990',
  badge: 'NEW',
  badgeType: 'new',
  category: 'Vehicles',
  image: "https://images.unsplash.com/photo-1591628360686-06bc9367d09a",
  alt: 'Tesla Model 3 Highland Performance in ultra red, sporty compact sedan on dynamic outdoor setting'
},
{
  id: 6,
  name: '2025 Model 3 Highland Long Range AWD',
  price: '$47,990',
  badge: 'NEW',
  badgeType: 'new',
  category: 'Vehicles',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_100135f9a-1772068664677.png",
  alt: 'Tesla Model 3 Highland Long Range AWD in stealth grey, refreshed front fascia, clean studio lighting'
},
{
  id: 7,
  name: '2025 Model 3 Highland RWD',
  price: '$38,990',
  badge: 'NEW',
  badgeType: 'new',
  category: 'Vehicles',
  image: "https://images.unsplash.com/photo-1655792290994-93437dc0482c",
  alt: 'Tesla Model 3 Highland RWD in solid black, compact electric sedan in urban environment'
},
{
  id: 8,
  name: '2025 Model X Plaid',
  price: '$94,990',
  badge: 'NEW',
  badgeType: 'new',
  category: 'Vehicles',
  image: "https://images.unsplash.com/photo-1650938777875-a375b33cd705",
  alt: 'Tesla Model X Plaid SUV with falcon wing doors open, obsidian black, dramatic studio environment'
},
{
  id: 9,
  name: 'CPO Model X Long Range',
  price: '$79,990',
  badge: 'CPO',
  badgeType: 'cpo',
  category: 'Vehicles',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1685a1a55-1770334382943.png",
  alt: 'Certified pre-owned Tesla Model X Long Range in silver metallic, full-size electric SUV on clean background'
},
{
  id: 10,
  name: '2025 Model Y Juniper Performance',
  price: '$59,990',
  badge: 'NEW',
  badgeType: 'new',
  category: 'Vehicles',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1eff0c21f-1786700170571.png",
  alt: 'Tesla Model Y Juniper Performance in quicksilver, refreshed front design, dynamic outdoor setting'
},
{
  id: 11,
  name: '2025 Model Y Juniper Long Range AWD',
  price: '$52,990',
  badge: 'NEW',
  badgeType: 'new',
  category: 'Vehicles',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1e9e9d3a5-1772067208650.png",
  alt: 'Tesla Model Y Juniper Long Range AWD in pearl white, compact SUV with updated headlights, bright studio lighting'
},
{
  id: 12,
  name: '2025 Model Y Juniper RWD',
  price: '$44,990',
  badge: 'NEW',
  badgeType: 'new',
  category: 'Vehicles',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1e9e9d3a5-1772067208650.png",
  alt: 'Tesla Model Y Juniper RWD in midnight cherry red, practical electric crossover side view in urban setting'
},
{
  id: 13,
  name: 'Tesla Semi – 500 Mile Range',
  price: '$150,000',
  badge: 'NEW',
  badgeType: 'new',
  category: 'Vehicles',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_194c94a32-1782930928777.png",
  alt: 'Tesla Semi electric truck on highway, futuristic aerodynamic cab design, long-haul electric freight'
},
{
  id: 14,
  name: 'CPO Model 3 2024',
  price: '$32,990',
  badge: 'CPO',
  badgeType: 'cpo',
  category: 'Vehicles',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_19d277a2a-1786700170011.png",
  alt: 'Certified pre-owned Tesla Model 3 2024 Highland in clean white setting, compact sedan front three-quarter view'
},
{
  id: 15,
  name: 'Tesla Cybercab – Reservation',
  price: '$30,000',
  badge: 'NEW',
  badgeType: 'new',
  category: 'Vehicles',
  image: "https://images.unsplash.com/photo-1699016083291-6fdf857e82a8",
  alt: 'Tesla Cybercab autonomous robotaxi concept, sleek two-door design, futuristic electric vehicle'
},

// ── Energy ────────────────────────────────────────────────────────────────
{
  id: 16,
  name: 'Powerwall 3 – 13.5 kWh',
  price: '$11,500',
  badge: 'ENERGY',
  badgeType: 'energy',
  category: 'Energy',
  image: "https://images.unsplash.com/photo-1706699778556-a9f9da002139",
  alt: 'Tesla Powerwall 3 home battery unit mounted on white exterior wall, clean modern residential installation'
},
{
  id: 17,
  name: 'Powerwall 3 – Two-Unit System',
  price: '$21,500',
  badge: 'ENERGY',
  badgeType: 'energy',
  category: 'Energy',
  image: "https://images.unsplash.com/photo-1706699778556-a9f9da002139",
  alt: 'Two Tesla Powerwall 3 units installed side by side on exterior wall, complete home energy storage setup'
},
{
  id: 18,
  name: 'Tesla Solar Roof V3 – 10 kW',
  price: '$35,000',
  badge: 'ENERGY',
  badgeType: 'energy',
  category: 'Energy',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1f81c1cd3-1786700170777.png",
  alt: 'Tesla Solar Roof V3 tiles integrated seamlessly into modern home rooftop, bright sunlight, clean energy installation'
},
{
  id: 19,
  name: 'Tesla Solar Panels – 8.16 kW',
  price: '$22,000',
  badge: 'ENERGY',
  badgeType: 'energy',
  category: 'Energy',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1fd4f5900-1775946061202.png",
  alt: 'Tesla Solar Panels array on modern home roof, blue sky background, residential clean energy setup'
},
{
  id: 20,
  name: 'Tesla Solar Panels – 12.24 kW',
  price: '$30,000',
  badge: 'ENERGY',
  badgeType: 'energy',
  category: 'Energy',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_14d68ed9c-1784572897425.png",
  alt: 'Large Tesla Solar Panel installation on commercial building rooftop, expansive solar array, bright sunny environment'
},
{
  id: 21,
  name: 'Powerwall 3 + Solar Bundle',
  price: '$44,500',
  badge: 'ENERGY',
  badgeType: 'energy',
  category: 'Energy',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1e4e26e3c-1769245733716.png",
  alt: 'Tesla Powerwall 3 and Solar Panel bundle installation on modern home, complete home energy system'
},
{
  id: 22,
  name: 'Tesla Megapack – Commercial',
  price: '$1,200,000',
  badge: 'ENERGY',
  badgeType: 'energy',
  category: 'Energy',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1fd25a658-1786700170664.png",
  alt: 'Tesla Megapack large-scale commercial battery energy storage system, industrial installation, utility-scale power'
},

// ── Robotics ──────────────────────────────────────────────────────────────
{
  id: 23,
  name: 'Optimus Gen 2 – Production Allocation',
  price: '$25,000',
  badge: 'ROBOTICS',
  badgeType: 'robotics',
  category: 'Robotics',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_10b24ecee-1769873083751.png",
  alt: 'Tesla Optimus Gen 2 humanoid robot standing in modern facility, white and grey design, advanced AI robotics'
},
{
  id: 24,
  name: 'Optimus Gen 2 – Industrial Pack',
  price: '$45,000',
  badge: 'ROBOTICS',
  badgeType: 'robotics',
  category: 'Robotics',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_10c3131db-1786700170653.png",
  alt: 'Tesla Optimus Gen 2 industrial configuration performing factory task, precision robotic manipulation in manufacturing environment'
},
{
  id: 25,
  name: 'Optimus End-Effector Toolkit',
  price: '$8,500',
  badge: 'ROBOTICS',
  badgeType: 'robotics',
  category: 'Robotics',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1f9347a15-1775873403838.png",
  alt: 'Robotic hand and arm end-effector components on dark surface, precision engineering parts for Optimus robot'
},
{
  id: 26,
  name: 'Autonomous Factory Robot Package',
  price: '$150,000',
  badge: 'ROBOTICS',
  badgeType: 'robotics',
  category: 'Robotics',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1d5db8362-1779019347119.png",
  alt: 'Industrial robotic arm in Tesla Gigafactory setting, automated manufacturing environment, dark industrial atmosphere'
}];


const categories: Category[] = ['All', 'Vehicles', 'Energy', 'Robotics'];

const badgeClasses: Record<string, string> = {
  new: 'card-badge-new',
  cpo: 'card-badge-cpo',
  energy: 'card-badge-energy',
  robotics: 'card-badge-robotics'
};

export default function LiveInventorySection() {
  const [active, setActive] = useState<Category>('All');
  const [showAll, setShowAll] = useState(false);

  const filtered = active === 'All' ? inventory : inventory.filter((i) => i.category === active);
  const displayed = showAll ? filtered : filtered.slice(0, 12);

  return (
    <section id="inventory" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      {/* Section header */}
      <div className="max-w-7xl mx-auto mb-12 section-reveal">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-bold text-green-400 tracking-[0.25em] uppercase">Live Inventory</span>
            </div>
            <h2 className="text-section-title font-extrabold tracking-tighter text-foreground">
              Verified Tesla Assets,{' '}
              <span className="gradient-text-primary">Available Now</span>
            </h2>
          </div>
          <a href="#" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 self-start md:self-auto">
            View Full Catalog
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </a>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Inventory category filter">
          {categories.map((cat) =>
          <button
            key={cat}
            role="tab"
            aria-selected={active === cat}
            onClick={() => {setActive(cat);setShowAll(false);}}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 min-h-[44px] ${
            active === cat ?
            'bg-primary text-primary-foreground shadow-lg' :
            'bg-muted/40 text-muted-foreground border border-border hover:border-primary/30 hover:text-foreground'}`
            }
            style={active === cat ? { boxShadow: '0 0 20px rgba(0,212,255,0.25)' } : {}}>
            
              {cat}
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {displayed.map((item, idx) =>
        <article
          key={item.id}
          className="glass-card glass-card-hover rounded-2xl overflow-hidden group section-reveal"
          style={{ transitionDelay: `${idx % 12 * 40}ms` }}>
          
            {/* Image */}
            <div className="relative h-48 overflow-hidden bg-muted">
              <AppImage
              src={item.image}
              alt={item.alt}
              fill
              loading="lazy"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
            
              <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
              <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-widest uppercase ${badgeClasses[item.badgeType]}`}>
                {item.badge}
              </span>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="text-sm font-bold text-foreground mb-1 leading-tight">{item.name}</h3>
              <div className="flex items-center justify-between mt-3">
                <span className="text-primary font-extrabold text-base">{item.price}</span>
                <button className="px-3 py-1.5 text-xs font-bold text-primary-foreground bg-primary rounded-lg btn-shimmer hover:opacity-90 transition-all min-h-[36px]">
                  Inquire
                </button>
              </div>
            </div>
          </article>
        )}
      </div>

      {/* Load more */}
      {filtered.length > 12 &&
      <div className="max-w-7xl mx-auto mt-10 text-center">
          <button
          onClick={() => setShowAll(!showAll)}
          className="px-8 py-3.5 border border-border text-foreground font-semibold rounded-xl hover:border-primary/40 hover:bg-primary/5 text-sm transition-all duration-300 btn-shimmer min-h-[44px]">
          
            {showAll ? 'Show Less' : `Load More (${filtered.length - 12} remaining)`}
          </button>
        </div>
      }
    </section>);

}