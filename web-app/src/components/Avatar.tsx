import React from 'react';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-24 h-24 text-2xl'
};

const backgroundColors = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-cyan-500'
];

export default function Avatar({ 
  src, 
  alt = 'Avatar', 
  name = '', 
  size = 'md', 
  className = '' 
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  // Generate initials from name
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate consistent background color based on name
  const getBackgroundColor = (name: string) => {
    if (!name) return backgroundColors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return backgroundColors[Math.abs(hash) % backgroundColors.length];
  };

  const initials = getInitials(name);
  const backgroundColor = getBackgroundColor(name);
  const sizeClass = sizeClasses[size];

  // If we have a valid src and no error, show the image
  if (src && !imageError && imageLoaded) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${sizeClass} rounded-full object-cover ${className}`}
        onError={() => setImageError(true)}
        onLoad={() => setImageLoaded(true)}
      />
    );
  }

  // Show initials with colored background
  return (
    <div
      className={`${sizeClass} ${backgroundColor} rounded-full flex items-center justify-center text-white font-semibold ${className}`}
      title={name || alt}
    >
      {initials}
    </div>
  );
}
