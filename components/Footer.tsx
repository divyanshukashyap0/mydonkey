import React from 'react';
import { Facebook, Twitter, Instagram, Youtube, Globe, MapPin } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface FooterProps {
  onNavigate: (pageTitle: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { settings } = useStore();
  const siteName = settings?.siteName || 'My Donkey';

  const footerLinks = [
    {
      title: 'Company',
      links: ['About Us', 'Careers', 'Press', 'Blog', 'Investors']
    },
    {
      title: 'Support',
      links: ['Help Center', 'Supported Devices', 'Contact Us', 'Activate Device']
    },
    {
      title: 'Legal',
      links: ['Terms of Use', 'Privacy Policy', 'Cookie Preferences', 'Corporate Information']
    },
    {
      title: 'Connect',
      links: ['Ways to Watch', 'Speed Test', `Only on ${siteName}`, 'Account']
    }
  ];

  return (
    <footer className="bg-black text-gray-400 py-12 md:py-16 px-6 md:px-12 border-t border-white/10 text-sm mt-12 relative z-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-6 mb-8">
          <Facebook size={24} className="hover:text-white cursor-pointer transition-colors" />
          <Instagram size={24} className="hover:text-white cursor-pointer transition-colors" />
          <Twitter size={24} className="hover:text-white cursor-pointer transition-colors" />
          <Youtube size={24} className="hover:text-white cursor-pointer transition-colors" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {footerLinks.map((section, idx) => (
            <div key={idx}>
              <h4 className="font-bold text-gray-200 mb-4 uppercase text-xs tracking-wider hidden md:block">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, lIdx) => (
                  <li
                    key={lIdx}
                    className="hover:underline cursor-pointer transition-colors hover:text-white"
                    onClick={() => onNavigate(link)}
                  >
                    {link}
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