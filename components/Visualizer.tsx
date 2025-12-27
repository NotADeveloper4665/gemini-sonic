
import React from 'react';

export const Visualizer: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  return (
    <div className="flex items-end justify-center space-x-1 h-8">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className={`w-1 bg-blue-400 rounded-full transition-all duration-300 ${
            isActive ? 'animate-bounce' : 'h-2'
          }`}
          style={{
            animationDelay: `${i * 0.1}s`,
            height: isActive ? `${Math.random() * 24 + 8}px` : '4px',
          }}
        />
      ))}
    </div>
  );
};
