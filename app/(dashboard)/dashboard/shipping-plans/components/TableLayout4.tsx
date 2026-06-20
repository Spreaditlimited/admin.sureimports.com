import React from 'react';
import { formatShippingPlanDisplay } from '@/lib/formatShippingPlan';

interface ShippingPlan {
  id: number;
  pidShippingPlan: string;
  shippingPlanName: string;
  shippingPlanRate: number;
  shippingPlanUnit?: string | null;
}

interface Country {
  id: number;
  pidCountry: string;
  countryName: string;
  shippingPlans: ShippingPlan[];
}

interface CountryTableProps {
  countries: Country[];
}

const CountryTable: React.FC<CountryTableProps> = ({ countries }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Country ID</th>
          <th>Country Name</th>
          <th>Shipping Plans</th>
        </tr>
      </thead>
      <tbody>
        {countries.map((country) => (
          <tr key={country.id}>
            <td>{country.pidCountry}</td>
            <td>{country.countryName}</td>
            <td>
              <ul>  
                {country.shippingPlans.map((plan) => (
                  <li key={plan.id}>
                    {formatShippingPlanDisplay(plan.shippingPlanName)} - ${plan.shippingPlanRate} / {plan.shippingPlanUnit || 'KG'}
                  </li>
                ))}
              </ul>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default CountryTable;
