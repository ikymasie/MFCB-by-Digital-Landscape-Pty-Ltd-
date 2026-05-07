'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search, RefreshCw, Bell, Info, Network, FileSearch, CheckCircle,
  Zap, BarChart2, Copy, ChevronLeft, ChevronRight, Server, Database,
  Cpu, ExternalLink,
} from '@/lib/icons';
import {
  spring, fadeUp, fadeUpTransition, staggerContainer, staggerItem, staggerItemTransition,
} from '@/lib/motion';

interface SftpBatchEntry {
  id: string;
  institution: string;
  srn: string;
  file_name: string;
  pickup_time: string;
  file_size: string;
  sha256: string;
  linked_batch: string;
  status: 'INGESTED' | 'IN_PROGRESS' | 'DISCOVERED' | 'FAILED';
  error?: string;
}

const STATIC_DATA: SftpBatchEntry[] = [
  {
    id: '1',
    institution: 'First National Bank',
    srn: 'SRN-00124',
    file_name: 'FNB_RECORDS_20241028_001.txt',
    pickup_time: '14:32:05 CAT',
    file_size: '2.4 MB',
    sha256: 'a8f3...b2c1',
    linked_batch: '#B-8821',
    status: 'INGESTED',
  },
  {
    id: '2',
    institution: 'Absa Bank Botswana',
    srn: 'SRN-00562',
    file_name: 'ABSA_DAILY_TX_994.csv',
    pickup_time: '14:31:55 CAT',
    file_size: '15.8 MB',
    sha256: '7e4d...00f8',
    linked_batch: '#B-8822',
    status: 'IN_PROGRESS',
  },
  {
    id: '3',
    institution: 'Stanbic Bank',
    srn: 'SRN-00219',
    file_name: 'STB_BALANCES_1028.xml',
    pickup_time: '14:31:12 CAT',
    file_size: '1.1 MB',
    sha256: '4b12...ff23',
    linked_batch: '#B-8823',
    status: 'DISCOVERED',
  },
  {
    id: '4',
    institution: 'Botswana Savings Bank',
    srn: 'SRN-00874',
    file_name: 'BSB_KYC_UPDT_01.dat',
    pickup_time: '14:28:40 CAT',
    file_size: '452 KB',
    sha256: 'd0a9...92e7',
    linked_batch: '#B-8820',
    status: 'FAILED',
    error: 'CRC Check Mismatch: Hash Invalidation',
  },
  {
    id: '5',
    institution: 'Standard Chartered',
    srn: 'SRN-00431',
    file_name: 'SCB_CREDIT_LINE_Z.txt',
    pickup_time: '14:25:20 CAT',
    file_size: '5.9 MB',
    sha256: 'c1c1...bb00',
    linked_batch: '#B-8819',
    status: 'INGESTED',
  },
];

type StatusKey = SftpBatchEntry['status'];

function StatusBadge({ status }: { status: StatusKey }) {
  const cfg: Record<StatusKey, { bg: string; text: string; border: string; label: string }> = {
    INGESTED:    { bg: 'bg-green-100',          text: 'text-green-700',          border: 'border-green-200',          label: 'INGESTED' },
    IN_PROGRESS: { bg: 'bg-[#97ccfe]',          text: 'text-[#175683]',          border: 'border-[#28628f]/20',       label: 'IN PROGRESS' },
    DISCOVERED:  { bg: 'bg-[#001e40]/10',        text: 'text-[#001e40]',          border: 'border-[#001e40]/20',       label: 'DISCOVERED' },
    FAILED:      { bg: 'bg-[#ffdad6]',          text: 'text-[#93000a]',          border: 'border-[#ba1a1a]/20',       label: 'FAILED' },
  };
  const c = cfg[status];
  return (
    <motion.span
      className={`px-2 py-1 rounded ${c.bg} ${c.text} text-[10px] font-bold uppercase tracking-widest border ${c.border}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={spring.crisp}
    >
      {c.label}
    </motion.span>
  );
}

const METRICS = [
  { icon: <Network className="w-5 h-5" />,     label: 'Active Connections',       value: '42',    color: 'bg-[#001e40]/10 text-[#001e40]' },
  { icon: <FileSearch className="w-5 h-5" />,  label: 'Files Discovered (Today)', value: '1,284', color: 'bg-[#28628f]/10 text-[#28628f]' },
  { icon: <CheckCircle className="w-5 h-5" />, label: 'Ingestion Success Rate',   value: '99.8%', color: 'bg-green-100 text-green-700' },
  { icon: <Zap className="w-5 h-5" />,         label: 'System Latency',           value: '14ms',  color: 'bg-[#dae2fd] text-[#161e31]' },
];

const SYSTEM_NODES = [
  { Icon: Server,   label: 'Main SFTP Gateway', status: 'ONLINE',   statusClass: 'text-green-600', iconClass: 'text-green-600' },
  { Icon: Database, label: 'Staging Bucket',    status: '92% FREE', statusClass: 'text-green-600', iconClass: 'text-green-600' },
  { Icon: Cpu,      label: 'Ingestion Worker A',status: 'BUSY',     statusClass: 'text-[#28628f]', iconClass: 'text-[#28628f]' },
  { Icon: Cpu,      label: 'Ingestion Worker B',status: 'IDLE',     statusClass: 'text-green-600', iconClass: 'text-green-600' },
];

export default function SFTPMonitorPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const filtered = STATIC_DATA.filter((row) => {
    const matchStatus = !statusFilter || row.status === statusFilter;
    const matchSearch =
      !search ||
      row.file_name.toLowerCase().includes(search.toLowerCase()) ||
      row.institution.toLowerCase().includes(search.toLowerCase()) ||
      row.srn.toLowerCase().includes(search.toLowerCase()) ||
      row.linked_batch.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const ingestedCount = STATIC_DATA.filter((r) => r.status === 'INGESTED').length;
  const failedCount   = STATIC_DATA.filter((r) => r.status === 'FAILED').length;

  return (
    <motion.div
      className="flex flex-col h-full overflow-hidden"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={fadeUpTransition}
    >
      {/* Top header inside main content */}
      <header className="flex justify-between items-center w-full px-6 py-6 bg-white border-b border-[#c3c6d1] z-10">
        <div className="flex items-center gap-4">
          <h2 className="text-[32px] font-semibold text-[#001e40]">SFTP Batch Monitor</h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full border border-green-200">
            {/* Framer Motion ping replaces animate-ping CSS class */}
            <motion.span
              className="w-2 h-2 rounded-full bg-green-600"
              animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <span className="text-xs font-semibold uppercase tracking-wider">Live</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737780]" />
            <input
              type="text"
              placeholder="Search batches, SRNs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#f2f4f6] border border-[#737780] rounded-lg text-sm w-64 focus:ring-2 focus:ring-[#001e40] focus:border-transparent outline-none"
            />
          </div>
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => window.location.reload()}
              className="p-2 text-[#43474f] hover:bg-[#e6e8ea] rounded-full transition-colors"
              title="Refresh"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={spring.crisp}
            >
              <RefreshCw className="w-5 h-5" />
            </motion.button>
            <motion.button
              className="p-2 text-[#43474f] hover:bg-[#e6e8ea] rounded-full transition-colors relative"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={spring.crisp}
            >
              <Bell className="w-5 h-5" />
              {failedCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#ba1a1a] rounded-full border-2 border-white" />
              )}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Scrollable workspace */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Info Banner */}
        <div className="bg-[#97ccfe]/20 border border-[#97ccfe] rounded-xl px-6 py-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-[#28628f] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#175683]">SFTP Monitoring Active</p>
            <p className="text-sm text-[#43474f] mt-0.5">
              Files are automatically picked up per institution schedule. View or configure institution SFTP
              settings in{' '}
              <Link href="/institutions" className="text-[#28628f] underline hover:opacity-80">
                Institution Management
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Metrics */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={staggerContainer(0.07)}
          initial="initial"
          animate="animate"
        >
          {METRICS.map(({ icon, label, value, color }) => (
            <motion.div
              key={label}
              className="bg-white p-6 rounded-xl border border-[#c3c6d1] shadow-sm flex items-center gap-6"
              variants={staggerItem}
              transition={staggerItemTransition}
              whileHover={{ y: -2 }}
            >
              <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
                {icon}
              </div>
              <div>
                <p className="text-sm text-[#43474f] leading-none mb-1">{label}</p>
                <h4 className="text-[32px] font-bold text-[#001e40] leading-none">{value}</h4>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Table */}
        <div className="bg-white rounded-xl border border-[#c3c6d1] shadow-sm overflow-hidden flex flex-col">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-[#c3c6d1] flex justify-between items-center bg-[#f2f4f6]">
            <div className="flex items-center gap-4">
              <BarChart2 className="w-5 h-5 text-[#001e40]" />
              <h3 className="text-sm font-semibold text-[#191c1e]">Real-Time Batch Stream</h3>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-[#c3c6d1] rounded-lg bg-white px-3 py-1.5 text-sm outline-none"
              >
                <option value="">All Statuses</option>
                <option value="INGESTED">INGESTED</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="DISCOVERED">DISCOVERED</option>
                <option value="FAILED">FAILED</option>
              </select>
              <span className="text-xs text-[#43474f] font-medium">
                Last updated: {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} CAT
              </span>
              <motion.button
                className="ml-2 px-4 py-1.5 bg-[#001e40] text-white rounded text-xs font-semibold hover:opacity-90 transition-opacity"
                onClick={() => alert('Log export coming soon')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={spring.crisp}
              >
                EXPORT LOGS
              </motion.button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-[#e6e8ea] border-b-2 border-[#001e40]">
                <tr>
                  {['Institution / SRN', 'File Name', 'Pickup Time', 'Size', 'SHA-256', 'Batch ID', 'Status', 'Errors'].map((h) => (
                    <th key={h} className="px-6 py-3 text-xs font-semibold text-[#191c1e] uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <motion.tbody
                className="divide-y divide-[#c3c6d1]"
                variants={staggerContainer(0.035)}
                initial="initial"
                animate="animate"
              >
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-[#43474f]">
                      No SFTP entries match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, idx) => (
                    <motion.tr
                      key={row.id}
                      className={`hover:bg-[#f2f4f6] transition-colors ${idx % 2 === 1 ? 'bg-[#f2f4f6]/30' : ''}`}
                      variants={staggerItem}
                      transition={staggerItemTransition}
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-[#191c1e]">{row.institution}</p>
                        <p className="text-xs text-[#43474f] font-mono mt-0.5">{row.srn}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium font-mono">{row.file_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono">{row.pickup_time}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono">{row.file_size}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-mono text-[10px] text-[#737780]">
                          <span>{row.sha256}</span>
                          <motion.button
                            className="hover:text-[#001e40] transition-colors"
                            onClick={() => navigator.clipboard.writeText(row.sha256)}
                            title="Copy SHA-256"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            transition={spring.crisp}
                          >
                            <Copy className="w-3 h-3" />
                          </motion.button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {row.linked_batch !== '—' ? (
                          <Link
                            href={`/batches/${row.linked_batch.replace('#B-', '')}`}
                            className="bg-[#eceef0] text-[#43474f] px-2 py-0.5 rounded font-mono text-xs hover:bg-[#c3c6d1] transition-colors"
                          >
                            {row.linked_batch}
                          </Link>
                        ) : (
                          <span className="text-[#43474f] opacity-40">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-6 py-4">
                        {row.error ? (
                          <span className="text-xs text-[#ba1a1a] font-medium">{row.error}</span>
                        ) : (
                          <span className="text-xs text-[#43474f]">None</span>
                        )}
                      </td>
                    </motion.tr>
                  ))
                )}
              </motion.tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-6 py-4 border-t border-[#c3c6d1] bg-[#f2f4f6] flex justify-between items-center">
            <span className="text-xs text-[#43474f] font-medium">
              Showing {filtered.length} of {STATIC_DATA.length} entries (static — real-time API coming soon)
            </span>
            <div className="flex gap-2">
              <motion.button
                className="p-1 text-[#43474f] hover:bg-[#e6e8ea] rounded disabled:opacity-30"
                disabled
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={spring.crisp}
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
              <button className="w-8 h-8 flex items-center justify-center bg-[#001e40] text-white rounded font-semibold text-xs">
                1
              </button>
              <motion.button
                className="p-1 text-[#43474f] hover:bg-[#e6e8ea] rounded disabled:opacity-30"
                disabled
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={spring.crisp}
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Bottom dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar chart placeholder */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-[#c3c6d1] shadow-sm h-64">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-[#191c1e]">Ingestion Performance (Last 6 Hours)</h3>
              <div className="flex gap-3">
                <span className="flex items-center gap-1 text-[10px] font-bold text-[#001e40]">
                  <span className="w-2 h-2 bg-[#001e40] rounded-full" /> FILES
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-[#28628f]">
                  <span className="w-2 h-2 bg-[#28628f] rounded-full" /> THROUGHPUT
                </span>
              </div>
            </div>
            <div className="w-full h-32 flex items-end justify-between gap-2 px-2">
              {[60, 85, 70, 95, 100, 80].map((h, i) => (
                <div key={i} className="w-full bg-[#eceef0] rounded-t-sm relative">
                  <div
                    className="absolute bottom-0 w-full bg-[#001e40]/20 hover:bg-[#001e40]/40 transition-colors rounded-t-sm"
                    style={{ height: `${h}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-[#43474f] font-medium px-2">
              {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'].map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white p-6 rounded-xl border border-[#c3c6d1] shadow-sm flex flex-col">
            <h3 className="text-sm font-semibold text-[#191c1e] mb-6">System Health Nodes</h3>
            <div className="space-y-4 flex-1">
              {SYSTEM_NODES.map(({ Icon, label, status, statusClass, iconClass }) => (
                <div
                  key={label}
                  className="flex items-center justify-between p-4 bg-[#f2f4f6] rounded-lg border border-[#c3c6d1]"
                >
                  <div className="flex items-center gap-4">
                    <Icon className={`w-5 h-5 ${iconClass}`} />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <span className={`text-[10px] font-bold ${statusClass}`}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Link to Institution SFTP config */}
        <div className="bg-[#f2f4f6] border border-[#c3c6d1] rounded-xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#001e40]/10 rounded-lg flex items-center justify-center">
              <Network className="w-5 h-5 text-[#001e40]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#001e40]">Configure Institution SFTP</p>
              <p className="text-sm text-[#43474f]">Manage SFTP credentials, schedules, and pickup directories per institution.</p>
            </div>
          </div>
          <Link
            href="/institutions"
            className="flex items-center gap-2 px-6 py-2.5 bg-[#001e40] text-white font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <ExternalLink className="w-4 h-4" />
            Institution Config
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
