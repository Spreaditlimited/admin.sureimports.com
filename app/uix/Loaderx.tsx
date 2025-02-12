import React from 'react';

interface LoaderProps {
  src?: string;
  alt?: string;
}

const url = '../images/loader3.gif';

const CenteredGifLoader: React.FC<LoaderProps> = ({
  src = url,
  alt = 'Loading...',
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <img src={src} alt={alt} className="w-50 h-50" />
    </div>
  );
};

export default CenteredGifLoader;
