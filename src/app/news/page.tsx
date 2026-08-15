import React from 'react';

import Header from '@/components/Header';
import Footer from '@/components/Footer';

const articles = [
{
  id: 1,
  category: 'Market Update',
  title: 'Tesla Q3 2026 Earnings Beat Expectations — EPS $2.84 vs $2.61 Estimate',
  excerpt: 'Tesla reported record quarterly revenue of $28.4B, driven by strong Cybertruck demand and energy storage deployments reaching 9.4 GWh.',
  time: '2 hours ago',
  readTime: '4 min read',
  tag: 'TSLA',
  tagColor: 'text-green-400 bg-green-400/10 border-green-400/20',
  image: "https://images.unsplash.com/photo-1573126324222-6600c9c21274",
  alt: 'Tesla Model S electric vehicle charging at a Supercharger station at night with city lights in background',
  featured: true
},
{
  id: 2,
  category: 'Energy',
  title: 'Megapack Orders Surge 340% as Global Grid Storage Demand Accelerates',
  excerpt: 'Tesla Energy division sees unprecedented demand with utility-scale battery contracts signed across 14 countries.',
  time: '5 hours ago',
  readTime: '3 min read',
  tag: 'Energy',
  tagColor: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1b937a421-1773093286076.png",
  alt: 'Large-scale solar panel array in desert landscape with clear blue sky, renewable energy installation',
  featured: false
},
{
  id: 3,
  category: 'Robotics',
  title: 'Optimus Gen 3 Begins Factory Deployment — 1,000 Units Operational',
  excerpt: 'Tesla\'s humanoid robot reaches commercial milestone with full factory integration at Gigafactory Texas.',
  time: '1 day ago',
  readTime: '5 min read',
  tag: 'Robotics',
  tagColor: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_114687bad-1772811528144.png",
  alt: 'Futuristic humanoid robot in industrial factory setting with bright lights and machinery',
  featured: false
},
{
  id: 4,
  category: 'Investment',
  title: 'Tesla Trade Platform Reaches $2.4T AUM Milestone',
  excerpt: 'The platform celebrates a landmark achievement as total assets under management cross the $2.4 trillion threshold.',
  time: '2 days ago',
  readTime: '2 min read',
  tag: 'Platform',
  tagColor: 'text-primary bg-primary/10 border-primary/20',
  image: "https://images.unsplash.com/photo-1672617195387-1a890be98e28",
  alt: 'Stock market trading screen showing green upward trending charts and financial data',
  featured: false
},
{
  id: 5,
  category: 'Vehicles',
  title: 'Cybertruck Demand Outpaces Production — 2.1M Orders Backlog',
  excerpt: 'Despite ramping production to 3,000 units per week, Tesla faces a growing waitlist for its stainless steel pickup.',
  time: '3 days ago',
  readTime: '3 min read',
  tag: 'Vehicles',
  tagColor: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  image: "https://images.unsplash.com/photo-1667137092038-27612b7233d1",
  alt: 'Modern electric pickup truck on a dark road with dramatic lighting and mountain backdrop',
  featured: false
},
{
  id: 6,
  category: 'Regulation',
  title: 'SEC Approves Tesla Ecosystem Investment Products for Retail Investors',
  excerpt: 'New regulatory framework opens Tesla-backed investment vehicles to a broader retail investor base.',
  time: '4 days ago',
  readTime: '4 min read',
  tag: 'Regulation',
  tagColor: 'text-[#888888] bg-[#1A1A1A] border-[#2A2A2A]',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1daf442ff-1772333279339.png",
  alt: 'Government building with columns and American flag, representing financial regulation and policy',
  featured: false
}];


const categories = ['All', 'Market Update', 'Energy', 'Robotics', 'Investment', 'Vehicles', 'Regulation'];

export default function NewsPage() {
  const featured = articles?.find((a) => a?.featured);
  const rest = articles?.filter((a) => !a?.featured);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <Header />
      <div className="pt-24 pb-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase mb-3 block">Market Intelligence</span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
              News & <span className="gradient-text-primary">Insights</span>
            </h1>
            <p className="text-[#666666] text-base max-w-xl">
              Real-time market intelligence, Tesla ecosystem updates, and investment research.
            </p>
          </div>

          {/* Category filters */}
          <div className="flex gap-2 flex-wrap mb-10">
            {categories?.map((cat) =>
            <button
              key={cat}
              className={`px-4 py-2 text-xs font-semibold rounded border tracking-wider uppercase transition-all ${
              cat === 'All' ? 'bg-primary text-white border-primary' : 'bg-transparent text-[#666666] border-[#2A2A2A] hover:border-[#3A3A3A] hover:text-white'}`
              }>
              
                {cat}
              </button>
            )}
          </div>

          {/* Featured article */}
          {featured &&
          <div className="mb-10 bg-[#111111] border border-[#1A1A1A] rounded-lg overflow-hidden hover:border-primary/20 transition-all duration-300 group">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="relative h-64 lg:h-auto overflow-hidden">
                  <img
                  src={featured?.image}
                  alt={featured?.alt}
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500 group-hover:scale-105 transform" />
                
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#111111] hidden lg:block" />
                </div>
                <div className="p-8 lg:p-10 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded border tracking-wider uppercase ${featured?.tagColor}`}>
                      {featured?.tag}
                    </span>
                    <span className="text-xs text-[#555555]">{featured?.time}</span>
                    <span className="text-xs text-[#444444]">{featured?.readTime}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mb-4 leading-tight">
                    {featured?.title}
                  </h2>
                  <p className="text-sm text-[#888888] leading-relaxed mb-6">{featured?.excerpt}</p>
                  <a href="#" className="inline-flex items-center gap-2 text-xs font-bold text-primary tracking-widest uppercase hover:gap-3 transition-all">
                    Read Full Story
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </a>
                </div>
              </div>
            </div>
          }

          {/* Article grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rest?.map((article) =>
            <article key={article?.id} className="bg-[#111111] border border-[#1A1A1A] rounded-lg overflow-hidden hover:border-primary/20 transition-all duration-300 group flex flex-col">
                <div className="relative h-44 overflow-hidden">
                  <img
                  src={article?.image}
                  alt={article?.alt}
                  className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity duration-500 group-hover:scale-105 transform" />
                
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded border tracking-wider uppercase ${article?.tagColor}`}>
                      {article?.tag}
                    </span>
                    <span className="text-[10px] text-[#444444]">{article?.time}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white leading-snug mb-2 flex-1">{article?.title}</h3>
                  <p className="text-xs text-[#666666] leading-relaxed mb-4 line-clamp-2">{article?.excerpt}</p>
                  <a href="#" className="text-[10px] font-bold text-primary tracking-widest uppercase hover:text-red-400 transition-colors">
                    Read More →
                  </a>
                </div>
              </article>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>);

}