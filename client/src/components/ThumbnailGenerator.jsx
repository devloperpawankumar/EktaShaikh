import { useState, useRef, memo, useEffect } from 'react';
import thumbnailImage from '../assests/images/Thumbnail.jpg';

// Global image preloader - loads once and is shared across all components
let globalImageLoaded = false;
let globalImageLoading = false;
const imageLoadCallbacks = new Set();

const preloadThumbnailImage = () => {
  if (globalImageLoaded || globalImageLoading) return;
  
  globalImageLoading = true;
  const img = new Image();
  img.src = thumbnailImage;
  img.onload = () => {
    globalImageLoaded = true;
    globalImageLoading = false;
    imageLoadCallbacks.forEach(callback => callback());
    imageLoadCallbacks.clear();
  };
  img.onerror = () => {
    globalImageLoading = false;
  };
};

// Start preloading immediately when module loads
if (typeof window !== 'undefined') {
  preloadThumbnailImage();
}

const ThumbnailGenerator = memo(function ThumbnailGenerator({ recording, className = "", isPlaying = false, currentTime = 0, duration = 0, isFirstVisible = false }) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(globalImageLoaded);
  const [shouldLoad, setShouldLoad] = useState(isFirstVisible || globalImageLoaded);
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  // Subscribe to global image load
  useEffect(() => {
    if (globalImageLoaded) {
      setImageLoaded(true);
      setShouldLoad(true);
      return;
    }

    const callback = () => {
      setImageLoaded(true);
      setShouldLoad(true);
    };
    imageLoadCallbacks.add(callback);
    return () => imageLoadCallbacks.delete(callback);
  }, []);

  // Intersection Observer - load image when it's about to be visible
  useEffect(() => {
    if (!containerRef.current || shouldLoad || globalImageLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before it's visible
        threshold: 0.01
      }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [shouldLoad]);

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formattedDuration = formatDuration(recording?.durationSeconds || duration);

  return (
    <div 
      ref={containerRef}
      className={`
        relative rounded-xl overflow-hidden transition-all duration-300
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Loading Placeholder */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}

      {/* Thumbnail Image - Only render when should load */}
      {shouldLoad && (
        <img 
          ref={imgRef}
          src={thumbnailImage} 
          alt={recording?.title || 'Archive thumbnail'}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => {
            setImageLoaded(true);
            if (!globalImageLoaded) {
              globalImageLoaded = true;
            }
          }}
          loading={isFirstVisible ? "eager" : "lazy"}
          fetchpriority={isFirstVisible ? "high" : "auto"}
          decoding="async"
        />
      )}
      
      {/* Overlay with duration badge */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {formattedDuration}
        </div>
        
        {/* Playing indicator */}
        {isPlaying && (
          <div className="absolute top-2 left-2 flex items-center space-x-1 bg-red-500/80 rounded-full px-2 py-1 backdrop-blur-sm">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-xs text-white font-bold">LIVE</span>
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
      </div>
      
      {/* Hover effect */}
      {isHovered && (
        <div className="absolute inset-0 bg-white/5 transition-opacity duration-300" />
      )}
    </div>
  );
});

export default ThumbnailGenerator;
