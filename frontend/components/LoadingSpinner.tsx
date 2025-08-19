import React from 'react';

interface LoadingSpinnerProps {
  /** Size variant of the spinner */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Color variant of the spinner */
  color?: 'blue' | 'white' | 'gray' | 'green' | 'red';
  /** Whether to show loading text */
  showText?: boolean;
  /** Custom loading text */
  text?: string;
  /** Whether to center the spinner */
  centered?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const COLOR_CLASSES = {
  blue: 'text-blue-600',
  white: 'text-white',
  gray: 'text-gray-600',
  green: 'text-green-600',
  red: 'text-red-600',
};

/**
 * Reusable loading spinner component with various size and color options
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue',
  showText = false,
  text = 'Loading...',
  centered = false,
  className = '',
}) => {
  const spinnerClasses = `
    inline-block
    border-2
    border-current
    border-t-transparent
    rounded-full
    animate-spin
    ${SIZE_CLASSES[size]}
    ${COLOR_CLASSES[color]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const containerClasses = `
    ${centered ? 'flex items-center justify-center' : ''}
    ${showText ? 'flex items-center space-x-2' : ''}
  `.trim();

  if (showText || centered) {
    return (
      <div className={containerClasses}>
        <div className={spinnerClasses} />
        {showText && (
          <span className={`text-sm ${COLOR_CLASSES[color]}`}>
            {text}
          </span>
        )}
      </div>
    );
  }

  return <div className={spinnerClasses} />;
};

export default LoadingSpinner;

// Export convenience components for common use cases
export const CenteredSpinner: React.FC<Omit<LoadingSpinnerProps, 'centered'>> = (props) => (
  <LoadingSpinner {...props} centered />
);

export const SpinnerWithText: React.FC<Omit<LoadingSpinnerProps, 'showText'>> = (props) => (
  <LoadingSpinner {...props} showText />
);

export const FullPageSpinner: React.FC<Pick<LoadingSpinnerProps, 'text' | 'size'>> = ({ 
  text = 'Loading...', 
  size = 'lg' 
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
    <div className="text-center">
      <LoadingSpinner size={size} centered className="mx-auto mb-4" />
      <p className="text-gray-600">{text}</p>
    </div>
  </div>
); 