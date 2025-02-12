import React from 'react';
import SkeletalLoader from './SkeletalLoader';
import styles from './SkeletalUserCard.module.css';

const SkeletalUserCard: React.FC = () => {
  return (
    <div className={styles.card}>
      {/* <div className={styles.avatar}>
        <SkeletalLoader width="50px" height="50px" borderRadius="50%" />
      </div> */}
      {/* <div className={styles.content}>
        <SkeletalLoader width="70%" height="20px" />
        <SkeletalLoader width="90%" height="16px" />
      </div> */}
      <div className={styles.content}>
        <SkeletalLoader width="100%" height="100px" />
      </div>
    </div>
  );
};

export default SkeletalUserCard;
