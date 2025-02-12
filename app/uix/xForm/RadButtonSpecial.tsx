import React from 'react';
import Link from 'next/link';

interface Props {
  label1?: string;
  label2?: string;
  redirect?: any;
  name?: string;
  id?: string;
  classx?: string;
}

const RadButtonSpecial: React.FC<Props> = ({
  label1,
  label2,
  redirect,
  name,
  id,
  classx,
}) => {
  let classprops =
    'bg-gray-800 hover:bg-gray-700 text-white font-semibold py-1.5 px-4 transition-colors bg-gray-50 border active:bg-gray-200 font-medium border-gray-200 text-gray-900 rounded-lg hover:bg-gray-100 disabled:opacity-50 ';
  return (
    <div>
      {/* SUBMIT & CANCEL BUTTON */}
      <div className="mt-7 sm:col-span-4">
        <button type="submit" className={classprops + classx}>
          {label1}
        </button>

        <Link href={redirect}>
          <button className="rounded-lg bg-transparent px-4 py-1.5 font-medium text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50">
            {label2}
          </button>
        </Link>
      </div>
    </div>
  );
};

export default RadButtonSpecial;
