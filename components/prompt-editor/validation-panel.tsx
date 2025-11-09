'use client';

import { useMemo, useState, useEffect } from 'react';

interface ValidationResult {
  isValid: boolean;
  errors: Array<{ line?: number; message: string }>;
  warnings: string[];
  fields_used: string[];
  fields_missing: string[];
  fields_wasted: string[];
}

interface HealthStats {
  retrieved: number;
  used_in_prompt: number;
  optimal: number;
  wasted: number;
  errors: number;
  total_fields: number;
}

interface ValidationPanelProps {
  promptContent: string;
  validation: ValidationResult | null;
}

export function ValidationPanel({ promptContent, validation }: ValidationPanelProps) {
  const [healthStats, setHealthStats] = useState<HealthStats | null>(null);

  // Fetch health stats
  useEffect(() => {
    const fetchHealthStats = async () => {
      try {
        const response = await fetch('/api/prompt-metadata');
        const data = await response.json();
        if (data.success && data.stats) {
          setHealthStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch health stats:', error);
      }
    };
    fetchHealthStats();
  }, []);

  // Auto-validate on content change (always recalculate based on current content)
  const autoValidation = useMemo(() => {
    // Basic validation
    const errors: Array<{ line?: number; message: string }> = [];
    const warnings: string[] = [];
    const fieldsUsed: string[] = [];

    // Extract placeholders
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = placeholderRegex.exec(promptContent)) !== null) {
      const field = match[1].trim();
      if (!fieldsUsed.includes(field)) {
        fieldsUsed.push(field);
      }
    }

    // Check for malformed placeholders (single braces without double braces)
    const malformedMatches = promptContent.match(/\{[^{]|[^}]\}/g);
    if (malformedMatches && malformedMatches.length > 0) {
      // Exclude cases that are part of valid JSON examples in the prompt
      const validJsonContext = malformedMatches.filter(match => {
        const index = promptContent.indexOf(match);
        const before = promptContent.substring(Math.max(0, index - 50), index);
        const after = promptContent.substring(index, Math.min(promptContent.length, index + 50));

        // Don't flag if it's part of JSON example syntax
        return !(before.includes('JSON') || after.includes('"action"') || after.includes('"symbol"'));
      });

      if (validJsonContext.length > 0) {
        warnings.push(`Found ${validJsonContext.length} potential placeholder issue(s). Placeholders must use double curly braces like {{FIELD}}, not single braces like {FIELD}.`);
      }
    }

    // Check for JSON response instruction
    const hasJsonInstruction =
      promptContent.includes('JSON') ||
      promptContent.includes('json') ||
      promptContent.match(/respond.*in.*json/i);

    if (!hasJsonInstruction) {
      warnings.push('Missing JSON response format instructions. Add a section like: "## RESPOND IN JSON FORMAT:" to ensure the LLM returns structured data.');
    }

    // Check for recommended sections
    if (!promptContent.match(/\{\{MARKET_DATA\}\}/i)) {
      warnings.push('Consider adding {{MARKET_DATA}} placeholder to provide market context to the LLM.');
    }

    // Check prompt length
    if (promptContent.length < 100) {
      warnings.push('Prompt is very short. Consider adding more context, instructions, and examples for better LLM performance.');
    } else if (promptContent.length > 10000) {
      warnings.push('Prompt is very long (' + Math.round(promptContent.length / 1000) + 'k chars). This may increase API costs and latency.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fields_used: fieldsUsed,
      fields_missing: [],
      fields_wasted: [],
    };
  }, [promptContent]);

  // Always use auto-validation (real-time calculation)
  const displayValidation = autoValidation;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black border border-black dark:border-white font-mono overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-black dark:border-white">
        <h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wide">Validation</h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Health Stats Banner */}
        {healthStats && (
          <div className="border border-black dark:border-white p-4">
            <h4 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider mb-3">
              Data Field Health
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-black dark:border-white p-2">
                <div className="text-xs text-black dark:text-white mb-1">Retrieved</div>
                <div className="text-lg font-bold text-black dark:text-white">
                  {healthStats.retrieved}/{healthStats.total_fields}
                </div>
              </div>
              <div className="border border-black dark:border-white p-2">
                <div className="text-xs text-black dark:text-white mb-1">Used</div>
                <div className="text-lg font-bold text-black dark:text-white">
                  {healthStats.used_in_prompt}/{healthStats.total_fields}
                </div>
              </div>
              <div className="border border-black dark:border-white p-2">
                <div className="text-xs text-black dark:text-white mb-1">✅ Optimal</div>
                <div className="text-lg font-bold text-black dark:text-white">
                  {healthStats.optimal}
                </div>
              </div>
              <div className="border border-black dark:border-white p-2">
                <div className="text-xs text-black dark:text-white mb-1">⚠️ Wasted</div>
                <div className="text-lg font-bold text-black dark:text-white">
                  {healthStats.wasted}
                </div>
              </div>
            </div>
            {healthStats.errors > 0 && (
              <div className="mt-3 border border-black dark:border-white p-2">
                <div className="text-xs text-black dark:text-white mb-1">❌ Errors</div>
                <div className="text-lg font-bold text-black dark:text-white">
                  {healthStats.errors}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status */}
        <div className="border border-black dark:border-white p-3">
          <div className="flex items-center gap-2">
            {displayValidation.isValid ? (
              <>
                <span className="text-xl">✓</span>
                <span className="text-xs font-bold text-black dark:text-white">Valid Prompt</span>
              </>
            ) : (
              <>
                <span className="text-xl">✗</span>
                <span className="text-xs font-bold text-black dark:text-white">Invalid Prompt</span>
              </>
            )}
          </div>
        </div>

        {/* Errors */}
        {displayValidation.errors.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider mb-2">
              ❌ Errors ({displayValidation.errors.length})
            </h4>
            <div className="space-y-2">
              {displayValidation.errors.map((error, i) => (
                <div
                  key={i}
                  className="border border-black dark:border-white p-3 text-xs text-black dark:text-white"
                >
                  {error.line && (
                    <span className="font-bold">Line {error.line}: </span>
                  )}
                  {error.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {displayValidation.warnings.length > 0 && (
          <>
            {/* Critical Warnings */}
            {displayValidation.warnings.filter(w =>
              w.includes('placeholder issue') ||
              w.includes('Missing JSON')
            ).length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider mb-2">
                  ⚠️ Warnings ({displayValidation.warnings.filter(w =>
                    w.includes('placeholder issue') ||
                    w.includes('Missing JSON')
                  ).length})
                </h4>
                <div className="space-y-2">
                  {displayValidation.warnings
                    .filter(w =>
                      w.includes('placeholder issue') ||
                      w.includes('Missing JSON')
                    )
                    .map((warning, i) => (
                      <div
                        key={i}
                        className="border-2 border-yellow-600 dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-950 p-3 text-xs text-black dark:text-white"
                      >
                        <div className="flex gap-2">
                          <span className="flex-shrink-0">⚠️</span>
                          <div className="flex-1">{warning}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {displayValidation.warnings.filter(w =>
              w.includes('Consider adding') ||
              w.includes('very short') ||
              w.includes('very long')
            ).length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider mb-2">
                  💡 Suggestions ({displayValidation.warnings.filter(w =>
                    w.includes('Consider adding') ||
                    w.includes('very short') ||
                    w.includes('very long')
                  ).length})
                </h4>
                <div className="space-y-2">
                  {displayValidation.warnings
                    .filter(w =>
                      w.includes('Consider adding') ||
                      w.includes('very short') ||
                      w.includes('very long')
                    )
                    .map((warning, i) => (
                      <div
                        key={i}
                        className="border border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950 p-3 text-xs text-black dark:text-white"
                      >
                        <div className="flex gap-2">
                          <span className="flex-shrink-0">💡</span>
                          <div className="flex-1">{warning}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Fields Used */}
        <div>
          <h4 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider mb-2">
            Fields Used ({displayValidation.fields_used.length})
          </h4>
          {displayValidation.fields_used.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {displayValidation.fields_used.map((field) => (
                <span
                  key={field}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium border border-black dark:border-white"
                >
                  {field}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-black dark:text-white opacity-50">No fields used yet</p>
          )}
        </div>

        {/* Missing Fields */}
        {displayValidation.fields_missing.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider mb-2">
              Recommended ({displayValidation.fields_missing.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {displayValidation.fields_missing.map((field) => (
                <span
                  key={field}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium border border-black dark:border-white"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* All Good */}
        {displayValidation.isValid &&
          displayValidation.errors.length === 0 &&
          displayValidation.warnings.filter(w =>
            w.includes('placeholder issue') ||
            w.includes('Missing JSON')
          ).length === 0 && (
            <div className="text-center py-6 border border-black dark:border-white">
              <div className="text-4xl mb-3">✓</div>
              <p className="text-xs font-bold text-black dark:text-white">Prompt looks great!</p>
              <p className="text-xs text-black dark:text-white opacity-50 mt-1">
                {displayValidation.warnings.length > 0
                  ? `No critical issues detected (${displayValidation.warnings.length} suggestion${displayValidation.warnings.length > 1 ? 's' : ''} below)`
                  : 'No issues detected'}
              </p>
            </div>
          )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-black dark:border-white">
        <p className="text-xs text-black dark:text-white">
          Validation runs automatically
        </p>
      </div>
    </div>
  );
}
