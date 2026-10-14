import * as React from "react"

import { cn } from "@/lib/utils"
import { toEnglishDigits } from "@/lib/persian-digits"

function Input({ className, type, inputMode, onChange, maxLength, id, name, ...props }: React.ComponentProps<"input">) {
  let computedMaxLength = maxLength;
  
  if (!computedMaxLength && inputMode === "numeric") {
    const ident = (id || name || "").toLowerCase();
    if (ident.includes("nationalcode") || ident.includes("nc")) {
      computedMaxLength = 10;
    } else if (ident.includes("phone") || ident.includes("ph") || ident.includes("g1") || ident.includes("g2")) {
      computedMaxLength = 11;
    } else {
      // Default fallback for any other numeric field just in case, though we primarily use it for these
      computedMaxLength = 11;
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (inputMode === "numeric") {
      // Allow control keys (Backspace, Tab, Delete, Arrows, Meta, Ctrl, Alt)
      if (
        e.key.length > 1 || 
        e.ctrlKey || 
        e.metaKey || 
        e.altKey
      ) {
        return;
      }
      
      // Convert Persian/Arabic key to English digit to check if it's a number
      const englishKey = toEnglishDigits(e.key);
      
      // If it's not a digit, prevent it from being typed.
      // We skip "Unidentified" because mobile keyboards (Android) often send this for every key.
      if (e.key !== "Unidentified" && e.key !== "Process" && /\D/.test(englishKey)) {
        e.preventDefault();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (inputMode === "numeric") {
      const originalValue = e.target.value;
      const englishValue = toEnglishDigits(originalValue);
      const val = englishValue.replace(/\D/g, "");
      
      if (val !== originalValue) {
        // Force the DOM to match the sanitized value.
        // This is necessary for pasted text or autofill, where onKeyDown doesn't catch it,
        // and React might bail out of rendering if the sanitized value matches the previous state.
        e.currentTarget.value = val;
        const target = e.currentTarget;
        setTimeout(() => {
          target.value = val;
        }, 0);
      }

      // We pass the sanitized value to the parent. 
      // Because we prevent invalid keys in onKeyDown, the only time
      // replace(/\D/g) actually does something is for pasted text.
      const mockEvent = Object.create(e);
      mockEvent.target = { ...e.target, value: val };
      mockEvent.currentTarget = { ...e.currentTarget, value: val };
      
      onChange?.(mockEvent);
      return;
    }
    
    onChange?.(e);
  };

  return (
    <input
      id={id}
      name={name}
      type={type}
      inputMode={inputMode}
      maxLength={computedMaxLength}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      onChange={handleChange}
      onKeyDown={(e) => {
        handleKeyDown(e);
        props.onKeyDown?.(e);
      }}
      {...props}
    />
  )
}

export { Input }
