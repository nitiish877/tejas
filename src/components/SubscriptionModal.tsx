import React, { useState } from 'react';
import { X, Check, Sparkles, Zap, Shield, Crown, TestTube2 } from 'lucide-react';
import { SubscriptionPlanType } from '../types';
import { PaymentItem } from './PaymentModal';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: SubscriptionPlanType;
  highlightPlan?: SubscriptionPlanType;
  onInitiateCheckout: (item: PaymentItem) => void;
  onSelectFreePlan: () => void;
  subscriptionExpiresAt?: number;
  isDark: boolean;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  currentPlan = 'free',
  highlightPlan,
  onInitiateCheckout,
  onSelectFreePlan,
  subscriptionExpiresAt,
  isDark,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  if (!isOpen) return null;

  const handleChooseFree = () => {
    onSelectFreePlan();
    onClose();
  };

  const daysLeft = subscriptionExpiresAt
    ? Math.max(0, Math.ceil((subscriptionExpiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-4 bg-black/80 backdrop-blur-sm flex justify-center items-start sm:items-center min-h-screen">
      <div
        className={`relative w-full max-w-6xl my-auto max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDark
            ? 'bg-[#18181b] border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Close Button */}
        <button
          id="close-subscription-modal-btn"
          type="button"
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-xl transition-colors z-20 ${
            isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1">
          {/* Header */}
          <div className="px-6 pt-7 pb-4 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tejas Model Subscription & Checkout</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Select Your Tejas Plan
            </h2>
            <p className={`mt-2 text-xs sm:text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Upgrade to higher reasoning models. Plans automatically revert to Free tier once the duration completes.
            </p>

            {/* Active Plan notice if subscribed */}
            {currentPlan !== 'free' && daysLeft !== null && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <span>Currently Active: <strong>Tejas {currentPlan.toUpperCase()}</strong></span>
                <span>•</span>
                <span>{daysLeft} days remaining before auto-free revert</span>
              </div>
            )}

            {/* Billing Cycle Toggle */}
            <div className="mt-5 inline-flex items-center p-1 rounded-xl bg-zinc-800/80 border border-zinc-700/60">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>Yearly Billing</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Save ~15%
                </span>
              </button>
            </div>
          </div>

          {/* 4 Pricing Cards Grid */}
          <div className="px-4 sm:px-6 pb-6 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. FREE PLAN (1B) */}
          <div
            className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
              currentPlan === 'free'
                ? isDark
                  ? 'bg-zinc-900/90 border-zinc-700 ring-1 ring-zinc-600'
                  : 'bg-zinc-50 border-zinc-300 ring-1 ring-zinc-400'
                : isDark
                ? 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
                : 'bg-white border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Default
                </span>
                {currentPlan === 'free' && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-200">
                    Active
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold">sieo</h3>
              <p className={`text-[11px] mt-1 min-h-[28px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                sieo model for basic everyday requests & prompt testing.
              </p>

              {/* Price */}
              <div className="mt-3 mb-4">
                <span className="text-2xl sm:text-3xl font-extrabold">₹0</span>
                <span className={`text-xs ml-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  / forever free
                </span>
              </div>

              {/* 7 Properties */}
              <div className="space-y-2 pt-3 border-t border-zinc-800/80">
                <p className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
                  Features included:
                </p>
                <ul className="space-y-1.5 text-xs">
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Tejas sieo model access</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Small context window (~4K tokens)</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Normal everyday tasks & queries</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Standard processing speed</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Local chat history & temp chats</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Basic code block formatting</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Community support</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={handleChooseFree}
              disabled={currentPlan === 'free'}
              className={`mt-5 w-full py-2 px-3 rounded-xl text-xs font-semibold transition-colors ${
                currentPlan === 'free'
                  ? 'bg-zinc-800 text-zinc-400 cursor-default border border-zinc-700'
                  : 'bg-zinc-700 hover:bg-zinc-600 text-white'
              }`}
            >
              {currentPlan === 'free' ? 'Active Plan' : 'Select Free'}
            </button>
          </div>

          {/* 2. CAT (3B) [TEST TIER - ₹1 FOR 1 MONTH] */}
          <div
            className={`rounded-2xl border p-5 flex flex-col justify-between transition-all relative ${
              currentPlan === 'cat'
                ? 'bg-purple-950/20 border-purple-500/60 ring-2 ring-purple-500'
                : highlightPlan === 'cat'
                ? 'bg-purple-950/10 border-purple-400 ring-1 ring-purple-400'
                : isDark
                ? 'bg-zinc-900/60 border-zinc-800 hover:border-purple-500/40'
                : 'bg-white border-zinc-200 hover:border-purple-300'
            }`}
          >
            {/* Test Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-purple-600 text-white shadow-sm flex items-center gap-1">
                <TestTube2 className="w-3 h-3" /> Test Tier
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 mt-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">
                  Developer Test
                </span>
                {currentPlan === 'cat' && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Active
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold">Cat (3B)</h3>
              <p className={`text-[11px] mt-1 min-h-[28px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                1-Month testing tier with real checkout flow test for only ₹1.
              </p>

              {/* Price */}
              <div className="mt-3 mb-4">
                <span className="text-2xl sm:text-3xl font-extrabold text-purple-400">₹1</span>
                <span className={`text-xs ml-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  / 1 month test
                </span>
              </div>

              {/* 7 Properties */}
              <div className="space-y-2 pt-3 border-t border-zinc-800/80">
                <p className="text-[10px] font-semibold tracking-wider text-purple-400 uppercase">
                  Features included:
                </p>
                <ul className="space-y-1.5 text-xs">
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span>Tejas <strong>Cat (3B)</strong> model access</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span>Balanced reasoning & speed</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span>Real ₹1 test payment flow</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span>30 days validity duration</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span>Auto-reverts to Free after month</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span>Instant payment confirmation receipt</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span>Testing & sandbox verification</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onInitiateCheckout({
                  plan: 'cat',
                  modelId: 'meta-llama/Llama-3.2-3B-Instruct',
                  name: 'Tejas Cat (3B) Test Tier',
                  amount: 1,
                  period: '1 month',
                  durationDays: 30,
                });
              }}
              className="mt-5 w-full py-2 px-3 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/20 cursor-pointer"
            >
              {currentPlan === 'cat' ? 'Re-test Pay ₹1' : 'Pay ₹1 to Test (1 Mo)'}
            </button>
          </div>

          {/* 3. CHETAK (8B) PLAN */}
          <div
            className={`rounded-2xl border p-5 flex flex-col justify-between transition-all relative ${
              currentPlan === 'chetak'
                ? 'bg-blue-950/20 border-blue-500/60 ring-2 ring-blue-500'
                : highlightPlan === 'chetak'
                ? 'bg-blue-950/10 border-blue-400 ring-2 ring-blue-400/80 shadow-lg shadow-blue-500/10'
                : isDark
                ? 'bg-zinc-900/60 border-zinc-800 hover:border-blue-500/40'
                : 'bg-white border-zinc-200 hover:border-blue-300'
            }`}
          >
            {/* Popular Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-blue-600 text-white shadow-sm flex items-center gap-1">
                <Zap className="w-3 h-3" /> Most Popular
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 mt-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
                  Pro Intelligence
                </span>
                {currentPlan === 'chetak' && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Active
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold">Chetak (8B)</h3>
              <p className={`text-[11px] mt-1 min-h-[28px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Smart & detailed reasoning model for professionals & developers.
              </p>

              {/* Price */}
              <div className="mt-3 mb-4">
                {billingCycle === 'monthly' ? (
                  <div>
                    <span className="text-2xl sm:text-3xl font-extrabold">₹299</span>
                    <span className={`text-xs ml-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      / month
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-2xl sm:text-3xl font-extrabold">₹3,499</span>
                    <span className={`text-xs ml-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      / year
                    </span>
                  </div>
                )}
              </div>

              {/* 7 Properties */}
              <div className="space-y-2 pt-3 border-t border-zinc-800/80">
                <p className="text-[10px] font-semibold tracking-wider text-blue-400 uppercase">
                  Features included:
                </p>
                <ul className="space-y-1.5 text-xs">
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>Full access to <strong>Tejas Chetak (8B)</strong></span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>Extended context window (8K+ tokens)</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>High-accuracy analytical & logic reasoning</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>Faster response speed & priority inference</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>Advanced multi-language coding & debugging</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>Comprehensive document analysis</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>Auto-reverts to Free after expiration</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onInitiateCheckout({
                  plan: 'chetak',
                  modelId: 'meta-llama/Llama-3.1-8B-Instruct',
                  name: 'Tejas Chetak (8B)',
                  amount: billingCycle === 'monthly' ? 299 : 3499,
                  period: billingCycle === 'monthly' ? '1 month' : '1 year',
                  durationDays: billingCycle === 'monthly' ? 30 : 365,
                });
              }}
              className="mt-5 w-full py-2 px-3 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/25 cursor-pointer"
            >
              {billingCycle === 'monthly' ? 'Subscribe for ₹299/mo' : 'Subscribe for ₹3,499/yr'}
            </button>
          </div>

          {/* 4. ARKA (70B) PLAN */}
          <div
            className={`rounded-2xl border p-5 flex flex-col justify-between transition-all relative ${
              currentPlan === 'arka'
                ? 'bg-amber-950/20 border-amber-500/60 ring-2 ring-amber-500'
                : highlightPlan === 'arka'
                ? 'bg-amber-950/10 border-amber-400 ring-2 ring-amber-400/80 shadow-lg shadow-amber-500/10'
                : isDark
                ? 'bg-zinc-900/60 border-zinc-800 hover:border-amber-500/40'
                : 'bg-white border-zinc-200 hover:border-amber-300'
            }`}
          >
            {/* Flagship Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 shadow-sm flex items-center gap-1 font-semibold">
                <Crown className="w-3 h-3" /> Flagship
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 mt-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                  Enterprise Ultra
                </span>
                {currentPlan === 'arka' && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Active
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold">Arka (70B)</h3>
              <p className={`text-[11px] mt-1 min-h-[28px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Superintelligence for heavy computations & complex research.
              </p>

              {/* Price */}
              <div className="mt-3 mb-4">
                {billingCycle === 'monthly' ? (
                  <div>
                    <span className="text-2xl sm:text-3xl font-extrabold">₹799</span>
                    <span className={`text-xs ml-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      / month
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-2xl sm:text-3xl font-extrabold">₹9,499</span>
                    <span className={`text-xs ml-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      / year
                    </span>
                  </div>
                )}
              </div>

              {/* 7 Properties */}
              <div className="space-y-2 pt-3 border-t border-zinc-800/80">
                <p className="text-[10px] font-semibold tracking-wider text-amber-400 uppercase">
                  Features included:
                </p>
                <ul className="space-y-1.5 text-xs">
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Unrestricted <strong>Tejas Arka (70B)</strong></span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Massive ultra-wide context processing</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Deep math & architectural logic</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Dedicated top-tier server cluster allocation</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>End-to-end fullstack code generation & audits</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Nuanced multilingual fluency</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Auto-reverts to Free after expiration</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onInitiateCheckout({
                  plan: 'arka',
                  modelId: 'meta-llama/Llama-3.3-70B-Instruct',
                  name: 'Tejas Arka (70B)',
                  amount: billingCycle === 'monthly' ? 799 : 9499,
                  period: billingCycle === 'monthly' ? '1 month' : '1 year',
                  durationDays: billingCycle === 'monthly' ? 30 : 365,
                });
              }}
              className="mt-5 w-full py-2 px-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-bold shadow-md shadow-amber-500/20 cursor-pointer"
            >
              {billingCycle === 'monthly' ? 'Subscribe for ₹799/mo' : 'Subscribe for ₹9,499/yr'}
            </button>
          </div>

        </div>

        </div>

        {/* Security & Guarantee Footer */}
        <div className={`p-4 border-t text-center text-xs flex flex-wrap items-center justify-center gap-4 ${
          isDark ? 'border-zinc-800/80 bg-zinc-900/60 text-zinc-400' : 'border-zinc-200 bg-zinc-50 text-zinc-500'
        }`}>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure 256-bit encrypted checkout</span>
          </div>
          <span className="text-zinc-600">•</span>
          <span>Instant UPI & Card payments</span>
          <span className="text-zinc-600">•</span>
          <span>Auto-downgrades to Free tier at end of cycle</span>
        </div>
      </div>
    </div>
  );
};
