import React, { useState, useRef, useEffect, useCallback } from 'react';
import ThumbnailGenerator from './ThumbnailGenerator.jsx';

const RotaryDial = ({ onDigit, displayNumber, onPrev, onNext, onPlayPause, isPlaying, hasMessages, canGoPrev, canGoNext, currentMessage, currentTime, duration }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isDialing, setIsDialing] = useState(false);
  const [currentHole, setCurrentHole] = useState(null);
  const [rotation, setRotation] = useState(0);
  const dialRef = useRef(null);
  const audioContextRef = useRef(null);

  // Initialize audio context for dial sounds
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playDialSound = useCallback((frequency = 350, duration = 50) => {
    if (!audioContextRef.current) return;
    
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration / 1000);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration / 1000);
  }, []);

  const playReturnSound = useCallback(() => {
    playDialSound(150, 800);
  }, [playDialSound]);

  const numbers = [
    { number: '1', letters: '' },
    { number: '2', letters: 'ABC' },
    { number: '3', letters: 'DEF' },
    { number: '4', letters: 'GHI' },
    { number: '5', letters: 'JKL' },
    { number: '6', letters: 'MNO' },
    { number: '7', letters: 'PQRS' },
    { number: '8', letters: 'TUV' },
    { number: '9', letters: 'WXYZ' },
    { number: '0', letters: '+' },
  ];

  const handleDialStart = (number, index) => {
    if (isDialing || phoneNumber.length >= 10) return;
    
    setIsDialing(true);
    setCurrentHole(index);
    playDialSound();
    
    // Calculate rotation based on hole position (0-9)
    const targetRotation = (index * 36) - 90; // 36 degrees per hole, offset by -90
    setRotation(targetRotation);
  };

  const handleDialEnd = (number) => {
    if (!isDialing) return;
    
    setIsDialing(false);
    setCurrentHole(null);
    playReturnSound();
    
    // Return to original position with animation
    setTimeout(() => {
      setRotation(0);
    }, 300);
    
    // Add number to phone number
    if (phoneNumber.length < 10) {
      setPhoneNumber(prev => prev + number);
    }

    // Notify parent about the digit dialed
    if (onDigit) {
      const parsed = Number(number)
      if (!Number.isNaN(parsed)) onDigit(parsed)
    }
  };

  const handleDelete = () => {
    playDialSound(200, 30);
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    playDialSound(100, 50);
    setPhoneNumber('');
  };

  const getHolePosition = (index, total) => {
    const angle = (index * 36 - 90) * (Math.PI / 180); // 36 degrees between holes
    const radius = 96; // Reduced from 120 to 96
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    };
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-3xl shadow-2xl p-6 max-w-md w-full">
        {/* Current Message Preview */}
        {currentMessage && (
          <div className="mb-6">
            <div className="text-center mb-3">
              <div className="text-green-400 text-sm font-mono mb-2">NOW PLAYING</div>
            </div>
            <div className="h-24 w-full">
              <ThumbnailGenerator 
                recording={currentMessage} 
                className="h-full w-full"
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
              />
            </div>
            <div className="text-center mt-2">
              <div className="text-xs text-gray-300 truncate">
                {currentMessage.title || 'Message'}
              </div>
            </div>
          </div>
        )}

        {/* Phone Display */}
        <div className="bg-black rounded-2xl p-6 mb-8 border-4 border-gray-700">
          <div className="text-center mb-4">
            <div className="text-green-400 text-sm font-mono mb-1">ROTARY DIAL</div>
            <div className="h-12 bg-gray-800 rounded-lg flex items-center justify-center border-2 border-gray-600">
              <span className="text-2xl font-mono text-white tracking-wider">
                {displayNumber || phoneNumber || ''}
              </span>
            </div>
            
          </div>
        </div>

        {/* Rotary Dial */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="relative w-64 h-64">
            {/* Dial Base */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full border-8 border-gray-600 shadow-2xl" />
            
            {/* Finger Hole Ring */}
            <div 
              ref={dialRef}
              className="absolute inset-8 rounded-full transition-transform duration-500 ease-out"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              {numbers.map((item, index) => {
                const position = getHolePosition(index, numbers.length);
                return (
                  <button
                    key={item.number}
                    className={`absolute w-12 h-12 rounded-full border-3 transition-all duration-200 transform hover:scale-110 active:scale-95 ${
                      currentHole === index 
                        ? 'bg-yellow-400 border-yellow-300 shadow-lg shadow-yellow-500/50' 
                        : 'bg-gradient-to-br from-gray-600 to-gray-800 border-gray-500 hover:border-gray-400'
                    }`}
                    style={{
                      left: `calc(50% + ${position.x}px - 1.5rem)`,
                      top: `calc(50% + ${position.y}px - 1.5rem)`,
                    }}
                    onMouseDown={() => handleDialStart(item.number, index)}
                    onMouseUp={() => handleDialEnd(item.number)}
                    onMouseLeave={() => isDialing && handleDialEnd(item.number)}
                    onTouchStart={() => handleDialStart(item.number, index)}
                    onTouchEnd={() => handleDialEnd(item.number)}
                    disabled={isDialing || phoneNumber.length >= 10}
                  >
                    <div className="text-white text-center">
                      <div className="text-lg font-bold">{item.number}</div>
                      {item.letters && (
                        <div className="text-xs opacity-70">{item.letters}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Center Circle */}
            <div className="absolute inset-24 bg-gradient-to-br from-gray-800 to-gray-600 rounded-full border-4 border-gray-500 flex items-center justify-center shadow-inner">
              <div className="text-white text-center">
                <div className="text-sm font-semibold">ROTATE</div>
                <div className="text-xs opacity-70">TO DIAL</div>
              </div>
            </div>


            {/* Finger Stop */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-4 h-8 bg-red-500 rounded-t-lg border-2 border-red-400" />
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex justify-center items-center space-x-6 mb-4">
          <button
            onClick={onPrev}
            disabled={!hasMessages || !canGoPrev}
            className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 disabled:from-gray-800 disabled:to-gray-900 disabled:cursor-not-allowed text-white rounded-full border-3 border-gray-500 hover:border-gray-400 flex items-center justify-center text-lg font-bold transition-all duration-200 hover:scale-110 active:scale-95"
          >
            ←
          </button>
          
          <button
            onClick={onPlayPause}
            disabled={!hasMessages}
            className="w-14 h-14 bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 disabled:from-gray-800 disabled:to-gray-900 disabled:cursor-not-allowed text-white rounded-full border-3 border-gray-500 hover:border-gray-400 flex items-center justify-center text-xl font-bold transition-all duration-200 hover:scale-110 active:scale-95"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          
          <button
            onClick={onNext}
            disabled={!hasMessages || !canGoNext}
            className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 disabled:from-gray-800 disabled:to-gray-900 disabled:cursor-not-allowed text-white rounded-full border-3 border-gray-500 hover:border-gray-400 flex items-center justify-center text-lg font-bold transition-all duration-200 hover:scale-110 active:scale-95"
          >
            →
          </button>
        </div>

        {/* Control Buttons */}
        {/* <div className="flex justify-center space-x-6">
          <button
            onClick={handleDelete}
            disabled={!phoneNumber.length}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors duration-200 transform hover:scale-105 active:scale-95"
          >
            DELETE
          </button>
          <button
            onClick={handleClear}
            disabled={!phoneNumber.length}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors duration-200 transform hover:scale-105 active:scale-95"
          >
            CLEAR
          </button>
        </div> */}

        {/* Status Indicator */}
        <div className="text-center mt-6">
          <div className={`inline-flex items-center px-4 py-2 rounded-full ${
            phoneNumber.length === 10 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-700 text-gray-300'
          }`}>
            <div className={`w-3 h-3 rounded-full mr-2 ${
              isDialing ? 'bg-yellow-400 animate-pulse' : 
              phoneNumber.length === 10 ? 'bg-green-400' : 'bg-gray-400'
            }`} />
            {phoneNumber.length === 10 ? 'READY TO CALL' : 
             isDialing ? 'DIALING...' : 'ENTER NUMBER'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RotaryDial;