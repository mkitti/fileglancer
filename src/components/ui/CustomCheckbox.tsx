import * as React from 'react';

type CustomCheckboxProps = {
  checked: boolean;
  id: string;
};

export function CustomCheckbox({ checked, id }: CustomCheckboxProps) {
  return (
    <div className="relative inline-flex items-center justify-center w-5 h-5">
      <input type="checkbox" id={id} checked={checked} className="sr-only" />
      <div
        className={`
        w-4 h-4 border border-blue-gray-200 rounded
        ${checked ? 'bg-blue-500' : 'bg-white'}
        flex items-center justify-center
      `}
      >
        {checked && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-3 h-3 text-white"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
