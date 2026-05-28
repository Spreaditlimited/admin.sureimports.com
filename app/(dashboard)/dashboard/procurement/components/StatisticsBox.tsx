import React from 'react';
import { toast } from 'sonner';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  onClick?: () => void; // Optional onClick handler for making the card clickable
}

const StatCard: React.FC<StatCardProps> = ({ title, value, description, onClick }) => {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`bg-card border border-border shadow-soft p-6 rounded-lg flex flex-col justify-between transition-colors
        ${onClick ? 'cursor-pointer hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset' : ''}
      `}
      onClick={onClick}
      onKeyDown={(e) => {
        // Ensure keyboard accessibility for clickable cards
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
      <p className="text-xs text-muted-foreground mt-2">{description}</p>
    </div>
  );
};

const Statistics = () => {
  // Example click handler
  const handleClick = (title: string) => {
    toast.info(`You clicked on ${title}!`);
  };

  return (
    <div className="mb-10">
      {/* Adjusted the heading to match our standard typography scale */}
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Statistical Summary
      </h3>
      
      {/* Updated gap-4 to gap-6 to match our 8-point grid system globally */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Registered Users"
          value="4"
          description="Total Registered Users"
          onClick={() => handleClick('Registered Users')}
        />
        <StatCard
          title="Registered Affiliates"
          value="0"
          description="Total Registered Affiliates"
          onClick={() => handleClick('Registered Affiliates')}
        />
        <StatCard
          title="Activated Users"
          value="0"
          description="Active User Accounts"
          onClick={() => handleClick('Activated Users')}
        />
        <StatCard
          title="Unactivated Users"
          value="0"
          description="Pending Activation"
          onClick={() => handleClick('Unactivated Users')}
        />
      </div>
    </div>
  );
};

export default Statistics;