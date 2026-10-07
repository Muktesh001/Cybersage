/**
 * CyberSage - AI Explanation Panel Component
 *
 * Purpose:
 *   Renders the full AI-generated security analysis for a scan.
 *   Handles: loading skeleton, error state, and full explanation display.
 *
 * Sections rendered:
 *   1. Header          — AI badge, generated-by info, regenerate button
 *   2. Summary         — Plain-English overview
 *   3. Why It Matters  — Business/user impact
 *   4. Top Risks       — 3 warning cards
 *   5. Quick Wins      — 3 green action cards
 *   6. Code Example    — Monospace block with copy button
 *   7. Technical Details — Developer context
 *   8. Disclaimer      — Passive audit notice
 *
 * Props:
 *   scanId      {string}    — Scan ID to explain
 *   autoLoad    {boolean}   — Auto-trigger AI on mount (default: false)
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdAutoAwesome, MdRefresh, MdWarning, MdCheckCircle,
  MdCode, MdInfo, MdError, MdContentCopy, MdDone,
  MdShield, MdLightbulb
} from 'react-icons/md';
import useAI from '../../hooks/useAI';
import LoadingSpinner from '../common/LoadingSpinner';

// ---- Copy to clipboard button ----
const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs
                 text-gray-400 hover:text-gray-200 hover:bg-dark-700
                 transition-all duration-150"
      aria-label="Copy code"
    >
      {copied
        ? <><MdDone className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Copied</span></>
        : <><MdContentCopy className="w-3.5 h-3.5" /><span>Copy</span></>}
    </button>
  );
};

// ---- Section wrapper ----
const Section = ({ icon: Icon, iconColor = 'text-primary-400', title, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="space-y-2"
  >
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
      <h4 className="text-sm font-semibold text-gray-200">{title}</h4>
    </div>
    {children}
  </motion.div>
);

// ---- Skeleton loader ----
const AILoadingSkeleton = () => (
  <div className="space-y-5 animate-pulse">
    {/* Header skeleton */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-dark-700" />
        <div className="w-32 h-5 rounded bg-dark-700" />
        <div className="w-16 h-5 rounded-full bg-dark-700" />
      </div>
    </div>
    {/* Content skeletons */}
    {[80, 60, 90, 50].map((w, i) => (
      <div key={i} className="space-y-2">
        <div className="w-24 h-4 rounded bg-dark-700" />
        <div className={`h-3 rounded bg-dark-800`} style={{ width: `${w}%` }} />
        <div className="h-3 rounded bg-dark-800 w-full" />
        {i === 0 && <div className="h-3 rounded bg-dark-800 w-3/4" />}
      </div>
    ))}
    {/* Chips skeleton */}
    <div className="grid grid-cols-3 gap-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-dark-800" />)}
    </div>
    <p className="text-xs text-gray-600 text-center mt-2">Generating AI analysis...</p>
  </div>
);

// ---- Error state ----
const AIErrorState = ({ error, onRetry }) => (
  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/20 border border-red-800/40">
    <MdError className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-red-400">AI Explanation Failed</p>
      <p className="text-xs text-gray-400 mt-0.5">{error}</p>
    </div>
    <button onClick={onRetry}
      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 flex-shrink-0">
      <MdRefresh className="w-3.5 h-3.5" /> Retry
    </button>
  </div>
);

// ---- Idle state (not yet triggered) ----
const AIIdleState = ({ onGenerate, scanId }) => (
  <div className="flex flex-col items-center gap-4 py-6 text-center">
    <div className="p-4 rounded-2xl bg-primary-900/20 border border-primary-800/40">
      <MdAutoAwesome className="w-8 h-8 text-primary-400" />
    </div>
    <div>
      <p className="text-white font-semibold">AI Security Analysis</p>
      <p className="text-gray-400 text-sm mt-1 max-w-xs">
        Get an AI-powered plain-English explanation of these findings, risks, and how to fix them.
      </p>
    </div>
    <button
      onClick={() => onGenerate(scanId)}
      className="btn-primary flex items-center gap-2 px-6 py-2.5"
    >
      <MdAutoAwesome className="w-4 h-4" />
      Generate AI Analysis
    </button>
  </div>
);

// ---- Main Component ----
const AIExplanationPanel = ({ scanId, autoLoad = false }) => {
  const { explanation, isLoading, isComplete, isError, error,
          isCached, generate, regenerate } = useAI();

  // Auto-trigger on mount if requested
  useEffect(() => {
    if (autoLoad && scanId) {
      generate(scanId);
    }
  }, [autoLoad, scanId]);

  const isIdle = !isLoading && !isComplete && !isError;

  return (
    <div className="card">
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary-900/30 border border-primary-800/40">
            <MdAutoAwesome className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">AI Security Analysis</h3>
            <p className="text-xs text-gray-500">Powered by Gemini AI</p>
          </div>
        </div>

        {isComplete && explanation && (
          <div className="flex items-center gap-2">
            {/* Source badge */}
            {explanation.generatedBy === 'gemini' ? (
              <span className="badge bg-primary-900/30 text-primary-400 border border-primary-800/50 text-xs">
                ✦ Gemini
              </span>
            ) : (
              <span className="badge bg-dark-700 text-gray-400 border border-dark-600 text-xs">
                Rule-based
              </span>
            )}

            {isCached && (
              <span className="badge bg-dark-700 text-gray-500 border border-dark-600 text-xs">
                Cached
              </span>
            )}

            {/* Regenerate button */}
            <button
              onClick={() => regenerate(scanId)}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs
                         text-gray-400 hover:text-gray-200 hover:bg-dark-700
                         border border-dark-700 transition-all"
              title="Regenerate AI analysis"
            >
              <MdRefresh className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          </div>
        )}
      </div>

      {/* ── States ── */}
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div key="loading" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <AILoadingSkeleton />
          </motion.div>
        )}

        {isError && (
          <motion.div key="error" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <AIErrorState error={error} onRetry={() => generate(scanId)} />
          </motion.div>
        )}

        {isIdle && (
          <motion.div key="idle" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <AIIdleState onGenerate={generate} scanId={scanId} />
          </motion.div>
        )}

        {isComplete && explanation && (
          <motion.div
            key="content"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="space-y-5"
          >
            {/* ── 1. Summary ── */}
            <Section icon={MdShield} title="Security Overview" delay={0}>
              <p className="text-sm text-gray-300 leading-relaxed">{explanation.summary}</p>
            </Section>

            <div className="border-t border-dark-800" />

            {/* ── 2. Why It Matters ── */}
            <Section icon={MdInfo} iconColor="text-blue-400" title="Why It Matters" delay={0.05}>
              <p className="text-sm text-gray-400 leading-relaxed">{explanation.whyItMatters}</p>
            </Section>

            <div className="border-t border-dark-800" />

            {/* ── 3. Top Risks ── */}
            <Section icon={MdWarning} iconColor="text-orange-400" title="Top Risks" delay={0.1}>
              <div className="grid grid-cols-1 gap-2">
                {(explanation.topRisks || []).map((risk, i) => (
                  <div key={i}
                    className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg
                               bg-orange-950/20 border border-orange-900/40">
                    <span className="w-5 h-5 rounded-full bg-orange-900/50 border border-orange-700/50
                                     flex items-center justify-center text-xs font-bold text-orange-400 flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-300">{risk}</p>
                  </div>
                ))}
              </div>
            </Section>

            <div className="border-t border-dark-800" />

            {/* ── 4. Quick Wins ── */}
            <Section icon={MdLightbulb} iconColor="text-green-400" title="Quick Wins" delay={0.15}>
              <div className="grid grid-cols-1 gap-2">
                {(explanation.quickWins || []).map((win, i) => (
                  <div key={i}
                    className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg
                               bg-green-950/20 border border-green-900/40">
                    <MdCheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-300">{win}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── 5. Code Example ── */}
            {explanation.codeExample && (
              <>
                <div className="border-t border-dark-800" />
                <Section icon={MdCode} iconColor="text-purple-400" title="Configuration Example" delay={0.2}>
                  <div className="rounded-xl bg-dark-950 border border-dark-700 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-dark-900/50 border-b border-dark-700">
                      <span className="text-xs text-gray-500 font-mono">security-headers.conf</span>
                      <CopyButton text={explanation.codeExample} />
                    </div>
                    <pre className="px-4 py-3 text-xs font-mono text-green-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                      {explanation.codeExample}
                    </pre>
                  </div>
                </Section>
              </>
            )}

            {/* ── 6. Technical Details ── */}
            {explanation.technicalDetails && (
              <>
                <div className="border-t border-dark-800" />
                <Section icon={MdCode} iconColor="text-gray-400" title="Technical Details" delay={0.25}>
                  <p className="text-sm text-gray-400 leading-relaxed font-mono text-xs bg-dark-900/40 rounded-lg px-3 py-2.5 border border-dark-700">
                    {explanation.technicalDetails}
                  </p>
                </Section>
              </>
            )}

            {/* ── 7. Disclaimer ── */}
            {explanation.disclaimer && (
              <div className="flex items-start gap-2 pt-3 border-t border-dark-800">
                <MdInfo className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600 italic">{explanation.disclaimer}</p>
              </div>
            )}

            {/* Generated timestamp */}
            {explanation.generatedAt && (
              <p className="text-xs text-gray-700 text-right">
                Generated: {new Date(explanation.generatedAt).toLocaleString()}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIExplanationPanel;
