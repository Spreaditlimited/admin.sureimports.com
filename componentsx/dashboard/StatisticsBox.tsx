import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  bgColor: string;
  onClick?: () => void; // Optional onClick handler for making the card clickable
}

const StatCard: React.FC<StatCardProps> = ({ title, value, description, bgColor, onClick }) => {
  return (
    <div
      className={`flex flex-col justify-between p-4 rounded-lg shadow-md cursor-pointer 
      ${bgColor} text-slate-900 dark:text-white dark:bg-opacity-90 transition-transform transform hover:scale-105 hover:shadow-lg`}
      onClick={onClick} // Handle clicks
    >
      <div className="text-lg font-semibold">{title}</div>
      <div className="text-4xl font-bold">{value}</div>
      <div className="text-sm">{description}</div>
    </div>
  );
};

const Statistics = () => {
  // Example click handler
  const handleClick = (title: string) => {
    alert(`You clicked on ${title}!`);
  };

  return (
    <>
    <h3 className='font-bold'>Statistical Summary</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
      <StatCard
        title="Registered Users"
        value="4"
        description="Registered Users"
        bgColor="bg-blue-100 dark:bg-blue-700"
        onClick={() => handleClick('Registered-Users')}
      />
      <StatCard
        title="Registered Affiliates"
        value="0"
        description="Registered Affiliates"
        bgColor="bg-yellow-100 dark:bg-yellow-700"
        onClick={() => handleClick('Regsitered Affiliates')}
      />
      <StatCard
        title="Activited Users"
        value="0"
        description="Activated Users"
        bgColor="bg-green-100 dark:bg-green-700"
        onClick={() => handleClick('Activated Users')}
      />
      <StatCard
        title="Unactivated Users"
        value="0"
        description="unactivated users"
        bgColor="bg-red-100 dark:bg-red-700"
        onClick={() => handleClick('Unactivated Users')}
      />

    </div>
    </>
  );
};

export default Statistics;
