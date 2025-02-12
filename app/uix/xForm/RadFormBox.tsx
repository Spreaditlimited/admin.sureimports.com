// Layout.js
import React from 'react';

interface Props {
  children?: any;
  title?: string;
  subtitle?: string;
}

const FormLayout: React.FC<Props> = ({ children, title, subtitle }) => {
  return (
    <main>
      <div className="mb-4 h-full rounded-lg bg-white p-4 shadow sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold leading-none text-gray-900">
            {title}
          </h3>
          {/*
                          <Link href="/dashboard" className="text-sm font-medium text-cyan-600 hover:bg-gray-100 rounded-lg inline-flex items-center p-2">
                            View all
                          </Link>
                        */}
        </div>
        <hr />

        <main>{children}</main>
      </div>
    </main>
  );
};

export default FormLayout;
