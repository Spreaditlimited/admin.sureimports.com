import CustomersTable from "./components/CustomersTable"

export default function CustomersPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage and view all registered and active customers
        </p>
      </div>
      <CustomersTable />
    </div>
  )
}

