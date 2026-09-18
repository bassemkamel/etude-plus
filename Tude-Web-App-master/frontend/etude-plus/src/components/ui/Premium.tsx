import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

// Centralized premium UI components to avoid dependency on missing local files

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'destructive', size?: 'sm' | 'md' | 'lg', isLoading?: boolean }>(({ className, variant = 'default', size = 'md', isLoading, children, disabled, ...props }, ref) => {
  const variants = {
    default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md hover:-translate-y-0.5",
    outline: "border-2 border-border bg-transparent hover:border-primary hover:text-primary",
    ghost: "bg-transparent hover:bg-muted text-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
  };
  const sizes = { sm: "h-9 px-4 text-sm", md: "h-12 px-6 font-medium", lg: "h-14 px-8 text-lg font-semibold" };
  
  return (
    <button
      ref={ref}
      disabled={isLoading || disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
      {children}
    </button>
  );
});
Button.displayName = "Button";

export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-card text-card-foreground rounded-2xl border border-border shadow-sm overflow-hidden", className)} {...props}>
    {children}
  </div>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Label = ({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground mb-1.5 block", className)} {...props}>
    {children}
  </label>
);

export const Badge = ({ className, variant = 'default', children }: { className?: string, variant?: 'default' | 'secondary' | 'success' | 'outline' | 'destructive', children: React.ReactNode }) => {
  const variants = {
    default: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary text-secondary-foreground border-border",
    success: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
    outline: "border-border text-foreground",
    destructive: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400"
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors", variants[variant as keyof typeof variants] ?? variants.default, className)}>
      {children}
    </span>
  );
}

export const PageHeader = ({ title, description, action }: { title: string, description?: string, action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
    <div>
      <h1 className="text-3xl font-serif font-bold text-foreground">{title}</h1>
      {description && <p className="text-muted-foreground mt-1 text-lg">{description}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

export const FadeIn = ({ children, delay = 0, className }: { children: React.ReactNode, delay?: number, className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>
);
