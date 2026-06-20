"use client"

import { Fragment, useState } from "react"
import { toast } from "sonner"
import { 
  Globe, 
  ChevronDown, 
  ChevronRight, 
  Truck, 
  Trash2, 
  Hash, 
  Banknote,
  PackageOpen,
  MapPin,
  Pencil,
  Check,
  X
} from "lucide-react"
import { formatShippingPlanDisplay } from "@/lib/formatShippingPlan"

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
  const [localCountries, setLocalCountries] = useState<Country[]>(countries)
  const [editingPlanPid, setEditingPlanPid] = useState<string | null>(null)
  const [editingPlanName, setEditingPlanName] = useState("")
  const [editingPlanRate, setEditingPlanRate] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)

  const formatCurrency = (amount: number | null) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-foreground">
          {/* Main Table Header */}
          <thead className="bg-muted/50 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-6 py-4 w-16 text-center">S/N</th>
              <th className="px-6 py-4 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" /> Destination Country
              </th>
              <th className="px-6 py-4 text-center">Active Routes</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border bg-card">
            {localCountries.map((country, index) => {
              const isExpanded = expandedCountry === country.id;
              
              return (
                <Fragment key={country.id}>
                  {/* Parent Row */}
                  <tr
                    className={`cursor-pointer transition-colors group ${
                      isExpanded ? 'bg-primary/5' : 'hover:bg-muted/30'
                    }`}
                    onClick={() => setExpandedCountry(isExpanded ? null : country.id)}
                  >
                    <td className="px-6 py-4 text-center text-muted-foreground font-medium">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded transition-colors ${isExpanded ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                           <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-foreground">{country.countryName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter border ${
                        country.shippingPlans.length > 0 
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                        : 'bg-muted text-muted-foreground border-border'
                      }`}>
                        {country.shippingPlans.length} Available Plans
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end">
                         {isExpanded ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Detail Drawer */}
                  {isExpanded && (
                    <tr className="bg-muted/10 border-t border-border animate-in slide-in-from-top-2 duration-300">
                      <td colSpan={4} className="p-0">
                        <div className="p-6">
                          <div className="rounded-lg border border-border overflow-hidden bg-card">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-muted/30 border-b border-border text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                                <tr>
                                  <th className="px-4 py-3"><div className="flex items-center gap-2"><Hash className="w-3 h-3" /> Plan Identifier</div></th>
                                  <th className="px-4 py-3"><div className="flex items-center gap-2"><Truck className="w-3 h-3" /> Delivery Mode</div></th>
                                  <th className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-2"><Banknote className="w-3 h-3" /> Surcharge / Rate</div></th>
                                  <th className="px-4 py-3 text-right">Mgmt</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {country.shippingPlans.length === 0 ? (
                                  <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center">
                                      <div className="flex flex-col items-center gap-2">
                                        <PackageOpen className="w-8 h-8 text-muted-foreground/20" />
                                        <p className="text-xs text-muted-foreground font-medium">No logistics routes provisioned for this destination.</p>
                                      </div>
                                    </td>
                                  </tr>
                                ) : (
                                  country.shippingPlans.map((plan) => (
                                    <tr key={plan.id} className="hover:bg-muted/20 transition-colors group/row">
                                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                                        {plan.pidShippingPlan}
                                      </td>
                                      <td className="px-4 py-3 font-bold text-foreground">
                                        {editingPlanPid === plan.pidShippingPlan ? (
                                          <input
                                            value={editingPlanName}
                                            onChange={(e) => setEditingPlanName(e.target.value)}
                                            className="w-full rounded border border-input bg-background px-2 py-1 text-xs font-semibold"
                                          />
                                        ) : (
                                          formatShippingPlanDisplay(plan.shippingPlanName)
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                                        {editingPlanPid === plan.pidShippingPlan ? (
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={editingPlanRate}
                                            onChange={(e) => setEditingPlanRate(e.target.value)}
                                            className="w-32 rounded border border-input bg-background px-2 py-1 text-right text-xs font-semibold"
                                          />
                                        ) : (
                                          formatCurrency(plan.shippingPlanRate)
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                          {editingPlanPid === plan.pidShippingPlan ? (
                                            <>
                                              <button
                                                disabled={savingEdit}
                                                onClick={async () => {
                                                  const shippingPlanName = editingPlanName.trim()
                                                  const shippingPlanRate = Number(editingPlanRate)
                                                  if (!shippingPlanName) {
                                                    toast.error("Plan name is required")
                                                    return
                                                  }
                                                  if (!Number.isFinite(shippingPlanRate) || shippingPlanRate < 0) {
                                                    toast.error("Plan rate must be a valid non-negative number")
                                                    return
                                                  }
                                                  setSavingEdit(true)
                                                  try {
                                                    const res = await fetch("/api/crud/shipping-plan/update", {
                                                      method: "POST",
                                                      headers: { "Content-Type": "application/json" },
                                                      body: JSON.stringify({
                                                        pidShippingPlan: plan.pidShippingPlan,
                                                        shippingPlanName,
                                                        shippingPlanRate,
                                                      }),
                                                    })
                                                    const data = await res.json()
                                                    if (data.statusx !== "SUCCESS") {
                                                      toast.error(data.message || "Failed to update shipping plan")
                                                      return
                                                    }
                                                    setLocalCountries((prev) =>
                                                      prev.map((c) => ({
                                                        ...c,
                                                        shippingPlans: c.shippingPlans.map((p) =>
                                                          p.pidShippingPlan === plan.pidShippingPlan
                                                            ? { ...p, shippingPlanName, shippingPlanRate }
                                                            : p
                                                        ),
                                                      }))
                                                    )
                                                    setEditingPlanPid(null)
                                                    toast.success("Shipping plan updated")
                                                  } catch {
                                                    toast.error("Failed to update shipping plan")
                                                  } finally {
                                                    setSavingEdit(false)
                                                  }
                                                }}
                                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-all"
                                                title="Save"
                                              >
                                                <Check className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                disabled={savingEdit}
                                                onClick={() => setEditingPlanPid(null)}
                                                className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-all"
                                                title="Cancel"
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <button
                                                onClick={() => {
                                                  setEditingPlanPid(plan.pidShippingPlan)
                                                  setEditingPlanName(plan.shippingPlanName || "")
                                                  setEditingPlanRate(String(plan.shippingPlanRate ?? 0))
                                                }}
                                                className="p-1.5 text-primary/70 hover:text-primary hover:bg-primary/5 rounded transition-all"
                                                title="Edit plan"
                                              >
                                                <Pencil className="w-3.5 h-3.5" />
                                              </button>
                                              <button className="p-1.5 text-destructive/40 hover:text-destructive hover:bg-destructive/5 rounded transition-all" title="Delete plan">
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
