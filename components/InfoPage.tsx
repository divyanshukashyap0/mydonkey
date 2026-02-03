import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { InfoPageData } from '../types';

interface InfoPageProps {
  data: InfoPageData;
  onBack: () => void;
}

const InfoPage: React.FC<InfoPageProps> = ({ data, onBack }) => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 px-6 md:px-20 lg:px-64 pb-20">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition group">
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Back
      </button>

      <h1 className="text-4xl md:text-5xl font-black mb-4 text-brand-red animate-in slide-in-from-left duration-500">{data.title}</h1>
      <p className="text-xl text-gray-300 mb-12 leading-relaxed border-b border-white/10 pb-8 animate-in slide-in-from-left duration-700">{data.description}</p>

      <div className="space-y-12">
        {data.sections.map((section, idx) => (
          <div key={idx} className="animate-in slide-in-from-bottom-4 duration-700 fill-mode-backwards" style={{ animationDelay: `${idx * 150}ms` }}>
            <h2 className="text-2xl font-bold mb-4 text-white">{section.heading}</h2>

            {section.content && (
              <p className="text-gray-400 leading-relaxed mb-4 text-lg">{section.content}</p>
            )}

            {section.listItems && (
              <ul className="list-disc pl-5 space-y-2 text-gray-400">
                {section.listItems.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            )}

            {section.steps && (
              <div className="space-y-4 mt-6">
                {section.steps.map((step, i) => (
                  <div key={i} className="flex gap-4 items-start bg-[#141414] p-4 rounded-lg border border-white/5 hover:border-white/20 transition">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-red/20 text-brand-red font-bold flex items-center justify-center border border-brand-red/50">
                      {i + 1}
                    </div>
                    <p className="pt-1 text-gray-300">{step}</p>
                  </div>
                ))}
              </div>
            )}

            {section.buttonLabel && section.buttonLink && (
              <a
                href={section.buttonLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 bg-white text-black font-bold py-3 px-8 rounded hover:bg-gray-200 transition"
              >
                {section.buttonLabel}
              </a>
            )}
          </div>
        ))}
      </div>

      {data.lastUpdated && (
        <div className="mt-20 pt-8 border-t border-white/10 text-xs text-gray-500">
          Last Updated: {data.lastUpdated}
        </div>
      )}
    </div>
  );
};

export default InfoPage;