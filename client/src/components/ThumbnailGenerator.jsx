import { useState, useEffect, useRef, useMemo, memo } from 'react';

const ThumbnailGenerator = memo(function ThumbnailGenerator({ recording, className = "", isPlaying = false, currentTime = 0, duration = 0 }) {
  const [thumbnailStyle, setThumbnailStyle] = useState({});
  const [visualType, setVisualType] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const containerRef = useRef(null);
  
  // Use useMemo to generate elements only once per recording and cache them
  const animationElements = useMemo(() => {
    if (!recording?._id) return { floating: [], bars: [], playing: [], levels: [], lights: [], sparkles: [], waves: [] };
    
    // REDUCED: Generate fewer elements for better performance
    return {
      floating: Array.from({ length: 3 }, (_, i) => ({ // Was 8, now 3
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 20 + 10,
        type: ['circle', 'star', 'heart'][i % 3]
      })),
      bars: Array.from({ length: 6 }, (_, i) => ({ // Was 12, now 6
        id: i,
        height: Math.random() * 40 + 10,
        delay: i * 0.1
      })),
      playing: Array.from({ length: 6 }, (_, i) => ({ // Was 12, now 6
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: ['#FF6B9D', '#4ECDC4', '#FFEAA7'][i % 3]
      })),
      levels: Array.from({ length: 10 }, (_, i) => ({ // Was 20, now 10
        id: i,
        height: Math.random() * 60 + 20,
        delay: i * 0.05
      })),
      lights: Array.from({ length: 6 }, (_, i) => ({ // Was 15, now 6
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: ['#FF6B9D', '#4ECDC4', '#FFEAA7', '#FF6B6B'][i % 4]
      })),
      sparkles: Array.from({ length: 8 }, (_, i) => ({ // Was 25, now 8
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 6 + 2,
      })),
      waves: Array.from({ length: 4 }, (_, i) => ({ // Was 8, now 4
        id: i,
        color: ['#FF6B9D', '#4ECDC4', '#FFEAA7', '#FF6B6B'][i % 4]
      }))
    };
  }, [recording?._id]);
  
  const { floating: floatingElements, bars: soundBars, playing: playingAnimations, levels: soundLevels, lights: moodLights, sparkles: sparkleEffects, waves: wavePatterns } = animationElements;

  // Use stable random selection based on recording ID for consistent visuals
  const visualConfig = useMemo(() => {
    if (!recording?._id) return null;
    
    const styles = ['glass-morphism', 'gradient-blob', 'neon-grid', 'liquid-shape', 'holographic', 'minimal-line'];
    const colorSchemes = [
      { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', accent: '#FF6B9D', text: '#ffffff' },
      { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', accent: '#4ECDC4', text: '#ffffff' },
      { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', accent: '#FFEAA7', text: '#2d3436' },
      { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', accent: '#FF6B6B', text: '#2d3436' }
    ];

    // Use recording ID hash for stable selection
    const idHash = recording._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const styleIndex = idHash % styles.length;
    const colorIndex = idHash % colorSchemes.length;
    
    return {
      visualType: styles[styleIndex],
      colorScheme: colorSchemes[colorIndex]
    };
  }, [recording?._id]);

  useEffect(() => {
    if (!visualConfig) return;
    setVisualType(visualConfig.visualType);
    setThumbnailStyle({
      background: visualConfig.colorScheme.bg,
      color: visualConfig.colorScheme.text,
      accentColor: visualConfig.colorScheme.accent
    });
  }, [visualConfig]);

  // Sound levels update removed for performance - static levels are sufficient

  const generateVisualContent = () => {
    const title = recording?.title || 'Untitled Recording';
    const duration = recording?.duration || '0:00';
    const words = recording?.transcript ? recording.transcript.split(' ').slice(0, 6) : ['Audio', 'Content'];
    const date = recording?.date || new Date().toLocaleDateString();

    switch (visualType) {
      case 'glass-morphism':
        return (
          <div className="relative h-full overflow-hidden rounded-xl">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-md" />
            <div className="absolute inset-4 rounded-lg bg-white/5 border border-white/20" />
            <div className="relative z-10 p-6 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="bg-white/20 rounded-full px-3 py-1 text-xs backdrop-blur-sm">
                  {duration}
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2 leading-tight">
                  {title.length > 25 ? title.substring(0, 25) + '...' : title}
                </h3>
                <p className="text-sm opacity-90">
                  {words.slice(0, 3).join(' ')}...
                </p>
              </div>
            </div>
          </div>
        );

      case 'gradient-blob':
        return (
          <div className="relative h-full overflow-hidden rounded-xl">
            <div className="absolute -inset-10 opacity-20">
              <div className="absolute top-0 -left-4 w-24 h-24 rounded-full" style={{ background: thumbnailStyle.accentColor }} />
              <div className="absolute bottom-0 -right-4 w-32 h-32 rounded-full" style={{ background: thumbnailStyle.accentColor }} />
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <div className="text-xs font-medium bg-black/20 rounded-full px-3 py-1">
                  REC
                </div>
                <div className="flex space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-1 h-4 rounded-full bg-white/60" />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2 opacity-90">{duration}</div>
                <h3 className="text-sm font-semibold mb-1">{title}</h3>
                <p className="text-xs opacity-80">{date}</p>
              </div>
            </div>
          </div>
        );

      case 'neon-grid':
        return (
          <div className="relative h-full overflow-hidden rounded-xl">
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 opacity-30">
              <div className="grid grid-cols-4 gap-2 h-full transform rotate-45 scale-150">
                {[...Array(16)].map((_, i) => (
                  <div 
                    key={i} 
                    className="border border-white/20 rounded-lg transition-all duration-300 hover:border-white/40"
                    style={{ 
                      animationDelay: `${i * 0.1}s`,
                      animation: 'pulse 2s infinite'
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="mb-4">
                <div className="w-12 h-12 border-2 border-white/50 rounded-full flex items-center justify-center mb-2">
                  <div className="w-6 h-6 border border-white/70 rounded" />
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2">{title}</h3>
              <div className="text-xs opacity-80 bg-black/30 rounded-full px-3 py-1">
                {words.slice(0, 2).join(' • ')}
              </div>
            </div>
          </div>
        );

      case 'liquid-shape':
        return (
          <div className="relative h-full overflow-hidden rounded-xl">
            <div className="absolute inset-0">
              <div 
                className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-30 blur-xl transition-all duration-700"
                style={{ background: thumbnailStyle.accentColor }}
              />
              <div 
                className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full opacity-30 blur-xl transition-all duration-700"
                style={{ background: thumbnailStyle.accentColor }}
              />
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold mb-2" style={{ color: thumbnailStyle.accentColor }}>
                  {title.charAt(0).toUpperCase()}
                </div>
                <div className="w-16 h-1 mx-auto rounded-full bg-white/40 mb-3" />
                <h3 className="text-sm font-semibold mb-1">{title}</h3>
                <p className="text-xs opacity-80">{duration} • {date}</p>
              </div>
            </div>
          </div>
        );

      case 'holographic':
        return (
          <div className="relative h-full overflow-hidden rounded-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
            <div className="relative z-10 p-6 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="text-xs font-mono bg-white/10 rounded px-2 py-1">
                  {duration}
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-green-400/80" />
                  <div className="w-2 h-2 rounded-full bg-yellow-400/80" />
                  <div className="w-2 h-2 rounded-full bg-red-400/80" />
                </div>
              </div>
              <div>
                <div className="font-mono text-sm mb-2 opacity-90">
                  {title.toUpperCase()}
                </div>
                <div className="text-xs opacity-70 font-mono">
                  {words.slice(0, 4).join(' ').toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        );

      // case 'cyberpunk':
        return (
          <div className="relative h-full overflow-hidden rounded-xl border-2" style={{ borderColor: thumbnailStyle.accentColor }}>
            <div className="absolute inset-0 bg-black/80" />
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current to-transparent" style={{ color: thumbnailStyle.accentColor }} />
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current to-transparent" style={{ color: thumbnailStyle.accentColor }} />
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center">
              <div className="text-center">
                <div className="text-xl font-bold mb-3 tracking-wider" style={{ color: thumbnailStyle.accentColor }}>
                  {title.substring(0, 12)}
                </div>
                <div className="text-xs mb-4 opacity-80 font-mono">
                  {words.slice(0, 3).join(' ▫ ')}
                </div>
                <div className="flex justify-center space-x-4 text-xs">
                  <span>{duration}</span>
                  <span style={{ color: thumbnailStyle.accentColor }}>●</span>
                  <span>{date}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'minimal-line':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-white/5">
            <div className="absolute top-4 left-4 w-8 h-8">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full opacity-60">
                <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" 
                      stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
              </svg>
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-end">
              <div className="mb-2">
                <div className="w-12 h-0.5 bg-current opacity-40 mb-3" />
                <h3 className="text-lg font-light mb-1">{title}</h3>
                <p className="text-xs opacity-60">{words.slice(0, 2).join(' ')}</p>
              </div>
              <div className="flex justify-between items-center text-xs opacity-50">
                <span>{duration}</span>
                <span>{date}</span>
              </div>
            </div>
          </div>
        );

      case 'abstract-wave':
        return (
          <div className="relative h-full overflow-hidden rounded-xl">
            <div className="absolute inset-0 opacity-20">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path 
                  d="M0,50 Q25,30 50,50 T100,50" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                />
                <path 
                  d="M0,60 Q25,40 50,60 T100,60" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1"
                />
                <path 
                  d="M0,40 Q25,60 50,40 T100,40" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1"
                />
              </svg>
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="mb-4">
                <div className="text-2xl font-bold mb-2" style={{ color: thumbnailStyle.accentColor }}>
                  {duration}
                </div>
                <div className="w-8 h-0.5 bg-current opacity-40 mx-auto" />
              </div>
              <h3 className="text-sm font-semibold mb-2">{title}</h3>
              <p className="text-xs opacity-80">
                {words.slice(0, 3).join(' ')}...
              </p>
            </div>
          </div>
        );

      case 'party-mode':
        return (
          <div className="relative h-full overflow-hidden rounded-xl">
            {/* Confetti */}
            {floatingElements.map((element) => (
              <div
                key={element.id}
                className="absolute animate-bounce"
                style={{
                  left: `${element.x}%`,
                  top: `${element.y}%`,
                  animationDelay: `${element.animationDelay}s`,
                  animationDuration: `${1 + Math.random() * 2}s`
                }}
              >
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ 
                    background: ['#FF6B9D', '#4ECDC4', '#FFEAA7', '#FF6B6B', '#6A11CB'][Math.floor(Math.random() * 5)]
                  }}
                />
              </div>
            ))}
            
            {/* Extra confetti when playing */}
            {isPlaying && playingAnimations.map((element) => (
              <div
                key={`playing-${element.id}`}
                className="absolute animate-bounce"
                style={{
                  left: `${element.x}%`,
                  top: `${element.y}%`,
                  animationDelay: `${element.animationDelay}s`,
                  animationDuration: `${0.5 + Math.random() * 1}s`
                }}
              >
                <div className="text-lg animate-spin">
                  {['🎊', '🎈', '🎁', '✨', '🌟'][element.id % 5]}
                </div>
              </div>
            ))}
            
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className={`text-4xl mb-2 ${isPlaying ? 'animate-bounce' : ''}`}>🎉</div>
              <h3 className="text-lg font-bold mb-2" style={{ color: thumbnailStyle.accentColor }}>
                {title}
              </h3>
              <div className="text-2xl font-bold mb-2">{duration}</div>
              <div className="flex space-x-1">
                {soundBars.map((bar) => (
                  <div
                    key={bar.id}
                    className="bg-white/60 rounded-sm animate-pulse"
                    style={{
                      width: '3px',
                      height: `${isPlaying ? bar.height * 1.5 : bar.height}px`,
                      animationDelay: `${bar.delay}s`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'disco-ball':
        return (
          <div className="relative h-full overflow-hidden rounded-xl">
            <div className={`absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-500 to-red-500 ${isPlaying ? 'animate-pulse' : ''}`} />
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-lg ${isPlaying ? 'animate-spin' : ''}`}>
                <div className="w-full h-full rounded-full bg-gradient-to-br from-transparent to-white/30" />
              </div>
            </div>
            
            {/* Extra disco lights when playing */}
            {isPlaying && (
              <div className="absolute inset-0">
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full animate-ping"
                    style={{
                      left: `${20 + (i * 10)}%`,
                      top: `${30 + (i * 8)}%`,
                      background: ['#FF6B9D', '#4ECDC4', '#FFEAA7', '#FF6B6B'][i % 4],
                      animationDelay: `${i * 0.3}s`
                    }}
                  />
                ))}
              </div>
            )}
            
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className={`text-3xl mb-2 ${isPlaying ? 'animate-bounce' : 'animate-pulse'}`}>🕺</div>
              <h3 className="text-lg font-bold mb-2 text-white">
                {title}
              </h3>
              <div className="text-white/80 text-sm">{duration}</div>
              <div className="mt-4 flex space-x-1">
                {['💃', '🎵', '🎶', '✨'].map((emoji, i) => (
                  <span key={i} className={`text-lg animate-bounce ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDelay: `${i * 0.2}s` }}>
                    {emoji}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'fireworks':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-b from-purple-900 to-black">
            {floatingElements.map((element) => (
              <div
                key={element.id}
                className="absolute animate-ping"
                style={{
                  left: `${element.x}%`,
                  top: `${element.y}%`,
                  animationDelay: `${element.animationDelay}s`
                }}
              >
                <div className="w-1 h-1 rounded-full bg-yellow-400" />
              </div>
            ))}
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2">🎆</div>
              <h3 className="text-lg font-bold mb-2 text-white">
                {title}
              </h3>
              <div className="text-white/80 text-sm">{duration}</div>
              <div className="mt-4 text-2xl animate-pulse">✨</div>
            </div>
          </div>
        );

      case 'rainbow-wave':
        return (
          <div className="relative h-full overflow-hidden rounded-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 to-purple-500 animate-pulse" />
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 animate-bounce">🌈</div>
              <h3 className="text-lg font-bold mb-2 text-white">
                {title}
              </h3>
              <div className="text-white/80 text-sm">{duration}</div>
              <div className="mt-4 flex space-x-1">
                {['🔴', '🟡', '🟢', '🔵', '🟣'].map((color, i) => (
                  <span key={i} className="text-lg animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>
                    {color}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'matrix-rain':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-black">
            <div className="absolute inset-0 text-green-400 font-mono text-xs opacity-60">
              {Array.from({ length: 20 }, (_, i) => (
                <div key={i} className="absolute animate-pulse" style={{ left: `${i * 5}%`, top: `${Math.random() * 100}%` }}>
                  {Math.random().toString(36).substring(7)}
                </div>
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-3xl mb-2 text-green-400">💻</div>
              <h3 className="text-lg font-bold mb-2 text-green-400 font-mono">
                {title}
              </h3>
              <div className="text-green-400/80 text-sm font-mono">{duration}</div>
            </div>
          </div>
        );

      case 'floating-hearts':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-pink-400 to-red-500">
            {floatingElements.map((element) => (
              <div
                key={element.id}
                className="absolute animate-bounce"
                style={{
                  left: `${element.x}%`,
                  top: `${element.y}%`,
                  animationDelay: `${element.animationDelay}s`
                }}
              >
                <div className="text-2xl animate-pulse">💖</div>
              </div>
            ))}
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 animate-pulse">💕</div>
              <h3 className="text-lg font-bold mb-2 text-white">
                {title}
              </h3>
              <div className="text-white/80 text-sm">{duration}</div>
              <div className="mt-4 text-2xl">💝</div>
            </div>
          </div>
        );

      case 'bouncing-emoji':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500">
            {floatingElements.map((element) => (
              <div
                key={element.id}
                className="absolute animate-bounce"
                style={{
                  left: `${element.x}%`,
                  top: `${element.y}%`,
                  animationDelay: `${element.animationDelay}s`
                }}
              >
                <div className="text-2xl">
                  {['😊', '🎉', '🌟', '✨', '🎵', '🎶', '💫', '🎊'][element.id % 8]}
                </div>
              </div>
            ))}
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 animate-bounce">🎵</div>
              <h3 className="text-lg font-bold mb-2 text-white">
                {title}
              </h3>
              <div className="text-white/80 text-sm">{duration}</div>
            </div>
          </div>
        );

      case 'cosmic-dance':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
            <div className="absolute inset-0">
              {floatingElements.map((element) => (
                <div
                  key={element.id}
                  className="absolute animate-spin"
                  style={{
                    left: `${element.x}%`,
                    top: `${element.y}%`,
                    animationDelay: `${element.animationDelay}s`,
                    animationDuration: `${3 + Math.random() * 4}s`
                  }}
                >
                  <div className="w-2 h-2 rounded-full bg-white/60" />
                </div>
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 animate-pulse">🌌</div>
              <h3 className="text-lg font-bold mb-2 text-white">
                {title}
              </h3>
              <div className="text-white/80 text-sm">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['⭐', '🌟', '💫', '✨'].map((star, i) => (
                  <span key={i} className="text-lg animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
                    {star}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'neon-cyber':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-black">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20" />
            <div className="absolute inset-0">
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className="absolute border border-cyan-400/30 animate-pulse"
                  style={{
                    left: `${i * 8}%`,
                    top: `${20 + (i * 5)}%`,
                    width: '2px',
                    height: '60px',
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 text-cyan-400 animate-pulse">⚡</div>
              <h3 className="text-lg font-bold mb-2 text-cyan-400 font-mono">
                {title}
              </h3>
              <div className="text-cyan-400/80 text-sm font-mono">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['🔮', '⚡', '💫', '🌟'].map((icon, i) => (
                  <span key={i} className="text-lg animate-bounce" style={{ animationDelay: `${i * 0.3}s` }}>
                    {icon}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'galaxy-dream':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-purple-900 via-indigo-900 to-black">
            <div className="absolute inset-0">
              {Array.from({ length: 20 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full animate-ping"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${2 + Math.random() * 3}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-5xl mb-2 animate-pulse">🌌</div>
              <h3 className="text-lg font-bold mb-2 text-white">
                {title}
              </h3>
              <div className="text-white/80 text-sm">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['⭐', '🌟', '💫', '✨', '🌙'].map((star, i) => (
                  <span key={i} className="text-lg animate-spin" style={{ animationDelay: `${i * 0.4}s` }}>
                    {star}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'crystal-palace':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-100 to-purple-200">
            <div className="absolute inset-0 opacity-30">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="absolute border-2 border-white/40 rounded-lg animate-pulse"
                  style={{
                    left: `${10 + (i * 10)}%`,
                    top: `${20 + (i * 8)}%`,
                    width: '20px',
                    height: '20px',
                    animationDelay: `${i * 0.3}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 animate-bounce">💎</div>
              <h3 className="text-lg font-bold mb-2 text-purple-800">
                {title}
              </h3>
              <div className="text-purple-600/80 text-sm">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['💎', '🔮', '✨', '💫'].map((crystal, i) => (
                  <span key={i} className="text-lg animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
                    {crystal}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'neon-aurora':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-green-900 to-blue-900">
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-blue-400/20 to-purple-400/20 animate-pulse" />
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="absolute h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse"
                  style={{
                    left: '0',
                    top: `${30 + (i * 10)}%`,
                    width: '100%',
                    animationDelay: `${i * 0.5}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 animate-pulse">🌌</div>
              <h3 className="text-lg font-bold mb-2 text-green-400">
                {title}
              </h3>
              <div className="text-green-400/80 text-sm">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['🌌', '🌊', '💚', '✨'].map((aurora, i) => (
                  <span key={i} className="text-lg animate-bounce" style={{ animationDelay: `${i * 0.3}s` }}>
                    {aurora}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'hologram-tech':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-black">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10" />
            <div className="absolute inset-0">
              {Array.from({ length: 16 }, (_, i) => (
                <div
                  key={i}
                  className="absolute border border-cyan-400/20 animate-pulse"
                  style={{
                    left: `${(i % 4) * 25}%`,
                    top: `${Math.floor(i / 4) * 25}%`,
                    width: '20px',
                    height: '20px',
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 text-cyan-400 animate-pulse">🔮</div>
              <h3 className="text-lg font-bold mb-2 text-cyan-400 font-mono">
                {title}
              </h3>
              <div className="text-cyan-400/80 text-sm font-mono">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['🔮', '⚡', '💫', '🌟'].map((tech, i) => (
                  <span key={i} className="text-lg animate-spin" style={{ animationDelay: `${i * 0.2}s` }}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'neon-cyberpunk':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-black border-2 border-pink-500">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-cyan-500/20" />
            <div className="absolute inset-0">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className="absolute border-l-2 border-pink-400 animate-pulse"
                  style={{
                    left: `${i * 10}%`,
                    top: '0',
                    height: '100%',
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 text-pink-400 animate-bounce">🤖</div>
              <h3 className="text-lg font-bold mb-2 text-pink-400 font-mono">
                {title}
              </h3>
              <div className="text-pink-400/80 text-sm font-mono">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['🤖', '⚡', '💻', '🔮'].map((cyber, i) => (
                  <span key={i} className="text-lg animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
                    {cyber}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'magic-forest':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-green-800 to-emerald-900">
            <div className="absolute inset-0">
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-8 bg-green-400/40 animate-pulse"
                  style={{
                    left: `${10 + (i * 7)}%`,
                    top: `${20 + (i * 5)}%`,
                    animationDelay: `${i * 0.3}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 animate-bounce">🌲</div>
              <h3 className="text-lg font-bold mb-2 text-green-400">
                {title}
              </h3>
              <div className="text-green-400/80 text-sm">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['🌲', '🍃', '✨', '🦋'].map((nature, i) => (
                  <span key={i} className="text-lg animate-bounce" style={{ animationDelay: `${i * 0.4}s` }}>
                    {nature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'ocean-waves':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500">
            <div className="absolute inset-0">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-full h-2 bg-white/20 animate-pulse"
                  style={{
                    top: `${20 + (i * 15)}%`,
                    animationDelay: `${i * 0.5}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 animate-bounce">🌊</div>
              <h3 className="text-lg font-bold mb-2 text-white">
                {title}
              </h3>
              <div className="text-white/80 text-sm">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['🌊', '🐚', '✨', '💙'].map((ocean, i) => (
                  <span key={i} className="text-lg animate-bounce" style={{ animationDelay: `${i * 0.3}s` }}>
                    {ocean}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'sunset-glow':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600">
            <div className="absolute inset-0">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-300/60 rounded-full animate-ping"
                  style={{
                    left: `${10 + (i * 10)}%`,
                    top: `${20 + (i * 8)}%`,
                    animationDelay: `${i * 0.4}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 animate-pulse">🌅</div>
              <h3 className="text-lg font-bold mb-2 text-white">
                {title}
              </h3>
              <div className="text-white/80 text-sm">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['🌅', '🌇', '✨', '🌞'].map((sunset, i) => (
                  <span key={i} className="text-lg animate-bounce" style={{ animationDelay: `${i * 0.3}s` }}>
                    {sunset}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'neon-city':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-black">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-cyan-500/20" />
            <div className="absolute inset-0">
              {Array.from({ length: 15 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-8 bg-cyan-400/60 animate-pulse"
                  style={{
                    left: `${5 + (i * 6)}%`,
                    top: `${30 + (i * 3)}%`,
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 text-cyan-400 animate-pulse">🏙️</div>
              <h3 className="text-lg font-bold mb-2 text-cyan-400 font-mono">
                {title}
              </h3>
              <div className="text-cyan-400/80 text-sm font-mono">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['🏙️', '🌃', '💡', '⚡'].map((city, i) => (
                  <span key={i} className="text-lg animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}>
                    {city}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'vintage-tape':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-amber-800 to-orange-900">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 left-4 w-8 h-8 border-2 border-amber-400/40 rounded" />
              <div className="absolute top-4 right-4 w-8 h-8 border-2 border-amber-400/40 rounded" />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-2 bg-amber-400/30 rounded" />
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2">🎵</div>
              <h3 className="text-lg font-bold mb-2 text-amber-100">
                {title}
              </h3>
              <div className="text-amber-200/80 text-sm">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['🎵', '📼', '🎶', '✨'].map((vintage, i) => (
                  <span key={i} className={`text-lg ${isClicked ? 'animate-bounce' : ''}`} style={{ animationDelay: `${i * 0.2}s` }}>
                    {vintage}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'retro-synth':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-purple-800 to-pink-800">
            <div className="absolute inset-0">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-12 bg-pink-400/40"
                  style={{
                    left: `${10 + (i * 10)}%`,
                    top: `${20 + (i * 5)}%`,
                    animation: isClicked ? 'pulse 1s infinite' : 'none',
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2">🎹</div>
              <h3 className="text-lg font-bold mb-2 text-pink-100">
                {title}
              </h3>
              <div className="text-pink-200/80 text-sm">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['🎹', '🎛️', '🎵', '✨'].map((synth, i) => (
                  <span key={i} className={`text-lg ${isClicked ? 'animate-spin' : ''}`} style={{ animationDelay: `${i * 0.3}s` }}>
                    {synth}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'neon-punk':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-black border-2 border-green-500">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-cyan-500/20" />
            <div className="absolute inset-0">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="absolute border border-green-400/30"
                  style={{
                    left: `${15 + (i * 12)}%`,
                    top: `${25 + (i * 8)}%`,
                    width: '20px',
                    height: '20px',
                    animation: isClicked ? 'pulse 2s infinite' : 'none',
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 text-green-400">⚡</div>
              <h3 className="text-lg font-bold mb-2 text-green-400 font-mono">
                {title}
              </h3>
              <div className="text-green-400/80 text-sm font-mono">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['⚡', '🔌', '💚', '🌟'].map((punk, i) => (
                  <span key={i} className={`text-lg ${isClicked ? 'animate-bounce' : ''}`} style={{ animationDelay: `${i * 0.2}s` }}>
                    {punk}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'cyber-grid':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-black">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
            <div className="absolute inset-0">
              {Array.from({ length: 16 }, (_, i) => (
                <div
                  key={i}
                  className="absolute border border-blue-400/20"
                  style={{
                    left: `${(i % 4) * 25}%`,
                    top: `${Math.floor(i / 4) * 25}%`,
                    width: '20px',
                    height: '20px',
                    animation: isClicked ? 'pulse 1.5s infinite' : 'none',
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 text-blue-400">🔲</div>
              <h3 className="text-lg font-bold mb-2 text-blue-400 font-mono">
                {title}
              </h3>
              <div className="text-blue-400/80 text-sm font-mono">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['🔲', '⚡', '💙', '🌟'].map((grid, i) => (
                  <span key={i} className={`text-lg ${isClicked ? 'animate-pulse' : ''}`} style={{ animationDelay: `${i * 0.2}s` }}>
                    {grid}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'holographic-3d':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900 to-purple-900">
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent" />
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-cyan-400/40 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animation: isClicked ? 'ping 2s infinite' : 'none',
                    animationDelay: `${Math.random() * 2}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 text-cyan-400">🔮</div>
              <h3 className="text-lg font-bold mb-2 text-cyan-400">
                {title}
              </h3>
              <div className="text-cyan-400/80 text-sm">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['🔮', '✨', '💫', '🌟'].map((hologram, i) => (
                  <span key={i} className={`text-lg ${isClicked ? 'animate-spin' : ''}`} style={{ animationDelay: `${i * 0.4}s` }}>
                    {hologram}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'neon-sign':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-black">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-yellow-500/20" />
            <div className="absolute inset-0">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-16 bg-pink-400/60"
                  style={{
                    left: `${5 + (i * 9)}%`,
                    top: `${20 + (i * 4)}%`,
                    animation: isClicked ? 'pulse 1s infinite' : 'none',
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 text-pink-400">💡</div>
              <h3 className="text-lg font-bold mb-2 text-pink-400">
                {title}
              </h3>
              <div className="text-pink-400/80 text-sm">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['💡', '⚡', '✨', '🌟'].map((sign, i) => (
                  <span key={i} className={`text-lg ${isClicked ? 'animate-bounce' : ''}`} style={{ animationDelay: `${i * 0.2}s` }}>
                    {sign}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'digital-art':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-gray-800 to-black">
            <div className="absolute inset-0">
              {Array.from({ length: 20 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-white/60 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animation: isClicked ? 'ping 3s infinite' : 'none',
                    animationDelay: `${Math.random() * 3}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 text-white">🎨</div>
              <h3 className="text-lg font-bold mb-2 text-white">
                {title}
              </h3>
              <div className="text-white/80 text-sm">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['🎨', '🖼️', '✨', '🌟'].map((art, i) => (
                  <span key={i} className={`text-lg ${isClicked ? 'animate-pulse' : ''}`} style={{ animationDelay: `${i * 0.3}s` }}>
                    {art}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'abstract-geometry':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-teal-600 to-blue-800">
            <div className="absolute inset-0 opacity-30">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="absolute border-2 border-teal-400/40"
                  style={{
                    left: `${10 + (i * 10)}%`,
                    top: `${20 + (i * 8)}%`,
                    width: '20px',
                    height: '20px',
                    transform: `rotate(${i * 45}deg)`,
                    animation: isClicked ? 'spin 3s linear infinite' : 'none'
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 text-teal-400">🔷</div>
              <h3 className="text-lg font-bold mb-2 text-teal-100">
                {title}
              </h3>
              <div className="text-teal-200/80 text-sm">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['🔷', '🔶', '✨', '🌟'].map((geo, i) => (
                  <span key={i} className={`text-lg ${isClicked ? 'animate-spin' : ''}`} style={{ animationDelay: `${i * 0.2}s` }}>
                    {geo}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'neon-waves':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-black">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20" />
            <div className="absolute inset-0">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                  style={{
                    top: `${30 + (i * 10)}%`,
                    animation: isClicked ? 'pulse 2s infinite' : 'none',
                    animationDelay: `${i * 0.3}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 text-cyan-400">🌊</div>
              <h3 className="text-lg font-bold mb-2 text-cyan-400">
                {title}
              </h3>
              <div className="text-cyan-400/80 text-sm">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['🌊', '💫', '✨', '🌟'].map((wave, i) => (
                  <span key={i} className={`text-lg ${isClicked ? 'animate-bounce' : ''}`} style={{ animationDelay: `${i * 0.3}s` }}>
                    {wave}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'cyber-matrix':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-black">
            <div className="absolute inset-0 text-green-400 font-mono text-xs opacity-40">
              {Array.from({ length: 30 }, (_, i) => (
                <div 
                  key={i} 
                  className="absolute"
                  style={{ 
                    left: `${i * 3.3}%`, 
                    top: `${Math.random() * 100}%`,
                    animation: isClicked ? 'pulse 1s infinite' : 'none',
                    animationDelay: `${i * 0.1}s`
                  }}
                >
                  {Math.random().toString(36).substring(7)}
                </div>
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 text-green-400">💻</div>
              <h3 className="text-lg font-bold mb-2 text-green-400 font-mono">
                {title}
              </h3>
              <div className="text-green-400/80 text-sm font-mono">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['💻', '⚡', '🔢', '🌟'].map((matrix, i) => (
                  <span key={i} className={`text-lg ${isClicked ? 'animate-pulse' : ''}`} style={{ animationDelay: `${i * 0.2}s` }}>
                    {matrix}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'hologram-display':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-purple-900 to-indigo-900">
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/10 to-transparent" />
              {Array.from({ length: 15 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-purple-400/60 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animation: isClicked ? 'ping 2s infinite' : 'none',
                    animationDelay: `${Math.random() * 2}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 text-purple-400">🔮</div>
              <h3 className="text-lg font-bold mb-2 text-purple-400">
                {title}
              </h3>
              <div className="text-purple-400/80 text-sm">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['🔮', '✨', '💫', '🌟'].map((hologram, i) => (
                  <span key={i} className={`text-lg ${isClicked ? 'animate-spin' : ''}`} style={{ animationDelay: `${i * 0.3}s` }}>
                    {hologram}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'neon-circuit':
        return (
          <div className="relative h-full overflow-hidden rounded-xl bg-black">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-orange-500/20" />
            <div className="absolute inset-0">
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className="absolute border border-yellow-400/40"
                  style={{
                    left: `${10 + (i * 7)}%`,
                    top: `${20 + (i * 5)}%`,
                    width: '15px',
                    height: '15px',
                    animation: isClicked ? 'pulse 1.5s infinite' : 'none',
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
            <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-2 text-yellow-400">⚡</div>
              <h3 className="text-lg font-bold mb-2 text-yellow-400">
                {title}
              </h3>
              <div className="text-yellow-400/80 text-sm">{duration}</div>
              <div className="mt-4 flex space-x-2">
                {['⚡', '🔌', '💡', '🌟'].map((circuit, i) => (
                  <span key={i} className={`text-lg ${isClicked ? 'animate-bounce' : ''}`} style={{ animationDelay: `${i * 0.2}s` }}>
                    {circuit}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-6 h-full flex flex-col justify-center items-center text-center">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-3">
              <div className="w-6 h-6 rounded-full bg-white/40" />
            </div>
            <h3 className="text-sm font-semibold mb-1">{title}</h3>
            <p className="text-xs opacity-80">{duration}</p>
          </div>
        );
    }
  };

  return (
    <>
      <style jsx>{`
        @keyframes wiggle {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(1deg); }
          75% { transform: rotate(-1deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes rainbow {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 5px currentColor; }
          50% { box-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes morph {
          0%, 100% { border-radius: 20px; }
          25% { border-radius: 50px; }
          50% { border-radius: 10px; }
          75% { border-radius: 30px; }
        }
        @keyframes neon-pulse {
          0%, 100% { text-shadow: 0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor; }
          50% { text-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor, 0 0 40px currentColor; }
        }
        .wiggle { animation: wiggle 0.5s ease-in-out infinite alternate; }
        .float { animation: float 3s ease-in-out infinite; }
        .sparkle { animation: sparkle 2s ease-in-out infinite; }
        .rainbow { animation: rainbow 3s linear infinite; }
        .glow { animation: glow 2s ease-in-out infinite; }
        .breathe { animation: breathe 4s ease-in-out infinite; }
        .shimmer { 
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        .morph { animation: morph 6s ease-in-out infinite; }
        .neon-pulse { animation: neon-pulse 1.5s ease-in-out infinite; }
      `}</style>
      <div 
        ref={containerRef}
        className={`
          relative rounded-2xl overflow-hidden transition-all duration-500 ease-out
          transform hover:scale-110 hover:rotate-2 hover:shadow-2xl cursor-pointer
          backdrop-blur-sm border border-white/10
          ${isHovered ? 'shadow-xl' : 'shadow-lg'}
          ${isClicked ? 'animate-pulse glow breathe morph neon-pulse' : ''}
          ${isPlaying ? 'morph neon-pulse' : ''}
          ${className}
        `}
        style={{
          ...thumbnailStyle,
          animation: isHovered ? 'wiggle 0.5s ease-in-out infinite alternate' : 'none'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsClicked(!isClicked)}
      >
      {generateVisualContent()}
      
      {/* Enhanced shine effect on hover */}
      <div className={`
        absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
        transform -skew-x-12 transition-all duration-700
        ${isHovered ? 'translate-x-full' : '-translate-x-full'}
      `} />
      
      {/* Floating particles overlay */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/60 rounded-full animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: '2s'
              }}
            />
          ))}
        </div>
      )}
      
      {/* Sound wave visualization */}
      {isHovered && (
        <div className="absolute bottom-2 left-2 right-2 flex justify-center space-x-1">
          {soundBars.map((bar) => (
            <div
              key={bar.id}
              className="bg-white/40 rounded-sm animate-pulse"
              style={{
                width: '2px',
                height: `${bar.height * 0.5}px`,
                animationDelay: `${bar.delay}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      )}
      
      {/* Simplified mode indicator */}
      {visualType && (
        <div className="absolute top-2 right-2 text-xs bg-black/20 rounded-full px-2 py-1 backdrop-blur-sm">
          🎵
        </div>
      )}

      {/* Playing indicator */}
      {isPlaying && (
        <div className="absolute top-2 left-2 flex items-center space-x-1 bg-red-500/80 rounded-full px-2 py-1 backdrop-blur-sm">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-xs text-white font-bold">LIVE</span>
        </div>
      )}

      {/* Playing animations */}
      {isPlaying && (
        <div className="absolute inset-0 pointer-events-none">
          {playingAnimations.map((element) => (
            <div
              key={element.id}
              className="absolute animate-bounce"
              style={{
                left: `${element.x}%`,
                top: `${element.y}%`,
                animationDelay: `${element.animationDelay}s`,
                animationDuration: `${1 + Math.random() * 2}s`
              }}
            >
              <div 
                className="text-2xl animate-spin"
                style={{ 
                  color: element.color,
                  animationDuration: `${2 + Math.random() * 3}s`
                }}
              >
                {element.type === 'star' && '⭐'}
                {element.type === 'heart' && '💖'}
                {element.type === 'circle' && '🔵'}
                {element.type === 'triangle' && '🔺'}
                {element.type === 'diamond' && '💎'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Real-time sound visualization when playing */}
      {isPlaying && (
        <div className="absolute bottom-0 left-0 right-0 h-16 flex items-end justify-center space-x-1 bg-gradient-to-t from-black/50 to-transparent">
          {soundLevels.map((level) => (
            <div
              key={level.id}
              className="bg-gradient-to-t from-white/60 to-white/20 rounded-sm animate-pulse"
              style={{
                width: '3px',
                height: `${level.height}px`,
                animationDelay: `${level.delay}s`,
                animationDuration: '0.5s'
              }}
            />
          ))}
        </div>
      )}

      {/* Progress bar when playing */}
      {isPlaying && duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div 
            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-100"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      )}

      {/* Playing text overlay */}
      {isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-6xl animate-pulse opacity-30">
            🎵
          </div>
        </div>
      )}

      {/* Mood lights overlay */}
      {moodLights.map((light) => (
        <div
          key={light.id}
          className="absolute rounded-full animate-pulse"
          style={{
            left: `${light.x}%`,
            top: `${light.y}%`,
            width: `${light.size}px`,
            height: `${light.size}px`,
            background: light.color,
            opacity: light.intensity,
            animationDelay: `${light.animationDelay}s`,
            animationDuration: `${2 + Math.random() * 3}s`
          }}
        />
      ))}

      {/* Sparkle effects */}
      {sparkleEffects.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute animate-ping"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            animationDelay: `${sparkle.animationDelay}s`,
            animationDuration: `${1 + Math.random() * 2}s`
          }}
        >
          <div 
            className="text-white/60 animate-spin"
            style={{
              fontSize: `${sparkle.size}px`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          >
            {sparkle.type === 'star' && '⭐'}
            {sparkle.type === 'diamond' && '💎'}
            {sparkle.type === 'circle' && '✨'}
            {sparkle.type === 'heart' && '💖'}
          </div>
        </div>
      ))}

      {/* Wave patterns */}
      {wavePatterns.map((wave) => (
        <div
          key={wave.id}
          className="absolute w-full h-1 opacity-30 animate-pulse"
          style={{
            top: `${30 + (wave.id * 8)}%`,
            background: `linear-gradient(90deg, transparent, ${wave.color}, transparent)`,
            animationDelay: `${wave.id * 0.5}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        />
      ))}

      </div>
    </>
  );
});

export default ThumbnailGenerator;