import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-muted">
            {icon}
          </div>
        )}

        <input
          ref={ref}
          className={[
            "w-full rounded-default bg-surface-container-lowest py-3 text-sm text-on-surface placeholder:text-on-surface-muted transition-all",
            "focus:outline-none focus:shadow-[0_0_0_2px_rgba(0,82,255,0.3)]",
            icon ? "pl-10 pr-4" : "px-4",
            className,
          ].join(" ")}
          {...props}
        />
      </div>
    );
  },
);

Input.displayName = "Input";
