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
  disable?: boolean;
  value?: string;
  onClick?: (e: any) => void;
  onChange?: (e: any) => void;
}

const RadPassword: React.FC<Props> = ({
  label,
  name,
  id,
  defaultValue,
  reacticon,
  autoComplete,
  placeholder,
  classx,
  errorx,
  disable,
  value,
  onClick,
  onChange,
  ...props
}) => {
  let classprops =
    'flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset sm:max-w-md ';

  return (
    <>
      {/* TEXT INPUT */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <span
          className="absolute m-2 text-2xl lg:m-5"
          style={{ color: '#404040' }}
        >
          {reacticon}
        </span>
        <input
          type="password"
          name={name}
          id={id}
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onClick={onClick}
          onChange={onChange}
          className="flex h-10 w-full rounded-md border-none border-input bg-slate-100 px-3 py-2 pl-12 text-base font-medium text-slate-600 placeholder-slate-600 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-white max-sm:w-[340px] lg:h-[60px] lg:w-full"
          disabled={disable}
          {...props}
        />
        <div id="question-error" aria-live="polite" aria-atomic="true">
          <p className="mt-2 text-sm text-red-500">{errorx}</p>
        </div>
      </div>
    </>
  );
};

export default RadPassword;
