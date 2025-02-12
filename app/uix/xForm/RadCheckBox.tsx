import React from 'react';

interface Props {
  label: string;
  hint?: any;
  name?: string;
  id?: string;
  value?: string;
  classx?: string;
}

const RadCheckBox: React.FC<Props> = ({
  label,
  hint,
  name,
  id,
  value,
  classx,
}) => {
  let classprops =
    'h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 ';
  return (
    <div>
      {/* OPTION BUTTON */}
      <fieldset>
        <div className="mt-6 space-y-6">
          <div className="relative flex gap-x-3">
            <div className="flex h-6 items-center">
              <input
                id={id}
                name={name}
                type="checkbox"
                value={value}
                className={classprops + classx}
                required
              />
            </div>

            <div className="text-sm leading-6">
              <label htmlFor="comments" className="font-medium text-gray-600">
                {label}
              </label>
              <p className="text-gray-500">{hint}</p>
            </div>
          </div>
        </div>
      </fieldset>
      <br />
    </div>
  );
};

export default RadCheckBox;
