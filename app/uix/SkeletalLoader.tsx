import React from 'react';
import styles from './SkeletalLoader.module.css';

interface SkeletalLoaderProps {
  width?: string;
  height?: string;
  borderRadius?: string;
}

const SkeletalLoader: React.FC<SkeletalLoaderProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = '4px',
}) => {
  return (
    <div
      className={styles.skeleton}
      style={{ width, height, borderRadius }}
    ></div>
  );
};

export default SkeletalLoader;
