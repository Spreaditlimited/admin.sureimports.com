import React from 'react';

interface Props {
  title: string;
  subtitle: string;

  label1: string;
  name1?: string;
  id1?: string;
  value1: string;
  classx1?: string;

  label2: string;
  name2?: string;
  id2?: string;
  value2: string;
  classx2?: string;
}

const RadRadioBox: React.FC<Props> = ({
  title,
  subtitle,
  label1,
  name1,
  id1,
  classx1,
  label2,
  name2,
  id2,
  value1,
  value2,
  classx2,
}) => {
  let classprops =
    'h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 ';
  return (
    <div>
      {/* OPTION BUTTON */}
      <fieldset>
        <legend className="text-sm font-semibold leading-6 text-gray-900">
          {title}
        </legend>
        <p className="mt-1 text-sm leading-6 text-gray-600">{subtitle}</p>
        <div className="mt-6 space-y-6">
          <div className="flex items-center gap-x-3">
            <input
              id={id1}
              name={name1}
              value={value1}
              type="radio"
              className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
            />
            <label
              htmlFor="push-everything"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              {label1}
            </label>
          </div>
          <div className="flex items-center gap-x-3">
            <input
              id={id2}
              name={name2}
              value={value2}
              type="radio"
              className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
            />
            <label
              htmlFor="push-email"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              {label2}
            </label>
          </div>
        </div>
      </fieldset>
    </div>
  );
};

export default RadRadioBox;
