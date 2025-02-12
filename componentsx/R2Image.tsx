import Image from 'next/image';

interface R2ImageProps {
  fileName: string;
  alt: string;
  width: number;
  height: number;
}

const R2Image: React.FC<R2ImageProps> = ({ fileName, alt, width, height }) => {
  const baseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  const imageUrl = `${baseUrl}/${fileName}`;

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      //layout="responsive"
    />
  );
};

export default R2Image;