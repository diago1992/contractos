"use client";

import { Upload, FileText, Tag, Brain, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProcessingStep = 'uploading' | 'parsing' | 'classifying' | 'extracting' | 'done' | 'failed';

const steps = [
  { key: 'uploading', label: 'Uploading', icon: Upload },
  { key: 'parsing', label: 'Parsing Document', icon: FileText },
  { key: 'classifying', label: 'Classifying', icon: Tag },
  { key: 'extracting', label: 'Extracting Metadata', icon: Brain },
  { key: 'done', label: 'Complete', icon: CheckCircle },
] as const;

interface UploadProgressProps {
  currentStep: ProcessingStep;
  error?: string;
  className?: string;
}

export function UploadProgress({ currentStep, error, className }: UploadProgressProps) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);
  const isFailed = currentStep === 'failed';

  return (
    <div className={cn('space-y-3', className)}>
      {steps.map((step, index) => {
        const isComplete = !isFailed && currentIndex > index;
        const isCurrent = currentStep === step.key;
        const isActive = isCurrent && !isFailed;
        const Icon = step.icon;

        return (
          <div key={step.key} className={cn(
            'flex items-center gap-3 p-3 rounded-lg transition-colors',
            isComplete ? 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-950' : '',
            isActive ? 'text-primary bg-primary/5 font-medium' : '',
            !isComplete && !isActive ? 'text-muted-foreground' : ''
          )}>
            {isComplete ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            ) : isActive ? (
              <Loader2 className="h-5 w-5 animate-spin shrink-0" />
            ) : (
              <Icon className="h-5 w-5 shrink-0" />
            )}
            <span className="text-sm">{step.label}</span>
          </div>
        );
      })}

      {isFailed && (
        <div className="flex items-center gap-3 p-3 rounded-lg text-destructive bg-destructive/5">
          <XCircle className="h-5 w-5 shrink-0" />
          <div>
            <span className="text-sm font-medium">Processing Failed</span>
            {error && <p className="text-xs mt-1">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
