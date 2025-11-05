
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate()
  const tabs = [
    { label: 'Home', path: '/' },
    { label: 'Booth', path: '/booth' },
    { label: 'Archive', path: '/archive' },
    { label: 'Record', path: '/record' },
    { label: 'Admin', path: '/admin' },
  ]
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="bg-white text-black rounded-md shadow-xl px-6 py-5 md:px-8 md:py-6 border border-black/10 -mt-12 md:-mt-40">
        {/* top badges */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] md:text-xs px-2 py-1 rounded-sm border border-black/20 bg-black/5 select-none">@Ekta Shaikh</span>
          {/* <span className="text-[10px] md:text-xs px-2 py-1 rounded-sm border border-black/20 bg-black/5 select-none">XYZ</span> */}
        </div>
        {/* title */}
        <h1 className="font-extrabold tracking-tight leading-none text-[21px] md:text-[30px]">
         Invite The One You Can't Touch
        </h1>
        {/* tabs row */}
        <div className="mt-3 flex items-center gap-2">
          {tabs.map((t) => (
            <button
              key={t.label}
              onClick={() => navigate(t.path)}
              className="cursor-pointer text-xs md:text-sm px-2.5 py-1 rounded-sm border border-black/20 bg-black/5 hover:bg-black hover:text-white transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


