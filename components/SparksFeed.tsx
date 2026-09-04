import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Music, User, Plus } from 'lucide-react';
import { Content } from '../types';

interface SparksFeedProps {
   items: Content[];
}

const SparksFeed: React.FC<SparksFeedProps> = ({ items }) => {
   const [activeIndex, setActiveIndex] = useState(0);
   const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});
   const [following, setFollowing] = useState<Record<string, boolean>>({});

   const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, clientHeight } = e.currentTarget;
      const index = Math.round(scrollTop / clientHeight);
      if (index !== activeIndex) {
         setActiveIndex(index);
      }
   };

   const toggleLike = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setLikedItems(prev => ({ ...prev, [id]: !prev[id] }));
   };

   const toggleFollow = (idx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setFollowing(prev => ({ ...prev, [idx]: !prev[idx] }));
   };

   return (
      <div
         className="w-full h-[calc(100vh-64px)] overflow-y-scroll snap-y snap-mandatory bg-black no-scrollbar"
         onScroll={handleScroll}
      >
         {items.map((item, idx) => (
            <div key={item.id} className="w-full h-full snap-start relative flex justify-center bg-[#0a0a0a]">
               {/* Visual Content (Poster as Placeholder for vertical video) */}
               <div className="h-full w-full md:w-[450px] relative overflow-hidden">
                  <img
                     src={item.poster_path || undefined}
                     alt={item.title}
                     className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90" />

                  {/* Right Action Bar */}
                  <div className="absolute right-4 bottom-28 flex flex-col items-center gap-7">
                     <div className="flex flex-col items-center gap-1.5">
                        <button
                           onClick={(e) => toggleLike(item.id, e)}
                           className={`p-3.5 rounded-full cursor-pointer transition-all transform active:scale-75 ${likedItems[item.id] ? 'bg-brand-red text-white' : 'bg-gray-800/40 backdrop-blur-md text-white border border-white/10'}`}
                        >
                           <Heart size={30} fill={likedItems[item.id] ? "currentColor" : "none"} />
                        </button>
                        <span className="text-[11px] font-black drop-shadow-lg uppercase tracking-tighter">12.1K</span>
                     </div>

                     <div className="flex flex-col items-center gap-1.5">
                        <button
                           className="p-3.5 bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-full cursor-pointer transition-colors"
                        >
                           <MessageCircle size={30} className="text-white" />
                        </button>
                        <span className="text-[11px] font-black drop-shadow-lg uppercase tracking-tighter">450</span>
                     </div>

                     <button
                        className="p-3.5 bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-full cursor-pointer transition-colors"
                     >
                        <Share2 size={30} className="text-white" />
                     </button>
                  </div>

                  {/* Bottom Info Overlay */}
                  <div className="absolute left-6 bottom-10 right-20 text-white text-left animate-in slide-in-from-bottom-10 duration-700">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-11 h-11 rounded-full bg-brand-red flex items-center justify-center border-2 border-white/20 shadow-xl">
                           <User size={24} />
                        </div>
                        <span className="font-black text-sm drop-shadow-xl tracking-tight">@mydonkey_official</span>

                        <button
                           onClick={(e) => toggleFollow(idx, e)}
                           className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${following[idx] ? 'bg-transparent border border-white/40 text-white' : 'bg-white text-black hover:scale-105'}`}
                        >
                           {following[idx] ? 'Following' : 'Follow'}
                        </button>
                     </div>

                     <h3 className="text-lg font-bold mb-3 drop-shadow-xl line-clamp-2 leading-snug">{item.overview}</h3>
                     <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/10 backdrop-blur-sm border border-white/5 w-fit px-4 py-1.5 rounded-full">
                        <Music size={12} className="animate-spin-slow" />
                        <span>{item.title} - Official Audio</span>
                     </div>
                  </div>
               </div>
            </div>
         ))}
      </div>
   );
};

export default SparksFeed;