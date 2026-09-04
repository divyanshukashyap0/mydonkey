import React from 'react';
import { Facebook, Twitter, Instagram, Youtube, Globe, MapPin } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface FooterProps {
  onNavigate: (pageTitle: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { settings, pages } = useStore();
  const siteName = settings?.siteName || 'My Donkey';

  const footerSections = [
    {
      title: 'Company',
      links: pages.filter(p => p.category === 'Company').map(p => ({ label: p.title, action: p.id }))
    },
    {
      title: 'Support',
      links: [
        ...pages.filter(p => p.category === 'Support').map(p => ({ label: p.title, action: p.id })),
        { label: 'Suggested Adblockers', action: 'adblocker' },
        { label: 'User Manual', action: '/MyDonkey.pdf' }
      ]
    },
    {
      title: 'Legal',
      links: pages.filter(p => p.category === 'Legal').map(p => ({ label: p.title, action: p.id }))
    },
    {
      title: 'Connect',
      links: [
        ...pages.filter(p => p.category === 'Connect').map(p => ({ label: p.title, action: p.id })),
        { label: 'Browse Categories', action: 'categories' },
        { label: 'Account', action: 'Account' }
      ]
    }
  ];

  return (
    <footer className="bg-black text-gray-400 py-12 md:py-16 px-6 md:px-12 border-t border-white/10 text-sm mt-12 relative z-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-6 mb-8">
          {settings.facebookUrl && (
            <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer">
              <Facebook size={24} className="hover:text-white cursor-pointer transition-colors" />
            </a>
          )}
          {settings.instagramUrl && (
            <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">
              <Instagram size={24} className="hover:text-white cursor-pointer transition-colors" />
            </a>
          )}
          {settings.twitterUrl && (
            <a href={settings.twitterUrl} target="_blank" rel="noopener noreferrer">
              <Twitter size={24} className="hover:text-white cursor-pointer transition-colors" />
            </a>
          )}
          {settings.youtubeUrl && (
            <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer">
              <Youtube size={24} className="hover:text-white cursor-pointer transition-colors" />
            </a>
          )}
        </div>

        {/* Sincere Apology & Language Policy Notices */}
        <div className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Huge Sorry for Unavailable Content */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-red-950/20 to-black/80 border border-amber-500/20 p-6 md:p-8 backdrop-blur-sm shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-2xl shadow-inner">
                🙏
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    A Huge Sincere Apology
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                  Can't Find Your Wished Content? We Are Deeply Sorry!
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  If the specific movie, series, or episode you wished to watch is currently unavailable or missing, please accept our biggest, most heartfelt apologies. While we continuously scour indexes and catalogue thousands of titles daily, some requested titles may not be available yet. Our team is constantly working to expand the catalog to bring your desired content here.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Apology for Original Language Support Only */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-red-950/20 to-black/80 border border-purple-500/20 p-6 md:p-8 backdrop-blur-sm shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 text-2xl shadow-inner">
                🎧
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Audio Language Notice
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                  Apologies: Only Original Language Audio Is Supported
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  We also offer our sincerest apologies that all movies and shows on our platform are provided exclusively in their authentic original voice and language. We currently do not provide dubbed audio tracks or secondary language voiceovers. We understand many viewers prefer localized dubbing, and we truly regret any inconvenience this may cause to your entertainment experience.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {footerSections.map((section, idx) => (
            <div key={idx}>
              <h4 className="font-bold text-gray-200 mb-4 uppercase text-xs tracking-wider hidden md:block">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, lIdx) => (
                  <li
                    key={lIdx}
                    className="hover:underline cursor-pointer transition-colors hover:text-white"
                    onClick={() => {
                      if (link.action.endsWith('.pdf')) {
                        window.open(link.action, '_blank');
                      } else {
                        onNavigate(link.action);
                      }
                    }}
                  >
                    {link.label}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs pt-8 border-t border-white/10">
          <div className="flex flex-col gap-4">
            <button className="border border-gray-400 px-4 py-1.5 hover:text-white hover:border-white transition-colors flex items-center gap-2 w-fit">
              <Globe size={14} /> English
            </button>
            <p className="flex items-center gap-2">
              <MapPin size={14} /> {siteName} India
            </p>
          </div>
          <div className="flex flex-col md:items-end gap-2">
            <p>&copy; {new Date().getFullYear()} {siteName}. All Rights Reserved.</p>
            <p>Designed with ❤️ for Entertainment.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;