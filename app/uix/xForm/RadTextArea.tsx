import React from 'react';

interface Props {
  label: string;
  name: string;
  id: string;
  rows?: number;
  defaultValue?: any;
  placeholder?: string;
  hint?: string;
  classx?: string;
  errorx?: any;
  value?: any;
  disable?: boolean;
  onClick?: (e: any) => void;
  onChange?: (e: any) => void;
}

const RadTextArea: React.FC<Props> = ({
  label,
  name,
  id,
  rows,
  defaultValue,
  placeholder,
  hint,
  classx,
  errorx,
  value,
  disable,
  onClick,
  onChange,
}) => {
  let classprops =
    'pl-3 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ';
  return (
    <>
      {/* TEXT AREA INPUT */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-400">
          {label}
        </label>
        <textarea
          id={id}
          name={name}
          rows={rows}
          defaultValue={defaultValue}
          placeholder={placeholder}
          value={value}
          onClick={onClick}
          onChange={onChange}
          disabled={disable}
          className="max-sm:w-340px flex min-h-[80px] w-full rounded-md border border-input bg-background bg-slate-200 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 lg:h-32 lg:w-full"
        />
        <p className="mt-3 text-sm leading-6 text-gray-600">{hint}</p>
        <div id="answer-error" aria-live="polite" aria-atomic="true">
          <p className="mt-2 text-sm text-red-500">{errorx}</p>
        </div>
      </div>
    </>
  );
};

export default RadTextArea;
