import React from 'react';

interface Props {
  label: string;
  name: string;
  id: string;
  defaultValue?: any;
  reacticon?: any;
  autoComplete?: string;
  placeholder?: string;
  classx?: string;
  errorx?: any;
  value?: any;
  onClick?: (e: any) => void;
  onChange?: (e: any) => void;
}

const RadText: React.FC<Props> = ({
  label,
  name,
  id,
  defaultValue,
  reacticon,
  autoComplete,
  placeholder,
  classx,
  errorx,
  value,
  onClick,
  onChange,
}) => {
  let classprops =
    'flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset sm:max-w-md ';

  return (
    <>
      {/* TEXT INPUT */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600">
          {label}
        </label>

        <div className="item-center relative flex max-md:pb-[15px]">
          <span
            className="absolute m-2 text-2xl lg:m-5"
            style={{ color: '#404040' }}
          >
            {reacticon}
          </span>
          <input
            type="date"
            id="dob"
            name="dob"
            value={value}
            defaultValue={defaultValue}
            onClick={onClick}
            onChange={onChange}
            className="items-centerx max-sm:w-340px flex h-10 w-full justify-between rounded-md border border-input bg-background bg-slate-100 p-5 px-3 py-2 pl-12 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 lg:h-[60px] lg:w-full [&>span]:line-clamp-1"
            placeholder="Contact Number"
          />
        </div>

        <div id="question-error" aria-live="polite" aria-atomic="true">
          <p className="mt-2 text-sm text-red-500">{errorx}</p>
        </div>
      </div>
    </>
  );
};

export default RadText;
