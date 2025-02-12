import { useRouter } from 'next/navigation';
import React from 'react';
import { BiSolidShoppingBags, BiUser } from 'react-icons/bi';
import { HiShoppingBag } from 'react-icons/hi2';
import { MdPayment } from 'react-icons/md';
import { RiShipFill } from 'react-icons/ri';

interface StatCardProps {
  icon: any;
  title: string;
  value: string | number;
  description: string;
  bgColor: string;
  onClick?: () => void; // Optional onClick handler for making the card clickable
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, description, bgColor, onClick }) => {
  return (
    <div
      className={`flex flex-col justify-between p-4 rounded-lg shadow-md cursor-pointer 
      ${bgColor} dark:bg-opacity-90 transition-transform transform hover:scale-105 hover:shadow-lg`}
      onClick={onClick} // Handle clicks
    >
      <div className="flex text-base font-semibold text-red-700">{icon} &nbsp; {title}</div>
      {/* <div className="text-4xl font-bold">{value}</div>
      <div className="text-sm">{description}</div> */}
    </div>
  );
};

const Statistics = () => {
  const router = useRouter();
  // Example click handler
  const handleClick = (url: string) => {
    router.push(url)
  };

  return (
    <>
    <h3 className='font-bold'>Services</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
      <StatCard
        icon = {<BiSolidShoppingBags />}
        title="Procurements"
        value="4"
        description="Procurement"
        bgColor="bg-blue-100 dark:bg-blue-700"
        onClick={() => handleClick('dashboard/procurement?status=saved')}
      />
      <StatCard
      icon = {<HiShoppingBag />}
        title="Special Sourcing"
        value="0"
        description="Special Sourcing"
        bgColor="bg-yellow-100 dark:bg-blue-700"
        onClick={() => handleClick('dashboard/special-sourcing')}
      />
      <StatCard
      icon = {<MdPayment />}
        title="Pay Supplier"
        value="0"
        description="Pay Supplier"
        bgColor="bg-green-100 dark:bg-green-700"
        onClick={() => handleClick('dashboard/pay-supplier')}
      />
      <StatCard
      icon = {<RiShipFill />}
        title="Shipping Only"
        value="0"
        description="Shipping Only"
        bgColor="bg-red-100 dark:bg-red-700"
        onClick={() => handleClick('dashboard/shipping-only')}
      />

      <StatCard
        icon = {<BiUser />}
        title="Verify Supplier"
        value="0"
        description="verify supplier"
        bgColor="bg-red-100 dark:bg-red-700"
        onClick={() => handleClick('dashboard/verify-supplier')}
      />

    </div>
    </>
  );
};

export default Statistics;
