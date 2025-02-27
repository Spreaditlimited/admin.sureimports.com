"use client"

import { useState } from "react"

type ShippingPlan = {
  id: number
  pidShippingPlan: string
  shippingPlanName: string | null
  shippingPlanRate: number | null
}

type Country = {
  id: number
  pidCountry: string
  countryName: string | null
  shippingPlans: ShippingPlan[]
}

export function CountryTable({ countries }: { countries: Country[] }) {
  const [expandedCountry, setExpandedCountry] = useState<number | null>(null)

  return (
    <table className="min-w-full bg-white border border-gray-300 text-gray-800">
      <thead>
        <tr className="bg-gray-100 dark:text-gray-300 text-gray-800">
          <th className="py-2 px-4 border-b">S/N</th>
          <th className="py-2 px-4 border-b">Country Name</th>
          <th className="py-2 px-4 border-b">Shipping Plans</th>
        </tr>
      </thead>
      <tbody>
        {countries.map((country, index) => (
          <>
            <tr
              key={country.id}
              className="cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-400 bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              onClick={() => setExpandedCountry(expandedCountry === country.id ? null : country.id)}
            >
              {/* <td className="py-2 px-4 border-b">{country.pidCountry}</td> */}
              <td className="py-2 px-4 border-b">{index + 1}</td>
              <td className="py-2 px-4 border-b">{country.countryName}</td>
              <td className="py-2 px-4 border-b">View (<b>{country.shippingPlans.length}</b>) </td>
            </tr>
            {expandedCountry === country.id && (
              <tr>
                <td colSpan={3} className="py-2 px-4 border-b">
                  <table className="min-w-full bg-gray-50">
                    <thead>
                      <tr>
                        <th className="py-2 px-4 border-b dark:text-gray-300">Shipping Plan ID</th>
                        <th className="py-2 px-4 border-b dark:text-gray-300">Shipping Plan Name</th>
                        <th className="py-2 px-4 border-b dark:text-gray-300">Shipping Plan Rate (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {country.shippingPlans.map((plan) => (
                        <tr key={plan.id}>
                          <td className="py-2 px-4 border-b">{plan.pidShippingPlan}</td>
                          <td className="py-2 px-4 border-b">{plan.shippingPlanName}</td>
                          <td className="py-2 px-4 border-b">${plan.shippingPlanRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>
              </tr>
            )}
          </>
        ))}
      </tbody>
    </table>
  )
}

