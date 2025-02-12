import React from 'react';
import Link from 'next/link';

interface Props {
  label: string;
  link?: any;
  name?: string;
  id?: string;
  classx?: string;
  reacticon?: any;
  value?: string;
  onClick?: (e: any) => void;
  onChange?: (e: any) => void;
}

const RadLinkButton: React.FC<Props> = ({
  label,
  link,
  name,
  id,
  classx,
  reacticon,
  value,
  onClick,
  onChange,
}) => {
  let classprops =
    'item-center mb-[25px] h-[49px] gap-2 text-base font-medium lg:w-[203px] bg-indigo-800 text-base font-semibold text-white hover:bg-indigo-700 inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  return (
    <div>
      {/* SUBMIT & CANCEL BUTTON */}
      <Link href={link}>
        <div className="mx-auto">
          <button
            type="button"
            onClick={onClick}
            onChange={onChange}
            className={
              classprops +
              classx +
              'item-center mb-[25px] h-[49px] gap-2 p-3 text-base font-medium lg:w-[203px]'
            }
          >
            <span className="text-2xl">{reacticon}</span>
            {label}
          </button>
        </div>
      </Link>
    </div>
  );
};

export default RadLinkButton;
