import React from 'react';
import styles from './Loader.module.css';

interface LoaderProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const Loader: React.FC<LoaderProps> = ({
  size = 'medium',
  color = '#0070f3',
}) => {
  return (
    <div className="h-screenx flex items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-4 border-gray-500 border-t-transparent"></div>
      &nbsp; L o a d i n g . . .
    </div>
  );
};

export default Loader;
