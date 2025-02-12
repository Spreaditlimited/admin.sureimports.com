// Layout.js
import React from 'react';

interface Props {
  children?: any;
  title?: string;
  subtitle?: string;
}

const RadFormLayout: React.FC<Props> = ({ children, title, subtitle }) => {
  return (
    <div>
      <div className="p-2">
        <div className="border-b text-xl font-bold text-slate-800 dark:text-white">
          <div className="m-5">{title}</div>
        </div>

        <div className="">
          <div className="flex w-full flex-col gap-3 rounded-2xl border-t-2 bg-white p-7 dark:bg-[#161629]">
            <main>{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadFormLayout;
