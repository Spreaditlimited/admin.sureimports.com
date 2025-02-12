import React, { useState } from 'react';
//import { ChevronUpDown } from 'lucide-react';
import { ChevronUpDownIcon } from '@heroicons/react/16/solid';

// Define the option type
type Option = {
  id: string;
  label: string;
  imageUrl: string;
  value: string;
};

// Define the component props
interface ImageSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const ImageSelect = ({ options, value, onChange, placeholder = "Select an option" }: ImageSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative w-full max-w-xs">
      {/* Selected Value Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <div className="flex items-center">
          {selectedOption ? (
            <>
              <img
                src={selectedOption.imageUrl}
                alt={selectedOption.label}
                className="h-6 w-6 object-cover rounded-sm mr-2"
              />
              <span className="block truncate">{selectedOption.label}</span>
            </>
          ) : (
            <span className="block truncate text-gray-500">{placeholder}</span>
          )}
        </div>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg">
          <ul className="max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
            {options.map((option) => (
              <li
                key={option.id}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-blue-50 flex items-center"
              >
                <img
                  src={option.imageUrl}
                  alt={option.label}
                  className="h-6 w-6 object-cover rounded-sm mr-2"
                />
                <span className={`block truncate ${value === option.value ? 'font-semibold' : 'font-normal'}`}>
                  {option.label}
                </span>
                {value === option.value && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ImageSelect;