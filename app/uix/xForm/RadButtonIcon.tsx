import React from 'react';
import Image from 'next/image';

interface Props {
  label: string;
  name?: string;
  id?: string;
  reacticon?: any;
  classx?: string;
  icon?: string;
  value?: string;
  onClick?: (e: any) => void;
  onChange?: (e: any) => void;
}

const RadButton: React.FC<Props> = ({
  label,
  name,
  id,
  reacticon,
  classx,
  icon,
  value,
  onClick,
  onChange,
}) => {
  let classprops =
    'item-center mb-[25px] h-[49px] gap-2 text-base font-medium lg:w-[203px] bg-indigo-800 text-base font-semibold text-white hover:bg-indigo-700 inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  //let iconx = "/icons/profile-update/user.svg";
  return (
    <>
      {/* SUBMIT & CANCEL BUTTON */}
      <div className="item-center mx-auto h-[49px] gap-2 text-base font-medium lg:w-[203px]">
        <button
          type="submit"
          onClick={onClick}
          onChange={onChange}
          value={value}
          className={
            classprops +
            classx +
            'item-center mb-[25px] h-[49px] gap-2 p-3 text-base font-medium lg:w-[203px]'
          }
        >
          <span className="text-xl">{reacticon}</span>
          {label}
        </button>
      </div>
    </>
  );
};

export default RadButton;
