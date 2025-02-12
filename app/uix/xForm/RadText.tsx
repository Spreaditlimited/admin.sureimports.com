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
      <div className="">
        <label className="block text-sm font-medium text-slate-400">
          {label}
        </label>
        <span
          className="absolute m-2 text-2xl lg:m-5"
          style={{ color: '#404040' }}
        >
          {reacticon}
        </span>
        <input
          type="text"
          name={name}
          id={id}
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onClick={onClick}
          onChange={onChange}
          className="items-centerx max-sm:w-340px flex h-10 w-full justify-between rounded-md border border-input bg-background bg-slate-200 p-5 px-3 py-2 pl-12 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 lg:h-[60px] lg:w-full [&>span]:line-clamp-1"
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

export default RadText;
