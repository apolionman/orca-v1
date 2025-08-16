import React, { useState } from 'react';

type AvatarProps = {
  src: string;
  name: string;
  size?: number; // Optional size prop (default 24px)
};

const Avatar: React.FC<AvatarProps> = ({ src, name, size = 24 }) => {
  const [error, setError] = useState(false);
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeClass = `w-[${size}px] h-[${size}px] text-[${Math.floor(size / 2.5)}px]`;

  return (
    <>
      {!error ? (
        <img
          src={src}
          alt={name}
          onError={() => setError(true)}
          className={`rounded-full object-cover mr-2 ${sizeClass}`}
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className={`mr-2 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white font-medium ${sizeClass}`}
          style={{ width: size, height: size }}
        >
          {initials}
        </div>
      )}
    </>
  );
};

export default Avatar;
