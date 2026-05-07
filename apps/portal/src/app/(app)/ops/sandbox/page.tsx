'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import {
  spring,
  fadeUp,
  fadeUpTransition,
  staggerContainer,
  staggerItem,
  staggerItemTransition,
} from '@/lib/motion';

type ScenarioStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PASS' | 'FAIL';

interface SandboxScenario {
  id: string;
  scenarioKey: string;
  name: string;
  description: string;
  status: ScenarioStatus;
  linkedBatchId?: string;
  linkedInquiryId?: string;
  institutionId?: string;
}

interface Institution {
  id: string;
  name: string;
}

const BUILTIN_SCENARIOS = [
  {
    scenarioKey: 'CLEAN_TEST_BATCH',
    name: 'Submit Clean TEST Batch',
    description:
      'Upload a batch containing 500+ records with 100% data integrity for schema validation.',
  },
  {
    scenarioKey: 'ERROR_REMEDIATION',
    name: 'Submit Batch with Intentional Errors',
    description:
      'Submit a batch with known field violations to verify rejection logic and error reporting.',
  },
  {
    scenarioKey: 'NO_MATCH_INQUIRY',
    name: 'No-Match Credit Inquiry',
    description: 'Perform an inquiry for a subject not in the bureau database.',
  },
  {
    scenarioKey: 'API_CONNECTIVITY',
    name: 'API Connectivity Test',
    description:
      'Initial handshake and secure token exchange between institution servers and MFCB gateway.',
  },
  {
    scenarioKey: 'SFTP_HANDSHAKE',
    name: 'SFTP Directory Handshake',
    description:
      'Validation of secure file transfer protocol folders and permission architecture.',
  },
  {
    scenarioKey: 'STRESS_TEST',
    name: 'Large Volume Stress Test',
    description:
      'Automated transmission of 50,000+ records to verify asynchronous processing performance.',
  },
];

function StatusBadge({ status }: { status: ScenarioStatus }) {
  const styles: Record<ScenarioStatus, { badge: string; icon: React.ReactNode; border: string }> = {
    NOT_STARTED: {
      badge: 'bg-gray-100 text-gray-600',
      border: 'border-outline-variant',
      icon: (
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    IN_PROGRESS: {
      badge: 'bg-blue-100 text-blue-800',
      border: 'border-blue-300',
      icon: (
        <motion.svg
          className="w-5 h-5 text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </motion.svg>
      ),
    },
    PASS: {
      badge: 'bg-green-50 text-green-700',
      border: 'border-green-200',
      icon: (
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
        </svg>
      ),
    },
    FAIL: {
      badge: 'bg-red-50 text-red-700',
      border: 'border-red-400',
      icon: (
        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
  };
  const s = styles[status];
  return (
    <div className="flex items-center gap-2">
      {s.icon}
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.badge}`}>
        {status.replace(/_/g, ' ')}
      </span>
    </div>
  );
}

export default function SandboxPage() {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const canManage = hasPermission('sandbox:manage');

  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [runTarget, setRunTarget] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: institutionsData } = useQuery({
    queryKey: ['sandbox-institutions'],
    queryFn: () => api.get('/institutions?status=ACTIVE').then((r) => r.data),
  });

  const institutions: Institution[] = institutionsData?.data ?? institutionsData ?? [];

  const { data: scenariosData, isLoading } = useQuery({
    queryKey: ['sandbox-scenarios', selectedInstitution],
    queryFn: () => {
      const params = selectedInstitution ? `?institutionId=${selectedInstitution}` : '';
      return api.get(`/sandbox/scenarios${params}`).then((r) => r.data);
    },
    // Handle gracefully if endpoint doesn't exist
    retry: false,
  });

  const scenarios: SandboxScenario[] = scenariosData?.data ?? scenariosData ?? [];

  const runMutation = useMutation({
    mutationFn: (scenarioKey: string) =>
      api.post('/sandbox/run', {
        scenarioKey,
        institutionId: selectedInstitution || undefined,
      }),
    onSuccess: () => {
      setSuccessMsg('Scenario initiated successfully.');
      setRunTarget(null);
      queryClient.invalidateQueries({ queryKey: ['sandbox-scenarios'] });
    },
    onError: () => {
      setErrorMsg('Failed to run scenario. Please try again.');
      setRunTarget(null);
    },
  });

  // Merge API results with built-in scenario definitions
  const mergedScenarios = BUILTIN_SCENARIOS.map((builtin) => {
    const apiScenario = Array.isArray(scenarios)
      ? scenarios.find((s) => s.scenarioKey === builtin.scenarioKey)
      : null;
    return {
      ...builtin,
      id: apiScenario?.id ?? builtin.scenarioKey,
      status: (apiScenario?.status ?? 'NOT_STARTED') as ScenarioStatus,
      linkedBatchId: apiScenario?.linkedBatchId,
      linkedInquiryId: apiScenario?.linkedInquiryId,
    };
  });

  const passCount = mergedScenarios.filter((s) => s.status === 'PASS').length;
  const progressPct = Math.round((passCount / mergedScenarios.length) * 100);
  const allPassed = passCount === mergedScenarios.length;

  return (
    <motion.div
      className="p-6 max-w-5xl mx-auto space-y-8"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Institutional Certification Centre</h1>
          <p className="text-outline mt-1 max-w-xl">
            Validate technical integration and data submission protocols before moving to the LIVE
            environment.
          </p>
        </div>
        <motion.button
          disabled={!allPassed}
          className={`px-6 py-2 rounded font-semibold text-sm transition-all ${
            allPassed
              ? 'bg-primary-container text-white hover:opacity-90'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          } relative group`}
          title={allPassed ? 'Generate certificate' : 'Complete all test scenarios to unlock'}
          whileHover={allPassed ? { scale: 1.04 } : {}}
          whileTap={allPassed ? { scale: 0.97 } : {}}
          transition={spring.crisp}
        >
          Generate Certificate of Readiness
          {!allPassed && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded w-52 text-center shadow-lg">
              Complete all {mergedScenarios.length} test scenarios to unlock certification.
            </span>
          )}
        </motion.button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <Alert variant="success" onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}
      {errorMsg && (
        <Alert variant="error" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {/* Institution Selector + Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-outline-variant rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary">Certification Status</h2>
            <span className="text-lg font-semibold text-secondary">{progressPct}%</span>
          </div>
          <div className="w-full bg-surface-container-high h-4 rounded-full overflow-hidden">
            <motion.div
              className="bg-secondary h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.2 }}
            />
          </div>
          <p className="mt-2 text-sm text-outline">
            {passCount} / {mergedScenarios.length} test scenarios passed.
          </p>

          {institutions.length > 0 && (
            <div className="mt-4">
              <label className="block text-xs font-semibold text-outline uppercase mb-1">
                View Certification For Institution
              </label>
              <select
                value={selectedInstitution}
                onChange={(e) => setSelectedInstitution(e.target.value)}
                className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-secondary-container focus:border-secondary outline-none"
              >
                <option value="">— All / Platform View —</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="bg-primary-container text-white rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold opacity-80 uppercase tracking-widest mb-1">
              Current Phase
            </p>
            <h3 className="text-lg font-semibold mb-3">
              {passCount === 0
                ? 'Phase 1: Initial Setup'
                : passCount < 3
                ? 'Phase 2: Technical Validation'
                : passCount < mergedScenarios.length
                ? 'Phase 3: Final Verification'
                : 'Phase 4: Certified'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-secondary-container" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">
              {passCount} / {mergedScenarios.length} Tests Successfully Passed
            </span>
          </div>
        </div>
      </div>

      {/* Scenarios */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-primary">Test Scenarios Checklist</h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <motion.div
            className="space-y-3"
            variants={staggerContainer(0.08)}
            initial="initial"
            animate="animate"
          >
            {mergedScenarios.map((scenario) => (
              <motion.div
                key={scenario.scenarioKey}
                variants={staggerItem}
                transition={staggerItemTransition}
                className={`bg-white border rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow ${
                  scenario.status === 'FAIL'
                    ? 'border-red-400 border-2'
                    : scenario.status === 'PASS'
                    ? 'border-green-200'
                    : 'border-outline-variant'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2 rounded-full ${
                      scenario.status === 'PASS'
                        ? 'bg-green-100 text-green-700'
                        : scenario.status === 'FAIL'
                        ? 'bg-red-100 text-red-700'
                        : scenario.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-surface-container-high text-outline'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {scenario.status === 'PASS' ? (
                        <motion.path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        />
                      ) : scenario.status === 'FAIL' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-on-surface">{scenario.name}</h4>
                    <p
                      className={`text-sm mt-0.5 ${
                        scenario.status === 'FAIL' ? 'text-red-600 font-medium' : 'text-outline'
                      }`}
                    >
                      {scenario.description}
                    </p>
                    {/* Linked IDs */}
                    <div className="flex gap-3 mt-2">
                      {scenario.linkedBatchId && (
                        <a
                          href={`/batches/${scenario.linkedBatchId}`}
                          className="text-xs text-secondary hover:underline font-mono"
                        >
                          Batch #{scenario.linkedBatchId.slice(0, 8)}
                        </a>
                      )}
                      {scenario.linkedInquiryId && (
                        <a
                          href={`/reports/inquiries/${scenario.linkedInquiryId}`}
                          className="text-xs text-secondary hover:underline font-mono"
                        >
                          Inquiry #{scenario.linkedInquiryId.slice(0, 8)}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={scenario.status} />
                  {canManage && (
                    <motion.button
                      className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
                        scenario.status === 'FAIL'
                          ? 'bg-primary-container text-white hover:opacity-90'
                          : 'border border-outline-variant text-on-surface hover:bg-surface-container'
                      }`}
                      onClick={() => setRunTarget(scenario.scenarioKey)}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring.crisp}
                    >
                      {scenario.status === 'FAIL'
                        ? 'Run Test / Re-upload'
                        : scenario.status === 'PASS'
                        ? 'Re-run'
                        : 'Run Scenario'}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Confirm Run Modal */}
      <Modal
        open={!!runTarget}
        onClose={() => setRunTarget(null)}
        title="Run Scenario"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            Initiating scenario:{' '}
            <span className="font-bold text-on-surface">
              {mergedScenarios.find((s) => s.scenarioKey === runTarget)?.name}
            </span>
            . This will create a sandbox batch or inquiry and update the certification status.
          </p>
          {selectedInstitution && (
            <p className="text-xs text-outline">
              For institution:{' '}
              <span className="font-semibold">
                {institutions.find((i) => i.id === selectedInstitution)?.name}
              </span>
            </p>
          )}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" size="sm" onClick={() => setRunTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={runMutation.isPending}
              onClick={() => runTarget && runMutation.mutate(runTarget)}
            >
              Run Scenario
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
